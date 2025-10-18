import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
interface RouteParams {
  params: Promise<{ employeeId: string; contractId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, contractId } = await params

    // Check if user has permission to view employee contracts
    if (!hasPermission(session.user, 'canViewEmployeeContracts')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const contract = await prisma.employeeContracts.findUnique({
      where: {
        id: contractId,
        employeeId: employeeId
      },
      include: {
        job_titles: true,
        compensation_types: true,
        businesses_employee_contracts_primaryBusinessIdTobusinesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        employees_employee_contracts_supervisorIdToemployees: {
          select: {
            id: true,
            fullName: true
          }
        },
        contract_benefits: {
          include: {
            benefit_types: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        employees_employee_contracts_employeeIdToemployees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true
          }
        }
      }
    })

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Map Prisma relation keys to legacy-friendly response shape
    const mapped = {
      ...contract,
      employee: contract.employees_employee_contracts_employeeIdToemployees || null,
      supervisor: contract.employees_employee_contracts_supervisorIdToemployees || null,
      business: contract.businesses_employee_contracts_primaryBusinessIdTobusinesses || null,
      contractBenefits: contract.contract_benefits || []
    }

    // Remove internal relation keys
    delete (mapped as any).employees_employee_contracts_employeeIdToemployees
    delete (mapped as any).employees_employee_contracts_supervisorIdToemployees
    delete (mapped as any).businesses
    delete (mapped as any).contract_benefits

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Contract fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, contractId } = await params

