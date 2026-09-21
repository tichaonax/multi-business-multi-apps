import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { getUnifiedProducts } from '@/lib/inventory/product-catalog-view'

/**
 * GET /api/universal/reports/stock-status?businessId=&status=out|low
 *
 * Backs the "Out of Stock" and "Low Stock" reports linked from
 * InventoryDashboardWidget. Uses the same dual-catalog view
 * (getUnifiedProducts) as the other inventory reports, and the same
 * out/low thresholds InventoryDashboardWidget itself uses, so the counts
 * shown there always agree with what this report lists.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 })

    const status = searchParams.get('status') === 'low' ? 'low' : 'out'

    const canView = isSystemAdmin(user) || hasPermission(user, 'canManageInventory', businessId)
    if (!canView) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
    const search = searchParams.get('search')?.trim() || undefined

    const [products, business] = await Promise.all([
      getUnifiedProducts({ businessId, search }),
      prisma.businesses.findUnique({ where: { id: businessId }, select: { type: true } }),
    ])

    const LOW_STOCK_THRESHOLD = 5
    const eligible = products.filter(p => {
      if (!p.isInventoryTracked) return false
      return status === 'out'
        ? p.quantityOnHand === 0
        : p.quantityOnHand > 0 && p.quantityOnHand <= LOW_STOCK_THRESHOLD
    })

    // Most-urgent first: lowest stock, then most recently added.
    eligible.sort((a, b) => a.quantityOnHand - b.quantityOnHand || b.createdAt.getTime() - a.createdAt.getTime())

    const total = eligible.length
    const startIndex = (page - 1) * limit
    const pageItems = eligible.slice(startIndex, startIndex + limit)

    const data = pageItems.map(p => ({
      id: p.id,
      editItemId: p.editItemId,
      name: p.variantName ? `${p.name} — ${p.variantName}` : p.name,
      imageUrl: p.imageUrl,
      sku: p.sku,
      category: p.categoryName,
      supplier: p.supplierName,
      quantityOnHand: p.quantityOnHand,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
    }))

    return NextResponse.json({
      success: true,
      businessType: business?.type ?? null,
      status,
      summary: { total },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      data,
    })
  } catch (error) {
    console.error('Error building stock-status report:', error)
    return NextResponse.json({ success: false, error: 'Failed to load report' }, { status: 500 })
  }
}
