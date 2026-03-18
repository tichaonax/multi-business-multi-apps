import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/supplier-payments/requests/[id]/queue
 * Manager queues a PENDING supplier payment request for cashier disbursement.
 * - Creates a QUEUED expense account payment (CASH only) on the business's primary account
 * - The person who queues becomes the owner (createdBy) of the expense payment
 * - Supplier request status → QUEUED, linkedPaymentId stored for status propagation
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const req = await prisma.supplierPaymentRequests.findUnique({
      where: { id },
      include: {
        items: { select: { id: true, status: true, categoryId: true, amount: true } },
      },
    })

    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const permissions = getEffectivePermissions(user, req.businessId)
    if (!permissions.canApproveSupplierPayments) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    if (req.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Only PENDING requests can be queued. Current status: ${req.status}` },
        { status: 400 }
      )
    }

    // Find business's primary general expense account
    const expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { businessId: req.businessId, isActive: true, accountType: 'GENERAL' },
      orderBy: { createdAt: 'asc' },
    })

    if (!expenseAccount) {
      return NextResponse.json(
        { error: 'No active general expense account found for this business' },
        { status: 400 }
      )
    }

    const now = new Date()
    const firstCategoryId = req.items.find(i => i.categoryId)?.categoryId ?? null

    const result = await prisma.$transaction(async (tx: any) => {
      // Create the expense payment in QUEUED status (CASH only)
      const payment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: expenseAccount.id,
          payeeType: 'SUPPLIER',
          payeeSupplierId: req.supplierId,
          amount: req.amount,
          paymentDate: req.dueDate,
          paymentType: 'EXPENSE',
          paymentChannel: 'CASH',
          status: 'QUEUED',
          categoryId: firstCategoryId,
          notes: req.notes ? `${req.notes} [SPR-${id.slice(-6)}]` : `Supplier payment request [SPR-${id.slice(-6)}]`,
          createdBy: user.id,
        },
        select: { id: true },
      })

      // Mark all pending items as approved
      await tx.supplierPaymentRequestItems.updateMany({
        where: { requestId: id, status: 'PENDING' },
        data: { status: 'APPROVED' },
      })

      // Update the supplier payment request to QUEUED
      const updated = await tx.supplierPaymentRequests.update({
        where: { id },
        data: {
          status: 'QUEUED',
          queuedBy: user.id,
          queuedAt: now,
          linkedPaymentId: payment.id,
          approvedBy: user.id,
          approvedAt: now,
        },
      })

      return { payment, updated }
    })

    return NextResponse.json({ success: true, data: { paymentId: result.payment.id } })
  } catch (error: any) {
    console.error('Error queuing supplier payment request:', error)
    return NextResponse.json({ error: error.message ?? 'Internal server error' }, { status: 500 })
  }
}
