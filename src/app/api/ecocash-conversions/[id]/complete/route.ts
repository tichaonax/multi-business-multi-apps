import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, getEffectivePermissions } from '@/lib/permission-utils'

async function getEcocashBalance(businessId: string): Promise<number> {
  const rows = await prisma.cashBucketEntry.groupBy({
    by: ['direction'] as any,
    where: { businessId, paymentChannel: 'ECOCASH', deletedAt: null },
    _sum: { amount: true },
  })
  let balance = 0
  for (const r of rows as any[]) {
    const amt = Number(r._sum.amount ?? 0)
    if (r.direction === 'INFLOW') balance += amt
    else balance -= amt
  }
  return balance
}

/**
 * PATCH /api/ecocash-conversions/[id]/complete
 * Confirms cash has been received from the requester and atomically creates:
 *   1. CashBucketEntry OUTFLOW ECOCASH (ecocashAmount)
 *   2. CashBucketEntry INFLOW  CASH    (cashTendered)
 * Net ledger effect = zero, up to whole-dollar rounding (physical cash can't be
 * fractional). ecocashAmount must match the amount approved (conversion.tenderedAmount);
 * cashTendered is always derived server-side as Math.round(ecocashAmount) — it is never
 * accepted from the client — so the two legs can never diverge by more than $0.50 and can
 * never be independently fabricated.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!isSystemAdmin(user) && !permissions.canSubmitPaymentBatch) {
      return NextResponse.json({ error: 'You do not have permission to complete ecocash conversions' }, { status: 403 })
    }

    const { id } = await params

    const body = await _request.json().catch(() => ({}))
    const transactionCode: string | null = body.transactionCode?.trim() || null
    const ecocashAmount: number = Number(body.ecocashAmount)

    if (!ecocashAmount || ecocashAmount <= 0) {
      return NextResponse.json({ error: 'Eco-cash amount must be a positive number.' }, { status: 400 })
    }

    const conversion = await prisma.ecocashConversion.findUnique({ where: { id } })
    if (!conversion) return NextResponse.json({ error: 'Conversion not found' }, { status: 404 })

    if (conversion.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Only APPROVED conversions can be completed. Current status: ${conversion.status}` },
        { status: 400 }
      )
    }

    // ecocashAmount must match what was actually approved — the approval step means
    // nothing if a completely different amount can be used here instead.
    const approvedAmount = Number(conversion.tenderedAmount)
    if (!conversion.tenderedAmount || Math.abs(ecocashAmount - approvedAmount) > 0.01) {
      return NextResponse.json(
        {
          error: `Eco-cash amount ($${ecocashAmount.toFixed(2)}) must match the approved amount ($${approvedAmount.toFixed(2)}). ` +
            `If the actual amount sent is different, deny this and have the requester resubmit for re-approval.`,
        },
        { status: 400 }
      )
    }

    // Cash tendered is never taken from the client — it's a mechanical whole-dollar
    // rounding of the approved eco-cash amount, not an independently editable figure.
    const cashTendered = Math.round(ecocashAmount)

    // Race-condition guard: re-check balance before creating entries
    const balance = await getEcocashBalance(conversion.businessId)
    if (balance < ecocashAmount) {
      return NextResponse.json(
        {
          error: `Insufficient eco-cash balance at completion. Available: ${balance.toFixed(2)}, Required: ${ecocashAmount.toFixed(2)}`,
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const notes = `Ecocash to cash conversion${conversion.notes ? ` — ${conversion.notes}` : ''}`

    const updated = await prisma.$transaction(async (tx) => {
      const outflow = await tx.cashBucketEntry.create({
        data: {
          businessId: conversion.businessId,
          entryType: 'ECOCASH_CONVERSION',
          direction: 'OUTFLOW',
          paymentChannel: 'ECOCASH',
          amount: ecocashAmount,
          referenceType: 'ecocash_conversion',
          referenceId: id,
          notes,
          entryDate: now,
          createdBy: user.id,
        },
      })

      const inflow = await tx.cashBucketEntry.create({
        data: {
          businessId: conversion.businessId,
          entryType: 'ECOCASH_CONVERSION',
          direction: 'INFLOW',
          paymentChannel: 'CASH',
          amount: cashTendered,
          referenceType: 'ecocash_conversion',
          referenceId: id,
          notes,
          entryDate: now,
          createdBy: user.id,
        },
      })

      return tx.ecocashConversion.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedBy: user.id,
          completedAt: now,
          outflowEntryId: outflow.id,
          inflowEntryId: inflow.id,
          transactionCode,
          ecocashAmount,
          cashTendered,
        },
      })
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error completing ecocash conversion:', error)
    return NextResponse.json({ error: 'Failed to complete ecocash conversion' }, { status: 500 })
  }
}
