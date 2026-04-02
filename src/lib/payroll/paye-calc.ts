/**
 * PAYE, AIDS Levy, and NSSA calculation utilities.
 * Rates and brackets are loaded from the database (paye_tax_brackets and payroll_tax_constants)
 * so they can be updated each tax year without code changes.
 */

import { prisma } from '@/lib/prisma'

export interface TaxBracket {
  lowerBound: number
  upperBound: number | null
  rate: number
  deductAmount: number
  sortOrder: number
}

export interface TaxConstants {
  aidsLevyRate: number      // e.g. 0.03
  nssaEmployeeRate: number  // e.g. 0.045
  nssaEmployerRate: number  // e.g. 0.045
}

export interface PayeResult {
  paye: number
  aidsLevy: number
  nssaEmployee: number
  nssaEmployer: number
}

/**
 * Calculate PAYE for a given taxable gross using the provided brackets.
 * Formula: PAYE = (taxableGross × rate) − deductAmount
 * The bracket where lowerBound <= taxableGross <= upperBound (or upperBound is null) applies.
 */
export function calculatePaye(taxableGross: number, brackets: TaxBracket[]): number {
  if (taxableGross <= 0) return 0

  const sorted = [...brackets].sort((a, b) => a.sortOrder - b.sortOrder)

  for (const bracket of sorted) {
    const lower = bracket.lowerBound
    const upper = bracket.upperBound

    const inBracket = taxableGross >= lower && (upper === null || taxableGross <= upper)
    if (inBracket) {
      const paye = taxableGross * bracket.rate - bracket.deductAmount
      return Math.max(0, Math.round(paye * 100) / 100)
    }
  }

  return 0
}

/**
 * Calculate NSSA employee contribution: rate × basicSalary, capped at the NSSA ceiling.
 * ZIMRA 2025: no statutory ceiling is published in the tables, so we apply rate × basicSalary.
 */
export function calculateNssa(basicSalary: number, nssaEmployeeRate: number): number {
  if (basicSalary <= 0) return 0
  return Math.round(basicSalary * nssaEmployeeRate * 100) / 100
}

/**
 * Calculate AIDS Levy: rate × PAYE amount.
 */
export function calculateAidsLevy(paye: number, aidsLevyRate: number): number {
  if (paye <= 0) return 0
  return Math.round(paye * aidsLevyRate * 100) / 100
}

/**
 * Load tax brackets from the DB for a given year and tableType.
 * Falls back to the nearest earlier year if no exact match.
 */
export async function loadBrackets(year: number, tableType: string = 'MONTHLY'): Promise<TaxBracket[]> {
  let rows = await prisma.payeTaxBrackets.findMany({
    where: { year, tableType },
    orderBy: { sortOrder: 'asc' },
  })

  if (rows.length === 0) {
    // Fall back to the latest available year <= requested year
    const fallback = await prisma.payeTaxBrackets.findFirst({
      where: { tableType, year: { lte: year } },
      orderBy: { year: 'desc' },
    })
    if (fallback) {
      rows = await prisma.payeTaxBrackets.findMany({
        where: { year: fallback.year, tableType },
        orderBy: { sortOrder: 'asc' },
      })
    }
  }

  return rows.map(r => ({
    lowerBound: Number(r.lowerBound),
    upperBound: r.upperBound !== null ? Number(r.upperBound) : null,
    rate: Number(r.rate),
    deductAmount: Number(r.deductAmount),
    sortOrder: r.sortOrder,
  }))
}

/**
 * Load tax constants (AIDS levy rate, NSSA rates) for a given year.
 * Falls back to the nearest earlier year if no exact match.
 */
export async function loadTaxConstants(year: number): Promise<TaxConstants> {
  let row = await prisma.payrollTaxConstants.findUnique({ where: { year } })

  if (!row) {
    row = await prisma.payrollTaxConstants.findFirst({
      where: { year: { lte: year } },
      orderBy: { year: 'desc' },
    })
  }

  if (!row) {
    // Hard fallback — should not happen after seeding
    return { aidsLevyRate: 0.03, nssaEmployeeRate: 0.045, nssaEmployerRate: 0.045 }
  }

  return {
    aidsLevyRate: Number(row.aidsLevyRate),
    nssaEmployeeRate: Number(row.nssaEmployeeRate),
    nssaEmployerRate: Number(row.nssaEmployerRate),
  }
}

/**
 * Calculate all statutory deductions for a single employee for a monthly payroll period.
 *
 * @param basicSalary  - Contractual basic salary (pre-proration, pre-allowances) used for NSSA
 * @param taxableGross - Total gross earnings used for PAYE bracket lookup
 * @param year         - The tax year (e.g. 2025)
 */
export async function calculateStatutoryDeductions(
  basicSalary: number,
  taxableGross: number,
  year: number
): Promise<PayeResult> {
  const [brackets, constants] = await Promise.all([
    loadBrackets(year, 'MONTHLY'),
    loadTaxConstants(year),
  ])

  const paye = calculatePaye(taxableGross, brackets)
  const aidsLevy = calculateAidsLevy(paye, constants.aidsLevyRate)
  const nssaEmployee = calculateNssa(basicSalary, constants.nssaEmployeeRate)
  const nssaEmployer = calculateNssa(basicSalary, constants.nssaEmployerRate)

  return { paye, aidsLevy, nssaEmployee, nssaEmployer }
}
