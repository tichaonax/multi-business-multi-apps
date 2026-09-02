import { prisma } from '@/lib/prisma'

/**
 * Follow-up to MBM-288 §3.1: "current cumulative contribution" for each
 * overridable minimum-target line — how much has actually been deposited
 * toward that obligation so far THIS calendar month, reusing the real
 * accounts each line already has (never a separate, parallel tracking
 * mechanism):
 *  - Rent: ExpenseAccountDeposits into the business's rent expense account
 *    (BusinessRentConfig.expenseAccountId) — the same account the Rent
 *    Account dashboard's "Current Balance" is built from.
 *  - Payroll: PayrollAccountDeposits tagged with this businessId — the
 *    payroll account itself is global (shared across all businesses), but
 *    each EOD auto-contribution deposit records which business it came
 *    from, so a per-business month-to-date sum is exactly this business's
 *    share contributed so far.
 *  - Recurring commitments: ExpenseAccountDeposits into any of the
 *    business's active ExpenseAccountAutoDeposit target accounts.
 *  - Loan repayments / Other commitments: no accrual mechanism exists for
 *    either (plan §1.4) — always 0, which is the correct answer, not a
 *    missing one.
 */

export type ContributionPaceStatus = 'behind' | 'current'

export interface LineContribution {
  contributedMonthToDate: number
  status: ContributionPaceStatus
}

export interface LineContributions {
  rent: LineContribution
  payroll: LineContribution
  recurringCommitments: LineContribution
}

/** behind vs current — a simple linear day-of-month pace, same spirit as the daily-target status math elsewhere in this feature. Nothing owed (target 0) is never "behind". */
function paceStatus(contributed: number, monthlyTarget: number, now: Date): ContributionPaceStatus {
  if (monthlyTarget <= 0) return 'current'
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const expectedByNow = monthlyTarget * (now.getDate() / daysInMonth)
  return contributed >= expectedByNow ? 'current' : 'behind'
}

export async function calculateLineContributions(
  businessId: string,
  targets: { rentMonthly: number; payrollMonthly: number; recurringCommitmentsMonthly: number }
): Promise<LineContributions> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [rentConfig, autoDeposits] = await Promise.all([
    prisma.businessRentConfig.findFirst({ where: { businessId, isActive: true }, select: { expenseAccountId: true } }),
    prisma.expenseAccountAutoDeposit.findMany({ where: { businessId, isActive: true }, select: { expenseAccountId: true } }),
  ])

  const [rentAgg, payrollAgg, recurringAgg] = await Promise.all([
    rentConfig
      ? prisma.expenseAccountDeposits.aggregate({
          where: { expenseAccountId: rentConfig.expenseAccountId, depositDate: { gte: monthStart } },
          _sum: { amount: true },
        })
      : null,
    prisma.payrollAccountDeposits.aggregate({
      where: { businessId, depositDate: { gte: monthStart } },
      _sum: { amount: true },
    }),
    autoDeposits.length > 0
      ? prisma.expenseAccountDeposits.aggregate({
          where: { expenseAccountId: { in: autoDeposits.map((d) => d.expenseAccountId) }, depositDate: { gte: monthStart } },
          _sum: { amount: true },
        })
      : null,
  ])

  const rentContributed = Number(rentAgg?._sum.amount ?? 0)
  const payrollContributed = Number(payrollAgg._sum.amount ?? 0)
  const recurringContributed = Number(recurringAgg?._sum.amount ?? 0)

  return {
    rent: { contributedMonthToDate: rentContributed, status: paceStatus(rentContributed, targets.rentMonthly, now) },
    payroll: { contributedMonthToDate: payrollContributed, status: paceStatus(payrollContributed, targets.payrollMonthly, now) },
    recurringCommitments: {
      contributedMonthToDate: recurringContributed,
      status: paceStatus(recurringContributed, targets.recurringCommitmentsMonthly, now),
    },
  }
}
