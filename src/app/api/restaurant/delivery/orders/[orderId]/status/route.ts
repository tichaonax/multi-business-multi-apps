import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { randomUUID } from 'crypto'

const VALID_STATUSES = ['PENDING', 'READY', 'DISPATCHED', 'DELIVERED', 'RETURNED', 'CANCELLED']
const PREPARED_STATUSES = ['READY', 'DISPATCHED', 'DELIVERED']
const PREV_STATUS: Record<string, string> = {
  DELIVERED: 'DISPATCHED',
  DISPATCHED: 'READY',
  READY: 'PENDING',
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = params
    const body = await request.json()
    const { status, paymentCollected, returnReason, reason } = body

    const existing = await prisma.deliveryOrderMeta.findUnique({ where: { orderId } })
    if (!existing) {
      return NextResponse.json({ error: 'Delivery order not found' }, { status: 404 })
    }

    // Payment-only update — no status change
    if (status === undefined && paymentCollected !== undefined && paymentCollected !== null) {
      if (existing.status !== 'DELIVERED') {
        return NextResponse.json({ error: 'Can only record payment for delivered orders' }, { status: 400 })
      }
      await prisma.deliveryOrderMeta.update({
        where: { orderId },
        data: { paymentCollected, paymentCollectedAt: new Date(), paymentCollectedBy: user.id, updatedAt: new Date() },
      })
      await prisma.$executeRaw`
        INSERT INTO delivery_status_history (id, "orderId", "fromStatus", "toStatus", "changedBy", reason, "createdAt")
        VALUES (${randomUUID()}, ${orderId}, ${existing.status}, ${existing.status}, ${user.id}, ${'Payment recorded: $' + Number(paymentCollected).toFixed(2)}, NOW())
      `
      return NextResponse.json({ success: true, status: existing.status, message: 'Payment recorded.' })
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Block reverting DELIVERED if payment already collected
    if (existing.status === 'DELIVERED' && existing.paymentCollected != null && status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'Cannot change status — payment has already been collected for this order.' },
        { status: 409 }
      )
    }

    // Block cancelling a prepared order without explicit override
    if (status === 'CANCELLED' && PREPARED_STATUSES.includes(existing.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel an order that has already been prepared. Revert status first.' },
        { status: 409 }
      )
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
        updateData.paymentCollectedBy = user.id
      }

      if (status === 'RETURNED' && returnReason) {
        updateData.returnReason = returnReason
      }

      await tx.deliveryOrderMeta.update({ where: { orderId }, data: updateData })

      // Mirror cancellation to the underlying BusinessOrders record so it is excluded from sales/EOD reports
      if (status === 'CANCELLED') {
        await tx.businessOrders.update({
          where: { id: orderId },
          data: { status: 'CANCELLED', paymentStatus: 'REFUNDED', updatedAt: new Date() },
        })
      }

      // Record status history
      await tx.$executeRaw`
        INSERT INTO delivery_status_history (id, "orderId", "fromStatus", "toStatus", "changedBy", reason, "createdAt")
        VALUES (${randomUUID()}, ${orderId}, ${existing.status}, ${status}, ${user.id}, ${reason || null}, NOW())
      `
    })

    const wasPrepared = PREPARED_STATUSES.includes(existing.status)
    const message =
      status === 'CANCELLED' && creditRestored
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = params
    const history = await prisma.$queryRaw<any[]>`
      SELECT h.id, h."fromStatus", h."toStatus", h.reason, h."createdAt",
             u.name AS "changedByName"
      FROM delivery_status_history h
      LEFT JOIN users u ON u.id = h."changedBy"
      WHERE h."orderId" = ${orderId}
      ORDER BY h."createdAt" ASC
    `
    return NextResponse.json({ success: true, history })
  } catch (error) {
    console.error('Error fetching delivery status history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
