import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canViewFinancials } from '@/lib/vehicle-service/permissions'

const PART_DOMAIN_IDS = ['vsdom_parts', 'vsdom_workshop']

// GET /api/vehicle-service/parts/reports/sales?businessId=&dateFrom=&dateTo=
// Sales/profit report — separates direct-sale parts (SALE movements, e.g.
// sold over the counter) from job-consumed parts (SERVICE_USE movements),
// with revenue sourced from the matching BusinessOrderItems (both flow
// through the same billing/POS pipeline eventually) and cost from each
// movement's own recorded unitCost — no separate "profit" column to keep
// in sync, computed at report time instead.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    if (!isSystemAdmin(user) && !canViewFinancials(user, businessId)) {
      return NextResponse.json({ error: 'You do not have permission to view financial reports' }, { status: 403 })
    }

    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const dateTo = searchParams.get('dateTo') ? new Date(new Date(searchParams.get('dateTo')!).getTime() + 24 * 60 * 60 * 1000) : new Date()

    const movements = await prisma.businessStockMovements.findMany({
      where: {
        businessId,
        businessType: 'vehicle_service',
        movementType: { in: ['SALE', 'SERVICE_USE'] },
        createdAt: { gte: dateFrom, lt: dateTo },
        business_products: { business_categories: { domainId: { in: PART_DOMAIN_IDS } } },
      },
      select: {
        movementType: true,
        quantity: true,
        unitCost: true,
        attributes: true,
        productVariantId: true,
        business_products: { select: { id: true, name: true, business_categories: { select: { name: true } } } },
      },
    })

    // Revenue comes from the order line items these movements were billed
    // through — matched by productVariantId within the same date range.
    const variantIds = [...new Set(movements.map(m => m.productVariantId).filter(Boolean))] as string[]
    const orderItems = variantIds.length > 0
      ? await prisma.businessOrderItems.findMany({
          where: {
            productVariantId: { in: variantIds },
            business_orders: { businessId, businessType: 'vehicle_service', createdAt: { gte: dateFrom, lt: dateTo } },
          },
          select: { productVariantId: true, quantity: true, totalPrice: true },
        })
      : []
    const revenueByVariant = new Map<string, number>()
    for (const oi of orderItems) {
      if (!oi.productVariantId) continue
      revenueByVariant.set(oi.productVariantId, (revenueByVariant.get(oi.productVariantId) || 0) + Number(oi.totalPrice))
    }

    // Vehicle make/model for job-consumed parts, via the job the movement
    // was attached to (attributes.vehicleServiceJobId) — a real vehicle,
    // more accurate than the part's general compatibility list.
    const jobIds = [...new Set(movements.map(m => (m.attributes as any)?.vehicleServiceJobId).filter(Boolean))] as string[]
    const jobs = jobIds.length > 0
      ? await prisma.vehicleServiceJobs.findMany({ where: { id: { in: jobIds } }, select: { id: true, vehicleMake: true, vehicleModel: true } })
      : []
    const jobById = new Map(jobs.map(j => [j.id, j]))

    let directQuantity = 0, serviceQuantity = 0, totalCost = 0
    const byCategory: Record<string, { quantity: number; cost: number; revenue: number }> = {}
    const byVehicle: Record<string, { quantity: number; revenue: number }> = {}
    const perPart = new Map<string, { name: string; quantitySold: number; quantityUsed: number; cost: number; revenue: number }>()

    for (const m of movements) {
      const qty = Math.abs(Number(m.quantity))
      const cost = Number(m.unitCost ?? 0) * qty
      const revenue = m.productVariantId ? (revenueByVariant.get(m.productVariantId) || 0) / Math.max(1, movements.filter(x => x.productVariantId === m.productVariantId).length) : 0
      totalCost += cost
      if (m.movementType === 'SALE') directQuantity += qty
      else serviceQuantity += qty

      const catName = m.business_products?.business_categories?.name || 'Uncategorized'
      if (!byCategory[catName]) byCategory[catName] = { quantity: 0, cost: 0, revenue: 0 }
      byCategory[catName].quantity += qty
      byCategory[catName].cost += cost
      byCategory[catName].revenue += revenue

      const jobId = (m.attributes as any)?.vehicleServiceJobId
      if (jobId && jobById.has(jobId)) {
        const job = jobById.get(jobId)!
        const vKey = [job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || 'Unspecified vehicle'
        if (!byVehicle[vKey]) byVehicle[vKey] = { quantity: 0, revenue: 0 }
        byVehicle[vKey].quantity += qty
        byVehicle[vKey].revenue += revenue
      }

      const partId = m.business_products?.id
      if (partId) {
        const existing = perPart.get(partId) || { name: m.business_products!.name, quantitySold: 0, quantityUsed: 0, cost: 0, revenue: 0 }
        if (m.movementType === 'SALE') existing.quantitySold += qty
        else existing.quantityUsed += qty
        existing.cost += cost
        existing.revenue += revenue
        perPart.set(partId, existing)
      }
    }

    const totalRevenue = [...revenueByVariant.values()].reduce((s, v) => s + v, 0)
    const partRows = [...perPart.values()].sort((a, b) => b.revenue - a.revenue)

    return NextResponse.json({
      success: true,
      summary: {
        directQuantity,
        serviceQuantity,
        totalRevenue,
        totalCost,
        grossProfit: totalRevenue - totalCost,
        marginPercent: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
      },
      byCategory,
      byVehicle,
      bestSellers: partRows.slice(0, 10),
      lowPerformers: partRows.slice(-10).reverse(),
      parts: partRows,
    })
  } catch (error) {
    console.error('Vehicle service parts sales report error:', error)
    return NextResponse.json({ error: 'Failed to build sales report' }, { status: 500 })
  }
}
