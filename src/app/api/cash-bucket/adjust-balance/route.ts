/**
 * POST /api/cash-bucket/adjust-balance
 *
 * Admin-only: manually correct a business's cash-box balance (cash and/or
 * EcoCash, independently) when it has drifted from a real physical count
 * (see MBM-263, mirrors the expense-account / payroll-account / business
 * adjust-balance endpoints).
 *
 * cashBalance/ecocashBalance are DERIVED values (sum of CashBucketEntry
 * INFLOW minus OUTFLOW per paymentChannel) — GET /api/cash-bucket
 * recomputes them from that ledger on every load. There is no stored
 * balance column to update: a correction is simply one more ledger entry
 * per channel that needs fixing. Cash and EcoCash deltas are computed
 * independently (MBM-256 lesson — one channel's correction must never
 * bleed into or create/destroy money in the other), and when both channels
 * need a correction both entries are posted atomically in one transaction
 * (MBM-252 lesson — these balances have drifted apart before from
 * ungrouped writes).
 *
 * Corrects the raw cashBalance/ecocashBalance (free/available cash), not
 * the derived "physicalCash" figure (cashBalance + earmarked allocations)
 * shown on the cash-bucket page — physicalCash follows automatically once
 * cashBalance is corrected.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { createAuditLog } from '@/lib/audit'

async function getChannelBalances(businessId: string) {
  const rows = await prisma.cashBucketEntry.groupBy({
    by: ['direction', 'paymentChannel'] as any,
    where: { businessId },
    _sum: { amount: true },
  })
  let cashInflow = 0, cashOutflow = 0, ecocashInflow = 0, ecocashOutflow = 0
  for (const row of rows as any[]) {
    const amt = Number(row._sum.amount ?? 0)
    if (row.paymentChannel === 'ECOCASH') {
      if (row.direction === 'INFLOW') ecocashInflow += amt
      else ecocashOutflow += amt
    } else {
      if (row.direction === 'INFLOW') cashInflow += amt
      else cashOutflow += amt
    }
  }
  return { cashBalance: cashInflow - cashOutflow, ecocashBalance: ecocashInflow - ecocashOutflow }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSystemAdmin(user)) {
      return NextResponse.json(
        { error: 'Only system administrators can manually adjust the cash box balance' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { businessId, targetCashBalance, targetEcocashBalance, reason } = body

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }
    if (targetCashBalance === undefined && targetEcocashBalance === undefined) {
      return NextResponse.json({ error: 'Provide targetCashBalance and/or targetEcocashBalance' }, { status: 400 })
    }
    if (targetCashBalance !== undefined && isNaN(Number(targetCashBalance))) {
      return NextResponse.json({ error: 'targetCashBalance must be a number' }, { status: 400 })
    }
    if (targetEcocashBalance !== undefined && isNaN(Number(targetEcocashBalance))) {
      return NextResponse.json({ error: 'targetEcocashBalance must be a number' }, { status: 400 })
    }
    if (!reason || !String(reason).trim()) {
      return NextResponse.json({ error: 'A reason is required for a manual balance adjustment' }, { status: 400 })
    }

    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true, name: true } })
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const current = await getChannelBalances(businessId)
    const reasonText = String(reason).trim()
    const adjuster = user.name || user.email || user.id

    let cashDelta: number | null = null
    if (targetCashBalance !== undefined) {
      const target = Math.round(Number(targetCashBalance) * 100) / 100
      const delta = Math.round((target - current.cashBalance) * 100) / 100
      if (Math.abs(delta) >= 0.01) cashDelta = delta
    }

    let ecocashDelta: number | null = null
    if (targetEcocashBalance !== undefined) {
      const target = Math.round(Number(targetEcocashBalance) * 100) / 100
      const delta = Math.round((target - current.ecocashBalance) * 100) / 100
      if (Math.abs(delta) >= 0.01) ecocashDelta = delta
    }

    if (cashDelta === null && ecocashDelta === null) {
      return NextResponse.json(
        { error: 'The cash box balance already matches the target value(s) — no adjustment needed' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      if (cashDelta !== null) {
        const targetCash = Math.round((current.cashBalance + cashDelta) * 100) / 100
        await tx.cashBucketEntry.create({
          data: {
            businessId,
            entryType: 'MANUAL_ADJUSTMENT',
            direction: cashDelta > 0 ? 'INFLOW' : 'OUTFLOW',
            paymentChannel: 'CASH',
            amount: Math.abs(cashDelta),
            notes: `Manual balance correction by ${adjuster}: ${current.cashBalance.toFixed(2)} -> ${targetCash.toFixed(2)}. Reason: ${reasonText}`,
            entryDate: new Date(),
            createdBy: user.id,
          },
        })
      }
      if (ecocashDelta !== null) {
        const targetEco = Math.round((current.ecocashBalance + ecocashDelta) * 100) / 100
        await tx.cashBucketEntry.create({
          data: {
            businessId,
            entryType: 'MANUAL_ADJUSTMENT',
            direction: ecocashDelta > 0 ? 'INFLOW' : 'OUTFLOW',
            paymentChannel: 'ECOCASH',
            amount: Math.abs(ecocashDelta),
            notes: `Manual balance correction by ${adjuster}: ${current.ecocashBalance.toFixed(2)} -> ${targetEco.toFixed(2)}. Reason: ${reasonText}`,
            entryDate: new Date(),
            createdBy: user.id,
          },
        })
      }
    })

    const updated = await getChannelBalances(businessId)

    await createAuditLog({
      userId: user.id,
      action: 'CASH_BOX_BALANCE_ADJUSTED',
      entityType: 'CashBox',
      entityId: businessId,
      oldValues: { cashBalance: current.cashBalance, ecocashBalance: current.ecocashBalance },
      newValues: { cashBalance: updated.cashBalance, ecocashBalance: updated.ecocashBalance },
      metadata: {
        businessName: business.name,
        cashDelta,
        ecocashDelta,
        reason: reasonText,
      },
      businessId,
    })

    return NextResponse.json({
      success: true,
      message: 'Cash box balance adjusted successfully',
      cash: cashDelta !== null ? { previousBalance: current.cashBalance, newBalance: updated.cashBalance, deltaAmount: cashDelta } : null,
      ecocash: ecocashDelta !== null ? { previousBalance: current.ecocashBalance, newBalance: updated.ecocashBalance, deltaAmount: ecocashDelta } : null,
    })
  } catch (error) {
    console.error('[Cash Box Adjust Balance] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to adjust balance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
