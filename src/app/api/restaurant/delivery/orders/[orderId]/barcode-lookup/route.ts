import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET — resolve a delivery order from a barcode scan (used by the global scan handler)
// Accepts either a UUID (full orderId) or a 4-digit sequence number (e.g. "0013" from "DEL-0013")
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = params

    let meta = await prisma.deliveryOrderMeta.findUnique({ where: { orderId } })
    let resolvedOrderId = orderId

    // Sequence number fallback: "0013" → find BusinessOrder with orderNumber ending "-0013"
    if (!meta && /^\d{1,6}$/.test(orderId)) {
      const suffix = `-${orderId.padStart(4, '0')}`
      const matchingOrder = await prisma.businessOrders.findFirst({
        where: { orderNumber: { endsWith: suffix } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (matchingOrder) {
        resolvedOrderId = matchingOrder.id
        meta = await prisma.deliveryOrderMeta.findUnique({ where: { orderId: resolvedOrderId } })
      }
    }

    if (!meta) {
      return NextResponse.json({ error: 'Delivery order not found' }, { status: 404 })
    }

    const order = await prisma.businessOrders.findUnique({
      where: { id: resolvedOrderId },
      include: {
        business_customers: { select: { id: true, name: true, phone: true } },
        business_order_items: {
          select: { quantity: true, unitPrice: true, totalPrice: true, attributes: true },
        },
      },
    })

    return NextResponse.json({ success: true, meta, order })
  } catch (error) {
    console.error('Error in delivery barcode lookup:', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
