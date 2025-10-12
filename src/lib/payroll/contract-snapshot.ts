/**
 * Contract Snapshot Utilities for Payroll
 *
 * This module handles creating and restoring immutable snapshots of employee contracts
 * at the time payroll periods are created. This ensures that future contract modifications
 * (salary changes, benefit changes, etc.) don't affect historical payroll calculations.
 *
 * Key Concepts:
 * - Snapshots freeze all contract data at a specific point in time
 * - Historical payroll regeneration uses snapshots instead of live contract data
 * - Snapshots include benefits, salary, job title, and all compensation details
 */

import { prisma } from '@/lib/prisma'
import type { Decimal } from '@prisma/client/runtime/library'

/**
 * Immutable contract snapshot structure
 * Captured at payroll period creation time
 */
export interface ContractSnapshot {
  // Contract identification
  contractId: string
  contractNumber: string
  capturedAt: Date
  effectiveDate: Date

  // Compensation details
  baseSalary: number
  compensationTypeId: string
  compensationType: {
    id: string
    name: string
    type: string
    commissionPercentage?: number
  }

  // Position details
  jobTitleId: string
  jobTitle: {
    id: string
    title: string
    department?: string
    level?: string
  }

  // Contract metadata
  startDate: Date
  endDate: Date | null
  status: string
  primaryBusinessId: string
  umbrellaBusinessId?: string

  // Benefits at time of capture
  benefits: Array<{
    benefitTypeId: string
    benefitName: string
    amount: number
    isPercentage: boolean
    notes?: string
  }>

  // PDF generation data (for regenerating documents)
  pdfGenerationData?: any

  // Signature status at time of capture
  employeeSignedAt: Date | null
  managerSignedAt: Date | null
}

/**
 * Captures an immutable snapshot of a contract at a specific point in time
 * This is the authoritative function for freezing contract data
 */
