import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// POST /api/orders/[orderId]/cancel/log
// Records a non-approval cancellation outcome: DENIED, ABORTED, or FAILED_CODE.
// Called from the override modal for every outcome that does NOT result in a cancellation.
// Also called for each failed code attempt (FAILED_CODE) before the 3-attempt lockout.
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = params
  const body = await req.json()
  const { outcome, managerId, staffReason, denialReason, businessId } = body

  const validOutcomes = ['DENIED', 'ABORTED', 'FAILED_CODE']
  if (!validOutcomes.includes(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
  }
  if (!staffReason) {
    return NextResponse.json({ error: 'staffReason is required' }, { status: 400 })
  }

  // Fetch order for snapshot
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
        select: { id: true, name: true, phone: true, customerNumber: true },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const isEcocash = (order.paymentMethod as string)?.toUpperCase() === 'ECOCASH'
  const gross = Number(order.totalAmount)
  const fee = isEcocash ? Number((order.attributes as any)?.ecocashFeeAmount ?? 0) : 0
  const feeDeducted = isEcocash ? fee * 2 : 0

  const items = order.business_order_items.map((item) => ({
    name: (item.product_variants as any)?.business_products?.name ?? 'Unknown item',
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
  }))

  const attrs = order.attributes as any
  const walkIn = attrs?.customerInfo ?? null
  const linked = order.business_customers

  const metadata = {
    orderNumber: order.orderNumber,
    orderDate: order.createdAt.toISOString(),
    businessType: order.businessType,
    paymentMethod: order.paymentMethod ?? 'UNKNOWN',
    grossAmount: gross,
    feeDeducted,
    netRefund: gross - feeDeducted,
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

  await prisma.managerOverrideLog.create({
    data: {
      managerId: managerId ?? null,
      action: 'ORDER_CANCELLATION',
      outcome,
      targetId: orderId,
      businessId: businessId ?? order.businessId,
      requestedBy: user.id,
      staffReason,
      denialReason: denialReason ?? null,
      metadata,
    },
  })

  return NextResponse.json({ success: true })
}
