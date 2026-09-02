import { prisma } from '@/lib/prisma'

/**
 * MBM-288 §3.1 — the minimum monthly target a business must hit to cover
 * rent, payroll, recurring commitments, loan repayments, other approved
 * obligations, and the configured buffer. See
 * ai-contexts/project-plans/review/projectplan-MBM-288-business-target-cash-flow-planning-2026-09-02.md
 * for the full formula derivation.
 *
 * Every line is computed live from its real source (never a stale stored
 * snapshot) except loan repayments and "other" commitments, which have no
 * schema source (plan §1.4) and come from BusinessTargetCommitment rows.
 */

export interface MinimumTargetBreakdown {
  rentMonthly: number
  payrollMonthly: number
  recurringCommitmentsMonthly: number
  loanRepaymentMonthly: number
  otherCommitmentsMonthly: number
  buffer: number
  minimumRequiredMonthlyTarget: number
  tradingDaysInMonth: number
  // The system-computed value for each of the 3 overridable lines, before
  // any manual override is applied — the floor an override can never go
  // below (plan follow-up: "salaries fluctuate, let us set payroll
  // ourselves, but never below what the system knows is real").
  rentMonthlyLive: number
  payrollMonthlyLive: number
  recurringCommitmentsMonthlyLive: number
  rentMonthlyIsOverridden: boolean
  payrollMonthlyIsOverridden: boolean
  recurringCommitmentsMonthlyIsOverridden: boolean
}

/** Count of this business's trading days (per BusinessTradingSchedule, minus CLOSED day-adjustments) for the given month. Absence of a schedule row = every day trades, matching current system-wide behavior (plan §2.5). */
export async function countTradingDaysInMonth(businessId: string, year: number, month: number /* 1-12 */): Promise<number> {
  const schedule = await prisma.businessTradingSchedule.findUnique({ where: { businessId } })
  const tradesFlags = [
    schedule?.tradesSunday ?? false,
    schedule?.tradesMonday ?? true,
    schedule?.tradesTuesday ?? true,
    schedule?.tradesWednesday ?? true,
    schedule?.tradesThursday ?? true,
    schedule?.tradesFriday ?? true,
    schedule?.tradesSaturday ?? true,
  ]
  // If there's no schedule row at all, every day trades regardless of weekday.
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 1))

  const closedDates = schedule
    ? new Set(
        (
          await prisma.businessTargetDayAdjustment.findMany({
            where: { businessId, adjustmentType: 'CLOSED', date: { gte: monthStart, lt: monthEnd } },
            select: { date: true },
          })
        ).map((r) => r.date.toISOString().slice(0, 10))
      )
    : new Set<string>()

  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month - 1, d))
    const dateStr = date.toISOString().slice(0, 10)
    if (closedDates.has(dateStr)) continue
    if (!schedule || tradesFlags[date.getUTCDay()]) count++
  }
  return count
}

export async function calculateMinimumTarget(params: {
  businessId: string
  /** Target month, defaults to the current calendar month. */
  year?: number
  month?: number /* 1-12 */
}): Promise<MinimumTargetBreakdown> {
  const now = new Date()
  const year = params.year ?? now.getFullYear()
  const month = params.month ?? now.getMonth() + 1
  const { businessId } = params

  const [rentConfig, contracts, autoDeposits, commitments, config, tradingDaysInMonth] = await Promise.all([
    prisma.businessRentConfig.findUnique({ where: { businessId }, select: { monthlyRentAmount: true, isActive: true } }),
    prisma.employeeContracts.findMany({
      where: { status: 'active', primaryBusinessId: businessId },
      select: { baseSalary: true, livingAllowance: true },
    }),
    prisma.expenseAccountAutoDeposit.findMany({
      where: { businessId, isActive: true },
      select: { dailyAmount: true },
    }),
    prisma.businessTargetCommitment.findMany({
      where: { businessId, isActive: true },
      select: { category: true, monthlyAmount: true },
    }),
    prisma.businessTargetConfig.findUnique({
      where: { businessId },
      select: { bufferType: true, bufferValue: true, rentMonthlyOverride: true, payrollMonthlyOverride: true, recurringCommitmentsMonthlyOverride: true },
    }),
    countTradingDaysInMonth(businessId, year, month),
  ])

  const rentMonthlyLive = rentConfig?.isActive ? Number(rentConfig.monthlyRentAmount) : 0
  const payrollMonthlyLive = contracts.reduce((sum, c) => sum + Number(c.baseSalary) + Number(c.livingAllowance ?? 0), 0)
  const recurringCommitmentsMonthlyLive = autoDeposits.reduce((sum, a) => sum + Number(a.dailyAmount) * tradingDaysInMonth, 0)

  // An override only ever raises a line above what the system knows is real
  // — a stale/lower override (e.g. a business's rent dropped since it was
  // set) is silently ignored in favor of the live value, never allowed to
  // understate the minimum. This mirrors the same hard-floor philosophy as
  // the overall approved-target validation (plan §4.1).
  const rentOverride = config?.rentMonthlyOverride != null ? Number(config.rentMonthlyOverride) : null
  const payrollOverride = config?.payrollMonthlyOverride != null ? Number(config.payrollMonthlyOverride) : null
  const recurringOverride = config?.recurringCommitmentsMonthlyOverride != null ? Number(config.recurringCommitmentsMonthlyOverride) : null

  const rentMonthlyIsOverridden = rentOverride !== null && rentOverride >= rentMonthlyLive
  const payrollMonthlyIsOverridden = payrollOverride !== null && payrollOverride >= payrollMonthlyLive
  const recurringCommitmentsMonthlyIsOverridden = recurringOverride !== null && recurringOverride >= recurringCommitmentsMonthlyLive

  const rentMonthly = rentMonthlyIsOverridden ? (rentOverride as number) : rentMonthlyLive
  const payrollMonthly = payrollMonthlyIsOverridden ? (payrollOverride as number) : payrollMonthlyLive
  const recurringCommitmentsMonthly = recurringCommitmentsMonthlyIsOverridden ? (recurringOverride as number) : recurringCommitmentsMonthlyLive

  const loanRepaymentMonthly = commitments
    .filter((c) => c.category === 'LOAN_REPAYMENT')
    .reduce((sum, c) => sum + Number(c.monthlyAmount), 0)
  const otherCommitmentsMonthly = commitments
    .filter((c) => c.category === 'OTHER')
    .reduce((sum, c) => sum + Number(c.monthlyAmount), 0)

  const subtotal = rentMonthly + payrollMonthly + recurringCommitmentsMonthly + loanRepaymentMonthly + otherCommitmentsMonthly
  const bufferType = config?.bufferType ?? 'PERCENT'
  const bufferValue = config ? Number(config.bufferValue) : 10
  const buffer = bufferType === 'PERCENT' ? subtotal * (bufferValue / 100) : bufferValue

  return {
    rentMonthly,
    payrollMonthly,
    recurringCommitmentsMonthly,
    loanRepaymentMonthly,
    otherCommitmentsMonthly,
    buffer,
    rentMonthlyLive,
    payrollMonthlyLive,
    recurringCommitmentsMonthlyLive,
    rentMonthlyIsOverridden,
    payrollMonthlyIsOverridden,
    recurringCommitmentsMonthlyIsOverridden,
    minimumRequiredMonthlyTarget: subtotal + buffer,
    tradingDaysInMonth,
  }
}
