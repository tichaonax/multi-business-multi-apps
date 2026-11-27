import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

// GET - Paginated audit trail of POS/menu/inventory price changes for a business.
// MBM-350: also includes changes found only in product_price_history (see below).
// Reads from the shared AuditLogs table (action: PRODUCT_PRICE_UPDATED), which is
// written server-side by the product/inventory PUT endpoints whenever basePrice or
// sellingPrice actually changes — see src/app/api/universal/products/[id]/route.ts
// and src/app/api/inventory/[businessId]/items/[itemId]/route.ts.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const canView = isSystemAdmin(user) ||
      hasPermission(user, 'canManageMenu', businessId) ||
      hasPermission(user, 'canManageInventory', businessId) ||
      hasPermission(user, 'canAccessFinancialData', businessId)
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0)
    const search = searchParams.get('search')?.trim()
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      action: 'PRODUCT_PRICE_UPDATED',
      entityType: 'Product',
      metadata: { path: ['businessId'], equals: businessId },
    }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.timestamp.lte = end
      }
    }

    if (search) {
      where.OR = [
        { metadata: { path: ['productName'], string_contains: search } },
        { users: { name: { contains: search, mode: 'insensitive' } } },
        { users: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // MBM-350: the audit log above misses some price changes (barcode print-job
    // price edits, warehouse container imports, bulk pack corrections/conversions).
    // Every price-changing route also writes product_price_history (MBM-296), so
    // read that too and add any change the audit log doesn't already have.
    const CAP = 5000
    const historyWhere: any = { businessId, priceType: 'SELLING' }
    if (where.timestamp) historyWhere.createdAt = where.timestamp

    const [logs, history] = await Promise.all([
      prisma.auditLogs.findMany({
        where,
        include: {
          users: { select: { id: true, name: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: CAP,
      }),
      prisma.productPriceHistory.findMany({
        where: historyWhere,
        include: { changedByUser: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: CAP,
      }),
    ])

    const auditRows = logs.map(log => {
      const oldValues = log.oldValues as any
      const newValues = log.newValues as any
      const metadata = log.metadata as any
      return {
        id: log.id,
        date: log.timestamp,
        productName: metadata?.productName ?? null,
        oldPrice: oldValues?.price ?? null,
        newPrice: newValues?.price ?? null,
        changedByName: log.users?.name ?? null,
        changedByEmail: log.users?.email ?? null,
        sourceTable: metadata?.sourceTable ?? null,
        viaPOSQuickEdit: metadata?.viaPOSQuickEdit === true,
        viaBulkStockReceiving: metadata?.viaBulkStockReceiving === true,
        reason: metadata?.reason ?? null,
        via: null as string | null,
        // for matching with product_price_history (not returned)
        _refs: [log.entityId, metadata?.variantId, metadata?.productId, metadata?.itemId].filter(Boolean) as string[],
        _userId: log.userId,
      }
    })

    // A history row is "already in the audit log" when the same person set the
    // same product to the same new price within a minute of it.
    const isInAuditLog = (h: typeof history[number]) => {
      const t = h.createdAt.getTime()
      const price = Number(h.newPrice)
      return auditRows.some(a =>
        a._userId === h.changedBy &&
        Math.abs(new Date(a.date).getTime() - t) <= 60_000 &&
        Math.abs(Number(a.newPrice) - price) < 0.005 &&
        a._refs.includes(h.productRefId)
      )
    }
    const missing = history.filter(h => !isInAuditLog(h))

    // Names for the added rows
    const idsOf = (src: string) => [...new Set(missing.filter(h => h.catalogSource === src).map(h => h.productRefId))]
    const [products, variants, barcodeItems] = await Promise.all([
      prisma.businessProducts.findMany({ where: { id: { in: idsOf('BUSINESS_PRODUCT') } }, select: { id: true, name: true } }),
      prisma.productVariants.findMany({ where: { id: { in: idsOf('PRODUCT_VARIANT') } }, select: { id: true, name: true, business_products: { select: { name: true } } } }),
      prisma.barcodeInventoryItems.findMany({ where: { id: { in: idsOf('BARCODE_ITEM') } }, select: { id: true, name: true } }),
    ])
    const names = new Map<string, string>()
    products.forEach(p => names.set(p.id, p.name))
    variants.forEach(v => {
      const parent = v.business_products?.name
      names.set(v.id, parent && v.name && v.name !== 'Default' && v.name !== parent ? `${parent} (${v.name})` : (parent || v.name || ''))
    })
    barcodeItems.forEach(b => names.set(b.id, b.name))

    const historyRows = missing.map(h => ({
      id: h.id,
      date: h.createdAt,
      productName: names.get(h.productRefId) || null,
      oldPrice: h.oldPrice != null ? Number(h.oldPrice) : null,
      newPrice: Number(h.newPrice),
      changedByName: h.changedByUser?.name ?? null,
      changedByEmail: h.changedByUser?.email ?? null,
      sourceTable: h.catalogSource === 'PRODUCT_VARIANT' ? 'BUSINESS_PRODUCT' : h.catalogSource,
      viaPOSQuickEdit: h.changeReason === 'QUICK_EDIT',
      viaBulkStockReceiving: h.changeReason === 'STOCK_RECEIVING',
      reason: h.reason ?? null,
      via: h.changeReason ?? null,
      _refs: [] as string[],
      _userId: h.changedBy,
    }))

    // The audit-log search ran in the database; apply the same search to the added rows
    const q = search?.toLowerCase()
    const matchesSearch = (r: typeof historyRows[number]) => !q ||
      (r.productName ?? '').toLowerCase().includes(q) ||
      (r.changedByName ?? '').toLowerCase().includes(q) ||
      (r.changedByEmail ?? '').toLowerCase().includes(q)

    const merged = [...auditRows, ...historyRows.filter(matchesSearch)]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const total = merged.length
    const reports = merged.slice(offset, offset + limit).map(({ _refs, _userId, ...r }) => r)

    return NextResponse.json({
      reports,
      pagination: {
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    })
  } catch (error) {
    console.error('Error fetching price change report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price change report' },
      { status: 500 }
    )
  }
}
