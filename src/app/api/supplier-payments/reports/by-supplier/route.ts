import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function buildDateFilter(searchParams: URLSearchParams): { gte?: Date; lt?: Date } | undefined {
  const preset = searchParams.get('dateRange')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const now = new Date()

  if (preset === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0)
    const e = new Date(now); e.setHours(23, 59, 59, 999)
    return { gte: s, lt: e }
  }
  if (preset === 'yesterday') {
    const s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0)
    const e = new Date(now); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59, 999)
    return { gte: s, lt: e }
  }
  if (preset === 'this_week') {
    const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0)
    return { gte: s }
  }
  if (preset === 'this_month') {
    return { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
  }
  if (preset === 'last_month') {
    return {
      gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      lt: new Date(now.getFullYear(), now.getMonth(), 1),
    }
  }
  if (startDate || endDate) {
    const filter: { gte?: Date; lt?: Date } = {}
    if (startDate) filter.gte = new Date(startDate)
    if (endDate) {
      const e = new Date(endDate); e.setDate(e.getDate() + 1); filter.lt = e
    }
    return filter
  }
  return undefined
}

// GET /api/supplier-payments/reports/by-supplier
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const allBusinesses = searchParams.get('all') === 'true'
    const statusFilter = searchParams.get('status')

    if (!businessId && !allBusinesses) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const permissions = getEffectivePermissions(user, businessId || undefined)
    if (!permissions.canViewSupplierPaymentReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    if (allBusinesses && !permissions.canViewCrossBusinessReports) {
      return NextResponse.json({ error: 'Cross-business reporting requires elevated permissions' }, { status: 403 })
    }

    const dateFilter = buildDateFilter(searchParams)
    const where: any = {}
    if (!allBusinesses) where.businessId = businessId
    if (dateFilter) where.submittedAt = dateFilter
    if (statusFilter) where.status = statusFilter

    const requests = await prisma.supplierPaymentRequests.findMany({
      where,
      select: {
        supplierId: true,
        amount: true,
        paidAmount: true,
        status: true,
        supplier: { select: { id: true, name: true, emoji: true } },
      },
    })

    // Aggregate by supplier
    const supplierMap = new Map<string, {
      supplierId: string
      supplierName: string
      supplierEmoji: string | null
      totalRequested: number
      totalPaid: number
      totalOutstanding: number
      requestCount: number
      percentage?: number
    }>()

    for (const r of requests) {
      const amount = parseFloat(r.amount.toString())
      const paid = parseFloat(r.paidAmount.toString())
      const existing = supplierMap.get(r.supplierId)
      if (existing) {
        existing.totalRequested += amount
        existing.totalPaid += paid
        existing.totalOutstanding += amount - paid
        existing.requestCount += 1
      } else {
        supplierMap.set(r.supplierId, {
          supplierId: r.supplierId,
          supplierName: r.supplier.name,
          supplierEmoji: r.supplier.emoji,
          totalRequested: amount,
          totalPaid: paid,
          totalOutstanding: amount - paid,
          requestCount: 1,
        })
      }
    }

    const items = Array.from(supplierMap.values())
      .sort((a, b) => b.totalRequested - a.totalRequested)

    // Compute percentage for donut chart
    const grandTotal = items.reduce((s, i) => s + i.totalRequested, 0)
    const OTHERS_THRESHOLD = 0.03 // 3%

    const mainItems: typeof items = []
    let othersTotal = 0
    let othersPaid = 0
    let othersCount = 0

    for (const item of items) {
      const pct = grandTotal > 0 ? item.totalRequested / grandTotal : 0
      if (pct < OTHERS_THRESHOLD && items.length > 5) {
        othersTotal += item.totalRequested
        othersPaid += item.totalPaid
        othersCount += item.requestCount
      } else {
        mainItems.push({ ...item, percentage: Math.round(pct * 1000) / 10 })
      }
    }

    if (othersTotal > 0) {
      mainItems.push({
        supplierId: '__others__',
        supplierName: 'Others',
        supplierEmoji: null,
        totalRequested: othersTotal,
        totalPaid: othersPaid,
        totalOutstanding: othersTotal - othersPaid,
        requestCount: othersCount,
        percentage: Math.round((othersTotal / grandTotal) * 1000) / 10,
      } as typeof mainItems[0])
    }

    return NextResponse.json({
      success: true,
      data: {
        suppliers: mainItems,
        grandTotal,
      },
    })
  } catch (error) {
    console.error('Error fetching by-supplier report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
