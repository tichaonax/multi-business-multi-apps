/**
 * Contract Selection Logic for Payroll
 *
 * This module handles complex contract selection rules for payroll processing:
 * - Determines which contracts are eligible for payment (signed contracts only)
 * - Handles multiple contracts per employee in a single period
 * - Calculates prorated work days and pay based on contract dates
 * - Implements auto-renewal logic for expired contracts
 */

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export interface ContractInfo {
  id: string
  contractNumber: string
  startDate: Date
  endDate: Date | null
  status: string
  employeeSignedAt: Date | null
  managerSignedAt: Date | null
  baseSalary: Decimal
  compensationTypeId: string
  compensationTypes?: {
    id: string
    name: string
    type: string
  }
  jobTitleId: string
  jobTitles?: {
    id: string
    title: string
  }
  contract_benefits?: any[]
  primaryBusinessId: string
  pdfGenerationData?: any
}

export interface PayrollContractEntry {
  contract: ContractInfo
  effectiveStartDate: Date
  effectiveEndDate: Date
  workDays: number
  proratedBaseSalary: number
  isProrated: boolean
}

/**
 * Determines if a contract is fully signed by both employee and manager
 */
export function isContractSigned(contract: ContractInfo): boolean {
  return !!(contract.employeeSignedAt && contract.managerSignedAt)
}

/**
 * Finds all contracts for an employee that overlap with the given payroll period
 * Includes both active and terminated contracts that were valid during any part of the period
 */
