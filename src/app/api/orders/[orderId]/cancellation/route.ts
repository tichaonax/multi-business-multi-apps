import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/orders/[orderId]/cancellation
// Returns cancellation details for a specific order (for order history display).
export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = params

  const cancellation = await prisma.orderCancellation.findUnique({
    where: { orderId },
    include: {
      requestedByUser: { select: { id: true, name: true } },
      approvedByUser: { select: { id: true, name: true } },
      override_log: { select: { createdAt: true, metadata: true } },
    },
  })

  if (!cancellation) {
    return NextResponse.json({ error: 'No cancellation record found for this order' }, { status: 404 })
  }

  return NextResponse.json({
    id: cancellation.id,
    orderId: cancellation.orderId,
    refundAmount: Number(cancellation.refundAmount),
    feeDeducted: Number(cancellation.feeDeducted),
    paymentMethod: cancellation.paymentMethod,
    staffReason: cancellation.staffReason,
    requestedBy: cancellation.requestedByUser,
    approvedBy: cancellation.approvedByUser,
    customerName: cancellation.customerName,
    customerPhone: cancellation.customerPhone,
    customerNumber: cancellation.customerNumber,
    createdAt: cancellation.createdAt.toISOString(),
    metadata: cancellation.override_log?.metadata ?? null,
  })
}
