import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount } from '@/lib/expense-account-access'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/[accountId]/payment-requests
 * List all REQUEST-status payments for an account. Used by cashier batch modal.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = getEffectivePermissions(user)
    const { accountId } = await params

    if (!permissions.canSubmitPaymentBatch && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to view payment requests' },
        { status: 403 }
      )
    }

    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      if (!(await canUserViewAccount(user.id, accountId))) {
        return NextResponse.json(
          { error: 'You do not have permission to access this expense account' },
          { status: 403 }
        )
      }
    }

    const payments = await prisma.expenseAccountPayments.findMany({
      where: {
        expenseAccountId: accountId,
        status: { in: ['QUEUED', 'REQUEST'] },
        paymentType: { notIn: ['LOAN_REPAYMENT', 'LOAN_DISBURSEMENT', 'TRANSFER_OUT', 'TRANSFER_RETURN'] },
      },
      include: {
        payeeUser: { select: { id: true, name: true } },
        payeeEmployee: { select: { id: true, fullName: true, employeeNumber: true } },
        payeePerson: { select: { id: true, fullName: true } },
        payeeBusiness: { select: { id: true, name: true } },
        payeeSupplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, emoji: true } },
        subcategory: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        payeeType: p.payeeType,
        payeeUser: p.payeeUser,
        payeeEmployee: p.payeeEmployee,
        payeePerson: p.payeePerson,
        payeeBusiness: p.payeeBusiness,
        payeeSupplier: (p as any).payeeSupplier,
        category: p.category,
        subcategory: p.subcategory,
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString(),
        notes: p.notes,
        status: p.status,
        createdBy: p.creator,
        createdAt: p.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching payment requests:', error)
    return NextResponse.json({ error: 'Failed to fetch payment requests' }, { status: 500 })
  }
}
