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
 *   1. CashBucketEntry OUTFLOW ECOCASH (tenderedAmount)
 *   2. CashBucketEntry INFLOW  CASH    (tenderedAmount)
 * Net ledger effect = zero.
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
    const cashTendered: number = parseInt(body.cashTendered, 10)

    if (!ecocashAmount || ecocashAmount <= 0) {
      return NextResponse.json({ error: 'Eco-cash amount must be a positive number.' }, { status: 400 })
    }
    if (!cashTendered || cashTendered <= 0 || !Number.isInteger(cashTendered)) {
      return NextResponse.json({ error: 'Cash tendered must be a positive whole number.' }, { status: 400 })
    }

    const conversion = await prisma.ecocashConversion.findUnique({ where: { id } })
    if (!conversion) return NextResponse.json({ error: 'Conversion not found' }, { status: 404 })

    if (conversion.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Only APPROVED conversions can be completed. Current status: ${conversion.status}` },
        { status: 400 }
      )
    }

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
