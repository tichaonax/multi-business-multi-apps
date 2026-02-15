import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

interface TransferItem {
  productVariantId?: string
  baleId?: string
  quantity: number
  sourcePrice: number
  targetPrice: number
  productName: string
  barcode?: string
}

/**
 * Helper: Find or create a matching product + variant in the target business.
 * Tries barcode match first, then creates new product + variant.
 */
async function findOrCreateTargetProduct(
  tx: any,
  targetBusinessId: string,
  targetBusiness: any,
  item: TransferItem
): Promise<{ targetProduct: any; targetVariant: any }> {
  let targetProduct = null
  let targetVariant = null

  if (item.barcode) {
    targetVariant = await tx.productVariants.findFirst({
      where: {
        barcode: item.barcode,
        business_products: { businessId: targetBusinessId }
      },
      include: { business_products: true }
    })

    if (targetVariant) {
      targetProduct = targetVariant.business_products
    }
  }

  if (!targetProduct) {
    let targetCategory = await tx.businessCategories.findFirst({
      where: { businessId: targetBusinessId, isActive: true }
    })

    if (!targetCategory) {
      targetCategory = await tx.businessCategories.create({
        data: {
          id: randomUUID(),
          businessId: targetBusinessId,
          name: 'Transferred Items',
          emoji: '📦',
          sortOrder: 999,
          isActive: true,
          updatedAt: new Date()
        }
      })
    }

    const prefix = targetBusiness.businessType.substring(0, 3).toUpperCase()
    const shortName = item.productName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()
    const newSku = `${prefix}-${shortName}-${randomUUID().substring(0, 6).toUpperCase()}`
    targetProduct = await tx.businessProducts.create({
      data: {
        id: randomUUID(),
        businessId: targetBusinessId,
        businessType: targetBusiness.businessType,
        name: item.productName,
        sku: newSku,
        barcode: item.barcode || null,
        basePrice: item.targetPrice,
        costPrice: item.sourcePrice,
        categoryId: targetCategory.id,
        condition: 'USED',
        isActive: true,
        isAvailable: true,
        updatedAt: new Date()
      }
    })

    targetVariant = await tx.productVariants.create({
      data: {
        id: randomUUID(),
        productId: targetProduct.id,
        name: 'Default',
        sku: `${newSku}-DEF`,
        barcode: item.barcode || null,
        price: item.targetPrice,
        stockQuantity: 0,
        isActive: true,
        isAvailable: true,
        updatedAt: new Date()
      }
    })
  }

  return { targetProduct, targetVariant }
}

