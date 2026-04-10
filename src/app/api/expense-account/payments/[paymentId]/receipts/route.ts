import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

function resolvePayeeName(receipt: {
  payeeType?: string | null
  payeePerson?: { fullName: string } | null
  payeeBusiness?: { name: string } | null
  payeeSupplier?: { name: string } | null
}): string | null {
  if (receipt.payeeType === 'PERSON') return receipt.payeePerson?.fullName ?? null
  if (receipt.payeeType === 'BUSINESS') return receipt.payeeBusiness?.name ?? null
  if (receipt.payeeType === 'SUPPLIER') return receipt.payeeSupplier?.name ?? null
  return null
}

function resolvePaymentPayee(payment: {
  payeeType: string
  payeePersonId?: string | null
  payeeBusinessId?: string | null
  payeeSupplierId?: string | null
  payeeUserId?: string | null
  payeeEmployeeId?: string | null
  payeePerson?: { id: string; fullName: string } | null
  payeeBusiness?: { id: string; name: string } | null
  payeeSupplier?: { id: string; name: string } | null
  payeeUser?: { id: string; name: string } | null
  payeeEmployee?: { id: string; fullName: string } | null
}): { type: string; id: string; name: string } | null {
  if (payment.payeeType === 'PERSON' && payment.payeePerson) {
    return { type: 'PERSON', id: payment.payeePerson.id, name: payment.payeePerson.fullName }
  }
  if (payment.payeeType === 'BUSINESS' && payment.payeeBusiness) {
    return { type: 'BUSINESS', id: payment.payeeBusiness.id, name: payment.payeeBusiness.name }
  }
  if (payment.payeeType === 'SUPPLIER' && payment.payeeSupplier) {
    return { type: 'SUPPLIER', id: payment.payeeSupplier.id, name: payment.payeeSupplier.name }
  }
  if (payment.payeeType === 'USER' && payment.payeeUser) {
    return { type: 'USER', id: payment.payeeUser.id, name: payment.payeeUser.name }
  }
  if (payment.payeeType === 'EMPLOYEE' && payment.payeeEmployee) {
    return { type: 'EMPLOYEE', id: payment.payeeEmployee.id, name: payment.payeeEmployee.fullName }
  }
  return null
}

/**
 * GET /api/expense-account/payments/[paymentId]/receipts
 * Returns all receipts for a payment + current payee on the payment (for mismatch detection)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { paymentId } = await params

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        payeeType: true,
        payeePersonId: true,
        payeeBusinessId: true,
        payeeSupplierId: true,
        payeeUserId: true,
        payeeEmployeeId: true,
        payeePerson: { select: { id: true, fullName: true } },
        payeeBusiness: { select: { id: true, name: true } },
        payeeSupplier: { select: { id: true, name: true } },
        payeeUser: { select: { id: true, name: true } },
        payeeEmployee: { select: { id: true, fullName: true } },
        expense_payment_receipts: {
          select: {
            id: true,
            receiptDate: true,
            amount: true,
            description: true,
            payeeType: true,
            payeePersonId: true,
            payeeBusinessId: true,
            payeeSupplierId: true,
            notes: true,
            createdBy: true,
            createdAt: true,
            payeePerson: { select: { fullName: true } },
            payeeBusiness: { select: { name: true } },
            payeeSupplier: { select: { name: true } },
            creator: { select: { name: true } },
          },
          orderBy: { receiptDate: 'desc' },
        },
      },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    const receipts = payment.expense_payment_receipts.map(r => ({
      id: r.id,
      receiptDate: r.receiptDate,
      amount: r.amount,
      description: r.description,
      payeeType: r.payeeType,
      payeePersonId: r.payeePersonId,
      payeeBusinessId: r.payeeBusinessId,
      payeeSupplierId: r.payeeSupplierId,
      payeeName: resolvePayeeName(r),
      notes: r.notes,
      createdBy: r.createdBy,
      createdByName: r.creator.name,
      createdAt: r.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        receipts,
        currentPayee: resolvePaymentPayee(payment),
      },
    })
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 })
  }
}

/**
 * POST /api/expense-account/payments/[paymentId]/receipts
 * Add a receipt to a payment. Optionally corrects the payment's payee.
 *
 * Body: { receiptDate, amount, description?, payeeType?, payeePersonId?, payeeBusinessId?,
 *         payeeSupplierId?, notes?, updatePaymentPayee?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { paymentId } = await params

    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      select: { id: true },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    const body = await request.json()
    const {
      receiptDate,
      amount,
      description,
      payeeType,
      payeePersonId,
      payeeBusinessId,
      payeeSupplierId,
      notes,
      updatePaymentPayee,
    } = body

    if (!receiptDate || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'receiptDate and amount are required' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.expensePaymentReceipts.create({
        data: {
          expensePaymentId: paymentId,
          receiptDate: new Date(receiptDate),
          amount,
          description: description ?? null,
          payeeType: payeeType ?? null,
          payeePersonId: payeePersonId ?? null,
          payeeBusinessId: payeeBusinessId ?? null,
          payeeSupplierId: payeeSupplierId ?? null,
          notes: notes ?? null,
          createdBy: user.id,
        },
      })

      if (updatePaymentPayee && payeeType) {
        await tx.expenseAccountPayments.update({
          where: { id: paymentId },
          data: {
            payeeType,
            payeePersonId: payeeType === 'PERSON' ? (payeePersonId ?? null) : null,
            payeeBusinessId: payeeType === 'BUSINESS' ? (payeeBusinessId ?? null) : null,
            payeeSupplierId: payeeType === 'SUPPLIER' ? (payeeSupplierId ?? null) : null,
            // USER and EMPLOYEE payees are not settable via receipt flow
            payeeUserId: null,
            payeeEmployeeId: null,
          },
        })
      }

      // Fetch the updated payment with payee info
      const updatedPayment = await tx.expenseAccountPayments.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          payeeType: true,
          payeePersonId: true,
          payeeBusinessId: true,
          payeeSupplierId: true,
          payeeUserId: true,
          payeeEmployeeId: true,
          payeePerson: { select: { id: true, fullName: true } },
          payeeBusiness: { select: { id: true, name: true } },
          payeeSupplier: { select: { id: true, name: true } },
          payeeUser: { select: { id: true, name: true } },
          payeeEmployee: { select: { id: true, fullName: true } },
        },
      })

      return { receipt: created, updatedPayment }
    })

    return NextResponse.json({
      success: true,
      data: {
        receiptId: result.receipt.id,
        updatedPayment: result.updatedPayment ? resolvePaymentPayee(result.updatedPayment) : null,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating receipt:', error)
    return NextResponse.json({ error: 'Failed to create receipt' }, { status: 500 })
  }
}
