import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { getPendingSubmissionsForBusiness, getDueDate, daysOverdue, isOverdue } from '@/lib/vehicle-service/payout-eligibility'

function canManagePayouts(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canAccessFinancialData || perms.canCloseBooks
}

const PENDING_PAYMENT_STATUSES = ['SUBMITTED', 'PENDING_APPROVAL', 'QUEUED']

// GET /api/vehicle-service/contractors/payments-report?businessId=&tab=pending-submissions|pending-payments|overdue&search=&from=&to=
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const tab = searchParams.get('tab') || 'pending-submissions'
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user) && !canManagePayouts(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const from = fromStr ? new Date(fromStr) : null
    const to = toStr ? new Date(toStr + 'T23:59:59.999') : null

    const matchesSearch = (...fields: (string | null | undefined)[]) =>
      !search || fields.some(f => f?.toLowerCase().includes(search))

    if (tab === 'pending-submissions' || tab === 'overdue') {
      const tasks = await getPendingSubmissionsForBusiness(businessId)
      const submissions = tasks
        .filter(t => !from || t.completedAt >= from)
        .filter(t => !to || t.completedAt <= to)
        .filter(t => matchesSearch(t.contractorName, t.vehicle, t.orderNumber, t.serviceName))
        .map(t => {
          const dueDate = getDueDate(t.completedAt)
          return {
            type: 'submission' as const,
            taskId: t.taskId,
            jobId: t.jobId,
            contractorId: t.contractorId,
            contractorName: t.contractorName,
            vehicle: t.vehicle,
            orderNumber: t.orderNumber,
            serviceName: t.serviceName,
            amount: t.amount,
            completedAt: t.completedAt,
            dueDate,
            daysOverdue: daysOverdue(dueDate),
            isOverdue: isOverdue(dueDate),
          }
        })

      if (tab === 'pending-submissions') {
        return NextResponse.json({ items: submissions })
      }
      // overdue tab continues below to also gather overdue payments
      const overdueSubmissions = submissions.filter(s => s.isOverdue)
      const overduePayments = await getPendingPayments(businessId, from, to, matchesSearch)
      return NextResponse.json({
        items: [...overdueSubmissions, ...overduePayments.filter(p => p.isOverdue)],
      })
    }

    if (tab === 'pending-payments') {
      const items = await getPendingPayments(businessId, from, to, matchesSearch)
      return NextResponse.json({ items })
    }

    return NextResponse.json({ error: `Unknown tab "${tab}"` }, { status: 400 })
  } catch (error) {
    console.error('Contractor payments report error:', error)
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 })
  }
}

async function getPendingPayments(
  businessId: string,
  from: Date | null,
  to: Date | null,
  matchesSearch: (...fields: (string | null | undefined)[]) => boolean
) {
  const payouts = await prisma.vehicleServiceContractorPayouts.findMany({
    where: {
      businessId,
      voidedAt: null,
      payment: { status: { in: PENDING_PAYMENT_STATUSES } },
      ...(from || to
        ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    include: {
      contractor: { select: { persons: { select: { fullName: true } } } },
      payment: { select: { status: true, eodBatchId: true } },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return payouts
    .map(p => {
      const dueDate = getDueDate(p.periodEnd, p.dueDateOverride)
      return {
        type: 'payment' as const,
        payoutId: p.id,
        contractorId: p.contractorId,
        contractorName: p.contractor.persons.fullName,
        voucherNumber: `CP-${p.createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${p.id.slice(0, 6).toUpperCase()}`,
        taskCount: p.items.length,
        amount: Number(p.totalAmount),
        createdAt: p.createdAt,
        dueDate,
        daysOverdue: daysOverdue(dueDate),
        isOverdue: isOverdue(dueDate),
        paymentStatus: p.payment.status,
        eodBatchId: p.payment.eodBatchId,
      }
    })
    .filter(p => matchesSearch(p.contractorName, p.voucherNumber))
}
