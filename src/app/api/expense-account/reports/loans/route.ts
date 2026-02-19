import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/reports/loans
 * System-wide loan portfolio report across all expense accounts
 *
 * Query params:
 * - status: ACTIVE | PAID_OFF | ALL (default: ALL)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canViewExpenseReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'ALL'

    const where: any = {}
    if (statusFilter !== 'ALL') where.status = statusFilter

    const loans = await prisma.expenseAccountLoans.findMany({
      where,
      include: {
        lender: { select: { id: true, name: true, lenderType: true } },
        expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Aggregate repayments per loan (same pattern as [accountId]/loans/route.ts)
    const repayments = await prisma.expenseAccountPayments.findMany({
      where: { paymentType: 'LOAN_REPAYMENT', loanId: { not: null } },
      select: { loanId: true, amount: true, interestAmount: true },
    })

    const totalPaidMap = new Map<string, number>()
    const interestMap = new Map<string, number>()
    for (const p of repayments) {
      if (!p.loanId) continue
      totalPaidMap.set(p.loanId, (totalPaidMap.get(p.loanId) || 0) + Number(p.amount))
      if (p.interestAmount) interestMap.set(p.loanId, (interestMap.get(p.loanId) || 0) + Number(p.interestAmount))
    }

    // System totals
    let totalPrincipal = 0
    let totalOutstanding = 0
    let totalInterestPaid = 0
    let activeCount = 0
    let paidOffCount = 0

    // By lender aggregation
    const lenderMap = new Map<string, { lenderName: string; loanCount: number; totalOutstanding: number }>()

    const loanRows = loans.map((loan) => {
      const principal = Number(loan.principalAmount)
      const remaining = Number(loan.remainingBalance)
      const totalPaid = totalPaidMap.get(loan.id) || 0
      const totalInterest = interestMap.get(loan.id) || 0

      totalPrincipal += principal
      totalOutstanding += remaining
      totalInterestPaid += totalInterest
      if (loan.status === 'ACTIVE') activeCount++
      if (loan.status === 'PAID_OFF') paidOffCount++

      const lenderId = loan.lender.id
      if (!lenderMap.has(lenderId)) {
        lenderMap.set(lenderId, { lenderName: loan.lender.name, loanCount: 0, totalOutstanding: 0 })
      }
      const lenderEntry = lenderMap.get(lenderId)!
      lenderEntry.loanCount++
      lenderEntry.totalOutstanding += remaining

      return {
        id: loan.id,
        loanNumber: loan.loanNumber,
        accountId: loan.expenseAccount.id,
        accountName: loan.expenseAccount.accountName,
        accountNumber: loan.expenseAccount.accountNumber,
        lenderName: loan.lender.name,
        lenderType: loan.lender.lenderType,
        principalAmount: principal,
        remainingBalance: remaining,
        totalPaid,
        totalInterestPaid: totalInterest,
        status: loan.status,
        loanDate: loan.loanDate.toISOString(),
        dueDate: loan.dueDate?.toISOString() || null,
        notes: loan.notes,
      }
    })

    const byLender = Array.from(lenderMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding)

    return NextResponse.json({
      success: true,
      data: {
        loans: loanRows,
        systemTotals: { totalPrincipal, totalOutstanding, totalInterestPaid, activeCount, paidOffCount },
        byLender,
      },
    })
  } catch (error) {
    console.error('Error generating loan portfolio report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
