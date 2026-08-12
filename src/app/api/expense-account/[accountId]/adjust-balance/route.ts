/**
 * POST /api/expense-account/[accountId]/adjust-balance
 *
 * Admin-only: manually correct an expense account's balance when it has
 * drifted from its true value (e.g. after a backup restore, or missing
 * historical transactions — see MBM-258).
 *
 * The account balance is a DERIVED value (deposits minus qualifying
 * payments), and `GET /api/expense-account/[accountId]` silently recomputes
 * and rewrites the stored column from that ledger on every load. So this
 * does NOT just overwrite the `balance` column — that would get stomped
 * back to the (possibly still-wrong) ledger total the next time anyone
 * views the account. Instead it posts an audited adjustment entry (a
 * deposit or a payment) for the difference, so every future recompute
 * agrees with the corrected number.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can manually adjust an account balance' },
        { status: 403 }
      )
    }

    const { accountId } = await params
    const body = await request.json()
    const { targetBalance, reason } = body

    if (targetBalance === undefined || targetBalance === null || isNaN(Number(targetBalance))) {
      return NextResponse.json({ error: 'targetBalance is required and must be a number' }, { status: 400 })
    }
    if (!reason || !String(reason).trim()) {
      return NextResponse.json({ error: 'A reason is required for a manual balance adjustment' }, { status: 400 })
    }

    const account = await prisma.expenseAccounts.findUnique({ where: { id: accountId } })
    if (!account) {
      return NextResponse.json({ error: 'Expense account not found' }, { status: 404 })
    }

    // Compute the true current balance from the ledger (not the possibly-stale column)
    const [depositsAgg, paymentsAgg] = await Promise.all([
      prisma.expenseAccountDeposits.aggregate({
        where: { expenseAccountId: accountId },
        _sum: { amount: true },
      }),
      prisma.expenseAccountPayments.aggregate({
        where: { expenseAccountId: accountId, status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] } },
        _sum: { amount: true },
      }),
    ])
    const currentBalance = Number(depositsAgg._sum.amount || 0) - Number(paymentsAgg._sum.amount || 0)
    const target = Math.round(Number(targetBalance) * 100) / 100
    const delta = Math.round((target - currentBalance) * 100) / 100

    if (Math.abs(delta) < 0.01) {
      return NextResponse.json(
        { error: 'The account balance already matches the target value — no adjustment needed' },
        { status: 400 }
      )
    }

    const reasonText = String(reason).trim()
    const note = `Manual balance correction by ${user.name || user.email || user.id}: ` +
      `${currentBalance.toFixed(2)} -> ${target.toFixed(2)}. Reason: ${reasonText}`

    const newBalance = await prisma.$transaction(async (tx) => {
      if (delta > 0) {
        await tx.expenseAccountDeposits.create({
          data: {
            expenseAccountId: accountId,
            sourceType: 'MANUAL_ADJUSTMENT',
            amount: delta,
            depositDate: new Date(),
            manualNote: note,
            transactionType: 'ADJUSTMENT',
            createdBy: user.id,
          },
        })
      } else {
        await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId: accountId,
            payeeType: 'NONE',
            amount: Math.abs(delta),
            paymentDate: new Date(),
            notes: note,
            status: 'PAID',
            paymentType: 'REGULAR',
            isFullPayment: true,
            createdBy: user.id,
            submittedBy: user.id,
            submittedAt: new Date(),
            paidAt: new Date(),
          },
        })
      }

      return updateExpenseAccountBalanceTx(tx, accountId)
    })

    await createAuditLog({
      userId: user.id,
      action: 'EXPENSE_ACCOUNT_BALANCE_ADJUSTED',
      entityType: 'ExpenseAccount',
      entityId: accountId,
      oldValues: { balance: currentBalance },
      newValues: { balance: newBalance },
      metadata: {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        deltaAmount: delta,
        reason: reasonText,
      },
      businessId: account.businessId ?? undefined,
    })

    return NextResponse.json({
      success: true,
      message: 'Balance adjusted successfully',
      previousBalance: currentBalance,
      newBalance,
      deltaAmount: delta,
    })
  } catch (error) {
    console.error('[Adjust Balance] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to adjust balance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
