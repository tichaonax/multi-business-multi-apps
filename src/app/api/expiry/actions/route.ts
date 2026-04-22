import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { generateSKU } from '@/lib/sku-generator'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageExpiryActions && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const batchId = searchParams.get('batchId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const where = {
      businessId,
      ...(batchId ? { batchId } : {}),
    }

    const [total, actions] = await Promise.all([
      prisma.expiryAction.count({ where }),
      prisma.expiryAction.findMany({
        where,
        orderBy: { actionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Enrich with item names where possible
    const batchIds = actions.map(a => a.batchId).filter(id => !id.startsWith('legacy-'))
    const batches = batchIds.length
      ? await prisma.itemExpiryBatch.findMany({
          where: { id: { in: batchIds } },
          include: { inventoryItem: { select: { name: true, barcodeData: true } } },
        })
      : []
    const batchMap = new Map(batches.map(b => [b.id, b]))

    const enriched = actions.map(a => ({
      ...a,
      newPrice: a.newPrice != null ? parseFloat(a.newPrice.toString()) : null,
      discountPct: a.discountPct != null ? parseFloat(a.discountPct.toString()) : null,
      itemName: batchMap.get(a.batchId)?.inventoryItem.name ?? null,
      itemBarcode: batchMap.get(a.batchId)?.inventoryItem.barcodeData ?? null,
    }))

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('GET /api/expiry/actions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageExpiryActions && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { businessId, batchId, actionType, quantity, notes, newPrice, newName } = body

    if (!businessId || !batchId || !actionType || !quantity) {
      return NextResponse.json({ error: 'businessId, batchId, actionType, quantity are required' }, { status: 400 })
    }

    if (!['DISPOSE', 'PRICE_REDUCTION', 'BOGO'].includes(actionType)) {
      return NextResponse.json({ error: 'actionType must be DISPOSE, PRICE_REDUCTION, or BOGO' }, { status: 400 })
    }

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 })
    }

    // Handle legacy items (no batch row — expiryDate was on the item directly)
    const isLegacy = batchId.startsWith('legacy-')
    const itemId = isLegacy ? batchId.replace('legacy-', '') : null

    // Load the batch or legacy item
    let sourceItemId: string
    let batchQty: number
    let sourceItem: { id: string; name: string; businessId: string; stockQuantity: number; sellingPrice: unknown } | null = null

    if (isLegacy) {
      sourceItem = await prisma.barcodeInventoryItems.findUnique({
        where: { id: itemId! },
        select: { id: true, name: true, businessId: true, stockQuantity: true, sellingPrice: true },
      })
      if (!sourceItem || sourceItem.businessId !== businessId) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      sourceItemId = sourceItem.id
      batchQty = sourceItem.stockQuantity
    } else {
      const batch = await prisma.itemExpiryBatch.findUnique({
        where: { id: batchId },
        include: {
          inventoryItem: {
            select: { id: true, name: true, businessId: true, stockQuantity: true, sellingPrice: true },
          },
        },
      })
      if (!batch || batch.businessId !== businessId) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
      }
      if (batch.isResolved) {
        return NextResponse.json({ error: 'Batch is already resolved' }, { status: 409 })
      }
      sourceItem = batch.inventoryItem
      sourceItemId = batch.inventoryItemId
      batchQty = batch.quantity
    }

    if (qty > batchQty) {
      return NextResponse.json({ error: `Quantity ${qty} exceeds batch quantity ${batchQty}` }, { status: 400 })
    }

    const sellingPrice = sourceItem.sellingPrice != null ? parseFloat(sourceItem.sellingPrice.toString()) : 0

    if (actionType === 'DISPOSE') {
      await prisma.$transaction(async tx => {
        // Record EXPIRED stock movement
        await tx.businessStockMovements.create({
          data: {
            businessId,
            movementType: 'EXPIRED',
            quantity: -qty,
            reference: batchId,
            reason: notes || 'Expired stock disposed',
            employeeId: user.id,
          },
        })

        // Decrement item stock
        await tx.barcodeInventoryItems.update({
          where: { id: sourceItemId },
          data: { stockQuantity: { decrement: qty } },
        })

        // Resolve batch (fully or partially)
        if (!isLegacy) {
          if (qty === batchQty) {
            await tx.itemExpiryBatch.update({
              where: { id: batchId },
              data: { isResolved: true, resolvedAt: new Date() },
            })
          } else {
            await tx.itemExpiryBatch.update({
              where: { id: batchId },
              data: { quantity: { decrement: qty } },
            })
          }
        }

        // Audit record
        await tx.expiryAction.create({
          data: {
            businessId,
            batchId,
            actionType: 'DISPOSE',
            quantity: qty,
            notes: notes || null,
            createdBy: user.id,
          },
        })
      })

      return NextResponse.json({ success: true, message: `${qty} units disposed` })
    }

    // PRICE_REDUCTION or BOGO — create discounted product
    const isBoGo = actionType === 'BOGO'
    const resolvedNewPrice = isBoGo ? Math.round(sellingPrice * 0.5 * 100) / 100 : parseFloat(newPrice)

    if (!isBoGo && (isNaN(resolvedNewPrice) || resolvedNewPrice < 0)) {
      return NextResponse.json({ error: 'newPrice is required for PRICE_REDUCTION' }, { status: 400 })
    }

    // Get business to generate SKU
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { type: true },
    })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const discountedName = newName ||
      (isBoGo ? `${sourceItem.name} (BOGO)` : `${sourceItem.name} - Expiry Deal`)

    const generatedSku = await generateSKU(prisma, {
      productName: discountedName,
      businessId,
      businessType: business.type,
    })

    // Auto-resolve or create "Expiry Deals" category
    let expiryCategory = await prisma.businessCategories.findFirst({
      where: { businessId, name: 'Expiry Deals' },
    })
    if (!expiryCategory) {
      expiryCategory = await prisma.businessCategories.create({
        data: {
          businessId,
          name: 'Expiry Deals',
          description: 'Discounted products nearing or past expiry',
          businessType: business.type,
          updatedAt: new Date(),
          isUserCreated: true,
        },
      })
    }

    let newItemId: string

    await prisma.$transaction(async tx => {
      // Create discounted inventory item
      const newItem = await tx.barcodeInventoryItems.create({
        data: {
          name: discountedName,
          sku: generatedSku,
          barcodeData: generatedSku,
          businessId,
          inventoryItemId: sourceItemId,
          stockQuantity: qty,
          sellingPrice: resolvedNewPrice,
          categoryId: expiryCategory!.id,
          isExpiryDiscount: true,
          originalItemId: sourceItemId,
          isActive: true,
          createdById: user.id,
          quantity: qty,
        },
      })
      newItemId = newItem.id

      // Decrement source item stock
      await tx.barcodeInventoryItems.update({
        where: { id: sourceItemId },
        data: { stockQuantity: { decrement: qty } },
      })

      // Resolve batch
      if (!isLegacy) {
        if (qty === batchQty) {
          await tx.itemExpiryBatch.update({
            where: { id: batchId },
            data: { isResolved: true, resolvedAt: new Date() },
          })
        } else {
          await tx.itemExpiryBatch.update({
            where: { id: batchId },
            data: { quantity: { decrement: qty } },
          })
        }
      }

      // Stock movement for the transfer
      await tx.businessStockMovements.create({
        data: {
          businessId,
          movementType: 'ADJUSTMENT',
          quantity: -qty,
          reference: batchId,
          reason: `Moved to expiry discount product: ${discountedName}`,
          employeeId: user.id,
        },
      })

      // Audit record
      const discountPct = sellingPrice > 0
        ? Math.round(((sellingPrice - resolvedNewPrice) / sellingPrice) * 100 * 100) / 100
        : null

      await tx.expiryAction.create({
        data: {
          businessId,
          batchId,
          actionType,
          quantity: qty,
          notes: notes || null,
          newItemId,
          newPrice: resolvedNewPrice,
          discountPct,
          createdBy: user.id,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `${qty} units moved to ${isBoGo ? 'BOGO' : 'discounted'} product`,
      newItemId: newItemId!,
      newSku: generatedSku,
      newPrice: resolvedNewPrice,
    })
  } catch (error) {
    console.error('POST /api/expiry/actions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
