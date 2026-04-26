import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// POST /api/orders/[orderId]/cancel
// Executes an approved cancellation. Called only after manager has approved via the override modal.
// Body: { managerId, staffReason, finalRefundAmount?, businessId }
// Performs a full rollback transaction: order status, business transaction debit, stock restore, loyalty reversal, log.
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = params
  const body = await req.json()
  const { managerId, staffReason, finalRefundAmount, businessId: reqBusinessId } = body

  if (!managerId) return NextResponse.json({ error: 'managerId is required' }, { status: 400 })
  if (!staffReason) return NextResponse.json({ error: 'staffReason is required' }, { status: 400 })

  // Fetch full order detail
  const order = await prisma.businessOrders.findUnique({
    where: { id: orderId },
    include: {
      business_order_items: {
        include: {
          product_variants: {
            include: { business_products: { select: { name: true } } },
          },
        },
      },
      business_customers: {
        select: { id: true, name: true, phone: true, customerNumber: true, loyaltyPoints: true },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Guard: only COMPLETED + PAID orders can be cancelled
  if (order.status !== 'COMPLETED' || order.paymentStatus !== 'PAID') {
    return NextResponse.json(
      { error: 'Order cannot be cancelled — it is not in a completed/paid state' },
      { status: 409 }
    )
  }

  // Guard: no double-cancellation
  const existingCancellation = await prisma.orderCancellation.findUnique({
    where: { orderId },
  })
  if (existingCancellation) {
    return NextResponse.json({ error: 'Order has already been cancelled' }, { status: 409 })
  }

  // Guard: same-day only — order must be from today (before EOD closes)
  const orderDate = new Date(order.createdAt)
  const today = new Date()
  const sameDay =
    orderDate.getFullYear() === today.getFullYear() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getDate() === today.getDate()

  if (!sameDay) {
    return NextResponse.json(
      { error: 'Order cannot be cancelled — same-day cancellations only' },
      { status: 409 }
    )
  }

  // Calculate refund amounts
  const isEcocash = (order.paymentMethod as string)?.toUpperCase() === 'ECOCASH'
  const gross = Number(order.totalAmount)
  const fee = isEcocash ? Number((order.attributes as any)?.ecocashFeeAmount ?? 0) : 0
  const feeDeducted = isEcocash ? fee * 2 : 0

  // For non-EcoCash, manager may have set a custom (partial) refund amount
  let netRefund: number
  if (isEcocash) {
    netRefund = gross - feeDeducted
  } else if (finalRefundAmount != null) {
    netRefund = Math.min(Number(finalRefundAmount), gross)
  } else {
    netRefund = gross
  }

  // Build metadata snapshot
  const attrs = order.attributes as any
  const linked = order.business_customers
  const walkIn = attrs?.customerInfo ?? null
  const loyaltyPointsEarned: number = attrs?.loyaltyPointsEarned ?? 0

  const items = order.business_order_items.map((item) => ({
    name: (item.product_variants as any)?.business_products?.name ?? 'Unknown item',
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
  }))

  const metadata = {
    orderNumber: order.orderNumber,
    orderDate: order.createdAt.toISOString(),
    businessType: order.businessType,
    paymentMethod: order.paymentMethod ?? 'UNKNOWN',
    grossAmount: gross,
    feeDeducted,
    netRefund,
    items,
    customer: linked ? {
      id: linked.id,
      name: linked.name,
      phone: linked.phone ?? undefined,
      loyaltyNumber: linked.customerNumber,
    } : null,
    walkInCustomer: !linked && walkIn ? {
      name: walkIn.name ?? undefined,
      phone: walkIn.phone ?? undefined,
    } : null,
  }

  const businessId = reqBusinessId ?? order.businessId

  // Look up current business account balance for transaction
  const latestTx = await prisma.businessTransactions.findFirst({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  })
  const currentBalance = Number(latestTx?.balanceAfter ?? 0)

  await prisma.$transaction(async (tx) => {
    // 1. Mark order CANCELLED + REFUNDED
    await tx.businessOrders.update({
      where: { id: orderId },
      data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
    })

    // 2. Business account debit for refund amount
    await tx.businessTransactions.create({
      data: {
        businessId,
        amount: netRefund,
        type: 'DEBIT',
        description: `Cancellation refund — Order #${order.orderNumber}`,
        referenceId: orderId,
        referenceType: 'CANCELLATION',
        balanceAfter: currentBalance - netRefund,
        createdBy: user.id,
        notes: `Approved by manager. Net refund $${netRefund.toFixed(2)} (gross $${gross.toFixed(2)}, fee deducted $${feeDeducted.toFixed(2)})`,
      },
    })

    // 3. Restock inventory — skip for restaurant orders
    const isRestaurant = order.businessType === 'restaurant'
    if (!isRestaurant) {
      for (const item of order.business_order_items) {
        if (item.productVariantId) {
          await tx.productVariants.update({
            where: { id: item.productVariantId },
            data: { stockQuantity: { increment: item.quantity } },
          })
        }
      }
    }

    // 4. Reverse loyalty points (defensive — only if customer has points to reverse)
    if (linked && loyaltyPointsEarned > 0 && linked.loyaltyPoints > 0) {
      const deduct = Math.min(loyaltyPointsEarned, linked.loyaltyPoints)
      await tx.businessCustomers.update({
        where: { id: linked.id },
        data: { loyaltyPoints: { decrement: deduct } },
      })
    }

    // 5. Create the override log (APPROVED outcome)
    const overrideLog = await tx.managerOverrideLog.create({
      data: {
        managerId,
        action: 'ORDER_CANCELLATION',
        outcome: 'APPROVED',
        targetId: orderId,
        businessId,
        requestedBy: user.id,
        staffReason,
        metadata,
      },
    })

    // 6. Create the OrderCancellation record
    await tx.orderCancellation.create({
      data: {
        orderId,
        businessId,
        requestedBy: user.id,
        approvedBy: managerId,
        overrideLogId: overrideLog.id,
        staffReason,
        refundAmount: netRefund,
        feeDeducted,
        paymentMethod: order.paymentMethod ?? 'UNKNOWN',
        customerId: linked?.id ?? null,
        customerName: linked?.name ?? (walkIn?.name ?? null),
        customerPhone: linked?.phone ?? (walkIn?.phone ?? null),
        customerNumber: linked?.customerNumber ?? null,
      },
    })
  })

  return NextResponse.json({
    success: true,
    orderNumber: order.orderNumber,
    grossAmount: gross,
    feeDeducted,
    refundAmount: netRefund,
    isEcocash,
  })
}
