import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildEmployeeQueryFilter, canUserPerformEmployeeAction } from '@/lib/employee-access-control'
import { SessionUser } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const department = searchParams.get('department') || ''
    const status = searchParams.get('status') || 'all'
    const sortBy = searchParams.get('sortBy') || ''
    const sortOrder = searchParams.get('sortOrder') || ''

    // Build access control filter with department-based restrictions
    const accessFilter = buildEmployeeQueryFilter(user)

    // Add additional filters
    const whereClause: any = {
      ...accessFilter,
      ...(status === 'active' ? { isActive: true } : {}),
      ...(status === 'inactive' ? { isActive: false } : {}),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { employeeNumber: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }),
      ...(department && {
        jobTitles: {
          department: department
        }
      })
    }

    // Build dynamic sorting based on sortBy and sortOrder parameters
    let orderBy: any = [
      { createdAt: 'desc' },
      { isActive: 'desc' },
      { fullName: 'asc' }
    ]

    if (sortBy && sortOrder) {
      const sortFields = sortBy.split(',')
      const sortOrders = sortOrder.split(',')

      orderBy = sortFields.map((field: string, index: number) => {
        const order = sortOrders[index] || 'asc'
        return { [field]: order }
      })
    }

    const skip = (page - 1) * limit

    // OPTIMIZED: Get employees with minimal essential data only
    const [employees, totalCount] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        select: {
          id: true,
          employeeNumber: true,
          fullName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          nationalId: true,
          hireDate: true,
          employmentStatus: true,
          isActive: true,
          jobTitleId: true,
          compensationTypeId: true,
          primaryBusinessId: true,
          // Only include absolutely essential related data
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          // Include active contract data for salary increase functionality
          employeeContracts: {
            where: {
              status: 'active'
            },
            select: {
              id: true,
              status: true,
              baseSalary: true,
              employeeSignedAt: true,
              notes: true
            },
            take: 1
          },
          _count: {
            select: {
              employeeContracts: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.employee.count({ where: whereClause })
    ])

    // OPTIMIZED: Get related data in separate, lighter queries
    const jobTitleIds = [...new Set(employees.map(e => e.jobTitleId).filter(Boolean))]
    const compensationTypeIds = [...new Set(employees.map(e => e.compensationTypeId).filter(Boolean))]
    const businessIds = [...new Set(employees.map(e => e.primaryBusinessId).filter(Boolean))]

    const [jobTitles, compensationTypes, businesses] = await Promise.all([
      jobTitleIds.length > 0 ? prisma.jobTitle.findMany({
        where: { id: { in: jobTitleIds } },
        select: { id: true, title: true, department: true, level: true }
      }) : [],
      compensationTypeIds.length > 0 ? prisma.compensationType.findMany({
        where: { id: { in: compensationTypeIds } },
        select: { id: true, name: true, type: true, frequency: true }
      }) : [],
      businessIds.length > 0 ? prisma.business.findMany({
        where: { id: { in: businessIds } },
        select: { id: true, name: true, type: true }
      }) : []
    ])

    // Create lookup maps for O(1) access
    const jobTitleMap = new Map(jobTitles.map(jt => [jt.id, jt]))
    const compensationTypeMap = new Map(compensationTypes.map(ct => [ct.id, ct]))
    const businessMap = new Map(businesses.map(b => [b.id, b]))

    // OPTIMIZED: Format response data using lookup maps
    const formattedEmployees = employees.map(employee => {
      const jobTitle = jobTitleMap.get(employee.jobTitleId)
      const compensationType = compensationTypeMap.get(employee.compensationTypeId)
      const business = businessMap.get(employee.primaryBusinessId)

      return {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        fullName: employee.fullName,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        nationalId: employee.nationalId,
        hireDate: employee.hireDate,
        employmentStatus: employee.employmentStatus,
        isActive: employee.isActive,
        user: employee.users,
        jobTitle: jobTitle ? {
          title: jobTitle.title,
          department: jobTitle.department,
          level: jobTitle.level
        } : null,
        compensationType: compensationType ? {
          name: compensationType.name,
          type: compensationType.type,
          frequency: compensationType.frequency
        } : null,
        primaryBusiness: business ? {
          id: business.id,
          name: business.name,
          type: business.type
        } : null,
        // Include active contract data for salary increase functionality
        employeeContracts: employee.employeeContracts || [],
        contractCount: employee._count.employeeContracts
      }
    })

    return NextResponse.json({
      employees: formattedEmployees,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Employee fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    
    // Check if user can create employees
    if (!canUserPerformEmployeeAction(user, 'create')) {
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
      address,
      dateOfBirth,
      jobTitleId,
      compensationTypeId,
      supervisorId,
      primaryBusinessId,
      hireDate,
      startDate,
      customResponsibilities,
      notes,
      userId,
      employmentStatus = 'pendingContract',
      businessAssignments = [],
      annualLeaveDays = 21,
      sickLeaveDays = 10
    } = data

    // Validation
    if (!firstName || !lastName || !phone || !nationalId || !jobTitleId || 
        !compensationTypeId || !primaryBusinessId || !hireDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check for duplicate national ID
    const existingEmployee = await prisma.employee.findUnique({
      where: { nationalId: nationalId }
    })

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'An employee with this national ID already exists' },
        { status: 400 }
      )
    }

    // Check for duplicate email if provided
    if (email) {
      const existingEmailEmployee = await prisma.employee.findUnique({
        where: { email }
      })

      if (existingEmailEmployee) {
        return NextResponse.json(
          { error: 'An employee with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Validate foreign key references (using correct table names)
    const [jobTitle, compensationType, business, supervisor, userAccount, idTemplate] = await Promise.all([
      prisma.jobTitle.findUnique({ where: { id: jobTitleId } }),
      prisma.compensationType.findUnique({ where: { id: compensationTypeId } }),
      prisma.business.findUnique({ where: { id: primaryBusinessId } }),
      supervisorId ? prisma.employee.findUnique({ where: { id: supervisorId } }) : null,
      userId ? prisma.user.findUnique({ where: { id: userId } }) : null,
      idFormatTemplateId ? prisma.idFormatTemplate.findUnique({ where: { id: idFormatTemplateId } }) : null
    ])

    if (!jobTitle || !compensationType || !business) {
      return NextResponse.json(
        { error: 'Invalid job title, compensation type, or business' },
        { status: 400 }
      )
    }

    if (supervisorId && !supervisor) {
      return NextResponse.json(
        { error: 'Invalid supervisor' },
        { status: 400 }
      )
    }

    if (userId && !userAccount) {
      return NextResponse.json(
        { error: 'Invalid user account' },
        { status: 400 }
      )
    }

    // Generate unique employee number
    const employeeCount = await prisma.employee.count()
    const employeeNumber = `EMP${String(employeeCount + 1).padStart(6, '0')}`

    // Create employee in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create employee
      const newEmployee = await tx.employee.create({
        data: {
          employeeNumber: employeeNumber,
          userId: userId,
          firstName: firstName,
          lastName: lastName,
          fullName: `${firstName} ${lastName}`,
          email: email || null,
          phone,
          nationalId: nationalId,
          idFormatTemplateId: idFormatTemplateId || null,
          address: address || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          jobTitleId: jobTitleId,
          compensationTypeId: compensationTypeId,
          supervisorId: supervisorId || null,
          primaryBusinessId: primaryBusinessId,
          hireDate: new Date(hireDate),
          startDate: startDate ? new Date(startDate) : new Date(hireDate),
          customResponsibilities: customResponsibilities || null,
          notes: notes || null,
          createdBy: user.id,
          isActive: false,
          employmentStatus: employmentStatus
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          jobTitles: true,
          compensationTypes: true,
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

      // Create leave balance for current year
      const currentYear = new Date().getFullYear()
      await tx.employeeLeaveBalance.create({
        data: {
          employeeId: newEmployee.id,
          year: currentYear,
          annualLeaveDays: annualLeaveDays,
          sickLeaveDays: sickLeaveDays,
          usedAnnualDays: 0,
          usedSickDays: 0,
          remainingAnnual: annualLeaveDays,
          remainingSick: sickLeaveDays
        }
      })

      // Create primary business assignment
      await tx.employeeBusinessAssignment.create({
        data: {
          employeeId: newEmployee.id,
          businessId: primaryBusinessId,
          isPrimary: true,
          role: 'Employee',
          assignedBy: user.id,
          isActive: true
        }
      })

      // Create additional business assignments
      if (businessAssignments && businessAssignments.length > 0) {
        const additionalAssignments = businessAssignments.map((assignment: any) => ({
          employeeId: newEmployee.id,
          businessId: assignment.businessId,
          isPrimary: false,
          role: assignment.role || 'Employee',
          assignedBy: user.id,
          isActive: true
        }))

        await tx.employeeBusinessAssignment.createMany({
          data: additionalAssignments
        })
      }

      return newEmployee
    })

    return NextResponse.json({
      message: 'Employee created successfully',
      employee: {
        id: result.id,
        employeeNumber: result.employeeNumber,
        fullName: result.fullName,
        email: result.email,
        phone: result.phone,
        jobTitle: result.jobTitles?.title,
        department: result.jobTitles?.department,
        compensationType: result.compensationTypes?.name,
        primaryBusiness: result.business?.name
      }
    })
  } catch (error: any) {
    console.error('Employee creation error:', error)
    
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
      if (field === 'employeeNumber') {
        return NextResponse.json(
          { error: 'Employee number conflict. Please try again.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}