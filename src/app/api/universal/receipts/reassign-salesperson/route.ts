import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// POST /api/universal/receipts/reassign-salesperson
//
// Corrects which employee a completed sale is attributed to (BusinessOrders.employeeId).
// Accepts either an explicit orderIds[] (single or bulk selection) or a filter{} matching
// the same params as /api/universal/receipts/search (apply-to-filtered-results).
//
// Attribution fix only — does not touch payroll/commission, which is a flat contract
// amount unrelated to per-order employeeId in this system. See MBM-260.
//
// Body: { businessId, orderIds?: string[], filter?: { query?, startDate?, endDate? }, toEmployeeId, reason }
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, orderIds, filter, toEmployeeId, reason } = body as {
      businessId?: string
      orderIds?: string[]
      filter?: { query?: string; startDate?: string; endDate?: string }
      toEmployeeId?: string
      reason?: string
    }

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!toEmployeeId) return NextResponse.json({ error: 'toEmployeeId is required' }, { status: 400 })
    if (!reason || !reason.trim()) return NextResponse.json({ error: 'reason is required' }, { status: 400 })
    if ((!orderIds || orderIds.length === 0) && !filter) {
      return NextResponse.json({ error: 'orderIds or filter is required' }, { status: 400 })
    }

    const perms = getEffectivePermissions(user, businessId)
    if (user.role !== 'admin' && !perms.canCloseBooks && !perms.canAccessFinancialData) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Target employee must be a valid, active employee of this business
    const toEmployee = await prisma.employees.findFirst({
      where: {
        id: toEmployeeId,
        isActive: true,
        OR: [
          { primaryBusinessId: businessId },
          { employee_business_assignments: { some: { businessId, isActive: true } } },
        ],
      },
      select: { id: true, fullName: true },
    })
    if (!toEmployee) {
      return NextResponse.json({ error: 'Selected employee is not valid for this business' }, { status: 400 })
    }

    const MAX_ORDERS = 500
    const candidateWhere: any = { businessId }
    if (orderIds && orderIds.length > 0) {
      candidateWhere.id = { in: orderIds }
    } else if (filter) {
      if (filter.query) {
        candidateWhere.OR = [
          { orderNumber: { contains: filter.query, mode: 'insensitive' } },
          { customerId: { contains: filter.query, mode: 'insensitive' } },
          { totalAmount: { equals: parseFloat(filter.query) || undefined } },
        ]
      }
      if (filter.startDate || filter.endDate) {
        candidateWhere.createdAt = {}
        if (filter.startDate) candidateWhere.createdAt.gte = new Date(filter.startDate)
        if (filter.endDate) candidateWhere.createdAt.lte = new Date(filter.endDate)
      }
    }

    const orders = await prisma.businessOrders.findMany({
      where: candidateWhere,
      select: {
        id: true,
        employeeId: true,
        employees: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_ORDERS + 1,
    })

    if (orders.length > MAX_ORDERS) {
      return NextResponse.json(
        { error: `Too many matching sales (max ${MAX_ORDERS} per reassignment). Narrow your filter and try again.` },
        { status: 400 }
      )
    }

    const alreadyCorrect: string[] = []
    const skippedNoSalesperson: string[] = []
    const withEmployee = orders.filter(o => {
      if (!o.employeeId) { skippedNoSalesperson.push(o.id); return false }
      if (o.employeeId === toEmployeeId) { alreadyCorrect.push(o.id); return false }
      return true
    })

    // Block orders whose date already has a submitted/approved EOD salesperson report
    // for the CURRENT salesperson — reassigning those would silently invalidate closed
    // cash reconciliation. Date bucketing mirrors the salesperson-shortfall report's
    // Africa/Harare conversion so "which day this sale counts against" stays consistent.
    let blockedIds = new Set<string>()
    if (withEmployee.length > 0) {
      const ids = withEmployee.map(o => o.id)
      const rows: Array<{ order_id: string }> = await prisma.$queryRaw`
        SELECT bo.id AS order_id
        FROM business_orders bo
        JOIN employees e ON e.id = bo."employeeId"
        JOIN salesperson_eod_reports ser
          ON ser."businessId" = bo."businessId"
         AND ser."salespersonId" = e."userId"
         AND ser."reportDate" = (
               TO_CHAR(COALESCE(bo."transactionDate", bo."createdAt") AT TIME ZONE 'Africa/Harare', 'YYYY-MM-DD')
             )::date
         AND ser.status != 'PENDING'
        WHERE bo.id = ANY(${ids}::text[])
      `
      blockedIds = new Set(rows.map(r => r.order_id))
    }

    const blocked: Array<{ orderId: string; reason: string }> = []
    const eligibleOrderIds: string[] = []
    const fromBreakdown = new Map<string, { employeeId: string; name: string; orderIds: string[] }>()

    for (const o of withEmployee) {
      if (blockedIds.has(o.id)) {
        blocked.push({ orderId: o.id, reason: 'EOD already submitted/approved for the current salesperson on this date' })
        continue
      }
      eligibleOrderIds.push(o.id)
      const key = o.employeeId as string
      if (!fromBreakdown.has(key)) {
        fromBreakdown.set(key, { employeeId: key, name: o.employees?.fullName ?? 'Unknown', orderIds: [] })
      }
      fromBreakdown.get(key)!.orderIds.push(o.id)
    }

    if (eligibleOrderIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        const CHUNK = 100
        for (let i = 0; i < eligibleOrderIds.length; i += CHUNK) {
          const chunk = eligibleOrderIds.slice(i, i + CHUNK)
          await tx.businessOrders.updateMany({
            where: { id: { in: chunk } },
            data: { employeeId: toEmployeeId },
          })
        }

        await tx.managerOverrideLog.create({
          data: {
            managerId: user.id,
            action: 'SALE_REASSIGNMENT',
            outcome: 'APPROVED',
            targetId: eligibleOrderIds[0],
            businessId,
            requestedBy: user.id,
            staffReason: reason,
            metadata: {
              toEmployeeId,
              toEmployeeName: toEmployee.fullName,
              orderCount: eligibleOrderIds.length,
              orderIds: eligibleOrderIds,
              from: Array.from(fromBreakdown.values()),
            },
          },
        })
      })
    }

    return NextResponse.json({
      success: true,
      reassigned: eligibleOrderIds,
      blocked,
      alreadyCorrect,
      skippedNoSalesperson,
    })
  } catch (error) {
    console.error('Reassign salesperson error:', error)
    return NextResponse.json({ error: 'Failed to reassign salesperson' }, { status: 500 })
  }
}