/**
 * POST /api/inventory/transfer
 * Atomic inventory transfer from source business to target business.
 * - Creates TRANSFER_OUT stock movements in source
 * - Creates/updates products + variants in target business
 * - Creates TRANSFER_IN stock movements in target
 * - Records InventoryTransfer + InventoryTransferItems
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      sourceBusinessId,
      targetBusinessId,
      items,
      notes,
      resetBogo
    }: {
      sourceBusinessId: string
      targetBusinessId: string
      items: TransferItem[]
      notes?: string
      resetBogo?: boolean
    } = body

    // Validation
    if (!sourceBusinessId || !targetBusinessId) {
      return NextResponse.json({ success: false, error: 'Source and target business IDs are required' }, { status: 400 })
    }

    if (sourceBusinessId === targetBusinessId) {
      return NextResponse.json({ success: false, error: 'Source and target businesses must be different' }, { status: 400 })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one item is required' }, { status: 400 })
    }

    // Verify businesses exist
    const [sourceBusiness, targetBusiness] = await Promise.all([
      prisma.businesses.findUnique({ where: { id: sourceBusinessId } }),
      prisma.businesses.findUnique({ where: { id: targetBusinessId } })
    ])

    if (!sourceBusiness || !targetBusiness) {
      return NextResponse.json({ success: false, error: 'Source or target business not found' }, { status: 404 })
    }

    // Verify source is clothing business (inventory transfer is clothing-only feature)
    if (sourceBusiness.businessType !== 'clothing') {
      return NextResponse.json({ success: false, error: 'Inventory transfer is only available for clothing businesses' }, { status: 400 })
    }

    // Run the entire transfer in a single transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create the transfer record
      const transfer = await tx.inventoryTransfers.create({
        data: {
          id: randomUUID(),
          sourceBusinessId,
          targetBusinessId,
          status: 'COMPLETED',
          transferDate: new Date(),
          employeeId: (session.user as any).id || null,
          notes: notes || null,
        }
      })

      let transferredCount = 0
      const transferredBaleIds: string[] = []

      // 2. Process each item
      for (const item of items) {
        // --- BALE TRANSFER ---
        if (item.baleId) {
          const bale = await tx.clothingBales.findUnique({
            where: { id: item.baleId },
            include: { category: { select: { name: true } } }
          })

          if (!bale) {
            throw new Error(`Bale ${item.baleId} not found`)
          }

          if (bale.businessId !== sourceBusinessId) {
            throw new Error(`Bale ${bale.batchNumber} does not belong to source business`)
          }

          if (bale.remainingCount < item.quantity) {
            throw new Error(`Insufficient stock for bale ${bale.batchNumber}. Available: ${bale.remainingCount}, Requested: ${item.quantity}`)
          }

          // Decrement bale remaining count; deactivate if fully transferred
          const newRemaining = bale.remainingCount - item.quantity
          await tx.clothingBales.update({
            where: { id: item.baleId },
            data: {
              remainingCount: newRemaining,
              isActive: newRemaining > 0,
              updatedAt: new Date()
            }
          })

          transferredBaleIds.push(item.baleId)

          // Find or create product in target business
          const { targetProduct, targetVariant } = await findOrCreateTargetProduct(
            tx, targetBusinessId, targetBusiness, item
          )

          // Create TRANSFER_IN stock movement in target
          await tx.businessStockMovements.create({
            data: {
              id: randomUUID(),
              businessId: targetBusinessId,
              productVariantId: targetVariant.id,
              movementType: 'TRANSFER_IN',
              quantity: item.quantity,
              unitCost: item.targetPrice,
              reference: `Transfer ${transfer.id}`,
              reason: `Bale transfer from ${sourceBusiness.businessName} (${bale.batchNumber})`,
              employeeId: (session.user as any).id || null,
              businessType: targetBusiness.businessType,
              businessProductId: targetProduct.id,
              createdAt: new Date()
            }
          })

          // Increase stock in target variant
          await tx.productVariants.update({
            where: { id: targetVariant.id },
            data: {
              stockQuantity: targetVariant.stockQuantity + item.quantity,
              price: item.targetPrice,
              updatedAt: new Date()
            }
          })

          // Record transfer item with baleId
          await tx.inventoryTransferItems.create({
            data: {
              id: randomUUID(),
              transferId: transfer.id,
              productVariantId: null,
              baleId: item.baleId,
              quantity: item.quantity,
              sourcePrice: item.sourcePrice,
              targetPrice: item.targetPrice,
              productName: item.productName,
              barcode: item.barcode || null,
            }
          })

          transferredCount++
          continue
        }

        // --- REGULAR PRODUCT TRANSFER ---
        if (!item.productVariantId) {
          throw new Error('Item must have either baleId or productVariantId')
        }

        const sourceVariant = await tx.productVariants.findUnique({
          where: { id: item.productVariantId },
          include: { business_products: true }
        })

        if (!sourceVariant) {
          throw new Error(`Product variant ${item.productVariantId} not found`)
        }

        if (sourceVariant.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}. Available: ${sourceVariant.stockQuantity}, Requested: ${item.quantity}`)
        }

        // Create TRANSFER_OUT movement in source business
        await tx.businessStockMovements.create({
          data: {
            id: randomUUID(),
            businessId: sourceBusinessId,
            productVariantId: item.productVariantId,
            movementType: 'TRANSFER_OUT',
            quantity: -item.quantity,
            unitCost: item.sourcePrice,
            reference: `Transfer ${transfer.id}`,
            reason: `Transfer to ${targetBusiness.businessName}`,
            employeeId: (session.user as any).id || null,
            businessType: sourceBusiness.businessType,
            businessProductId: sourceVariant.productId,
            createdAt: new Date()
          }
        })

        // Reduce stock in source variant
        await tx.productVariants.update({
          where: { id: item.productVariantId },
          data: {
            stockQuantity: sourceVariant.stockQuantity - item.quantity,
            updatedAt: new Date()
          }
        })

        // Find or create product in target business
        const { targetProduct, targetVariant } = await findOrCreateTargetProduct(
          tx, targetBusinessId, targetBusiness, item
        )

        // Create TRANSFER_IN movement in target business
        await tx.businessStockMovements.create({
          data: {
            id: randomUUID(),
            businessId: targetBusinessId,
            productVariantId: targetVariant.id,
            movementType: 'TRANSFER_IN',
            quantity: item.quantity,
            unitCost: item.targetPrice,
            reference: `Transfer ${transfer.id}`,
            reason: `Transfer from ${sourceBusiness.businessName}`,
            employeeId: (session.user as any).id || null,
            businessType: targetBusiness.businessType,
            businessProductId: targetProduct.id,
            createdAt: new Date()
          }
        })

        // Increase stock in target variant
        await tx.productVariants.update({
          where: { id: targetVariant.id },
          data: {
            stockQuantity: targetVariant.stockQuantity + item.quantity,
            price: item.targetPrice,
            updatedAt: new Date()
          }
        })

        // Record transfer item
        await tx.inventoryTransferItems.create({
          data: {
            id: randomUUID(),
            transferId: transfer.id,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            sourcePrice: item.sourcePrice,
            targetPrice: item.targetPrice,
            productName: item.productName,
            barcode: item.barcode || null,
          }
        })

        transferredCount++
      }

      // 9. Reset BOGO — per-bale for transferred bales, global for legacy
      if (resetBogo) {
        // Reset per-bale BOGO on all transferred bales
        if (transferredBaleIds.length > 0) {
          await tx.clothingBales.updateMany({
            where: { id: { in: transferredBaleIds } },
            data: {
              bogoActive: false,
              updatedAt: new Date()
            }
          })
        }

        // Also reset legacy global BOGO promotion
        await tx.menuPromotions.updateMany({
          where: {
            businessId: sourceBusinessId,
            type: 'BUY_ONE_GET_ONE',
            isActive: true
          },
          data: {
            isActive: false,
            updatedAt: new Date()
          }
        })
      }

      return { transfer, transferredCount }
    })

    return NextResponse.json({
      success: true,
      data: {
        transferId: result.transfer.id,
        itemsTransferred: result.transferredCount,
        status: result.transfer.status
      }
    })
  } catch (error: any) {
    console.error('Inventory transfer error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process inventory transfer'
    }, { status: 500 })
  }
}

/**
 * GET /api/inventory/transfer?businessId=xxx
 * List transfers for a business (as source or target)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })
    }

    const transfers = await prisma.inventoryTransfers.findMany({
      where: {
        OR: [
          { sourceBusinessId: businessId },
          { targetBusinessId: businessId }
        ]
      },
      include: {
        items: true,
        sourceBusiness: { select: { id: true, businessName: true } },
        targetBusiness: { select: { id: true, businessName: true } },
        employees: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ success: true, data: transfers })
  } catch (error) {
    console.error('Transfer list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch transfers' }, { status: 500 })
  }
}
