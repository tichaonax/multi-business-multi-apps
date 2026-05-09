import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/expense-account/payments/[paymentId]/resubmit
 * Resubmits a REJECTED payment as-is back into the EOD queue.
 * Only the original creator can resubmit their own payment.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { paymentId } = await params

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, createdBy: true },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.createdBy !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (payment.status !== 'REJECTED') {
      return NextResponse.json({ error: 'Only REJECTED payments can be resubmitted' }, { status: 400 })
    }

    await prisma.expenseAccountPayments.update({
      where: { id: paymentId },
      data: {
        status: 'SUBMITTED',
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
      },
    })

    return NextResponse.json({ success: true, message: 'Payment resubmitted to the queue' })
  } catch (error) {
    console.error('Error resubmitting payment:', error)
    return NextResponse.json({ error: 'Failed to resubmit payment' }, { status: 500 })
  }
}
