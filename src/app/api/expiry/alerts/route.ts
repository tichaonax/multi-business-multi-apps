import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

const EXPIRY_WARNING_DAYS = 7

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    const canView = (permissions as unknown as Record<string, unknown>)['canViewStockAlerts'] === true
    if (!canView && !permissions.canManageExpiryActions && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const now = new Date()
    const warningCutoff = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000)

    // Query unresolved batches with expiry dates within the warning window
    const batches = await prisma.itemExpiryBatch.findMany({
      where: {
        businessId,
        isResolved: false,
        expiryDate: { not: null, lte: warningCutoff },
      },
      include: {
        inventoryItem: {
          select: { id: true, name: true, barcodeData: true, sku: true, stockQuantity: true, sellingPrice: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
    })

    // Also check legacy expiryDate on BarcodeInventoryItems (items with no batches)
    const legacyItems = await prisma.barcodeInventoryItems.findMany({
      where: {
        businessId,
        isExpiryDiscount: false,
        expiryDate: { not: null, lte: warningCutoff },
        expiryBatches: { none: {} },
      },
      select: { id: true, name: true, barcodeData: true, sku: true, stockQuantity: true, sellingPrice: true, expiryDate: true },
    })

    const toRow = (
      id: string,
      itemId: string,
      name: string,
      barcode: string | null,
      sku: string | null,
      qty: number,
      expiryDate: Date,
      price: unknown
    ) => {
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        batchId: id,
        itemId,
        name,
        barcode: barcode ?? '',
        sku: sku ?? '',
        quantity: qty,
        expiryDate: expiryDate.toISOString(),
        daysUntilExpiry,
        sellingPrice: price != null ? parseFloat((price as number).toString()) : null,
      }
    }

    const batchRows = batches.map(b =>
      toRow(
        b.id,
        b.inventoryItemId,
        b.inventoryItem.name,
        b.inventoryItem.barcodeData,
        b.inventoryItem.sku,
        b.quantity,
        b.expiryDate!,
        b.inventoryItem.sellingPrice
      )
    )

    // Legacy items get a synthetic batchId so the action API can distinguish them
    const legacyRows = legacyItems.map(item =>
      toRow(
        `legacy-${item.id}`,
        item.id,
        item.name,
        item.barcodeData,
        item.sku,
        item.stockQuantity,
        item.expiryDate!,
        item.sellingPrice
      )
    )

    const allRows = [...batchRows, ...legacyRows].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

    const expired = allRows.filter(r => r.daysUntilExpiry < 0)
    const nearExpiry = allRows.filter(r => r.daysUntilExpiry >= 0)

    return NextResponse.json({
      success: true,
      data: { expired, nearExpiry },
      counts: { expiredCount: expired.length, nearExpiryCount: nearExpiry.length },
    })
  } catch (error) {
    console.error('GET /api/expiry/alerts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
