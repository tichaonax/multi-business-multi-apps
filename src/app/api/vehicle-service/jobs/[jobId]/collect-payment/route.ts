import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canViewFinancials } from '@/lib/vehicle-service/permissions'
import { initializeBusinessAccount, processBusinessTransaction } from '@/lib/business-balance-utils'

const VALID_PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE_MONEY', 'ECOCASH', 'BANK_TRANSFER']

// POST /api/vehicle-service/jobs/[jobId]/collect-payment
// Body: { paymentMethod }
//
// Step 2 of the two-step billing flow (see MBM-266) — takes a job that's
// already been billed (an invoice/order exists, paymentStatus PENDING) and
// records that the customer actually paid. Deliberately a separate action
// from POST .../bill: in practice the invoice is printed and handed to the
// customer, who takes it to a cashier — a different user, at a different
// time — to actually pay. This is also where the business account gets
// credited (moved out of billing itself, for the same reason).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await params
    const body = await request.json()
    const { paymentMethod } = body as { paymentMethod?: string }
    if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: `paymentMethod must be one of ${VALID_PAYMENT_METHODS.join(', ')}` }, { status: 400 })
    }

    const job = await prisma.vehicleServiceJobs.findUnique({
      where: { id: jobId },
      select: {
        id: true, businessId: true, status: true, orderId: true,
        business_orders: { select: { id: true, orderNumber: true, paymentStatus: true, totalAmount: true } },
      },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!isSystemAdmin(user) && !canViewFinancials(user, job.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (job.status !== 'billed' || !job.business_orders) {
      return NextResponse.json({ error: 'This job has not been billed yet — generate the invoice first' }, { status: 409 })
    }
    if (job.business_orders.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'This invoice has already been paid', orderId: job.orderId }, { status: 409 })
    }
    if (job.business_orders.paymentStatus !== 'PENDING') {
      return NextResponse.json({ error: `Cannot collect payment — invoice is ${job.business_orders.paymentStatus}` }, { status: 409 })
    }

    const now = new Date()
    const order = await prisma.businessOrders.update({
      where: { id: job.business_orders.id },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod as any,
        paidBy: user.id,
        paidAt: now,
      },
    })

    try {
      await initializeBusinessAccount(job.businessId, 0, user.id)
      await processBusinessTransaction({
        businessId: job.businessId,
        amount: Number(order.totalAmount),
        type: 'deposit',
        description: `Order revenue - ${order.orderNumber}`,
        referenceId: order.id,
        referenceType: 'order',
        notes: 'Vehicle service job payment collected',
        createdBy: user.id,
      })
    } catch (balanceError) {
      console.error('Failed to credit business balance for vehicle service payment:', balanceError)
    }

    return NextResponse.json({
      success: true,
      order: { id: order.id, orderNumber: order.orderNumber, totalAmount: Number(order.totalAmount), paidAt: order.paidAt },
    })
  } catch (error) {
    console.error('Collect vehicle service payment error:', error)
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
  }
}
