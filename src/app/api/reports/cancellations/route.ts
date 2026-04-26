import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/reports/cancellations?businessId=&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns:
 *   summary       — aggregate cards
 *   cancellations — approved OrderCancellation rows
 *   overrideLogs  — all override log entries (APPROVED, DENIED, ABORTED, FAILED_CODE)
 */
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!businessId) {
    return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  }

  const dateWhere =
    startDate && endDate
      ? {
          gte: new Date(startDate + 'T00:00:00.000Z'),
          lte: new Date(endDate + 'T23:59:59.999Z'),
        }
      : undefined

  // Approved cancellations
  const cancellations = await prisma.orderCancellation.findMany({
    where: {
      businessId,
      ...(dateWhere ? { createdAt: dateWhere } : {}),
    },
    include: {
      requestedByUser: { select: { id: true, name: true } },
      approvedByUser: { select: { id: true, name: true } },
      override_log: { select: { metadata: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // All override log entries for this business (ORDER_CANCELLATION action only)
  const overrideLogs = await prisma.managerOverrideLog.findMany({
    where: {
      businessId,
      action: 'ORDER_CANCELLATION',
      ...(dateWhere ? { createdAt: dateWhere } : {}),
    },
    include: {
      manager: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Total completed+paid orders in period (for cancellation rate)
  const totalOrdersInPeriod = await prisma.businessOrders.count({
    where: {
      businessId,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      ...(dateWhere ? { createdAt: dateWhere } : {}),
    },
  })

  // Summary aggregates
  const totalCancellations = cancellations.length
  const totalNetRefund = cancellations.reduce((sum, c) => sum + Number(c.refundAmount), 0)
  const totalFeesDeducted = cancellations.reduce((sum, c) => sum + Number(c.feeDeducted), 0)

  const deniedCount = overrideLogs.filter((l) => l.outcome === 'DENIED').length
  const approvedCount = overrideLogs.filter((l) => l.outcome === 'APPROVED').length
  const decisionTotal = approvedCount + deniedCount

  const cancellationRate =
    totalOrdersInPeriod > 0
      ? ((totalCancellations / (totalOrdersInPeriod + totalCancellations)) * 100)
      : 0

  const denialRate = decisionTotal > 0 ? (deniedCount / decisionTotal) * 100 : 0

  const summary = {
    totalCancellations,
    totalNetRefund,
    totalFeesDeducted,
    cancellationRate,
    denialRate,
    totalOrdersInPeriod,
  }

  const cancellationRows = cancellations.map((c) => ({
    id: c.id,
    orderId: c.orderId,
    createdAt: c.createdAt.toISOString(),
    paymentMethod: c.paymentMethod,
    grossAmount: Number(c.refundAmount) + Number(c.feeDeducted),
    feeDeducted: Number(c.feeDeducted),
    refundAmount: Number(c.refundAmount),
    staffReason: c.staffReason,
    customerName: c.customerName,
    customerPhone: c.customerPhone,
    customerNumber: c.customerNumber,
    requestedBy: c.requestedByUser,
    approvedBy: c.approvedByUser,
    items: (c.override_log?.metadata as any)?.items ?? [],
    orderNumber: (c.override_log?.metadata as any)?.orderNumber ?? c.orderId,
  }))

  const logRows = overrideLogs.map((l) => {
    const meta = (l.metadata as any) ?? {}
    return {
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      outcome: l.outcome,
      orderNumber: meta.orderNumber ?? l.targetId,
      orderId: l.targetId,
      grossAmount: meta.grossAmount ?? null,
      feeDeducted: meta.feeDeducted ?? null,
      paymentMethod: meta.paymentMethod ?? null,
      customerName: meta.customer?.name ?? meta.walkInCustomer?.name ?? null,
      customerNumber: meta.customer?.loyaltyNumber ?? null,
      staffReason: l.staffReason,
      denialReason: l.denialReason,
      manager: l.manager,
      requestedBy: l.requester,
      items: meta.items ?? [],
    }
  })

  return NextResponse.json({ summary, cancellations: cancellationRows, overrideLogs: logRows })
}
