import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

// GET - Search employees with optional contract data
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view employees
    if (!hasPermission(user, 'canViewEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const contractsOnly = searchParams.get('contractsOnly') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const excludeId = searchParams.get('excludeId') || null

    // Build where clause
    const whereClause: any = {
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { employeeNumber: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    }

    // Exclude a specific employee id if provided
    if (excludeId) {
      whereClause.id = { not: excludeId }
    }

    // Filter by active status if not including inactive
    if (!includeInactive) {
      whereClause.isActive = true
    }

    // If contractsOnly is true, only include employees with contracts
    if (contractsOnly) {
      whereClause.employee_contracts_employee_contracts_employeeIdToemployees = {
        some: {}
      }
    }

    // Search employees
    const employees = await prisma.employees.findMany({
      where: whereClause,
      take: limit,
      orderBy: [
        { isActive: 'desc' }, // Active first
        { fullName: 'asc' }
      ],
      select: {
        id: true,
        employeeNumber: true,
        fullName: true,
        email: true,
        isActive: true,
        job_titles: {
          select: { title: true, department: true }
        },
        businesses: {
          select: {
            name: true,
            type: true
          }
        },
        // Include latest contract if contractsOnly is true
        ...(contractsOnly && {
          employee_contracts_employee_contracts_employeeIdToemployees: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              contractNumber: true,
              status: true,
              startDate: true,
              endDate: true,
              createdAt: true,
              baseSalary: true,
              // Include stored benefits as well as the PDF generation payload (some older contracts
              // have benefits embedded in pdfGenerationData rather than as relation rows)
              contract_benefits: {
                select: {
                  id: true,
                  amount: true,
                  isPercentage: true,
                  notes: true,
                  benefit_types: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              },
              isRenewal: true,
              renewalCount: true
            }
          }
        })
      }
    })

    // Transform the data for frontend consumption
    const transformedEmployees = employees.map(employee => ({
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      email: employee.email,
      isActive: employee.isActive,
  jobTitle: employee.job_titles?.title,
  department: employee.job_titles?.department,
  businessName: employee.businesses?.name,
  businessType: employee.businesses?.type,
      // Contract info (if requested)
      ...(contractsOnly && {
        // Expose contracts directly; benefits come only from the contract_benefits relation
        latestContract: (employee.employee_contracts_employee_contracts_employeeIdToemployees?.[0] || null),
        contracts: (employee.employee_contracts_employee_contracts_employeeIdToemployees || []).map((c: any) => c),
        hasContract: employee.employee_contracts_employee_contracts_employeeIdToemployees?.length > 0
      })
    }))

    return NextResponse.json({
      success: true,
      data: transformedEmployees,
      meta: {
        count: transformedEmployees.length,
        query,
        includeInactive,
        contractsOnly
      }
    })

  } catch (error) {
    console.error('Error searching employees:', error)
    return NextResponse.json(
      { error: 'Failed to search employees' },
      { status: 500 }
    )
  }
}