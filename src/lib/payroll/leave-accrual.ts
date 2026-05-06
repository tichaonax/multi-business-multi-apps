/**
 * Leave accrual utilities.
 * Centralises the leave policy lookup and accrual calculation so every route
 * uses the same numbers — no more hardcoded 21 / 10.
 */

import { PrismaClient } from '@prisma/client'

export interface LeavePolicy {
  maxAnnualDays: number
  sickDaysPerYear: number
  annualAccrualPerMonth: number
  carryoverEnabled: boolean
  maxCarryoverDays: number | null
}

const DEFAULTS: LeavePolicy = {
  maxAnnualDays: 30,
  sickDaysPerYear: 10,
  annualAccrualPerMonth: 2.5,
  carryoverEnabled: false,
  maxCarryoverDays: null,
}

/**
 * Fetch the active leave policy for an employee.
 * Checks for a business-specific override first, then falls back to the
 * umbrella-level default.  Returns hard-coded defaults if no policy exists yet.
 */
export async function getEmployeeLeavePolicy(
  prismaClient: PrismaClient,
  employeeId: string
): Promise<LeavePolicy> {
  try {
    const employee = await prismaClient.employees.findUnique({
      where: { id: employeeId },
      select: { primaryBusinessId: true },
    })
    if (!employee) return DEFAULTS

    const umbrella = await prismaClient.businesses.findFirst({
      where: { isUmbrellaBusiness: true },
      select: { id: true },
    })
    if (!umbrella) return DEFAULTS

    // Business-specific override ranks above umbrella-level default
    const policy = await prismaClient.leavePolicies.findFirst({
      where: {
        umbrellaBusinessId: umbrella.id,
        isActive: true,
        OR: [
          { businessId: employee.primaryBusinessId },
          { businessId: null },
        ],
      },
      orderBy: [
        { businessId: 'desc' }, // non-null businessId sorts last in desc → picks it first
        { createdAt: 'desc' },
      ],
    })

    const base: LeavePolicy = policy ? {
      maxAnnualDays: policy.maxAnnualDays,
      sickDaysPerYear: policy.sickDaysPerYear,
      annualAccrualPerMonth: Number(policy.annualAccrualPerMonth),
      carryoverEnabled: policy.carryoverEnabled,
      maxCarryoverDays: policy.maxCarryoverDays,
    } : DEFAULTS

    // Contract-level sick days override: check the employee's active signed contract
    const activeContract = await prismaClient.employeeContracts.findFirst({
      where: { employeeId, status: { in: ['active', 'pending_signature'] } },
      orderBy: { startDate: 'desc' },
      select: { sickDaysPerYear: true },
    })
    if (activeContract?.sickDaysPerYear != null) {
      base.sickDaysPerYear = activeContract.sickDaysPerYear
    }

    return base
  } catch {
    return DEFAULTS
  }
}

/**
 * Calculate how many annual leave days have accrued in a given year.
 *
 * Rules:
 * - Count only full or near-full months worked within the year
 *   (a month is counted if the employee's start day within that month is ≤ 15)
 * - Capped at maxAnnualDays
 * - Capped at 12 months even for employees hired before the year started
 *
 * @param hireDate   Employee's hire date
 * @param year       Calendar year to calculate for
 * @param accrualPerMonth  Days accrued per qualifying month (e.g. 2.5)
 * @param maxAnnualDays    Annual ceiling (e.g. 30)
 */
export function calculateAccruedLeave(
  hireDate: Date,
  year: number,
  accrualPerMonth: number,
  maxAnnualDays: number
): number {
  const yearStart = new Date(year, 0, 1)   // 1 Jan
  const yearEnd   = new Date(year, 11, 31) // 31 Dec
  const today     = new Date()

  // Effective period within the year the employee actually worked
  const effectiveStart = hireDate > yearStart ? hireDate : yearStart
  const effectiveEnd   = today   < yearEnd   ? today   : yearEnd

  if (effectiveStart > effectiveEnd) return 0

  let months =
    (effectiveEnd.getFullYear() - effectiveStart.getFullYear()) * 12 +
    (effectiveEnd.getMonth()   - effectiveStart.getMonth())

  // Count the starting month if hire day ≤ 15 (joined early enough in the month)
  if (effectiveStart.getDate() <= 15) months += 1

  months = Math.min(Math.max(months, 0), 12)

  return Math.min(months * accrualPerMonth, maxAnnualDays)
}
