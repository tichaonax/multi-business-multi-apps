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

    // Expected EcoCash: sum of ECOCASH order net amounts for a business on a given date
    const expectedEcocash = searchParams.get('expectedEcocash') === 'true'
    if (expectedEcocash && businessId) {
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
      const dayStart = new Date(date)
      const dayEnd = new Date(date)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const orders = await (prisma as any).orders.findMany({
        where: {
          businessId,
          paymentMethod: 'ECOCASH',
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          orderDate: { gte: dayStart, lt: dayEnd },
        },
        select: { totalAmount: true, attributes: true },
      })
      const expectedTotal = orders.reduce((sum: number, o: any) => {
        const fee = Number((o.attributes as any)?.ecocashFeeAmount || 0)
        return sum + (Number(o.totalAmount) - fee)
      }, 0)
      return NextResponse.json({ success: true, data: { expectedEcocash: expectedTotal } })
    }

    // Per-date aggregation: return ecocashInflow for a specific date
    const dateParam = searchParams.get('date')
    if (dateParam && businessId && !searchParams.get('startDate') && !searchParams.get('endDate')) {
      const dayStart = new Date(dateParam)
      const dayEnd = new Date(dateParam)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const dayRows = await prisma.cashBucketEntry.groupBy({
        by: ['direction', 'paymentChannel'] as any,
        where: { businessId, entryDate: { gte: dayStart, lt: dayEnd } },
        _sum: { amount: true },
      })
      let cashInflow = 0, ecocashInflow = 0
      for (const r of dayRows as any[]) {
        if (r.direction !== 'INFLOW') continue
        const amt = Number(r._sum.amount ?? 0)
        if (r.paymentChannel === 'ECOCASH') ecocashInflow += amt
        else cashInflow += amt
      }
      return NextResponse.json({ success: true, cashInflow, ecocashInflow })
    }

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
      by: ['businessId', 'direction', 'paymentChannel'] as any,
      where: balanceWhere,
      _sum: { amount: true },
    })

    type ChannelTotals = { cashInflow: number; cashOutflow: number; ecocashInflow: number; ecocashOutflow: number }
    const map = new Map<string, ChannelTotals>()
    for (const row of rows as any[]) {
      const cur = map.get(row.businessId) ?? { cashInflow: 0, cashOutflow: 0, ecocashInflow: 0, ecocashOutflow: 0 }
      const amt = Number(row._sum.amount ?? 0)
      if (row.paymentChannel === 'ECOCASH') {
        if (row.direction === 'INFLOW') cur.ecocashInflow += amt
        else cur.ecocashOutflow += amt
      } else {
        if (row.direction === 'INFLOW') cur.cashInflow += amt
        else cur.cashOutflow += amt
      }
      map.set(row.businessId, cur)
    }

    const businessIds = [...map.keys()]
    const businesses = await prisma.businesses.findMany({
      where: { id: { in: businessIds } },
      select: { id: true, name: true, type: true },
    })
    const bizMap = new Map(businesses.map((b) => [b.id, b]))

    // CASH_ALLOCATION outflow breakdown (current month) — earmarked funds still physically in the box
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const allocationRows = await prisma.cashBucketEntry.groupBy({
      by: ['businessId', 'notes'] as any,
      where: {
        entryType: 'CASH_ALLOCATION',
        direction: 'OUTFLOW',
        deletedAt: null,
        entryDate: { gte: startOfMonth },
        ...(businessId && { businessId }),
      },
      _sum: { amount: true },
    })

    const allocMap = new Map<string, { accountName: string; amount: number }[]>()
    for (const row of allocationRows as any[]) {
      const items = allocMap.get(row.businessId) ?? []
      items.push({ accountName: row.notes ?? 'Unspecified', amount: Number(row._sum.amount ?? 0) })
      allocMap.set(row.businessId, items)
    }

    // PAYROLL_FUNDING outflow breakdown (current month) — payroll reserved in the box
    const payrollRows = await prisma.cashBucketEntry.groupBy({
      by: ['businessId'] as any,
      where: {
        entryType: 'PAYROLL_FUNDING',
        direction: 'OUTFLOW',
        deletedAt: null,
        entryDate: { gte: startOfMonth },
        ...(businessId && { businessId }),
      },
      _sum: { amount: true },
    })
    for (const row of payrollRows as any[]) {
      const items = allocMap.get(row.businessId) ?? []
      items.push({ accountName: 'Payroll Funding', amount: Number(row._sum.amount ?? 0) })
      allocMap.set(row.businessId, items)
    }

    // PAYMENT_APPROVAL outflows this month — cash that already physically left the box.
    // These reduce the earmarked display: earmarks that have been disbursed should clear.
    const approvalRows = await prisma.cashBucketEntry.groupBy({
      by: ['businessId'] as any,
      where: {
        entryType: 'PAYMENT_APPROVAL',
        direction: 'OUTFLOW',
        paymentChannel: 'CASH',
        deletedAt: null,
        entryDate: { gte: startOfMonth },
        ...(businessId && { businessId }),
      },
      _sum: { amount: true },
    })
    const approvalMap = new Map<string, number>()
    for (const row of approvalRows as any[]) {
      approvalMap.set(row.businessId, Number(row._sum.amount ?? 0))
    }

    const balances = businessIds.map((id) => {
      const { cashInflow, cashOutflow, ecocashInflow, ecocashOutflow } = map.get(id)!
      const cashBalance = cashInflow - cashOutflow
      const ecocashBalance = ecocashInflow - ecocashOutflow

      // Net earmarks against disbursements: reduce line items proportionally until paid amounts consumed
      const rawAllocations = (allocMap.get(id) ?? []).sort((a, b) => b.amount - a.amount)
      let remaining = approvalMap.get(id) ?? 0
      const allocations = rawAllocations
        .map((a) => {
          if (remaining <= 0) return a
          const reduction = Math.min(a.amount, remaining)
          remaining -= reduction
          return { ...a, amount: a.amount - reduction }
        })
        .filter((a) => a.amount > 0.009)

      const allocatedTotal = allocations.reduce((s, a) => s + a.amount, 0)
      return {
        businessId: id,
        business: bizMap.get(id) ?? null,
        cashInflow, cashOutflow, cashBalance,
        ecocashInflow, ecocashOutflow, ecocashBalance,
        inflow: cashInflow + ecocashInflow,
        outflow: cashOutflow + ecocashOutflow,
        balance: cashBalance + ecocashBalance,
        // earmarked: cash physically still in box but already allocated
        allocations,
        allocatedTotal,
        physicalCash: cashBalance + allocatedTotal,
      }
    }).sort((a, b) => (a.business?.name ?? '').localeCompare(b.business?.name ?? ''))

    const totalBalance = balances.reduce((s, b) => s + b.balance, 0)
    const totalAllocated = balances.reduce((s, b) => s + b.allocatedTotal, 0)
    const totalPhysicalCash = balances.reduce((s, b) => s + b.physicalCash, 0)

    // Filtered + paginated entries — ordered so same-date same-business entries cluster together
    const [entries, total] = await Promise.all([
      prisma.cashBucketEntry.findMany({
        where: entryWhere,
        include: {
          business: { select: { id: true, name: true, type: true } },
          creator: { select: { id: true, name: true } },
          editor: { select: { id: true, name: true } },
          deleter: { select: { id: true, name: true } },
        },
        orderBy: [{ entryDate: 'desc' }, { businessId: 'asc' }, { entryType: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.cashBucketEntry.count({ where: entryWhere }),
    ])

    // Batch-fetch petty cash statuses for PETTY_CASH / PETTY_CASH_RETURN entries
    const pettyCashIds = entries
      .filter((e) => (e.entryType === 'PETTY_CASH' || e.entryType === 'PETTY_CASH_RETURN') && e.referenceId)
      .map((e) => e.referenceId as string)
    const pettyCashStatuses = pettyCashIds.length > 0
      ? await prisma.pettyCashRequests.findMany({
          where: { id: { in: pettyCashIds } },
          select: { id: true, status: true, requestedAt: true },
        })
      : []
    const pettyCashStatusMap = new Map(pettyCashStatuses.map((r) => [r.id, r.status]))
    const pettyCashRequestedAtMap = new Map(pettyCashStatuses.map((r) => [r.id, r.requestedAt.toISOString()]))

    return NextResponse.json({
      success: true,
      data: {
        totalBalance,
        totalAllocated,
        totalPhysicalCash,
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
          paymentChannel: e.paymentChannel,
          entryDate: e.entryDate.toISOString(),
          createdAt: e.createdAt.toISOString(),
          createdBy: e.creator,
          editedAt: e.editedAt?.toISOString() ?? null,
          editedBy: e.editor ?? null,
          deletedAt: e.deletedAt?.toISOString() ?? null,
          deletedBy: e.deleter ?? null,
          deletionReason: e.deletionReason ?? null,
          pettyCashStatus: e.referenceId ? (pettyCashStatusMap.get(e.referenceId) ?? null) : null,
          pettyCashRequestedAt: e.referenceId ? (pettyCashRequestedAtMap.get(e.referenceId) ?? null) : null,
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
    const { businessId, amount, notes, entryDate, ecocashAmount } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })
    if (!notes?.trim()) return NextResponse.json({ error: 'Notes are required' }, { status: 400 })

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const date = entryDate ? new Date(entryDate) : new Date()
    const cashAmount = Number(amount)
    const ecoAmount = Number(ecocashAmount || 0)

    const entry = await prisma.cashBucketEntry.create({
      data: {
        businessId,
        entryType: 'EOD_RECEIPT',
        direction: 'INFLOW',
        amount: cashAmount,
        paymentChannel: 'CASH',
        notes: notes?.trim() || null,
        entryDate: date,
        createdBy: user.id,
      },
      include: {
        business: { select: { id: true, name: true, type: true } },
        creator: { select: { id: true, name: true } },
      },
    })

    if (ecoAmount > 0) {
      await prisma.cashBucketEntry.create({
        data: {
          businessId,
          entryType: 'EOD_RECEIPT',
          direction: 'INFLOW',
          amount: ecoAmount,
          paymentChannel: 'ECOCASH',
          notes: notes?.trim() || null,
          entryDate: date,
          createdBy: user.id,
        },
      })
    }

    const totalRecorded = cashAmount + ecoAmount
    return NextResponse.json({
      success: true,
      message: `Recorded $${totalRecorded.toFixed(2)} EOD receipt for ${business.name}`,
      data: {
        id: entry.id,
        businessId: entry.businessId,
        business: entry.business,
        entryType: entry.entryType,
        direction: entry.direction,
        amount: cashAmount,
        ecocashAmount: ecoAmount,
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
