/**
 * POST /api/payroll/account/adjust-balance
 *
 * Admin-only: manually correct the global payroll account's balance when it
 * has drifted from its true value. Mirrors the expense-account adjust-balance
 * endpoint (see MBM-258), but payroll accounts have no self-healing anywhere
 * today, so this is the only way to fix drift here.
 *
 * PayrollAccountDeposits requires a real businessId (every deposit represents
 * actual cash debited from a specific business/expense account) — a manual
 * correction isn't real cash movement from anywhere, so forcing it through
 * that table would either need a schema change or misattribute the
 * correction to an arbitrary business. Instead, both directions are recorded
 * as a single PayrollAccountPayments row (no required business), with a
 * signed amount: negative for a balance-increasing correction, positive for
 * a balance-decreasing one — payments are subtracted in the balance formula,
 * so a negative payment nets the same as a deposit would.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getGlobalPayrollAccount } from '@/lib/payroll-account-utils'
import { createAuditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can manually adjust the payroll account balance' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { targetBalance, reason } = body

    if (targetBalance === undefined || targetBalance === null || isNaN(Number(targetBalance))) {
      return NextResponse.json({ error: 'targetBalance is required and must be a number' }, { status: 400 })
    }
    if (!reason || !String(reason).trim()) {
      return NextResponse.json({ error: 'A reason is required for a manual balance adjustment' }, { status: 400 })
    }

    const payrollAccount = await getGlobalPayrollAccount()
    if (!payrollAccount) {
      return NextResponse.json({ error: 'Payroll account not found' }, { status: 404 })
    }

    // Compute the true current balance from the ledger (not the possibly-stale column)
    const [depositsAgg, paymentsAgg] = await Promise.all([
      prisma.payrollAccountDeposits.aggregate({
        where: { payrollAccountId: payrollAccount.id },
        _sum: { amount: true },
      }),
      prisma.payrollAccountPayments.aggregate({
        where: { payrollAccountId: payrollAccount.id },
        _sum: { amount: true },
      }),
    ])
    const currentBalance = Number(depositsAgg._sum.amount || 0) - Number(paymentsAgg._sum.amount || 0)
    const target = Math.round(Number(targetBalance) * 100) / 100
    const delta = Math.round((target - currentBalance) * 100) / 100

    if (Math.abs(delta) < 0.01) {
      return NextResponse.json(
        { error: 'The payroll account balance already matches the target value — no adjustment needed' },
        { status: 400 }
      )
    }

    const reasonText = String(reason).trim()
    const note = `Manual balance correction by ${user.name || user.email || user.id}: ` +
      `${currentBalance.toFixed(2)} -> ${target.toFixed(2)}. Reason: ${reasonText}`

    const newBalance = await prisma.$transaction(async (tx) => {
      await tx.payrollAccountPayments.create({
        data: {
          payrollAccountId: payrollAccount.id,
          amount: -delta,
          paymentDate: new Date(),
          paymentType: 'MANUAL_ADJUSTMENT',
          status: 'COMPLETED',
          notes: note,
          createdBy: user.id,
          completedBy: user.id,
          completedAt: new Date(),
        },
      })

      const [depositsSum, paymentsSum] = await Promise.all([
        tx.payrollAccountDeposits.aggregate({
          where: { payrollAccountId: payrollAccount.id },
          _sum: { amount: true },
        }),
        tx.payrollAccountPayments.aggregate({
          where: { payrollAccountId: payrollAccount.id },
          _sum: { amount: true },
        }),
      ])
      const recomputed = Number(depositsSum._sum.amount || 0) - Number(paymentsSum._sum.amount || 0)

      await tx.payrollAccounts.update({
        where: { id: payrollAccount.id },
        data: { balance: recomputed, updatedAt: new Date() },
      })

      return recomputed
    })

    await createAuditLog({
      userId: user.id,
      action: 'PAYROLL_ACCOUNT_BALANCE_ADJUSTED',
      entityType: 'PayrollAccount',
      entityId: payrollAccount.id,
      oldValues: { balance: currentBalance },
      newValues: { balance: newBalance },
      metadata: {
        accountNumber: payrollAccount.accountNumber,
        deltaAmount: delta,
        reason: reasonText,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Balance adjusted successfully',
      previousBalance: currentBalance,
      newBalance,
      deltaAmount: delta,
    })
  } catch (error) {
    console.error('[Payroll Adjust Balance] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to adjust balance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
