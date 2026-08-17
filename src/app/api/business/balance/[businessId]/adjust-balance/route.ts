/**
 * POST /api/business/balance/[businessId]/adjust-balance
 *
 * Admin-only: manually correct a business's revenue balance when it has
 * drifted from its true value (see MBM-263, mirrors the expense-account /
 * payroll-account adjust-balance endpoints — MBM-258).
 *
 * The balance is a DERIVED value (BusinessTransactions credits minus
 * debits), and GET /api/business/balance/[businessId] recomputes it from
 * that ledger on every load. So this does NOT overwrite the `balance`
 * column directly — it posts a real, audited correction transaction via the
 * same `processBusinessTransaction()` helper every other business
 * transaction goes through, so every future recompute agrees with the
 * corrected number.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getBusinessBalance, processBusinessTransaction } from '@/lib/business-balance-utils'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can manually adjust a business balance' },
        { status: 403 }
      )
    }

    const { businessId } = await params
    const body = await request.json()
    const { targetBalance, reason } = body

    if (targetBalance === undefined || targetBalance === null || isNaN(Number(targetBalance))) {
      return NextResponse.json({ error: 'targetBalance is required and must be a number' }, { status: 400 })
    }
    if (!reason || !String(reason).trim()) {
      return NextResponse.json({ error: 'A reason is required for a manual balance adjustment' }, { status: 400 })
    }

    const balanceInfo = await getBusinessBalance(businessId)
    if (!balanceInfo.hasAccount) {
      return NextResponse.json({ error: 'Business account not found — initialize it first' }, { status: 404 })
    }

    const currentBalance = balanceInfo.balance
    const target = Math.round(Number(targetBalance) * 100) / 100
    const delta = Math.round((target - currentBalance) * 100) / 100

    if (Math.abs(delta) < 0.01) {
      return NextResponse.json(
        { error: 'The business balance already matches the target value — no adjustment needed' },
        { status: 400 }
      )
    }

    const reasonText = String(reason).trim()
    const note = `Manual balance correction by ${user.name || user.email || user.id}: ` +
      `${currentBalance.toFixed(2)} -> ${target.toFixed(2)}. Reason: ${reasonText}`

    const result = await processBusinessTransaction({
      businessId,
      amount: Math.abs(delta),
      type: delta > 0 ? 'deposit' : 'withdrawal',
      description: 'Manual balance correction',
      notes: note,
      metadata: { manualAdjustment: true, adjustedBy: user.id, previousBalance: currentBalance, targetBalance: target },
      createdBy: user.id,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to adjust balance' }, { status: 400 })
    }

    await createAuditLog({
      userId: user.id,
      action: 'BUSINESS_ACCOUNT_BALANCE_ADJUSTED',
      entityType: 'BusinessAccount',
      entityId: businessId,
      oldValues: { balance: currentBalance },
      newValues: { balance: result.newBalance },
      metadata: {
        deltaAmount: delta,
        reason: reasonText,
      },
      businessId,
    })

    return NextResponse.json({
      success: true,
      message: 'Balance adjusted successfully',
      previousBalance: currentBalance,
      newBalance: result.newBalance,
      deltaAmount: delta,
    })
  } catch (error) {
    console.error('[Business Adjust Balance] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to adjust balance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
