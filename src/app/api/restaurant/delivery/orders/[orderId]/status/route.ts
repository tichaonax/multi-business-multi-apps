import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

const VALID_STATUSES = ['PENDING', 'READY', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'CANCELLED']
const PREPARED_STATUSES = ['READY', 'DISPATCHED', 'DELIVERED']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = params
    const body = await request.json()
    const { status, paymentCollected, returnReason } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await prisma.deliveryOrderMeta.findUnique({ where: { orderId } })
    if (!existing) {
      return NextResponse.json({ error: 'Delivery order not found' }, { status: 404 })
    }

    let creditRestored = false

    await prisma.$transaction(async (tx) => {
      // Restore credit if cancelling a PENDING order that used credit
      if (status === 'CANCELLED' && existing.status === 'PENDING' && Number(existing.creditUsed) > 0) {
        const account = await tx.deliveryCustomerAccounts.findFirst({
          where: { transactions: { some: { orderId } } },
        })
        if (account) {
          await tx.deliveryCustomerAccounts.update({
            where: { id: account.id },
            data: { balance: { increment: Number(existing.creditUsed) }, updatedAt: new Date() },
          })
          await tx.deliveryAccountTransactions.create({
            data: {
              accountId: account.id,
              type: 'CREDIT',
              amount: Number(existing.creditUsed),
              orderId,
              notes: 'Credit restored — order cancelled before preparation',
              createdBy: user.id,
            },
          })
          creditRestored = true
        }
      }

      const updateData: any = { status, updatedAt: new Date() }

      if (status === 'DELIVERED' && paymentCollected !== undefined && paymentCollected !== null) {
        updateData.paymentCollected = paymentCollected
        updateData.paymentCollectedAt = new Date()
      }

      if (status === 'RETURNED' && returnReason) {
        updateData.returnReason = returnReason
      }

      await tx.deliveryOrderMeta.update({ where: { orderId }, data: updateData })
    })

    const wasPrepared = PREPARED_STATUSES.includes(existing.status)
    const message =
      status === 'CANCELLED' && wasPrepared
        ? 'Order cancelled. Order was already prepared — credit was NOT refunded. Review manually if needed.'
        : status === 'CANCELLED' && creditRestored
        ? 'Order cancelled and credit restored to customer account.'
        : status === 'RETURNED'
        ? 'Order marked as returned.'
        : `Order status updated to ${status}.`

    return NextResponse.json({ success: true, status, creditRestored, message })
  } catch (error) {
    console.error('Error updating delivery status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
