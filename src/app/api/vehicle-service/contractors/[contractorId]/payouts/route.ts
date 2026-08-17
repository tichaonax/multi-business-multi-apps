import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { getEligibleTasks, getDueDate, isOverdue, daysOverdue } from '@/lib/vehicle-service/payout-eligibility'

function canManagePayouts(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canAccessFinancialData || perms.canCloseBooks
}

// GET /api/vehicle-service/contractors/[contractorId]/payouts — voucher history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      select: { businessId: true },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!isSystemAdmin(user) && !canManagePayouts(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payouts = await prisma.vehicleServiceContractorPayouts.findMany({
      where: { contractorId },
      include: {
        payment: { select: { status: true, paymentDate: true, paidAt: true, notes: true, eodBatchId: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      payouts: payouts.map(p => {
        const dueDate = getDueDate(p.periodEnd, p.dueDateOverride)
        return {
          id: p.id,
          // Display-only reference derived from the payout's own id — no separate
          // sequence/column needed, this voucher is never re-issued with a new number.
          voucherNumber: `CP-${p.createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${p.id.slice(0, 6).toUpperCase()}`,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          totalAmount: p.totalAmount,
          taskCount: p.items.length,
          createdAt: p.createdAt,
          paymentStatus: p.payment.status,
          paymentDate: p.payment.paymentDate,
          paidAt: p.payment.paidAt,
          notes: p.payment.notes,
          eodBatchId: p.payment.eodBatchId,
          dueDate,
          isOverdue: !p.voidedAt && ['SUBMITTED', 'PENDING_APPROVAL', 'QUEUED'].includes(p.payment.status) && isOverdue(dueDate),
          daysOverdue: daysOverdue(dueDate),
          voidedAt: p.voidedAt,
          canAmend: !p.voidedAt && p.payment.status === 'SUBMITTED',
        }
      }),
    })
  } catch (error) {
    console.error('List payouts error:', error)
    return NextResponse.json({ error: 'Failed to list payouts' }, { status: 500 })
  }
}

// POST /api/vehicle-service/contractors/[contractorId]/payouts
// Body: { periodStart, periodEnd }
//
// Bundles every eligible (completed, billed+paid, not-yet-paid-out) task into one
// ExpenseAccountPayments voucher (payeeType PERSON, payeePersonId = contractor's
// Persons row — reuses the existing cashier-approval flow, see MBM-261 Decision #2)
// and locks those tasks against being included in a future run.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const body = await request.json()
    const {
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      taskIds,
      dueDate: dueDateStr,
    } = body as { periodStart?: string; periodEnd?: string; taskIds?: string[]; dueDate?: string }
    if (!periodStartStr || !periodEndStr) {
      return NextResponse.json({ error: 'periodStart and periodEnd are required' }, { status: 400 })
    }

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      select: { businessId: true, personId: true, persons: { select: { fullName: true } } },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!isSystemAdmin(user) && !canManagePayouts(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { businessId: contractor.businessId, isActive: true, accountType: 'GENERAL' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (!expenseAccount) {
      return NextResponse.json({ error: 'No active expense account is set up for this business yet — set one up before generating contractor payouts' }, { status: 400 })
    }

    const periodStart = new Date(periodStartStr)
    const periodEnd = new Date(periodEndStr + 'T23:59:59.999')
    const eligibleTasks = await getEligibleTasks(contractorId, periodStart, periodEnd)

    // taskIds lets the user exclude specific jobs from this voucher (e.g. one is
    // disputed) — re-validated against the same eligibility query the preview used
    // rather than trusted from the client, closing the preview→submit race where a
    // task could be claimed by a different payout in between.
    const tasks = taskIds
      ? eligibleTasks.filter(t => taskIds.includes(t.taskId))
      : eligibleTasks

    if (taskIds && tasks.length !== taskIds.length) {
      return NextResponse.json({ error: 'One or more selected jobs are no longer eligible for payout — refresh and try again' }, { status: 409 })
    }

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'No unpaid completed work found for this contractor in the selected period' }, { status: 400 })
    }

    const totalAmount = tasks.reduce((sum, t) => sum + t.amount, 0)
    const now = new Date()
    const dueDateOverride = dueDateStr ? new Date(dueDateStr + 'T23:59:59.999') : null

    const payout = await prisma.$transaction(async (tx) => {
      const payment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: expenseAccount.id,
          payeeType: 'PERSON',
          payeePersonId: contractor.personId,
          amount: totalAmount,
          paymentDate: now,
          notes: `Vehicle service contractor payout — ${tasks.length} completed job${tasks.length === 1 ? '' : 's'}${taskIds ? ' (manually selected)' : ` (${periodStartStr} to ${periodEndStr})`}`,
          isFullPayment: true,
          status: 'SUBMITTED',
          paymentType: 'REGULAR',
          createdBy: user.id,
          submittedBy: user.id,
          submittedAt: now,
        },
      })

      const created = await tx.vehicleServiceContractorPayouts.create({
        data: {
          id: randomUUID(),
          contractorId,
          businessId: contractor.businessId,
          paymentId: payment.id,
          periodStart,
          periodEnd,
          totalAmount,
          createdBy: user.id,
          dueDateOverride,
        },
      })

      for (const t of tasks) {
        await tx.vehicleServiceContractorPayoutItems.create({
          data: { id: randomUUID(), payoutId: created.id, taskId: t.taskId },
        })
      }

      return created
    })

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        voucherNumber: `CP-${payout.createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${payout.id.slice(0, 6).toUpperCase()}`,
        totalAmount,
        taskCount: tasks.length,
        contractorName: contractor.persons.fullName,
        paymentDate: now.toISOString(),
        dueDate: getDueDate(payout.periodEnd, payout.dueDateOverride),
      },
    })
  } catch (error) {
    console.error('Create payout error:', error)
    return NextResponse.json({ error: 'Failed to create payout' }, { status: 500 })
  }
}
