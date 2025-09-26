import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ employeeId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params

    // Check if user has permission to view employees
    if (!hasPermission(session.user, 'canViewEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true
          }
        },
        jobTitles: true,
        compensationTypes: true,
        business: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        idFormatTemplate: true,
        driverLicenseTemplate: true,
        employeeContracts: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                type: true
              }
            },
            jobTitle: {
              select: {
                id: true,
                title: true,
                department: true
              }
            },
            supervisor: {
              select: {
                id: true,
                fullName: true
              }
            },
            contractBenefits: {
              include: {
                benefitType: {
                  select: {
                    name: true,
                    type: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        supervisor: {
          select: {
            id: true,
            fullName: true,
            jobTitles: {
              select: {
                title: true
              }
            }
          }
        },
        subordinates: {
          select: {
            id: true,
            fullName: true,
            jobTitles: {
              select: {
                title: true
              }
            }
          }
        },
        employeeBusinessAssignments: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        disciplinaryActionsReceived: {
          select: {
            id: true,
            actionType: true,
            violationType: true,
            title: true,
            description: true,
            incidentDate: true,
            actionDate: true,
            severity: true,
            isActive: true
          }
        },
        _count: {
          select: {
            subordinates: true,
            disciplinaryActionsReceived: true
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Format response to match expected structure
    const formattedEmployee = {
      ...employee,
      user: employee.users,
      jobTitle: employee.jobTitles,
      compensationType: employee.compensationTypes,
      primaryBusiness: employee.business,
      supervisor: employee.supervisor,
      subordinates: employee.subordinates || [],
      contracts: employee.employeeContracts?.map(contract => ({
        id: contract.id,
        contractNumber: contract.contractNumber,
        version: contract.version,
        status: contract.status,
        employeeSignedAt: contract.employeeSignedAt,
        startDate: contract.startDate,
        endDate: contract.endDate,
        baseSalary: contract.baseSalary,
        isCommissionBased: contract.isCommissionBased,
        isSalaryBased: contract.isSalaryBased,
        notes: contract.notes,
        createdAt: contract.createdAt,
        benefits: contract.contractBenefits?.map(benefit => ({
          id: benefit.id,
          amount: benefit.amount,
          isPercentage: benefit.isPercentage,
          notes: benefit.notes,
          benefitType: {
            name: benefit.benefitType.name,
            type: benefit.benefitType.type
          }
        })) || []
      })) || [],
      businessAssignments: employee.employeeBusinessAssignments?.map(assignment => ({
        business: assignment.business,
        role: assignment.role,
        isActive: assignment.isActive,
        assignedAt: assignment.assignedAt
      })) || [],
      disciplinaryActions: employee.disciplinaryActionsReceived?.map(action => ({
        id: action.id,
        type: action.actionType,
        severity: action.severity,
        description: action.description,
        actionTaken: action.title,
        actionDate: action.actionDate,
        followUpDate: null,
        isResolved: action.isActive
      })) || [],
      _count: employee._count || { subordinates: 0, disciplinaryActions: 0 }
    }

    // Calculate latest salary, benefits, and total remuneration
    const activeContract = employee.employeeContracts?.find(contract => contract.status === 'active')

    if (activeContract) {
      // Extract frequency from contract notes (priority) or fallback to compensation type
      let frequency = employee.compensationTypes?.frequency || 'monthly'

      // Check if contract has frequency specified in notes
      if (activeContract.notes) {
        const frequencyMatch = activeContract.notes.match(/\[SALARY_FREQUENCY:(monthly|annual)\]/)
        if (frequencyMatch) {
          frequency = frequencyMatch[1]
        }
      }

      const baseSalary = Number(activeContract.baseSalary)

      // Calculate annual and monthly salary
      let annualSalary: number
      let monthlySalary: number

      if (frequency === 'monthly') {
        annualSalary = baseSalary * 12
        monthlySalary = baseSalary
      } else {
        annualSalary = baseSalary
        monthlySalary = baseSalary / 12
      }

      // Calculate total benefits from active contract
      // Note: All percentage-based benefits calculated against MONTHLY salary
      const totalBenefits = activeContract.contractBenefits?.reduce((total, benefit) => {
        const benefitAmount = Number(benefit.amount)
        if (benefit.isPercentage) {
          // Calculate percentage of MONTHLY salary (as specified)
          return total + (monthlySalary * benefitAmount / 100)
        } else {
          // Fixed amount benefit (assumed to be monthly)
          return total + benefitAmount
        }
      }, 0) || 0

      // Calculate total remuneration (monthly salary + monthly benefits)
      // Then convert to annual for display
      const monthlyRemuneration = monthlySalary + totalBenefits
      const annualRemuneration = monthlyRemuneration * 12

      // Add calculated fields to the formatted employee
      formattedEmployee.currentSalary = {
        frequency: frequency,
        baseSalary: baseSalary,
        annualSalary: annualSalary,
        monthlySalary: monthlySalary
      }

      formattedEmployee.totalBenefits = totalBenefits
      formattedEmployee.totalRemuneration = annualRemuneration
      formattedEmployee.monthlyRemuneration = monthlyRemuneration
    }

    return NextResponse.json(formattedEmployee)
  } catch (error) {
    console.error('Employee fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
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

    const { employeeId } = await params

    // Check if user has permission to edit employees
    if (!hasPermission(session.user, 'canEditEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      nationalId,
      idFormatTemplateId,
      driverLicenseNumber,
      driverLicenseTemplateId,
      address,
      dateOfBirth,
      jobTitleId,
      compensationTypeId,
      supervisorId,
      primaryBusinessId,
      hireDate,
      startDate,
      terminationDate,
      employmentStatus,
      customResponsibilities,
      notes,
      userId,
      isActive
    } = data

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Validation
    if (!firstName || !lastName || !phone || !nationalId || !jobTitleId || 
        !compensationTypeId || !primaryBusinessId || !hireDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check for duplicate national ID (excluding current employee)
    if (nationalId !== existingEmployee.nationalId) {
      const duplicateNationalId = await prisma.employee.findUnique({
        where: { nationalId }
      })

      if (duplicateNationalId) {
        return NextResponse.json(
          { error: 'An employee with this national ID already exists' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate email (excluding current employee)
    if (email && email !== existingEmployee.email) {
      const duplicateEmail = await prisma.employee.findUnique({
        where: { email }
      })

      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'An employee with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Validate foreign key references
    const [jobTitle, compensationType, business, supervisor, user, idTemplate] = await Promise.all([
      prisma.jobTitle.findUnique({ where: { id: jobTitleId } }),
      prisma.compensationType.findUnique({ where: { id: compensationTypeId } }),
      prisma.business.findUnique({ where: { id: primaryBusinessId } }),
      supervisorId && supervisorId !== employeeId ? prisma.employee.findUnique({ where: { id: supervisorId } }) : null,
      userId ? prisma.user.findUnique({ where: { id: userId } }) : null,
      idFormatTemplateId ? prisma.idFormatTemplate.findUnique({ where: { id: idFormatTemplateId } }) : null
    ])

    if (!jobTitle || !compensationType || !business) {
      return NextResponse.json(
        { error: 'Invalid job title, compensation type, or business' },
        { status: 400 }
      )
    }

    if (supervisorId && supervisorId !== employeeId && !supervisor) {
      return NextResponse.json(
        { error: 'Invalid supervisor' },
        { status: 400 }
      )
    }

    // Cannot set self as supervisor
    if (supervisorId === employeeId) {
      return NextResponse.json(
        { error: 'Employee cannot be their own supervisor' },
        { status: 400 }
      )
    }

    if (userId && !user) {
      return NextResponse.json(
        { error: 'Invalid user account' },
        { status: 400 }
      )
    }

    // Validate national ID format if template is provided
    if (idFormatTemplateId && idTemplate) {
      const regex = new RegExp(idTemplate.pattern)
      if (!regex.test(nationalId)) {
        return NextResponse.json(
          { error: `National ID format is invalid. Expected format: ${idTemplate.example}` },
          { status: 400 }
        )
      }
    }

    // Check for status changes that require user account synchronization
    const oldEmploymentStatus = existingEmployee.employmentStatus
    const oldIsActive = existingEmployee.isActive
    const newEmploymentStatus = employmentStatus || oldEmploymentStatus
    const newIsActive = isActive !== undefined ? isActive : oldIsActive

    const statusChanged = oldEmploymentStatus !== newEmploymentStatus || oldIsActive !== newIsActive
    const shouldDeactivateUser = 
      statusChanged && (newEmploymentStatus === 'terminated' || newEmploymentStatus === 'suspended' || newIsActive === false)

    // Update the employee with user synchronization
    const result = await prisma.$transaction(async (tx) => {
      // Update employee
      const updatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: {
          userId: userId || null,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`,
          email: email || null,
          phone,
          nationalId,
          idFormatTemplateId: idFormatTemplateId || null,
          driverLicenseNumber: driverLicenseNumber || null,
          driverLicenseTemplateId: driverLicenseTemplateId || null,
          address: address || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          jobTitleId,
          compensationTypeId,
          supervisorId: supervisorId || null,
          primaryBusinessId,
          hireDate: new Date(hireDate),
          startDate: startDate ? new Date(startDate) : null,
          terminationDate: terminationDate ? new Date(terminationDate) : null,
          employmentStatus: newEmploymentStatus,
          customResponsibilities: customResponsibilities || null,
          notes: notes || null,
          isActive: newIsActive,
          updatedAt: new Date()
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true
            }
          },
          jobTitles: true,
          compensationTypes: true,
          business: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          idFormatTemplate: true
        }
      })

      let userSyncAction = null

      // Synchronize linked user account if needed
      if (updatedEmployee.users && shouldDeactivateUser) {
        await tx.user.update({
          where: { id: updatedEmployee.users.id },
          data: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivatedBy: session.user.id,
            deactivationReason: `Employee ${newEmploymentStatus}`,
            deactivationNotes: `Automatically deactivated due to employee status change to ${newEmploymentStatus}`
          }
        })

        // Deactivate business memberships
        await tx.businessMembership.updateMany({
          where: { userId: updatedEmployee.users.id },
          data: { isActive: false }
        })

        userSyncAction = 'deactivated'
      }

      // Create audit log for synchronization
      if (statusChanged && updatedEmployee.users) {
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'EMPLOYEE_STATUS_SYNC',
            resourceType: 'Employee',
            resourceId: employeeId,
            changes: {
              employeeId,
              employeeName: updatedEmployee.fullName,
              employeeNumber: updatedEmployee.employeeNumber,
              oldStatus: oldEmploymentStatus,
              newStatus: newEmploymentStatus,
              oldActive: oldIsActive,
              newActive: newIsActive,
              linkedUserId: updatedEmployee.users.id,
              linkedUserEmail: updatedEmployee.users.email,
              userSyncAction,
              reason: 'Employee status update'
            },
            businessId: updatedEmployee.primaryBusinessId,
            timestamp: new Date(),
          }
        })
      }

      return { updatedEmployee, userSyncAction }
    })

    // Format response to match expected structure
    const formattedEmployee = {
      ...result.updatedEmployee,
      user: result.updatedEmployee.users,
      jobTitle: result.updatedEmployee.jobTitles,
      compensationType: result.updatedEmployee.compensationTypes,
      primaryBusiness: result.updatedEmployee.business,
      supervisor: null, // Simplified for now
      subordinates: [] // Simplified for now
    }

    const response: any = {
      ...formattedEmployee,
      message: 'Employee updated successfully'
    }

    // Add user sync information if applicable
    if (result.userSyncAction) {
      response.userSync = {
        action: result.userSyncAction,
        message: result.userSyncAction === 'deactivated' 
          ? 'Linked user account has been deactivated due to employee status change'
          : 'User account status synchronized with employee status'
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Employee update error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0]
      if (field === 'nationalId') {
        return NextResponse.json(
          { error: 'An employee with this national ID already exists' },
          { status: 400 }
        )
      }
      if (field === 'email') {
        return NextResponse.json(
          { error: 'An employee with this email already exists' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to update employee' },
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

    const { employeeId } = await params

    // Check if user has permission to delete employees
    if (!hasPermission(session.user, 'canDeleteEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employeeContracts: true,
        disciplinaryActionsReceived: true,
        employeeBenefits: true,
        otherEmployees: true
      }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if employee has active contracts
    const activeContracts = existingEmployee.employeeContracts.filter(
      contract => contract.status === 'active'
    )

    if (activeContracts.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete employee with active contracts. Please terminate contracts first.' },
        { status: 400 }
      )
    }

    // Check if employee has subordinates
    if (existingEmployee.otherEmployees.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete employee who supervises other employees. Please reassign subordinates first.' },
        { status: 400 }
      )
    }

    // Safe to delete - mark as inactive instead of hard delete to preserve history
    // Also synchronize linked user account
    const result = await prisma.$transaction(async (tx) => {
      const inactivatedEmployee = await tx.employee.update({
        where: { id: employeeId },
        data: {
          isActive: false,
          employmentStatus: 'terminated',
          terminationDate: new Date(),
          notes: existingEmployee.notes ? 
            `${existingEmployee.notes}\n\n[${new Date().toISOString()}] Account deactivated by ${session.user.name}` :
            `[${new Date().toISOString()}] Account deactivated by ${session.user.name}`
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true
            }
          }
        }
      })

      let userSyncAction = null

      // Synchronize linked user account
      if (inactivatedEmployee.users && inactivatedEmployee.users.isActive) {
        await tx.user.update({
          where: { id: inactivatedEmployee.users.id },
          data: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivatedBy: session.user.id,
            deactivationReason: 'Employee terminated',
            deactivationNotes: `Automatically deactivated due to employee termination by ${session.user.name}`
          }
        })

        // Deactivate business memberships
        await tx.businessMembership.updateMany({
          where: { userId: inactivatedEmployee.users.id },
          data: { isActive: false }
        })

        userSyncAction = 'deactivated'
      }

      // Create audit log for termination and synchronization
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'EMPLOYEE_TERMINATED',
          resourceType: 'Employee',
          resourceId: employeeId,
          changes: {
            employeeId,
            employeeName: inactivatedEmployee.fullName,
            employeeNumber: inactivatedEmployee.employeeNumber,
            terminationDate: inactivatedEmployee.terminationDate,
            linkedUserId: inactivatedEmployee.users?.id,
            linkedUserEmail: inactivatedEmployee.users?.email,
            userSyncAction,
            reason: 'Employee termination'
          },
          businessId: inactivatedEmployee.primaryBusinessId,
          timestamp: new Date(),
        }
      })

      return { inactivatedEmployee, userSyncAction }
    })

    const response: any = { 
      message: 'Employee deactivated successfully',
      employee: result.inactivatedEmployee
    }

    // Add user sync information if applicable
    if (result.userSyncAction) {
      response.userSync = {
        action: result.userSyncAction,
        message: 'Linked user account has been deactivated due to employee termination'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Employee deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate employee' },
      { status: 500 }
    )
  }
}