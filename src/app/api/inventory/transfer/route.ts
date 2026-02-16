import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { getServerUser } from '@/lib/get-server-user'

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
          businesses: { connect: { id: targetBusinessId } },
          businessType: targetBusiness.type,
          name: 'Transferred Items',
          description: 'Category for items received via inventory transfer',
          emoji: '📦',
          displayOrder: 999,
          isActive: true,
          updatedAt: new Date()
        }
      })
    }

    const prefix = targetBusiness.type.substring(0, 3).toUpperCase()
    const shortName = item.productName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()
    const newSku = `${prefix}-${shortName}-${randomUUID().substring(0, 6).toUpperCase()}`
    targetProduct = await tx.businessProducts.create({
      data: {
        id: randomUUID(),
        businessId: targetBusinessId,
        businessType: targetBusiness.type,
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
    const user = await getServerUser()
    if (!user) {
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
    if (sourceBusiness.type !== 'clothing') {
      return NextResponse.json({ success: false, error: 'Inventory transfer is only available for clothing businesses' }, { status: 400 })
    }

    // Look up employee record for the current user (employeeId FK references employees table, not users)
    const employee = await prisma.employees.findFirst({
      where: { userId: user.id },
      select: { id: true }
    })
    const employeeId = employee?.id || null

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
          employeeId,
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

          // Create a new bale record in the target business
          // Find or create matching category by name
          let targetCategory = await tx.clothingBaleCategories.findFirst({
            where: { name: bale.category.name }
          })
          if (!targetCategory) {
            targetCategory = await tx.clothingBaleCategories.create({
              data: {
                id: randomUUID(),
                name: bale.category.name,
                description: `Transferred from ${sourceBusiness.name}`,
              }
            })
          }

          // Generate batch number and SKU for target bale
          const targetBatchNumber = `T-${bale.batchNumber}-${randomUUID().substring(0, 4).toUpperCase()}`
          const targetShortName = (targetBusiness.shortName || targetBusiness.type.substring(0, 3)).toUpperCase().slice(0, 4)
          const targetBaleSku = `BALE-${targetShortName}-${targetBatchNumber}-${randomUUID().substring(0, 4).toUpperCase()}`

          await tx.clothingBales.create({
            data: {
              id: randomUUID(),
              businessId: targetBusinessId,
              categoryId: targetCategory.id,
              batchNumber: targetBatchNumber,
              itemCount: item.quantity,
              remainingCount: item.quantity,
              unitPrice: item.targetPrice,
              sku: targetBaleSku,
              barcode: bale.barcode || null,
              bogoActive: false,
              bogoRatio: 1,
              isActive: true,
              notes: `Transferred from ${sourceBusiness.name} (${bale.batchNumber})`,
            }
          })

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
              reason: `Bale transfer from ${sourceBusiness.name} (${bale.batchNumber})`,
              employeeId,
              businessType: targetBusiness.type,
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
            reason: `Transfer to ${targetBusiness.name}`,
            employeeId,
            businessType: sourceBusiness.type,
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
            reason: `Transfer from ${sourceBusiness.name}`,
            employeeId,
            businessType: targetBusiness.type,
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

    // Return user-friendly error messages, not raw Prisma/DB errors
    let userMessage = 'Failed to process inventory transfer'
    if (error.message?.includes('Insufficient stock')) {
      userMessage = error.message
    } else if (error.message?.includes('not found')) {
      userMessage = error.message
    } else if (error.message?.includes('does not belong')) {
      userMessage = error.message
    }

    return NextResponse.json({
      success: false,
      error: userMessage
    }, { status: 500 })
  }
}

/**
 * GET /api/inventory/transfer?businessId=xxx
 * List transfers for a business (as source or target)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
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
