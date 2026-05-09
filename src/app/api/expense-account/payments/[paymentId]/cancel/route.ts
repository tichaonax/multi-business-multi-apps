import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

const CANCELLABLE_STATUSES = ['REJECTED', 'SUBMITTED', 'QUEUED', 'REQUEST']

/**
 * POST /api/expense-account/payments/[paymentId]/cancel
 * Self-cancellation by the creator. Accepts REJECTED, SUBMITTED, QUEUED, and REQUEST statuses.
 * Body: { reason?: string } — required for SUBMITTED/QUEUED/REQUEST; optional for REJECTED.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { paymentId } = await params

    const body = await request.json().catch(() => ({}))
    const reason: string | null = body?.reason?.trim() || null

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, createdBy: true, notes: true },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.createdBy !== user.id && (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!CANCELLABLE_STATUSES.includes(payment.status)) {
      return NextResponse.json(
        { error: `Only ${CANCELLABLE_STATUSES.join(', ')} payments can be cancelled` },
        { status: 400 }
      )
    }
    if (!reason && payment.status !== 'REJECTED') {
      return NextResponse.json({ error: 'A cancellation reason is required' }, { status: 400 })
    }

    const cancelNote = reason ? `[Cancelled: ${reason}]` : '[Cancelled]'
    const updatedNotes = [payment.notes, cancelNote].filter(Boolean).join('\n')

    await prisma.expenseAccountPayments.update({
      where: { id: paymentId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), notes: updatedNotes },
    })

    return NextResponse.json({ success: true, message: 'Payment cancelled' })
  } catch (error) {
    console.error('Error cancelling payment:', error)
    return NextResponse.json({ error: 'Failed to cancel payment' }, { status: 500 })
  }
}
