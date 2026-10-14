/**
 * MBM-312: flags any ACTIVE BUSINESS loan that hasn't received an approved
 * repayment within the last calendar month, for the cashier group to review
 * and follow up on. PAID_OFF/REJECTED/WRITTEN_OFF/DEFAULTED loans are
 * excluded automatically by only scanning ACTIVE ones — a fully repaid and
 * closed loan never gets an overdue notification.
 */
import { prisma } from '@/lib/prisma'
import { emitGroupedNotification } from '@/lib/notifications/notification-emitter'

export function loanOverdueGroupKey(loanId: string): string {
  return `loan-overdue:${loanId}`
}

/** Shared with the loan report so "overdue" means the same thing everywhere. */
export function isLoanOverdue(lastActivity: Date, now: Date = new Date()): boolean {
  const oneMonthLater = new Date(lastActivity)
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
  return now > oneMonthLater
}

export async function sweepOverdueLoans(): Promise<{ scanned: number; flagged: number }> {
  const loans = await prisma.accountOutgoingLoans.findMany({
    where: { status: 'ACTIVE', loanType: 'BUSINESS' },
    include: {
      recipientBusiness: { select: { name: true } },
      expenseAccount: { select: { accountName: true } },
    },
  })

  const cashiers = await prisma.users.findMany({
    where: { isActive: true, OR: [{ role: 'admin' }, { permissions: { path: ['canManageLending'], equals: true } }] },
    select: { id: true },
  })
  if (cashiers.length === 0) return { scanned: loans.length, flagged: 0 }

  const now = new Date()
  let flagged = 0

  for (const loan of loans) {
    const lastRepayment = await prisma.accountOutgoingLoanPayments.findFirst({
      where: { loanId: loan.id, status: 'APPROVED' },
      orderBy: { paymentDate: 'desc' },
      select: { paymentDate: true },
    })
    const lastActivity = lastRepayment?.paymentDate ?? loan.disbursementDate
    if (!isLoanOverdue(lastActivity, now)) continue

    flagged++
    const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))

    for (const cashier of cashiers) {
      await emitGroupedNotification({
        userId: cashier.id,
        type: 'LOAN_OVERDUE',
        title: 'Loan overdue for repayment',
        message: `${loan.loanNumber} — ${loan.recipientBusiness?.name ?? 'business'} owes ${loan.expenseAccount?.accountName ?? 'account'} $${Number(loan.remainingBalance).toFixed(2)}, no repayment in ${daysSince} days`,
        linkUrl: `/expense-accounts/${loan.expenseAccountId}`,
        metadata: { loanId: loan.id, loanNumber: loan.loanNumber },
        groupKey: loanOverdueGroupKey(loan.id),
      })
    }
  }

  return { scanned: loans.length, flagged }
}
