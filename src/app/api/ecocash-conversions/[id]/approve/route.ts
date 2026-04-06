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
 * PATCH /api/ecocash-conversions/[id]/approve
 * Approves the conversion and records the actual tenderedAmount.
 * Body: { tenderedAmount: number }
 *
 * Validations:
 *   - tenderedAmount > 0
 *   - ecocashBalance >= tenderedAmount
 * tenderedAmount may be less than, equal to, or greater than conversion.amount.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!isSystemAdmin(user) && !permissions.canSubmitPaymentBatch) {
      return NextResponse.json({ error: 'You do not have permission to approve ecocash conversions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const tenderedAmount = Number(body.tenderedAmount)

    if (!tenderedAmount || tenderedAmount <= 0) {
      return NextResponse.json({ error: 'tenderedAmount must be a positive number' }, { status: 400 })
    }

    const conversion = await prisma.ecocashConversion.findUnique({ where: { id } })
    if (!conversion) return NextResponse.json({ error: 'Conversion not found' }, { status: 404 })

    if (conversion.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Only PENDING conversions can be approved. Current status: ${conversion.status}` },
        { status: 400 }
      )
    }

    const balance = await getEcocashBalance(conversion.businessId)
    if (balance < tenderedAmount) {
      return NextResponse.json(
        {
          error: `Insufficient eco-cash balance. Available: ${balance.toFixed(2)}, Required: ${tenderedAmount.toFixed(2)}`,
        },
        { status: 400 }
      )
    }

    const updated = await prisma.ecocashConversion.update({
      where: { id },
      data: {
        status: 'APPROVED',
        tenderedAmount,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error approving ecocash conversion:', error)
    return NextResponse.json({ error: 'Failed to approve ecocash conversion' }, { status: 500 })
  }
}
