import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/expense-account/payments/[paymentId]/cancel
 * Cancels a REJECTED payment. Only the original creator can cancel.
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
      return NextResponse.json({ error: 'Only REJECTED payments can be cancelled here' }, { status: 400 })
    }

    await prisma.expenseAccountPayments.update({
      where: { id: paymentId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    })

    return NextResponse.json({ success: true, message: 'Payment cancelled' })
  } catch (error) {
    console.error('Error cancelling payment:', error)
    return NextResponse.json({ error: 'Failed to cancel payment' }, { status: 500 })
  }
}
