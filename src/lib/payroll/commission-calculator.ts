import { prisma } from '@/lib/prisma'

export interface CommissionTierConfig {
  enabled: boolean
  threshold: number | null // WIDTH of this tier's sales band, not a cumulative cutoff. Tier 3 only: null = unlimited width (no upper bound at all — this field IS the tier's own cap, there is no separate ceiling).
  rate: number | null // percent, e.g. 5 = 5%
}

export interface CommissionEligibleEmployee {
  id: string
  commissionEligible: boolean
  primaryBusinessId: string
  commissionTier1Enabled: boolean
  commissionTier1Threshold: unknown
  commissionTier1Rate: unknown
  commissionTier2Enabled: boolean
  commissionTier2Threshold: unknown
  commissionTier2Rate: unknown
  commissionTier3Enabled: boolean
  commissionTier3Threshold: unknown
  commissionTier3Rate: unknown
}

export interface TierResult {
  enabled: boolean
  sales: number
  rate: number | null
  amount: number
}

export interface CommissionBreakdown {
  salesTotal: number
  tier1: TierResult
  tier2: TierResult
  tier3: TierResult
}

export interface CommissionResult {
  total: number
  breakdown: CommissionBreakdown
}

const toNum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))

function employeeTiers(employee: CommissionEligibleEmployee): [CommissionTierConfig, CommissionTierConfig, CommissionTierConfig] {
  return [
    {
      enabled: employee.commissionTier1Enabled,
      threshold: toNum(employee.commissionTier1Threshold),
      rate: toNum(employee.commissionTier1Rate),
    },
    {
      enabled: employee.commissionTier2Enabled,
      threshold: toNum(employee.commissionTier2Threshold),
      rate: toNum(employee.commissionTier2Rate),
    },
    {
      enabled: employee.commissionTier3Enabled,
      threshold: toNum(employee.commissionTier3Threshold),
      rate: toNum(employee.commissionTier3Rate),
    },
  ]
}

/**
 * Sum of completed sales attributed to this employee in the given window —
 * the base commission is calculated from. Matches the same "real sale"
 * filter the daily-detail report uses (COMPLETED, not an expense-account
 * self-payment), scoped to the employee's own primary business only.
 */
export async function getEmployeeSalesTotal(
  employeeId: string,
  businessId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const result = await prisma.businessOrders.aggregate({
    where: {
      employeeId,
      businessId,
      status: 'COMPLETED',
      paymentMethod: { not: 'EXPENSE_ACCOUNT' },
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    _sum: { totalAmount: true },
  })
  return Number(result._sum.totalAmount || 0)
}

/**
 * Pure tier calculation — progressive, like a tax bracket. Each tier's
 * threshold is the WIDTH of its own sales band, not a cumulative/absolute
 * cutoff: tier 2 covers (tier1Threshold) to (tier1Threshold+tier2Threshold)
 * of cumulative sales, tier 3 covers (tier1Threshold+tier2Threshold)
 * onward. Tier 3's threshold left null means unlimited width — there is no
 * separate ceiling field; a set Tier 3 threshold already IS its own upper
 * bound.
 *
 * Example from the spec: tier1=1000@5%, tier2=1500@2%, tier3=2000@1%, for
 * $1,800 in sales: tier1 = 5% of $1,000 = $50, tier2 = 2% of the next $800
 * (sales fall short of tier2's full $1,500 width) = $16, tier3 = $0 (sales
 * never reach tier3's start at $2,500 cumulative).
 */
export function calculateCommission(employee: CommissionEligibleEmployee, salesTotal: number): CommissionResult {
  const [t1, t2, t3] = employeeTiers(employee)

  const tier1Width = t1.threshold ?? 0
  const tier2Width = t2.threshold ?? 0

  const tier1Start = 0
  const tier1End = tier1Start + tier1Width
  const tier2Start = tier1End
  const tier2End = tier2Start + tier2Width
  const tier3Start = tier2End
  const tier3End = t3.threshold !== null ? tier3Start + t3.threshold : Infinity

  const salesInBand = (start: number, end: number): number => Math.max(0, Math.min(salesTotal, end) - start)

  const t1Sales = salesInBand(tier1Start, tier1End)
  const t2Sales = salesInBand(tier2Start, tier2End)
  const t3Sales = salesInBand(tier3Start, tier3End)

  const tierAmount = (tier: CommissionTierConfig, sales: number): number => {
    if (!tier.enabled || !tier.rate) return 0
    return sales * (tier.rate / 100)
  }

  const tier1: TierResult = { enabled: t1.enabled, sales: round2(t1Sales), rate: t1.rate, amount: round2(tierAmount(t1, t1Sales)) }
  const tier2: TierResult = { enabled: t2.enabled, sales: round2(t2Sales), rate: t2.rate, amount: round2(tierAmount(t2, t2Sales)) }
  const tier3: TierResult = { enabled: t3.enabled, sales: round2(t3Sales), rate: t3.rate, amount: round2(tierAmount(t3, t3Sales)) }

  const total = round2(tier1.amount + tier2.amount + tier3.amount)

  return {
    total,
    breakdown: { salesTotal: round2(salesTotal), tier1, tier2, tier3 },
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Convenience wrapper: fetches the employee's sales for the window and
 * runs the tier calculation in one call. Returns a zero result (not an
 * error) for an employee who isn't commission-eligible or has no tier
 * enabled, so callers can call this unconditionally.
 */
export async function calculateEmployeeCommission(
  employee: CommissionEligibleEmployee,
  periodStart: Date,
  periodEnd: Date
): Promise<CommissionResult> {
  const anyTierEnabled = employee.commissionTier1Enabled || employee.commissionTier2Enabled || employee.commissionTier3Enabled
  if (!employee.commissionEligible || !anyTierEnabled) {
    return {
      total: 0,
      breakdown: {
        salesTotal: 0,
        tier1: { enabled: false, sales: 0, rate: null, amount: 0 },
        tier2: { enabled: false, sales: 0, rate: null, amount: 0 },
        tier3: { enabled: false, sales: 0, rate: null, amount: 0 },
      },
    }
  }

  const salesTotal = await getEmployeeSalesTotal(
    employee.id,
    employee.primaryBusinessId,
    periodStart,
    periodEnd
  )
  return calculateCommission(employee, salesTotal)
}
