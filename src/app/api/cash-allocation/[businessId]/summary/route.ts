import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cash-allocation/[businessId]/summary
// Returns the physical cash box balance for a business using CashBucketEntry ledger.
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params

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

    const cashBalance = cashInflow - cashOutflow
    const ecocashBalance = ecocashInflow - ecocashOutflow
    const balance = cashBalance + ecocashBalance

    return NextResponse.json({
      balance,
      cashBalance,
      ecocashBalance,
      totalReceived: cashInflow + ecocashInflow,
      totalAllocated: cashOutflow + ecocashOutflow,
    })
  } catch (err) {
    console.error('[GET /api/cash-allocation/[businessId]/summary]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
