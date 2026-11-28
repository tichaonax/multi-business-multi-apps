// MBM-361: the original request behind a business loan, READ-ONLY, for users
// of the account the loan was paid into (they often can't open the lending
// account, where the request itself lives). Only answers for a request that
// was paid into, or made from, this account. No actions.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount } from '@/lib/expense-account-access'

type Payee = { fullName?: string | null; name?: string | null } | null
const payeeName = (x: { payeePerson?: Payee; payeeUser?: Payee; payeeEmployee?: Payee; payeeBusiness?: Payee; payeeSupplier?: Payee }) =>
  x.payeePerson?.fullName || x.payeeEmployee?.fullName || x.payeeUser?.name || x.payeeBusiness?.name || x.payeeSupplier?.name || null

const PAYEE_SELECT = {
  payeePerson: { select: { fullName: true } },
  payeeUser: { select: { name: true } },
  payeeEmployee: { select: { fullName: true } },
  payeeBusiness: { select: { name: true } },
  payeeSupplier: { select: { name: true } },
} as const

export async function GET(_request: NextRequest, { params }: { params: Promise<{ accountId: string; requestId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { accountId, requestId } = await params

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin' && !(await canUserViewAccount(user.id, accountId))) {
      return NextResponse.json({ error: 'You do not have permission to view this expense account' }, { status: 403 })
    }

    const r = await prisma.comboPaymentRequests.findUnique({
      where: { id: requestId },
      include: {
        creator: { select: { name: true } },
        approver: { select: { name: true } },
        cashierEditor: { select: { name: true } },
        expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
        loanBusiness: { select: { name: true } },
        loanExpenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
        outgoingLoan: { select: { loanNumber: true, status: true, principalAmount: true, remainingBalance: true, disbursementDate: true } },
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            ...PAYEE_SELECT,
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                ...PAYEE_SELECT,
                category: { select: { name: true, emoji: true } },
                subcategory: { select: { name: true, emoji: true } },
                receipts: { select: { amount: true } },
                generatedPayment: { select: { id: true, status: true, amount: true, paymentDate: true, expense_payment_receipts: { select: { amount: true } } } },
              },
            },
          },
        },
      },
    })
    // only a request paid into, or made from, this account
    if (!r || (r.loanExpenseAccountId !== accountId && r.accountId !== accountId)) {
      return NextResponse.json({ error: 'Request not found for this account' }, { status: 404 })
    }

    const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
    return NextResponse.json({
      success: true,
      data: {
        id: r.id,
        title: r.title,
        status: r.status,
        notes: r.notes,
        requestedAmount: num(r.requestedAmount),
        approvedAmount: num(r.approvedAmount),
        approvalNote: r.approvalNote,
        requestedBy: r.creator?.name ?? null,
        createdAt: r.createdAt,
        submittedAt: r.submittedAt,
        approvedBy: r.approver?.name ?? null,
        approvedAt: r.approvedAt,
        cashierEditedBy: r.cashierEditor?.name ?? null,
        cashierChanges: r.cashierChanges,
        lendingAccount: r.expenseAccount,
        borrowingAccount: r.loanExpenseAccount,
        borrowingBusiness: r.loanBusiness?.name ?? null,
        loan: r.outgoingLoan ? {
          loanNumber: r.outgoingLoan.loanNumber,
          status: r.outgoingLoan.status,
          principalAmount: num(r.outgoingLoan.principalAmount),
          remainingBalance: num(r.outgoingLoan.remainingBalance),
          disbursementDate: r.outgoingLoan.disbursementDate,
        } : null,
        sections: r.sections.map(s => ({
          id: s.id,
          name: s.sectionName || payeeName(s) || s.sectionType.replace(/_/g, ' ').toLowerCase(),
          payee: payeeName(s),
          items: s.items.map(i => {
            const p = i.generatedPayment
            const receipted = p
              ? p.expense_payment_receipts.reduce((x, rc) => x + Number(rc.amount || 0), 0)
              : i.receipts.reduce((x, rc) => x + Number(rc.amount || 0), 0)
            return {
              id: i.id,
              description: i.description,
              quantity: num(i.quantity),
              unit: i.unit,
              payee: payeeName(i) || payeeName(s),
              category: i.category ? `${i.category.emoji ? i.category.emoji + ' ' : ''}${i.category.name}` : null,
              subcategory: i.subcategory ? `${i.subcategory.emoji ? i.subcategory.emoji + ' ' : ''}${i.subcategory.name}` : null,
              amount: num(i.approvedAmount ?? i.estimatedAmount),
              payment: p ? { id: p.id, status: p.status, amount: num(p.amount), date: p.paymentDate } : null,
              receipted: Math.round(receipted * 100) / 100,
              noReceiptReason: i.noReceiptReason,
            }
          }),
        })),
      },
    })
  } catch (error) {
    console.error('Loan request view error:', error)
    return NextResponse.json({ error: 'Failed to load the request' }, { status: 500 })
  }
}
