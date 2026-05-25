import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/inventory/reports/missing-cost-price
 * Returns all active inventory items with no cost price set.
 * Accessible to any authenticated user with canAccessExpenseAccount or canManageInventory.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && !permissions.canManageInventory) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const categoryId = searchParams.get('categoryId')

    const where: any = {
      isActive: true,
      stockQuantity: { gt: 0 },
      OR: [{ costPrice: null }, { costPrice: 0 }],
    }

    if (businessId) where.businessId = businessId
    if (categoryId) where.categoryId = categoryId

    const items = await prisma.barcodeInventoryItems.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true,
        costPrice: true,
        stockQuantity: true,
        businessId: true,
        business: { select: { id: true, name: true, type: true } },
        business_category: { select: { id: true, name: true, emoji: true } },
        updatedAt: true,
      },
      orderBy: [{ businessId: 'asc' }, { name: 'asc' }],
      take: 500,
    })

    const rows = items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      sellingPrice: item.sellingPrice != null ? Number(item.sellingPrice) : null,
      costPrice: item.costPrice != null ? Number(item.costPrice) : null,
      stockQuantity: item.stockQuantity,
      businessId: item.businessId,
      businessName: item.business?.name ?? '—',
      businessType: item.business?.type ?? '—',
      categoryName: (item as any).business_category?.name ?? null,
      categoryEmoji: (item as any).business_category?.emoji ?? null,
      updatedAt: item.updatedAt.toISOString(),
    }))

    // Group by business for the summary
    const byBusiness = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.businessName] = (acc[r.businessName] ?? 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        items: rows,
        total: rows.length,
        byBusiness,
      },
    })
  } catch (error) {
    console.error('Error fetching missing cost price report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