    // Check if user is system admin - only system admins can delete contracts
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json({ error: 'Only system administrators can delete contracts' }, { status: 403 })
    }

    // Verify contract exists and belongs to the employee
    const existingContract = await prisma.employeeContracts.findUnique({
      where: {
        id: contractId,
        employeeId: employeeId
      },
      include: {
        employees_employee_contracts_employeeIdToemployees: {
          select: { fullName: true, employeeNumber: true }
        }
      }
    })

    if (!existingContract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Check if it's an active contract
    if (existingContract.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete an active contract. Please terminate it first.' },
        { status: 400 }
      )
    }

    // Delete related contract benefits first
    await prisma.contractBenefits.deleteMany({
      where: { contractId }
    })

    // Delete the contract
    await prisma.employeeContracts.delete({
      where: { id: contractId }
    })

    return NextResponse.json({
      message: 'Contract deleted successfully',
      deletedContract: {
        id: contractId,
        contractNumber: existingContract.contractNumber,
        employeeName: (existingContract as any).employees_employee_contracts_employeeIdToemployees?.fullName
      }
    })
  } catch (error: any) {
    console.error('Contract deletion error:', error)

    // Handle specific database constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete contract due to existing references. Please contact system administrator.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete contract' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, contractId } = await params
    const data = await req.json()
    const { action } = data

    // Handle contract signing
    if (action === 'sign') {
      // Check if user has permission to sign contracts (could be employee themselves or manager)
      if (!hasPermission(session.user, 'canSignEmployeeContracts') && !hasPermission(session.user, 'canEditEmployeeContracts')) {
        return NextResponse.json({ error: 'Insufficient permissions to sign contracts' }, { status: 403 })
      }

      // Verify contract exists and belongs to the employee
      const existingContract = await prisma.employeeContracts.findUnique({
        where: {
          id: contractId,
          employeeId: employeeId
        }
      })

      if (!existingContract) {
        return NextResponse.json(
          { error: 'Contract not found' },
          { status: 404 }
        )
      }

      if (existingContract.employeeSignedAt) {
        return NextResponse.json(
          { error: 'Contract has already been signed' },
          { status: 400 }
        )
      }

      // Sign the contract and activate employee
      const signedContract = await prisma.$transaction(async (tx) => {
        // Update contract with signature timestamp and activate
        const contract = await tx.employeeContracts.update({
          where: { id: contractId },
          data: {
            employeeSignedAt: new Date(),
            status: 'active' // Contract becomes active when signed
          }
        })

        // Activate the employee (can now create user accounts, access systems)
        await tx.employees.update({
          where: { id: employeeId },
          data: {
            employmentStatus: 'active',
            isActive: true
          }
        })

        return contract
      })

      return NextResponse.json({
        message: 'Contract signed successfully',
        contract: signedContract
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Contract action error:', error)
    return NextResponse.json(
      { error: 'Failed to process contract action' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, contractId } = await params

    // Check if user has permission to edit employee contracts
    if (!hasPermission(session.user, 'canEditEmployeeContracts')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const { status, endDate, terminationReason, notes } = data

    // Verify contract exists and belongs to the employee
    const existingContract = await prisma.employeeContracts.findUnique({
      where: {
        id: contractId,
        employeeId: employeeId
      }
    })

    if (!existingContract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // CRITICAL: Prevent modification of terminated contracts
    if (existingContract.status === 'terminated') {
      return NextResponse.json(
        { error: 'Cannot modify terminated contracts. Contract status is locked.' },
        { status: 400 }
      )
    }

    // Validate status transitions for signed contracts
    if (existingContract.employeeSignedAt && status) {
      const allowedContractStatuses = ['suspended', 'terminated']
      if (!allowedContractStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid contract status transition. Signed contracts can only be changed to: ${allowedContractStatuses.join(', ')}`,
            currentStatus: existingContract.status,
            allowedStatuses: allowedContractStatuses,
            note: 'Contract status is separate from employee status. Use employee status for onLeave.'
          },
          { status: 400 }
        )
      }
    }

    // Update the contract
    const updatedContract = await prisma.$transaction(async (tx) => {
      // Update the contract
      const contract = await tx.employeeContracts.update({
        where: { id: contractId },
        data: {
          status: status || existingContract.status,
          endDate: endDate ? new Date(endDate) : existingContract.endDate,
          terminationReason: terminationReason || existingContract.terminationReason,
          notes: notes !== undefined ? notes : existingContract.notes,
          updatedAt: new Date()
        },
        include: {
          job_titles: true,
          compensation_types: true,
          businesses_employee_contracts_primaryBusinessIdTobusinesses: {
            select: { id: true, name: true, type: true }
          },
          employees_employee_contracts_supervisorIdToemployees: { select: { id: true, fullName: true } },
          employees_employee_contracts_employeeIdToemployees: { select: { id: true, fullName: true, employeeNumber: true } }
        }
      })

      // NOTE: Manual contract status changes (suspended/terminated) do NOT automatically
      // sync to employee status. Employee status is managed independently.
      // Only contract SIGNING (via PATCH action) syncs contract->employee status.

      // Contract status changes (suspended) are independent of employee status
      // Employee status should be managed via separate employee status API

      // CRITICAL: If contract is being terminated, update employee and suspend user account
      if (status === 'terminated' && existingContract.status !== 'terminated') {
        // SYNC RULE: Contract terminated → Employee terminated
        const updatedEmployee = await tx.employees.update({
          where: { id: employeeId },
          data: {
            employmentStatus: 'terminated',
            isActive: false
          },
          include: {
            users: true
          }
        })

        // Suspend linked user account automatically
        if (updatedEmployee.users) {
          await tx.users.update({
            where: { id: updatedEmployee.users.id },
            data: {
              isActive: false,
              deactivatedAt: new Date(),
              deactivatedBy: session.user.id,
              deactivationReason: 'Contract terminated',
              deactivationNotes: `Automatically deactivated due to contract termination. Contract: ${contractId}`
            }
          })

          // Deactivate all business memberships
          await tx.businessMemberships.updateMany({
            where: { userId: updatedEmployee.users.id },
            data: { isActive: false }
          })
        }

        // Create audit log for contract termination
        await tx.auditLogs.create({
          data: {
            userId: session.user.id,
            action: 'CONTRACT_TERMINATED',
            resourceType: 'EmployeeContract',
            resourceId: contractId,
            changes: {
              contractId,
              employeeId,
              employeeName: updatedEmployee.fullName,
              employeeNumber: updatedEmployee.employeeNumber,
              terminationReason,
              notes,
              userAccountSuspended: !!updatedEmployee.users,
              linkedUserId: updatedEmployee.users?.id,
              linkedUserEmail: updatedEmployee.users?.email
            },
            businessId: existingContract.primaryBusinessId,
            timestamp: new Date(),
          }
        })
      }

      return contract
    })

    // Map updatedContract to legacy-friendly shape before returning
    const mappedUpdated = {
      ...updatedContract,
      jobTitle: (updatedContract as any).job_titles || null,
      compensationType: (updatedContract as any).compensationTypes || null,
      business: (updatedContract as any).businesses_employee_contracts_primaryBusinessIdTobusinesses || null,
      supervisor: (updatedContract as any).employees_employee_contracts_supervisorIdToemployees || null,
      employee: (updatedContract as any).employees_employee_contracts_employeeIdToemployees || null
    }

    return NextResponse.json(mappedUpdated)
  } catch (error) {
    console.error('Contract update error:', error)
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 }
    )
  }
}