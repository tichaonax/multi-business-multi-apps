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
      by: ['direction'],
      where: { businessId },
      _sum: { amount: true },
    })

    const inflow = Number(rows.find(r => r.direction === 'INFLOW')?._sum.amount ?? 0)
    const outflow = Number(rows.find(r => r.direction === 'OUTFLOW')?._sum.amount ?? 0)
    const balance = inflow - outflow

    return NextResponse.json({ balance, totalReceived: inflow, totalAllocated: outflow })
  } catch (err) {
    console.error('[GET /api/cash-allocation/[businessId]/summary]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
