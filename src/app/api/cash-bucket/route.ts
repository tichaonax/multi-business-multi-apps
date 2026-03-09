import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/cash-bucket
 * Returns per-business balances and recent entries.
 *
 * POST /api/cash-bucket
 * Records an EOD cash receipt (INFLOW) for a business.
 * Body: { businessId, amount, notes?, entryDate? }
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    const canAccess = permissions.canSubmitPaymentBatch || (permissions as any).canViewCashBucketReport || user.role === 'admin'
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || undefined
    const direction  = searchParams.get('direction')  || undefined
    const entryType  = searchParams.get('entryType')  || undefined
    const startDate  = searchParams.get('startDate')  || undefined
    const endDate    = searchParams.get('endDate')    || undefined
    const limit      = parseInt(searchParams.get('limit')  || '100')
    const offset     = parseInt(searchParams.get('offset') || '0')

    // Date range filter
    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setDate(end.getDate() + 1)
      dateFilter.lt = end
    }

    const entryWhere: any = {
      ...(businessId && { businessId }),
      ...(direction  && { direction }),
      ...(entryType  && { entryType }),
      ...(Object.keys(dateFilter).length > 0 && { entryDate: dateFilter }),
    }

    // Per-business balance aggregation (always across all dates/filters for accuracy)
    const balanceWhere: any = { ...(businessId && { businessId }) }
    const rows = await prisma.cashBucketEntry.groupBy({
      by: ['businessId', 'direction'],
      where: balanceWhere,
      _sum: { amount: true },
    })

    const map = new Map<string, { inflow: number; outflow: number }>()
    for (const row of rows) {
      const cur = map.get(row.businessId) ?? { inflow: 0, outflow: 0 }
      if (row.direction === 'INFLOW') cur.inflow += Number(row._sum.amount ?? 0)
      else cur.outflow += Number(row._sum.amount ?? 0)
      map.set(row.businessId, cur)
    }

    const businessIds = [...map.keys()]
    const businesses = await prisma.businesses.findMany({
      where: { id: { in: businessIds } },
      select: { id: true, name: true, type: true },
    })
    const bizMap = new Map(businesses.map((b) => [b.id, b]))

    const balances = businessIds.map((id) => {
      const { inflow, outflow } = map.get(id)!
      return {
        businessId: id,
        business: bizMap.get(id) ?? null,
        inflow,
        outflow,
        balance: inflow - outflow,
      }
    }).sort((a, b) => (a.business?.name ?? '').localeCompare(b.business?.name ?? ''))

    const totalBalance = balances.reduce((s, b) => s + b.balance, 0)

    // Filtered + paginated entries
    const [entries, total] = await Promise.all([
      prisma.cashBucketEntry.findMany({
        where: entryWhere,
        include: {
          business: { select: { id: true, name: true, type: true } },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { entryDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.cashBucketEntry.count({ where: entryWhere }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalBalance,
        balances,
        entries: entries.map((e) => ({
          id: e.id,
          businessId: e.businessId,
          business: e.business,
          entryType: e.entryType,
          direction: e.direction,
          amount: Number(e.amount),
          referenceType: e.referenceType,
          referenceId: e.referenceId,
          notes: e.notes,
          entryDate: e.entryDate.toISOString(),
          createdAt: e.createdAt.toISOString(),
          createdBy: e.creator,
        })),
        pagination: { total, limit, offset },
      },
    })
  } catch (error) {
    console.error('Error fetching cash bucket:', error)
    return NextResponse.json({ error: 'Failed to fetch cash bucket' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canSubmitPaymentBatch && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { businessId, amount, notes, entryDate } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const entry = await prisma.cashBucketEntry.create({
      data: {
        businessId,
        entryType: 'EOD_RECEIPT',
        direction: 'INFLOW',
        amount: Number(amount),
        notes: notes?.trim() || null,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        createdBy: user.id,
      },
      include: {
        business: { select: { id: true, name: true, type: true } },
        creator: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Recorded $${Number(amount).toFixed(2)} EOD cash for ${business.name}`,
      data: {
        id: entry.id,
        businessId: entry.businessId,
        business: entry.business,
        entryType: entry.entryType,
        direction: entry.direction,
        amount: Number(entry.amount),
        notes: entry.notes,
        entryDate: entry.entryDate.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        createdBy: entry.creator,
      },
    })
  } catch (error) {
    console.error('Error recording cash receipt:', error)
    return NextResponse.json({ error: 'Failed to record cash receipt' }, { status: 500 })
  }
}
