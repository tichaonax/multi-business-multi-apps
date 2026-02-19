import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { canUserViewAccount } from '@/lib/expense-account-access'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/[accountId]/loans
 * List all loans for this account
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId } = await params
    const permissions = getEffectivePermissions(user)

    if (!permissions.canAccessExpenseAccount && !(await canUserViewAccount(user.id, accountId))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const loans = await prisma.expenseAccountLoans.findMany({
      where: { expenseAccountId: accountId },
      include: { lender: true },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch all repayment payments for this account (for totals + history)
    const repayments = await prisma.expenseAccountPayments.findMany({
      where: {
        expenseAccountId: accountId,
        paymentType: 'LOAN_REPAYMENT',
        loanId: { not: null },
      },
      select: { loanId: true, amount: true, interestAmount: true, paymentDate: true },
      orderBy: { paymentDate: 'desc' },
    })

    // Build per-loan maps
    const interestMap = new Map<string, number>()
    const totalPaidMap = new Map<string, number>()
    const paymentsMap = new Map<string, { amount: number; interestAmount: number | null; paymentDate: string }[]>()
    for (const p of repayments) {
      if (!p.loanId) continue
      const amt = Number(p.amount)
      const interest = p.interestAmount != null ? Number(p.interestAmount) : null
      totalPaidMap.set(p.loanId, (totalPaidMap.get(p.loanId) || 0) + amt)
      if (interest) interestMap.set(p.loanId, (interestMap.get(p.loanId) || 0) + interest)
      const list = paymentsMap.get(p.loanId) || []
      list.push({ amount: amt, interestAmount: interest, paymentDate: p.paymentDate.toISOString() })
      paymentsMap.set(p.loanId, list)
    }

    return NextResponse.json({
      success: true,
      data: {
        loans: loans.map(loan => ({
          id: loan.id,
          loanNumber: loan.loanNumber,
          principalAmount: Number(loan.principalAmount),
          remainingBalance: Number(loan.remainingBalance),
          totalInterestPaid: interestMap.get(loan.id) ?? 0,
          totalPaid: totalPaidMap.get(loan.id) ?? 0,
          repayments: paymentsMap.get(loan.id) || [],
          loanDate: loan.loanDate.toISOString(),
          dueDate: loan.dueDate?.toISOString() || null,
          status: loan.status,
          notes: loan.notes,
          lender: { id: loan.lender.id, name: loan.lender.name, lenderType: loan.lender.lenderType },
          createdAt: loan.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching loans:', error)
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}
