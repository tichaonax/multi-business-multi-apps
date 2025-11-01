/**
 * Employee Transfer Service
 * 
 * Handles transferring employees from one business to another when a business is being deleted.
 * Creates contract renewal records to update primary business without changing other contract terms.
 */

import { prisma } from '@/lib/prisma'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface TransferableEmployee {
  id: string
  fullName: string
  employeeNumber: string
  primaryBusinessId: string
  primaryBusinessName: string
  isActive: boolean
  jobTitle: {
    id: string
    title: string
  }
  activeContract: {
    id: string
    contractNumber: string
    startDate: Date
    endDate: Date | null
    status: string
    baseSalary: number
  } | null
}

export interface CompatibleBusiness {
  id: string
  name: string
  type: string
  shortName: string | null
  isActive: boolean
  employeeCount: number
}

export interface TransferValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sourceBusinessType: string | null
  targetBusinessType: string | null
  validEmployeeIds: string[]
  invalidEmployeeIds: string[]
}

export interface TransferResult {
  success: boolean
  transferredCount: number
  contractRenewalsCreated: number
  businessAssignmentsUpdated: number
  employeeIds: string[]
  errors: string[]
  auditLogId: string | null
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all transferable employees for a business
 * Returns active employees where the given business is their primary business
 */
export async function getTransferableEmployees(
  businessId: string
): Promise<TransferableEmployee[]> {
  try {
    const employees = await prisma.employees.findMany({
      where: {
        primaryBusinessId: businessId,
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        primaryBusinessId: true,
        isActive: true,
        job_titles: {
          select: {
            id: true,
            title: true
          }
        },
        businesses: {
          select: {
            id: true,
            name: true
          }
        },
        employee_contracts_employee_contracts_employeeIdToemployees: {
          where: {
            status: 'active',
            primaryBusinessId: businessId
          },
          orderBy: {
            startDate: 'desc'
          },
          take: 1,
          select: {
            id: true,
            contractNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            baseSalary: true
          }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    })

    return employees.map(emp => ({
      id: emp.id,
      fullName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      primaryBusinessId: emp.primaryBusinessId,
      primaryBusinessName: emp.businesses.name,
      isActive: emp.isActive,
      jobTitle: {
        id: emp.job_titles.id,
        title: emp.job_titles.title
      },
      activeContract: emp.employee_contracts_employee_contracts_employeeIdToemployees[0] || null
    }))
  } catch (error) {
    console.error('Error fetching transferable employees:', error)
    throw new Error('Failed to fetch transferable employees')
  }
}

/**
 * Get compatible target businesses for transfer
 * Returns active businesses of the same type, excluding the source business
 */
export async function getCompatibleTargetBusinesses(
  sourceBusinessId: string
): Promise<CompatibleBusiness[]> {
  try {
    // First, get the source business to know its type
    const sourceBusiness = await prisma.businesses.findUnique({
      where: { id: sourceBusinessId },
      select: { type: true }
    })

    if (!sourceBusiness) {
      throw new Error('Source business not found')
    }

    // Find all active businesses of the same type, excluding the source
    const businesses = await prisma.businesses.findMany({
      where: {
        type: sourceBusiness.type,
        isActive: true,
        id: {
          not: sourceBusinessId
        }
      },
      select: {
        id: true,
        name: true,
        type: true,
        shortName: true,
        isActive: true,
        employees: {
          where: {
            isActive: true
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return businesses.map(biz => ({
      id: biz.id,
      name: biz.name,
      type: biz.type,
      shortName: biz.shortName,
      isActive: biz.isActive,
      employeeCount: biz.employees.length
    }))
  } catch (error) {
    console.error('Error fetching compatible target businesses:', error)
    throw new Error('Failed to fetch compatible target businesses')
  }
}

/**
 * Validate a transfer request
 * Checks business compatibility, employee validity, and other requirements
 */
export async function validateTransfer(
  sourceBusinessId: string,
  targetBusinessId: string,
  employeeIds: string[]
): Promise<TransferValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const validEmployeeIds: string[] = []
  const invalidEmployeeIds: string[] = []

  try {
    // Validate source business exists
    const sourceBusiness = await prisma.businesses.findUnique({
      where: { id: sourceBusinessId },
      select: { id: true, name: true, type: true, isActive: true }
    })

    if (!sourceBusiness) {
      errors.push('Source business not found')
      return {
        isValid: false,
        errors,
        warnings,
        sourceBusinessType: null,
        targetBusinessType: null,
        validEmployeeIds,
        invalidEmployeeIds
      }
    }

    // Validate target business exists and is active
    const targetBusiness = await prisma.businesses.findUnique({
      where: { id: targetBusinessId },
      select: { id: true, name: true, type: true, isActive: true }
    })

    if (!targetBusiness) {
      errors.push('Target business not found')
    } else if (!targetBusiness.isActive) {
      errors.push('Target business is not active')
    }

    // Validate business types match
    if (sourceBusiness && targetBusiness && sourceBusiness.type !== targetBusiness.type) {
      errors.push(
        `Business types do not match: source is ${sourceBusiness.type}, target is ${targetBusiness.type}`
      )
    }

    // Validate same business not selected
    if (sourceBusinessId === targetBusinessId) {
      errors.push('Source and target business cannot be the same')
    }

    // Validate employees
    if (employeeIds.length === 0) {
      errors.push('No employees selected for transfer')
    } else {
      for (const empId of employeeIds) {
        const employee = await prisma.employees.findUnique({
          where: { id: empId },
          select: {
            id: true,
            fullName: true,
            primaryBusinessId: true,
            isActive: true
          }
        })

        if (!employee) {
          errors.push(`Employee ${empId} not found`)
          invalidEmployeeIds.push(empId)
        } else if (!employee.isActive) {
          warnings.push(`Employee ${employee.fullName} is inactive and will be skipped`)
          invalidEmployeeIds.push(empId)
        } else if (employee.primaryBusinessId !== sourceBusinessId) {
          errors.push(
            `Employee ${employee.fullName} does not have source business as primary business`
          )
          invalidEmployeeIds.push(empId)
        } else {
          validEmployeeIds.push(empId)
        }
      }
    }

    return {
      isValid: errors.length === 0 && validEmployeeIds.length > 0,
      errors,
      warnings,
      sourceBusinessType: sourceBusiness?.type || null,
      targetBusinessType: targetBusiness?.type || null,
      validEmployeeIds,
      invalidEmployeeIds
    }
  } catch (error) {
    console.error('Error validating transfer:', error)
    errors.push('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    return {
      isValid: false,
      errors,
      warnings,
      sourceBusinessType: null,
      targetBusinessType: null,
      validEmployeeIds,
      invalidEmployeeIds
    }
  }
}

/**
 * Transfer employees to a new primary business
 * Creates contract renewal records and updates business assignments
 * Uses a transaction to ensure atomicity
 */
export async function transferEmployeesToBusiness(
  sourceBusinessId: string,
  targetBusinessId: string,
  employeeIds: string[],
  userId: string
): Promise<TransferResult> {
  try {
    // Validate the transfer first
    const validation = await validateTransfer(sourceBusinessId, targetBusinessId, employeeIds)

    if (!validation.isValid) {
      return {
        success: false,
        transferredCount: 0,
        contractRenewalsCreated: 0,
        businessAssignmentsUpdated: 0,
        employeeIds: [],
        errors: validation.errors,
        auditLogId: null
      }
    }

    // Use only valid employee IDs
    const validEmployeeIds = validation.validEmployeeIds

    // Execute transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let transferredCount = 0
      let contractRenewalsCreated = 0
      let businessAssignmentsUpdated = 0
      const transferredEmployeeIds: string[] = []

      // Get business names for audit log
      const sourceBusiness = await tx.businesses.findUnique({
        where: { id: sourceBusinessId },
        select: { name: true }
      })

      const targetBusiness = await tx.businesses.findUnique({
        where: { id: targetBusinessId },
        select: { name: true }
      })

      // Transfer each employee
      for (const empId of validEmployeeIds) {
        // 1. Update employee's primary business
        await tx.employees.update({
          where: { id: empId },
          data: {
            primaryBusinessId: targetBusinessId,
            updatedAt: new Date()
          }
        })

        // 2. Get employee's active contract
        const activeContract = await tx.employeeContracts.findFirst({
          where: {
            employeeId: empId,
            status: 'active',
            primaryBusinessId: sourceBusinessId
          },
          orderBy: {
            startDate: 'desc'
          }
        })

        // 3. Create contract renewal record if contract exists
        if (activeContract) {
          const renewalDueDate = new Date()
          renewalDueDate.setDate(renewalDueDate.getDate() + 7) // Due in 7 days

          await tx.contractRenewals.create({
            data: {
              employeeId: empId,
              originalContractId: activeContract.id,
              status: 'pending',
              isAutoRenewal: true,
              renewalDueDate,
              notes: `Auto-generated due to business transfer from "${sourceBusiness?.name}" to "${targetBusiness?.name}". Primary business change only - all other terms remain the same.`,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          contractRenewalsCreated++
        }

        // 4. Update old business assignment (mark as inactive)
        const oldAssignment = await tx.employeeBusinessAssignments.findFirst({
          where: {
            employeeId: empId,
            businessId: sourceBusinessId
          }
        })

        if (oldAssignment) {
          await tx.employeeBusinessAssignments.update({
            where: { id: oldAssignment.id },
            data: {
              isActive: false,
              isPrimary: false,
              endDate: new Date(),
              notes: oldAssignment.notes
                ? `${oldAssignment.notes}\n\nTransferred to ${targetBusiness?.name} on ${new Date().toISOString()}`
                : `Transferred to ${targetBusiness?.name} on ${new Date().toISOString()}`,
              updatedAt: new Date()
            }
          })
        }

        // 5. Create or update new business assignment
        const existingNewAssignment = await tx.employeeBusinessAssignments.findFirst({
          where: {
            employeeId: empId,
            businessId: targetBusinessId
          }
        })

        if (existingNewAssignment) {
          await tx.employeeBusinessAssignments.update({
            where: { id: existingNewAssignment.id },
            data: {
              isActive: true,
              isPrimary: true,
              startDate: existingNewAssignment.startDate,
              notes: existingNewAssignment.notes
                ? `${existingNewAssignment.notes}\n\nSet as primary due to business transfer on ${new Date().toISOString()}`
                : `Set as primary due to business transfer on ${new Date().toISOString()}`,
              updatedAt: new Date()
            }
          })
        } else {
          await tx.employeeBusinessAssignments.create({
            data: {
              employeeId: empId,
              businessId: targetBusinessId,
              isActive: true,
              isPrimary: true,
              startDate: new Date(),
              role: 'Transferred Employee',
              notes: `Transferred from ${sourceBusiness?.name} during business deletion on ${new Date().toISOString()}`,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }

        businessAssignmentsUpdated++
        transferredCount++
        transferredEmployeeIds.push(empId)
      }

      // Create audit log
      const auditLog = await tx.auditLogs.create({
        data: {
          action: 'EMPLOYEES_TRANSFERRED',
          entityType: 'Employee',
          entityId: sourceBusinessId,
          userId,
          details: {
            sourceBusinessId,
            sourceBusinessName: sourceBusiness?.name,
            targetBusinessId,
            targetBusinessName: targetBusiness?.name,
            employeeIds: transferredEmployeeIds,
            transferredCount,
            contractRenewalsCreated,
            businessAssignmentsUpdated,
            timestamp: new Date().toISOString()
          }
        } as any
      })

      return {
        transferredCount,
        contractRenewalsCreated,
        businessAssignmentsUpdated,
        transferredEmployeeIds,
        auditLogId: auditLog.id
      }
    })

    return {
      success: true,
      transferredCount: result.transferredCount,
      contractRenewalsCreated: result.contractRenewalsCreated,
      businessAssignmentsUpdated: result.businessAssignmentsUpdated,
      employeeIds: result.transferredEmployeeIds,
      errors: [],
      auditLogId: result.auditLogId
    }
  } catch (error) {
    console.error('Error transferring employees:', error)
    return {
      success: false,
      transferredCount: 0,
      contractRenewalsCreated: 0,
      businessAssignmentsUpdated: 0,
      employeeIds: [],
      errors: ['Transfer failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
      auditLogId: null
    }
  }
}
