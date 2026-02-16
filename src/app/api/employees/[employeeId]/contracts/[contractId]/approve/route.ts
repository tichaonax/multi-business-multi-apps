import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { randomUUID } from 'crypto'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ employeeId: string; contractId: string }>
}

/**
 * POST /api/employees/[employeeId]/contracts/[contractId]/approve
 *
 * Manager approves a contract that has been signed by the employee.
 * This is the second step in the two-step contract approval workflow:
 * 1. Employee signs (status: draft → pendingApproval)
 * 2. Manager approves (status: pendingApproval → active, employee activated)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId, contractId } = await params

    // Check if user has permission to approve contracts
    if (!hasPermission(user, 'canApproveEmployeeContracts') &&
        !hasPermission(user, 'canEditEmployeeContracts')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve contracts' },
        { status: 403 }
      )
    }

    // Verify contract exists and belongs to the employee
    const existingContract = await prisma.employeeContracts.findUnique({
      where: {
        id: contractId,
        employeeId: employeeId
      },
      include: {
        employees_employee_contracts_employeeIdToemployees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            employmentStatus: true
          }
        }
      }
    })

    if (!existingContract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Validation: Contract cannot be terminated
    if (existingContract.status === 'terminated') {
      return NextResponse.json(
        { error: 'Cannot approve a terminated contract' },
        { status: 400 }
      )
    }

    // Validation: Manager must not have already signed
    if (existingContract.managerSignedAt) {
      return NextResponse.json(
        { error: 'Contract has already been approved by manager' },
        { status: 400 }
      )
    }

    // Approve the contract and activate employee
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date()

      // Update contract with manager signature and activate
      // If employee hasn't signed yet (legacy contract), set both signatures
      const approvedContract = await tx.employeeContracts.update({
        where: { id: contractId },
        data: {
          employeeSignedAt: existingContract.employeeSignedAt || now, // Set if null (legacy contracts)
          managerSignedAt: now,
          status: 'active',
          approvedBy: user.id,
          approvedAt: now
        }
      })

      // Activate the employee (can now create user accounts, access systems)
      const activatedEmployee = await tx.employees.update({
        where: { id: employeeId },
        data: {
          employmentStatus: 'active',
          isActive: true
        }
      })

      // Create audit log for contract approval
      await tx.auditLogs.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          action: 'CONTRACT_APPROVED',
          entityType: 'EmployeeContract',
          entityId: contractId,
          timestamp: new Date(),
          changes: {
            contractId,
            contractNumber: existingContract.contractNumber,
            employeeId,
            employeeName: existingContract.employees_employee_contracts_employeeIdToemployees?.fullName,
            employeeNumber: existingContract.employees_employee_contracts_employeeIdToemployees?.employeeNumber,
            employeeSignedAt: existingContract.employeeSignedAt,
            managerSignedAt: approvedContract.managerSignedAt,
            approvedBy: user.id,
            previousStatus: existingContract.status,
            newStatus: 'active',
            employeePreviousStatus: existingContract.employees_employee_contracts_employeeIdToemployees?.employmentStatus,
            employeeNewStatus: 'active'
          },
          metadata: {
            businessId: existingContract.primaryBusinessId,
            approvalType: existingContract.employeeSignedAt ? 'manager_approval' : 'direct_sign_and_approve'
          }
        }
      })

      return { approvedContract, activatedEmployee }
    })

    return NextResponse.json({
      message: 'Contract approved successfully. Employee has been activated.',
      contract: result.approvedContract,
      employee: result.activatedEmployee
    })

  } catch (error: any) {
    console.error('Contract approval error:', error)

    // Handle specific database constraint errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Contract or employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to approve contract' },
      { status: 500 }
    )
  }
}
