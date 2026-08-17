import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'

function canManagePayouts(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canAccessFinancialData || perms.canCloseBooks
}

// POST /api/vehicle-service/contractors/[contractorId]/payouts/[payoutId]/void
// Cancels a payout that hasn't been swept into an EOD batch yet — releases its
// tasks back to eligible and marks the linked payment CANCELLED. Once a payment
// leaves SUBMITTED (batched for review) this is no longer available, mirroring
// the same cutoff the standalone expense-account payment cancel route uses.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string; payoutId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId, payoutId } = await params
    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null

    const payout = await prisma.vehicleServiceContractorPayouts.findUnique({
      where: { id: payoutId },
      select: {
        contractorId: true,
        businessId: true,
        voidedAt: true,
        paymentId: true,
        payment: { select: { status: true, notes: true } },
      },
    })
    if (!payout || payout.contractorId !== contractorId) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }
    if (!isSystemAdmin(user) && !canManagePayouts(user, payout.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (payout.voidedAt) {
      return NextResponse.json({ error: 'This payout has already been voided' }, { status: 409 })
    }
    if (payout.payment.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `Cannot void a payout with status "${payout.payment.status}" — once batched for EOD review, ask the cashier to reject it there.` },
        { status: 400 }
      )
    }

    const now = new Date()
    await prisma.$transaction(async (tx) => {
      // Freeing the tasks is just deleting their payout items — payoutItem: null
      // is exactly what getEligibleTasks() checks for.
      await tx.vehicleServiceContractorPayoutItems.deleteMany({ where: { payoutId } })
      await tx.expenseAccountPayments.update({
        where: { id: payout.paymentId },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          notes: [payout.payment.notes, reason ? `Voided: ${reason}` : 'Voided'].filter(Boolean).join(' | '),
        },
      })
      await tx.vehicleServiceContractorPayouts.update({
        where: { id: payoutId },
        data: { voidedAt: now, voidedBy: user.id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Void payout error:', error)
    return NextResponse.json({ error: 'Failed to void payout' }, { status: 500 })
  }
}
