import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/eod-payment-batches/[batchId]/add-payment
 * Cashier adds an ad-hoc payment directly to an open (PENDING_REVIEW) EOD batch.
 * The payment bypasses the normal queue and is immediately PENDING_APPROVAL.
 *
 * Body: {
 *   expenseAccountId: string
 *   payeeType: string   // USER | EMPLOYEE | PERSON | BUSINESS | SUPPLIER | NONE
 *   payeeUserId?: string
 *   payeeEmployeeId?: string
 *   payeePersonId?: string
 *   payeeBusinessId?: string
 *   payeeSupplierId?: string
 *   categoryId?: string
 *   subcategoryId?: string
 *   amount: number
 *   paymentDate: string  // ISO date
 *   notes?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canSubmitPaymentBatch && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { batchId } = await params
    const body = await request.json()
    const {
      expenseAccountId,
      payeeType,
      payeeUserId,
      payeeEmployeeId,
      payeePersonId,
      payeeBusinessId,
      payeeSupplierId,
      categoryId,
      subcategoryId,
      amount,
      paymentDate,
      notes,
    } = body

    if (!expenseAccountId) return NextResponse.json({ error: 'expenseAccountId is required' }, { status: 400 })
    if (!payeeType) return NextResponse.json({ error: 'payeeType is required' }, { status: 400 })
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })

    const batch = await prisma.eODPaymentBatch.findUnique({
      where: { id: batchId },
      select: { id: true, businessId: true, status: true },
    })

    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    if (batch.status !== 'PENDING_REVIEW') {
      return NextResponse.json(
        { error: `Cannot add payments to a batch with status "${batch.status}"` },
        { status: 400 }
      )
    }

    // Verify expense account belongs to the same business
    const account = await prisma.expenseAccounts.findUnique({
      where: { id: expenseAccountId },
      select: { id: true, businessId: true, accountName: true, isActive: true },
    })

    if (!account) return NextResponse.json({ error: 'Expense account not found' }, { status: 404 })
    if (account.businessId !== batch.businessId) {
      return NextResponse.json({ error: 'Expense account does not belong to this batch\'s business' }, { status: 400 })
    }
    if (!account.isActive) {
      return NextResponse.json({ error: 'Cannot add payment to an inactive expense account' }, { status: 400 })
    }

    const payment = await prisma.expenseAccountPayments.create({
      data: {
        expenseAccountId,
        payeeType,
        payeeUserId: payeeUserId || null,
        payeeEmployeeId: payeeEmployeeId || null,
        payeePersonId: payeePersonId || null,
        payeeBusinessId: payeeBusinessId || null,
        payeeSupplierId: payeeSupplierId || null,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        amount: Number(amount),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes: notes?.trim() || null,
        status: 'PENDING_APPROVAL',
        adHoc: true,
        eodBatchId: batchId,
        createdBy: user.id,
      },
      include: {
        expenseAccount: { select: { id: true, accountName: true } },
        category: { select: { id: true, name: true, emoji: true } },
        creator: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Ad-hoc payment added to batch',
      data: {
        id: payment.id,
        status: payment.status,
        adHoc: payment.adHoc,
        expenseAccountId: payment.expenseAccountId,
        expenseAccount: payment.expenseAccount,
        payeeType: payment.payeeType,
        amount: Number(payment.amount),
        paymentDate: payment.paymentDate.toISOString(),
        notes: payment.notes,
        category: payment.category,
        creator: payment.creator,
        createdAt: payment.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error adding ad-hoc payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add payment' },
      { status: 500 }
    )
  }
}
