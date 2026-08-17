import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { getEligibleTasks, getDueDate } from '@/lib/vehicle-service/payout-eligibility'

function canManagePayouts(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canAccessFinancialData || perms.canCloseBooks
}

// PATCH /api/vehicle-service/contractors/[contractorId]/payouts/[payoutId]
// Body: { taskIds?: string[], dueDate?: string | null }
// Changes which jobs a still-SUBMITTED voucher covers, and/or its due date.
// Same cutoff as void: once the payment leaves SUBMITTED this is no longer available.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string; payoutId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId, payoutId } = await params
    const body = await request.json()
    const { taskIds, dueDate: dueDateStr } = body as { taskIds?: string[]; dueDate?: string | null }

    const payout = await prisma.vehicleServiceContractorPayouts.findUnique({
      where: { id: payoutId },
      select: {
        contractorId: true,
        businessId: true,
        periodStart: true,
        periodEnd: true,
        voidedAt: true,
        paymentId: true,
        payment: { select: { status: true } },
        items: { select: { taskId: true } },
      },
    })
    if (!payout || payout.contractorId !== contractorId) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }
    if (!isSystemAdmin(user) && !canManagePayouts(user, payout.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (payout.voidedAt) {
      return NextResponse.json({ error: 'This payout has been voided' }, { status: 409 })
    }
    if (payout.payment.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `Cannot amend a payout with status "${payout.payment.status}" — once batched for EOD review, changes must go through the cashier.` },
        { status: 400 }
      )
    }

    const dueDateOverride = dueDateStr === undefined
      ? undefined // not touching it
      : dueDateStr
        ? new Date(dueDateStr + 'T23:59:59.999')
        : null // explicit clear back to computed default

    let totalAmount: number | undefined
    let newTaskIds: string[] | undefined

    if (taskIds) {
      // Re-validate against the same eligibility rule the preview/create routes use.
      // A task already on this payout is legitimately "not eligible" per that query
      // (it has a payoutItem), so eligibility is checked against the union of
      // currently-eligible tasks plus this payout's own current tasks.
      const eligible = await getEligibleTasks(contractorId, payout.periodStart, payout.periodEnd)
      const eligibleIds = new Set([...eligible.map(t => t.taskId), ...payout.items.map(i => i.taskId)])
      const invalid = taskIds.filter(id => !eligibleIds.has(id))
      if (invalid.length > 0) {
        return NextResponse.json({ error: 'One or more selected jobs are not eligible for this payout' }, { status: 409 })
      }
      if (taskIds.length === 0) {
        return NextResponse.json({ error: 'A payout must include at least one job — void it instead if none should remain' }, { status: 400 })
      }

      const taskAmounts = await prisma.vehicleServiceTasks.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, agreedFeeAmount: true, contractorFeeOverride: true },
      })
      const amountById = new Map(taskAmounts.map(t => [t.id, Number(t.contractorFeeOverride ?? t.agreedFeeAmount)]))
      totalAmount = taskIds.reduce((sum, id) => sum + (amountById.get(id) ?? 0), 0)
      newTaskIds = taskIds
    }

    const now = new Date()
    await prisma.$transaction(async (tx) => {
      if (newTaskIds) {
        const currentIds = payout.items.map(i => i.taskId)
        const toRemove = currentIds.filter(id => !newTaskIds!.includes(id))
        const toAdd = newTaskIds.filter(id => !currentIds.includes(id))

        if (toRemove.length > 0) {
          await tx.vehicleServiceContractorPayoutItems.deleteMany({ where: { payoutId, taskId: { in: toRemove } } })
        }
        for (const taskId of toAdd) {
          await tx.vehicleServiceContractorPayoutItems.create({
            data: { id: randomUUID(), payoutId, taskId },
          })
        }

        await tx.expenseAccountPayments.update({
          where: { id: payout.paymentId },
          data: { amount: totalAmount },
        })
      }

      if (dueDateOverride !== undefined) {
        await tx.vehicleServiceContractorPayouts.update({
          where: { id: payoutId },
          data: { dueDateOverride },
        })
      }

      if (newTaskIds) {
        await tx.vehicleServiceContractorPayouts.update({
          where: { id: payoutId },
          data: { totalAmount },
        })
      }
    })

    const updated = await prisma.vehicleServiceContractorPayouts.findUniqueOrThrow({
      where: { id: payoutId },
      include: { items: true },
    })

    return NextResponse.json({
      success: true,
      payout: {
        id: updated.id,
        totalAmount: updated.totalAmount,
        taskCount: updated.items.length,
        dueDate: getDueDate(updated.periodEnd, updated.dueDateOverride),
      },
    })
  } catch (error) {
    console.error('Amend payout error:', error)
    return NextResponse.json({ error: 'Failed to amend payout' }, { status: 500 })
  }
}
