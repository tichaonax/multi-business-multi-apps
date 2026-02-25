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
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end = new Date(now); end.setHours(23, 59, 59, 999)
    return { gte: start, lt: end }
  }
  if (preset === 'yesterday') {
    const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0)
    const end = new Date(now); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999)
    return { gte: start, lt: end }
  }
  if (preset === 'this_week') {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0)
    return { gte: start }
  }
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { gte: start }
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    return { gte: start, lt: end }
  }
  if (startDate || endDate) {
    const filter: { gte?: Date; lt?: Date } = {}
    if (startDate) filter.gte = new Date(startDate)
    if (endDate) {
      const e = new Date(endDate); e.setDate(e.getDate() + 1)
      filter.lt = e
    }
    return filter
  }
  return undefined
}

// GET /api/supplier-payments/reports/summary
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const allBusinesses = searchParams.get('all') === 'true'

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

    const [requests, paidRequests] = await Promise.all([
      prisma.supplierPaymentRequests.findMany({
        where,
        select: {
          amount: true,
          paidAmount: true,
          status: true,
          dueDate: true,
          submittedAt: true,
          supplierId: true,
        },
      }),
      // For avg days to payment: only PAID requests with partialPayments
      prisma.supplierPaymentRequests.findMany({
        where: { ...where, status: 'PAID' },
        select: {
          submittedAt: true,
          partialPayments: { select: { paidAt: true }, orderBy: { paidAt: 'desc' }, take: 1 },
        },
      }),
    ])

    const today = new Date(); today.setHours(23, 59, 59, 999)

    let totalRequested = 0
    let totalPaid = 0
    let totalOutstanding = 0
    let overdueAmount = 0
    const supplierIds = new Set<string>()
    const statusCounts: Record<string, number> = {
      PENDING: 0, APPROVED: 0, DENIED: 0, PARTIAL: 0, PAID: 0,
    }

    for (const r of requests) {
      const amount = parseFloat(r.amount.toString())
      const paid = parseFloat(r.paidAmount.toString())
      const remaining = amount - paid

      totalRequested += amount
      totalPaid += paid

      if (r.status !== 'PAID' && r.status !== 'DENIED') {
        totalOutstanding += remaining
        if (r.dueDate < today) overdueAmount += remaining
        supplierIds.add(r.supplierId)
      }

      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
    }

    // Avg days to payment
    let avgDaysToPayment: number | null = null
    if (paidRequests.length > 0) {
      const daysArr = paidRequests
        .filter((r: typeof paidRequests[0]) => r.partialPayments.length > 0)
        .map((r: typeof paidRequests[0]) => {
          const lastPaid = r.partialPayments[0].paidAt
          return (lastPaid.getTime() - r.submittedAt.getTime()) / (1000 * 60 * 60 * 24)
        })
      if (daysArr.length > 0) {
        avgDaysToPayment = daysArr.reduce((a: number, b: number) => a + b, 0) / daysArr.length
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRequested,
        totalPaid,
        totalOutstanding,
        overdueAmount,
        avgDaysToPayment: avgDaysToPayment !== null ? Math.round(avgDaysToPayment * 10) / 10 : null,
        suppliersOwed: supplierIds.size,
        statusCounts,
        requestCount: requests.length,
      },
    })
  } catch (error) {
    console.error('Error fetching supplier payment summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