export async function findOverlappingContracts(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
  businessId?: string
): Promise<ContractInfo[]> {
  const where: any = {
    employeeId,
    startDate: { lte: periodEnd },
    OR: [
      { endDate: null }, // Active contracts with no end date
      { endDate: { gte: periodStart } } // Terminated contracts that ended during or after period start
    ]
  }

  if (businessId) {
    where.primaryBusinessId = businessId
  }

  const contracts = await prisma.employeeContracts.findMany({
    where,
    include: {
      compensationTypes: {
        select: { id: true, name: true, type: true }
      },
      jobTitles: {
        select: { id: true, title: true }
      },
      contract_benefits: {
        include: {
          benefitType: true
        }
      }
    },
    orderBy: [
      { startDate: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  return contracts as ContractInfo[]
}

/**
 * Selects applicable contracts for an employee in a payroll period
 *
 * Rules:
 * 1. Only signed contracts are eligible for payment
 * 2. If latest contract is unsigned, use previous signed contract
 * 3. If contract expired but employee not terminated, assume auto-renewal
 * 4. Can return multiple contracts if employee had contract changes during period
 */
export async function selectApplicableContracts(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
  employeeTerminationDate: Date | null,
  businessId?: string
): Promise<ContractInfo[]> {
  const overlapping = await findOverlappingContracts(employeeId, periodStart, periodEnd, businessId)

  if (overlapping.length === 0) {
    return []
  }

  // Group contracts by whether they overlap with period AND are signed
  const signedContracts = overlapping.filter(c => isContractSigned(c))
  const unsignedContracts = overlapping.filter(c => !isContractSigned(c))

  // If no signed contracts at all, employee cannot be paid
  if (signedContracts.length === 0) {
    console.warn(`Employee ${employeeId} has no signed contracts for period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`)
    return []
  }

  // Check if latest contract is unsigned - if so, need to use fallback to previous signed
  const latestContract = overlapping[0] // Already sorted by startDate desc
  const latestIsSigned = isContractSigned(latestContract)

  if (!latestIsSigned && signedContracts.length > 0) {
    // Use the most recent signed contract as fallback
    const fallbackContract = signedContracts[0]
    console.log(`Using fallback signed contract ${fallbackContract.contractNumber} for employee ${employeeId} because latest contract ${latestContract.contractNumber} is unsigned`)

    // Check if we need to apply auto-renewal logic
    if (fallbackContract.endDate && fallbackContract.endDate < periodEnd && !employeeTerminationDate) {
      // Contract expired but employee not terminated - assume auto-renewal
      console.log(`Auto-renewing contract ${fallbackContract.contractNumber} for employee ${employeeId}`)
    }

    return [fallbackContract]
  }

  // Handle multiple signed contracts in the same period (e.g., promotion mid-month)
  const applicableContracts: ContractInfo[] = []

  for (const contract of signedContracts) {
    const contractStart = new Date(contract.startDate)
    const contractEnd = contract.endDate ? new Date(contract.endDate) : null

    // Check if this contract actually overlaps the period
    const startsBeforePeriodEnds = contractStart <= periodEnd
    const endsAfterPeriodStarts = !contractEnd || contractEnd >= periodStart

    if (startsBeforePeriodEnds && endsAfterPeriodStarts) {
      applicableContracts.push(contract)
    }
  }

  // If employee was terminated, ensure we respect the termination date
  if (employeeTerminationDate) {
    const terminationDate = new Date(employeeTerminationDate)
    return applicableContracts.filter(c => {
      const cStart = new Date(c.startDate)
      return cStart <= terminationDate
    })
  }

  return applicableContracts
}

/**
 * Counts actual working days (Monday-Saturday, excluding Sundays) between two dates
 * Employees work 6 days a week, 9 hours per day, with Sundays off
 */
function countWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    // Count all days except Sunday (0)
    if (dayOfWeek !== 0) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Calculates the number of work days for a contract within a payroll period
 * Takes into account contract start/end dates and employee termination
 * Employees work Monday-Saturday (6 days/week, 9 hours/day), excluding Sundays
 */
export function calculateWorkDays(
  periodStart: Date,
  periodEnd: Date,
  contractStart: Date,
  contractEnd: Date | null,
  employeeTerminationDate: Date | null,
  standardWorkDays: number = 22 // Standard work days per month (not used with actual count)
): number {
  // Determine the effective start date (later of period start or contract start)
  const effectiveStart = contractStart > periodStart ? contractStart : periodStart

  // Determine the effective end date (earliest of: period end, contract end, termination date)
  let effectiveEnd = periodEnd

  if (contractEnd && contractEnd < effectiveEnd) {
    effectiveEnd = contractEnd
  }

  if (employeeTerminationDate) {
    const termDate = new Date(employeeTerminationDate)
    if (termDate < effectiveEnd) {
      effectiveEnd = termDate
    }
  }

  // Count actual working days (Mon-Sat, excluding Sundays)
  const workDays = countWorkingDays(effectiveStart, effectiveEnd)

  return workDays
}

/**
 * Calculates prorated base salary for salaried employees
 * For hourly employees, returns the base hourly rate (no proration)
 */
export function calculateProratedBaseSalary(
  baseSalary: Decimal | number,
  compensationType: string,
  actualWorkDays: number,
  periodWorkDays: number
): number {
  const salary = typeof baseSalary === 'object' && 'toNumber' in baseSalary
    ? (baseSalary as Decimal).toNumber()
    : Number(baseSalary)

  // For hourly employees, return base rate as-is (they're paid per hour, not per day)
  if (compensationType.toLowerCase().includes('hourly')) {
    return salary
  }

  // For salaried employees, prorate based on work days
  // If employee worked less than the full period's working days, prorate the salary
  if (actualWorkDays < periodWorkDays) {
    return Math.round((salary * actualWorkDays / periodWorkDays) * 100) / 100
  }

  return salary
}

/**
 * Generates payroll contract entries for an employee in a period
 * Returns one entry per applicable contract (handles mid-period contract changes)
 */
export async function generatePayrollContractEntries(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
  employeeTerminationDate: Date | null,
  businessId?: string,
  standardWorkDays: number = 22
): Promise<PayrollContractEntry[]> {
  const applicableContracts = await selectApplicableContracts(
    employeeId,
    periodStart,
    periodEnd,
    employeeTerminationDate,
    businessId
  )

  if (applicableContracts.length === 0) {
    return []
  }

  // Calculate total working days for the full period (Mon-Sat, excluding Sundays)
  const periodWorkDays = countWorkingDays(periodStart, periodEnd)

  const entries: PayrollContractEntry[] = []

  for (const contract of applicableContracts) {
    const contractStart = new Date(contract.startDate)
    const contractEnd = contract.endDate ? new Date(contract.endDate) : null

    // Determine effective dates for this contract within the period
    const effectiveStart = contractStart > periodStart ? contractStart : periodStart
    let effectiveEnd = periodEnd

    if (contractEnd && contractEnd < effectiveEnd) {
      effectiveEnd = contractEnd
    }

    if (employeeTerminationDate) {
      const termDate = new Date(employeeTerminationDate)
      if (termDate < effectiveEnd) {
        effectiveEnd = termDate
      }
    }

    // Calculate work days for this contract
    const workDays = calculateWorkDays(
      periodStart,
      periodEnd,
      contractStart,
      contractEnd,
      employeeTerminationDate,
      periodWorkDays
    )

    // Calculate prorated base salary
    const compensationType = contract.compensationTypes?.type || ''
    const proratedBaseSalary = calculateProratedBaseSalary(
      contract.baseSalary,
      compensationType,
      workDays,
      periodWorkDays
    )

    // Determine if this entry is prorated (worked less than full period)
    const isProrated = workDays < periodWorkDays

    entries.push({
      contract,
      effectiveStartDate: effectiveStart,
      effectiveEndDate: effectiveEnd,
      workDays,
      proratedBaseSalary,
      isProrated
    })
  }

  return entries
}
