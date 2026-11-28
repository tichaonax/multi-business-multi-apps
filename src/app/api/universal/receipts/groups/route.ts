// MBM-359: Receipt History "Group by": the receipts of the search + date range
// folded into one row per day / week / month / year (business time zone),
// salesperson or payment method, with count, total and average. Cancelled
// receipts are counted but not in the totals. Opening a group lists its
// receipts through /receipts/search?groupBy=&groupKey= (the same grouping).
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { buildReceiptWhere, groupOf, isReceiptGroupBy, safeTimeZone, RECEIPT_GROUP_SELECT } from '@/lib/receipts/receipt-groups'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const groupBy = searchParams.get('groupBy')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!isReceiptGroupBy(groupBy)) return NextResponse.json({ error: 'Invalid groupBy' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const where = await buildReceiptWhere(businessId, searchParams.get('query') || '', searchParams.get('startDate'), searchParams.get('endDate'))
    const tz = safeTimeZone(searchParams.get('timezone'))
    const orders = await prisma.businessOrders.findMany({ where, select: RECEIPT_GROUP_SELECT })

    // top: the group's highest receipt (not cancelled), shown on its row
    const groups = new Map<string, { key: string; label: string; count: number; cancelled: number; total: number; top: { id: string; orderNumber: string; amount: number } | null }>()
    for (const o of orders) {
      const { key, label } = groupOf(o as any, groupBy, tz)
      const g = groups.get(key) || { key, label, count: 0, cancelled: 0, total: 0, top: null }
      g.count++
      if (o.status === 'CANCELLED') g.cancelled++
      else {
        const amount = Number(o.totalAmount || 0)
        g.total += amount
        if (!g.top || amount > g.top.amount) g.top = { id: o.id, orderNumber: o.orderNumber, amount }
      }
      groups.set(key, g)
    }

    const byDate = ['day', 'week', 'month', 'year'].includes(groupBy)
    const list = [...groups.values()]
      .map(g => {
        const counted = g.count - g.cancelled
        const total = Math.round(g.total * 100) / 100
        return { ...g, total, average: counted ? Math.round((total / counted) * 100) / 100 : 0 }
      })
      // dates: newest first; salespeople / payment methods: biggest total first
      .sort((a, b) => byDate ? b.key.localeCompare(a.key) : b.total - a.total || a.label.localeCompare(b.label))

    const counted = orders.filter(o => o.status !== 'CANCELLED')
    const total = Math.round(counted.reduce((s, o) => s + Number(o.totalAmount || 0), 0) * 100) / 100
    return NextResponse.json({
      groups: list,
      summary: {
        count: orders.length,
        cancelled: orders.length - counted.length,
        total,
        average: counted.length ? Math.round((total / counted.length) * 100) / 100 : 0,
      },
    })
  } catch (error) {
    console.error('Receipt groups error:', error)
    return NextResponse.json({ error: 'Failed to group receipts' }, { status: 500 })
  }
}
