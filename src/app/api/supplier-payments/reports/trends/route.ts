import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function buildDateBounds(searchParams: URLSearchParams): { start: Date; end: Date } {
  const preset = searchParams.get('dateRange')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const now = new Date()

  if (preset === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0)
    const e = new Date(now); e.setHours(23, 59, 59, 999)
    return { start: s, end: e }
  }
  if (preset === 'yesterday') {
    const s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0)
    const e = new Date(now); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59, 999)
    return { start: s, end: e }
  }
  if (preset === 'this_week') {
    const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0)
    return { start: s, end: now }
  }
  if (preset === 'this_month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
  }
  if (preset === 'last_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 1),
    }
  }
  if (startDate || endDate) {
    const s = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1)
    const e = endDate ? (() => { const d = new Date(endDate); d.setDate(d.getDate() + 1); return d })() : now
    return { start: s, end: e }
  }
  // Default: this month
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
}

function autoGroupBy(start: Date, end: Date): 'day' | 'week' | 'month' {
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays <= 14) return 'day'
  if (diffDays <= 90) return 'week'
  return 'month'
}

function bucketKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
  if (groupBy === 'day') {
    return date.toISOString().slice(0, 10)
  }
  if (groupBy === 'week') {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay()) // Sunday of that week
    return d.toISOString().slice(0, 10)
  }
  // month
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

// GET /api/supplier-payments/reports/trends
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const allBusinesses = searchParams.get('all') === 'true'
    const groupByParam = searchParams.get('groupBy') as 'day' | 'week' | 'month' | null

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

    const { start, end } = buildDateBounds(searchParams)
    const groupBy = groupByParam || autoGroupBy(start, end)

    const where: any = { submittedAt: { gte: start, lt: end } }
    if (!allBusinesses) where.businessId = businessId

    const requests = await prisma.supplierPaymentRequests.findMany({
      where,
      select: {
        submittedAt: true,
        amount: true,
        paidAmount: true,
        status: true,
      },
      orderBy: { submittedAt: 'asc' },
    })

    // Bucket requests by time period
    const buckets = new Map<string, { date: string; requestCount: number; requestedAmount: number; paidAmount: number }>()

    for (const r of requests) {
      const key = bucketKey(r.submittedAt, groupBy)
      const existing = buckets.get(key)
      const amount = parseFloat(r.amount.toString())
      const paid = parseFloat(r.paidAmount.toString())
      if (existing) {
        existing.requestCount += 1
        existing.requestedAmount += amount
        existing.paidAmount += paid
      } else {
        buckets.set(key, { date: key, requestCount: 1, requestedAmount: amount, paidAmount: paid })
      }
    }

    const data = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: {
        groupBy,
        buckets: data,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
      },
    })
  } catch (error) {
    console.error('Error fetching trends report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