export async function captureContractSnapshot(
  contractId: string,
  captureDate: Date = new Date()
): Promise<ContractSnapshot> {
  // Fetch the complete contract with all related data
  const contract = await prisma.employeeContracts.findUnique({
    where: { id: contractId },
    include: {
      compensationTypes: {
        select: {
          id: true,
          name: true,
          type: true,
          commissionPercentage: true
        }
      },
      jobTitles: {
        select: {
          id: true,
          title: true,
          department: true,
          level: true
        }
      },
      contract_benefits: {
        include: {
          benefitType: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      }
    }
  })

  if (!contract) {
    throw new Error(`Contract ${contractId} not found`)
  }

  // Convert Decimal to number for JSON storage
  const baseSalary = typeof contract.baseSalary === 'object' && 'toNumber' in contract.baseSalary
    ? (contract.baseSalary as Decimal).toNumber()
    : Number(contract.baseSalary)

  // Build the immutable snapshot
  const snapshot: ContractSnapshot = {
    contractId: contract.id,
    contractNumber: contract.contractNumber,
    capturedAt: captureDate,
    effectiveDate: new Date(contract.startDate),

    // Compensation
    baseSalary,
    compensationTypeId: contract.compensationTypeId,
    compensationType: {
      id: contract.compensationTypes.id,
      name: contract.compensationTypes.name,
      type: contract.compensationTypes.type,
      commissionPercentage: contract.compensationTypes.commissionPercentage
        ? (contract.compensationTypes.commissionPercentage as Decimal).toNumber()
        : undefined
    },

    // Position
    jobTitleId: contract.jobTitleId,
    jobTitle: {
      id: contract.jobTitles.id,
      title: contract.jobTitles.title,
      department: contract.jobTitles.department || undefined,
      level: contract.jobTitles.level || undefined
    },

    // Contract metadata
    startDate: new Date(contract.startDate),
    endDate: contract.endDate ? new Date(contract.endDate) : null,
    status: contract.status,
    primaryBusinessId: contract.primaryBusinessId,
    umbrellaBusinessId: contract.umbrellaBusinessId || undefined,

    // Benefits at capture time
    benefits: contract.contract_benefits.map(cb => ({
      benefitTypeId: cb.benefitTypeId,
      benefitName: cb.benefitType.name,
      amount: (cb.amount as Decimal).toNumber(),
      isPercentage: cb.isPercentage,
      notes: cb.notes || undefined
    })),

    // PDF generation data for document regeneration
    pdfGenerationData: contract.pdfGenerationData || undefined,

    // Signature status
    employeeSignedAt: contract.employeeSignedAt,
    managerSignedAt: contract.managerSignedAt
  }

  return snapshot
}

/**
 * Restores contract information from a snapshot for use in payroll calculations
 * This ensures historical payroll uses frozen contract data, not current data
 */
export function restoreContractFromSnapshot(snapshot: ContractSnapshot) {
  return {
    id: snapshot.contractId,
    contractNumber: snapshot.contractNumber,
    startDate: new Date(snapshot.startDate),
    endDate: snapshot.endDate ? new Date(snapshot.endDate) : null,
    status: snapshot.status,
    employeeSignedAt: snapshot.employeeSignedAt ? new Date(snapshot.employeeSignedAt) : null,
    managerSignedAt: snapshot.managerSignedAt ? new Date(snapshot.managerSignedAt) : null,
    baseSalary: snapshot.baseSalary,
    compensationTypeId: snapshot.compensationTypeId,
    compensationTypes: snapshot.compensationType,
    jobTitleId: snapshot.jobTitleId,
    jobTitles: snapshot.jobTitle,
    contract_benefits: snapshot.benefits.map(b => ({
      benefitTypeId: b.benefitTypeId,
      amount: b.amount,
      isPercentage: b.isPercentage,
      notes: b.notes || null,
      benefitType: {
        id: b.benefitTypeId,
        name: b.benefitName
      }
    })),
    primaryBusinessId: snapshot.primaryBusinessId,
    pdfGenerationData: snapshot.pdfGenerationData
  }
}

/**
 * Validates that a snapshot is complete and well-formed
 * Useful for detecting corrupted snapshot data
 */
export function validateContractSnapshot(snapshot: any): snapshot is ContractSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false

  // Check required fields
  const requiredFields = [
    'contractId',
    'contractNumber',
    'capturedAt',
    'baseSalary',
    'compensationTypeId',
    'compensationType',
    'jobTitleId',
    'jobTitle',
    'startDate',
    'status',
    'primaryBusinessId',
    'benefits'
  ]

  for (const field of requiredFields) {
    if (!(field in snapshot)) {
      console.error(`Invalid snapshot: missing field ${field}`)
      return false
    }
  }

  // Validate nested structures
  if (!snapshot.compensationType.id || !snapshot.compensationType.name) {
    console.error('Invalid snapshot: malformed compensationType')
    return false
  }

  if (!snapshot.jobTitle.id || !snapshot.jobTitle.title) {
    console.error('Invalid snapshot: malformed jobTitle')
    return false
  }

  if (!Array.isArray(snapshot.benefits)) {
    console.error('Invalid snapshot: benefits must be an array')
    return false
  }

  return true
}

/**
 * Captures snapshots for multiple contracts in batch
 * Optimized for bulk operations like period creation
 */
export async function captureContractSnapshotsBatch(
  contractIds: string[],
  captureDate: Date = new Date()
): Promise<Map<string, ContractSnapshot>> {
  const snapshots = new Map<string, ContractSnapshot>()

  // Process in parallel for performance
  await Promise.all(
    contractIds.map(async (contractId) => {
      try {
        const snapshot = await captureContractSnapshot(contractId, captureDate)
        snapshots.set(contractId, snapshot)
      } catch (error) {
        console.error(`Failed to capture snapshot for contract ${contractId}:`, error)
        // Don't throw - allow partial success
      }
    })
  )

  return snapshots
}
