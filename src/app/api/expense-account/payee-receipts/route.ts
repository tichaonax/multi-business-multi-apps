import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/payee-receipts?payeeType=PERSON&payeeId=xxx
 * Returns all receipts for a given payee across all payments, with payment context.
 * Also includes aggregate totals.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.role !== 'admin' && !hasUserPermission(user, 'canViewPayees')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const payeeType = searchParams.get('payeeType')
    const payeeId = searchParams.get('payeeId')

    if (!payeeType || !payeeId) {
      return NextResponse.json({ error: 'payeeType and payeeId are required' }, { status: 400 })
    }

    const where: Record<string, unknown> = {}
    if (payeeType === 'PERSON') where.payeePersonId = payeeId
    else if (payeeType === 'BUSINESS') where.payeeBusinessId = payeeId
    else if (payeeType === 'SUPPLIER') where.payeeSupplierId = payeeId
    else return NextResponse.json({ error: 'payeeType must be PERSON, BUSINESS, or SUPPLIER' }, { status: 400 })

    const receipts = await prisma.expensePaymentReceipts.findMany({
      where,
      select: {
        id: true,
        receiptDate: true,
        amount: true,
        description: true,
        notes: true,
        createdAt: true,
        expensePayment: {
          select: {
            id: true,
            notes: true,
            paymentDate: true,
            amount: true,
            expenseAccount: {
              select: { id: true, accountName: true },
            },
          },
        },
      },
      orderBy: { receiptDate: 'desc' },
    })

    const totalAmount = receipts.reduce((sum, r) => sum + Number(r.amount), 0)

    return NextResponse.json({
      success: true,
      data: {
        receipts: receipts.map(r => ({
          id: r.id,
          receiptDate: r.receiptDate,
          amount: r.amount,
          description: r.description,
          notes: r.notes,
          createdAt: r.createdAt,
          paymentId: r.expensePayment.id,
          paymentDescription: r.expensePayment.notes,
          paymentDate: r.expensePayment.paymentDate,
          paymentAmount: r.expensePayment.amount,
          accountName: r.expensePayment.expenseAccount.accountName,
        })),
        summary: {
          totalReceiptCount: receipts.length,
          totalAmount,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching payee receipts:', error)
    return NextResponse.json({ error: 'Failed to fetch payee receipts' }, { status: 500 })
  }
}
