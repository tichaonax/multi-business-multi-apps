import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { hasPermission } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
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

    // NOTE: casting include to 'any' to avoid transient TypeScript include mismatches
    // while the generated Prisma client types settle. TODO: remove 'as any' once
    // prisma client types are stable and include names are verified.
    const includeAny: any = {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        }
      },
      job_titles: true,
      compensation_types: true,
      businesses: {
        select: { id: true, name: true, type: true }
      },
      id_format_templates: true,
      driver_license_templates: true,
      // Prisma generated relation name for employee contracts
      employee_contracts_employee_contracts_employeeIdToemployees: {
        select: ( {
          id: true,
          contractNumber: true,
          version: true,
          status: true,
          baseSalary: true,
          startDate: true,
          endDate: true,
          employeeSignedAt: true,
          managerSignedAt: true,
          isCommissionBased: true,
          isSalaryBased: true,
          notes: true,
          createdAt: true,
          pdfGenerationData: true,
          businesses_employee_contracts_primaryBusinessIdTobusinesses: {
            select: { id: true, name: true, type: true }
          },
          employee_contracts: { select: { id: true, contractNumber: true } },
          job_titles: { select: { id: true, title: true, department: true } },
          employees_employee_contracts_supervisorIdToemployees: { select: { id: true, fullName: true } },
          contract_benefits: { include: { benefit_types: { select: { name: true, type: true } } } }
        } as Prisma.EmployeeContractSelect ),
        orderBy: { createdAt: 'desc' }
      },
      // supervisor relation on Employee model is named `employees` (supervisor link)
      employees: { select: { id: true, fullName: true, job_titles: { select: { title: true } } } },
      other_employees: { select: { id: true, fullName: true, job_titles: { select: { title: true } } } },
  // generated relation name for business assignments (Prisma uses snake_case here)
  employee_business_assignments: { include: { businesses: { select: { id: true, name: true, type: true } } } },
      // generated relation name for disciplinary actions where employeeId is the target
      disciplinary_actions_disciplinary_actions_employeeIdToemployees: {
        select: { id: true, actionType: true, violationType: true, title: true, description: true, incidentDate: true, actionDate: true, severity: true, isActive: true }
      },
      _count: { select: { other_employees: true, disciplinary_actions_disciplinary_actions_employeeIdToemployees: true } }
    }

    const employee = await prisma.employees.findUnique({ where: { id: employeeId }, include: includeAny })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Format response to match expected structure (use any casts to bridge generated Prisma types -> legacy API shape)
    const e: any = employee as any

    // Normalize supervisor: Prisma returns generated relation `employees` which may be an array
    let supervisorObj: any = null
    if (Array.isArray(e.employees)) {
      const s = e.employees[0]
      if (s) {
        supervisorObj = {
          id: s.id,
          fullName: s.fullName,
          jobTitle: (s.job_titles && Array.isArray(s.job_titles)) ? s.job_titles[0] : (s.job_titles || null)
        }
      }
    } else if (e.employees) {
      const s = e.employees
      supervisorObj = {
        id: s.id,
        fullName: s.fullName,
        jobTitle: (s.job_titles && Array.isArray(s.job_titles)) ? s.job_titles[0] : (s.job_titles || null)
      }
    }

    // Normalize subordinates similarly (map to include singular jobTitle)
    const subordinates = (Array.isArray(e.other_employees) ? e.other_employees : (Array.isArray(e.subordinates) ? e.subordinates : [])).map((sub: any) => ({
      id: sub.id,
      fullName: sub.fullName,
      jobTitle: (sub.job_titles && Array.isArray(sub.job_titles)) ? sub.job_titles[0] : (sub.job_titles || null)
    }))

    // Extract compensation type first for use in contracts mapping
    const employeeCompensationType = Array.isArray(e.compensation_types) ? e.compensation_types[0] : (e.compensation_types || null)

    const formattedEmployee = {
      ...e,
      user: e.users,
      jobTitle: Array.isArray(e.job_titles) ? e.job_titles[0] : (e.job_titles || null),
      compensationType: employeeCompensationType,
      primaryBusiness: e.businesses || e.primaryBusiness || null,
      supervisor: supervisorObj,
      subordinates,
      contracts: (e.employee_contracts_employee_contracts_employeeIdToemployees || e.employeeContracts || []).map((contract: any) => {
        // Determine salary frequency for this contract (contract notes override employee compensation type)
        let contractFrequency = employeeCompensationType?.frequency || 'monthly'
        if (contract.notes) {
          const frequencyMatch = contract.notes.match(/\[SALARY_FREQUENCY:(monthly|annual)\]/)
          if (frequencyMatch) {
            contractFrequency = frequencyMatch[1]
          }
        }

        const baseSalary = Number(contract.baseSalary || 0)
        let monthlySalary = 0
        if (contractFrequency === 'monthly') {
          monthlySalary = baseSalary
        } else {
          monthlySalary = baseSalary / 12
        }

        // Choose benefits source: DB relation preferred, fallback to pdfGenerationData.benefits
        let benefitsSource: any[] = []
        if (Array.isArray(contract.contract_benefits) && contract.contract_benefits.length > 0) {
          benefitsSource = contract.contract_benefits
        } else if (contract.pdfGenerationData && Array.isArray(contract.pdfGenerationData.benefits)) {
          benefitsSource = contract.pdfGenerationData.benefits
        }

        // Compute monthly benefits: fixed amounts added directly; percentage benefits calculated against monthlySalary
        const monthlyBenefits = (benefitsSource || []).reduce((total: number, benefit: any) => {
          const amt = Number(benefit.amount || 0)
          if (benefit.isPercentage) {
            return total + (monthlySalary * amt / 100)
          }
          return total + amt
        }, 0)

        return {
          id: contract.id,
          contractNumber: contract.contractNumber,
          version: contract.version,
          status: contract.status,
          employeeSignedAt: contract.employeeSignedAt,
          managerSignedAt: contract.managerSignedAt,
          // Include stored PDF generation payload so clients that use the employee endpoint
          // (instead of fetching the separate contracts endpoint) receive the JSON used
          // by the PDF generator.
          pdfGenerationData: contract.pdfGenerationData || null,
          startDate: contract.startDate,
          endDate: contract.endDate,
          baseSalary: contract.baseSalary,
          isCommissionBased: contract.isCommissionBased,
          isSalaryBased: contract.isSalaryBased,
          notes: contract.notes,
          createdAt: contract.createdAt,
          // Add job title and business for approval modal
          jobTitle: contract.job_titles || null,
          job_titles: contract.job_titles || null,
          business: contract.businesses_employee_contracts_primaryBusinessIdTobusinesses || null,
          businesses_employee_contracts_primaryBusinessIdTobusinesses: contract.businesses_employee_contracts_primaryBusinessIdTobusinesses || null,
          // Add employee info for approval modal
          employee: {
            fullName: e.fullName,
            employeeNumber: e.employeeNumber
          },
          // Normalized benefits list (if using pdfGenerationData the shape may be different)
          benefits: (benefitsSource || []).map((benefit: any) => ({
            id: benefit.id || null,
            amount: benefit.amount,
            isPercentage: benefit.isPercentage,
            notes: benefit.notes || null,
            benefitType: {
              name: benefit.benefitType?.name || benefit.name || null,
              type: benefit.benefitType?.type || null
            }
          })),
          // Expose a normalized previousContract when available from the DB relation
          previousContract: (contract.employee_contracts && contract.employee_contracts.id)
            ? { id: contract.employee_contracts.id, contractNumber: contract.employee_contracts.contractNumber }
            : null,
          // Computed values for client convenience
          _computed: {
            frequency: contractFrequency,
            monthlySalary,
            monthlyBenefits
          }
        }
      }) || [],
      businessAssignments: (e.employee_business_assignments || []).map((assignment: any) => ({
        role: assignment.role,
        isActive: assignment.isActive,
        assignedAt: assignment.assignedAt,
        businesses: assignment.businesses
      })) || [],
      disciplinaryActions: (e.disciplinary_actions_disciplinary_actions_employeeIdToemployees || e.disciplinaryActionsReceived || []).map((action: any) => ({
        id: action.id,
        type: action.actionType,
        severity: action.severity,
        description: action.description,
        actionTaken: action.title,
        actionDate: action.actionDate,
        followUpDate: null,
        isResolved: action.isActive
      })) || [],
      _count: (() => {
        const c = e._count || {}
        return { subordinates: c.other_employees || c.subordinates || 0, disciplinaryActions: c.disciplinary_actions_disciplinary_actions_employeeIdToemployees || c.disciplinaryActionsReceived || 0 }
      })()
    }

    // Calculate latest salary, benefits, and total remuneration
  // Use the normalized/formatted contracts for active contract totals (they include computed monthly values)
  const formattedContracts = formattedEmployee.contracts || []
  const activeContract = formattedContracts.find((c: any) => c.status === 'active')

  if (activeContract) {
    const monthlySalary = Number(activeContract._computed?.monthlySalary || 0)
    const totalBenefits = Number(activeContract._computed?.monthlyBenefits || 0)

    const monthlyRemuneration = monthlySalary + totalBenefits
    const annualRemuneration = monthlyRemuneration * 12

    formattedEmployee.currentSalary = {
      frequency: activeContract._computed?.frequency || e.compensationTypes?.frequency || 'monthly',
      baseSalary: Number(activeContract.baseSalary || 0),
      annualSalary: monthlySalary * 12,
      monthlySalary
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
    const existingEmployee = await prisma.employees.findUnique({
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
      const duplicateNationalId = await prisma.employees.findUnique({
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
      const duplicateEmail = await prisma.employees.findUnique({
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
      prisma.jobTitles.findUnique({ where: { id: jobTitleId } }),
      prisma.compensationTypes.findUnique({ where: { id: compensationTypeId } }),
      prisma.businesses.findUnique({ where: { id: primaryBusinessId } }),
      supervisorId && supervisorId !== employeeId ? prisma.employees.findUnique({ where: { id: supervisorId } }) : null,
      userId ? prisma.users.findUnique({ where: { id: userId } }) : null,
      idFormatTemplateId ? prisma.idFormatTemplates.findUnique({ where: { id: idFormatTemplateId } }) : null
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
      const updatedEmployee = await tx.employees.update({
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
          job_titles: true,
          compensation_types: true,
          businesses: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          id_format_templates: true
        }
      })

      let userSyncAction = null

      // Synchronize linked user account if needed
      if (updatedEmployee.users && shouldDeactivateUser) {
        await tx.users.update({
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
        await tx.businessMemberships.updateMany({
          where: { userId: updatedEmployee.users.id },
          data: { isActive: false }
        })

        userSyncAction = 'deactivated'
      }

      // Create audit log for synchronization
      if (statusChanged && updatedEmployee.users) {
        await tx.auditLogs.create({
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
    const ue: any = result.updatedEmployee as any
    const formattedEmployee = {
      ...ue,
      user: ue.users,
      jobTitle: ue.job_titles || null,
      compensationType: ue.compensation_types || null,
      primaryBusiness: ue.businesses || ue.primaryBusiness || null,
      supervisor: null,
      subordinates: []
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
    const existingEmployee = await prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        // use generated relation name for contracts
        employee_contracts_employee_contracts_employeeIdToemployees: true,
        disciplinary_actions_disciplinary_actions_employeeIdToemployees: true,
        employee_benefits: true,
        other_employees: true
      }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if employee has active contracts
    const activeContracts = ((existingEmployee as any).employee_contracts_employee_contracts_employeeIdToemployees || (existingEmployee as any).employeeContracts || []).filter(
      (contract: any) => contract.status === 'active'
    )

    if (activeContracts.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete employee with active contracts. Please terminate contracts first.' },
        { status: 400 }
      )
    }

    // Check if employee has subordinates
    if ((existingEmployee as any).other_employees.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete employee who supervises other employees. Please reassign subordinates first.' },
        { status: 400 }
      )
    }

    // Safe to delete - mark as inactive instead of hard delete to preserve history
    // Also synchronize linked user account
    const result = await prisma.$transaction(async (tx) => {
      const inactivatedEmployee = await tx.employees.update({
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
        await tx.users.update({
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
        await tx.businessMemberships.updateMany({
          where: { userId: inactivatedEmployee.users.id },
          data: { isActive: false }
        })

        userSyncAction = 'deactivated'
      }

      // Create audit log for termination and synchronization
      await tx.auditLogs.create({
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