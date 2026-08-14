import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { getEligibleTasks } from '@/lib/vehicle-service/payout-eligibility'

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
      include: { payment: { select: { status: true, paymentDate: true, paidAt: true } }, items: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      payouts: payouts.map(p => ({
        id: p.id,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        totalAmount: p.totalAmount,
        taskCount: p.items.length,
        createdAt: p.createdAt,
        paymentStatus: p.payment.status,
        paymentDate: p.payment.paymentDate,
        paidAt: p.payment.paidAt,
      })),
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
    const { periodStart: periodStartStr, periodEnd: periodEndStr } = body as { periodStart?: string; periodEnd?: string }
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
    const tasks = await getEligibleTasks(contractorId, periodStart, periodEnd)

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'No unpaid completed work found for this contractor in the selected period' }, { status: 400 })
    }

    const totalAmount = tasks.reduce((sum, t) => sum + t.amount, 0)
    const now = new Date()

    const payout = await prisma.$transaction(async (tx) => {
      const payment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: expenseAccount.id,
          payeeType: 'PERSON',
          payeePersonId: contractor.personId,
          amount: totalAmount,
          paymentDate: now,
          notes: `Vehicle service contractor payout — ${tasks.length} completed job${tasks.length === 1 ? '' : 's'} (${periodStartStr} to ${periodEndStr})`,
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
      payout: { id: payout.id, totalAmount, taskCount: tasks.length, contractorName: contractor.persons.fullName },
    })
  } catch (error) {
    console.error('Create payout error:', error)
    return NextResponse.json({ error: 'Failed to create payout' }, { status: 500 })
  }
}
