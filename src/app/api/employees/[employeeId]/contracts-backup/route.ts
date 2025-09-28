import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if user has permission to view employee contracts
    if (!hasPermission(session.user, 'canViewEmployeeContracts')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const contracts = await prisma.employeeContract.findMany({
      where: { employeeId: id },
      include: {
        jobTitle: true,
        compensationType: true,
        business: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        supervisor: {
          select: {
            id: true,
            fullName: true,
            jobTitle: true
          }
        },
        benefits: {
          include: {
            benefitType: true
          }
        },
        originalRenewals: {
          select: {
            id: true,
            status: true,
            renewalDueDate: true,
            isAutoRenewal: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error('Employee contracts fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee contracts' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if user has permission to create employee contracts
    if (!hasPermission(session.user, 'canCreateEmployeeContracts')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      jobTitleId,
      compensationTypeId,
      baseSalary,
      customResponsibilities,
      startDate,
      endDate,
      probationPeriodMonths,
      primaryBusinessId,
      additionalBusinesses,
      supervisorId,
      isCommissionBased,
      isSalaryBased,
      benefits, // Array of { benefitTypeId, amount, isPercentage, notes }
      notes
    } = data

    // Validation
    if (!jobTitleId || !compensationTypeId || !baseSalary || !startDate || 
        !primaryBusinessId || !supervisorId) {
      return NextResponse.json(
        { error: 'Missing required contract fields' },
        { status: 400 }
      )
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Validate foreign key references
    const [jobTitle, compensationType, business, supervisor] = await Promise.all([
      prisma.jobTitle.findUnique({ where: { id: jobTitleId } }),
      prisma.compensation_types.findUnique({ where: { id: compensationTypeId } }),
      prisma.business.findUnique({ where: { id: primaryBusinessId } }),
      prisma.employee.findUnique({ where: { id: supervisorId } })
    ])

    if (!jobTitle || !compensationType || !business || !supervisor) {
      return NextResponse.json(
        { error: 'Invalid job title, compensation type, business, or supervisor' },
        { status: 400 }
      )
    }

    // Generate unique contract number
    const contractCount = await prisma.employeeContract.count()
    const contractNumber = `CON${String(contractCount + 1).padStart(6, '0')}`

    // Get next version number for this employee
    const lastContract = await prisma.employeeContract.findFirst({
      where: { employeeId: id },
      orderBy: { version: 'desc' }
    })
    const version = (lastContract?.version || 0) + 1

    // Create the contract with all related data in a transaction
    const contract = await prisma.$transaction(async (tx) => {
      // Create the contract
      const newContract = await tx.employeeContract.create({
        data: {
          employeeId: id,
          contractNumber,
          version,
          jobTitleId,
          compensationTypeId,
          baseSalary: parseFloat(baseSalary),
          customResponsibilities: customResponsibilities || null,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          probationPeriodMonths: probationPeriodMonths || null,
          primaryBusinessId,
          additionalBusinesses: Array.isArray(additionalBusinesses) ? additionalBusinesses : [],
          supervisorId,
          supervisorName: supervisor.fullName,
          supervisorTitle: supervisor.jobTitle?.title || 'Manager',
          isCommissionBased: isCommissionBased || false,
          isSalaryBased: isSalaryBased !== false, // Default to true unless explicitly false
          notes: notes || null,
          createdBy: session.user.id
        }
      })

      // Create contract benefits if provided
      if (Array.isArray(benefits) && benefits.length > 0) {
        await tx.contractBenefit.createMany({
          data: benefits.map((benefit: any) => ({
            contractId: newContract.id,
            benefitTypeId: benefit.benefitTypeId,
            amount: parseFloat(benefit.amount),
            isPercentage: benefit.isPercentage || false,
            notes: benefit.notes || null
          }))
        })
      }

      return newContract
    })

    // Fetch the complete contract data
    const completeContract = await prisma.employeeContract.findUnique({
      where: { id: contract.id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true
          }
        },
        jobTitle: true,
        compensationType: true,
        business: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        supervisor: {
          select: {
            id: true,
            fullName: true,
            jobTitle: true
          }
        },
        benefits: {
          include: {
            benefitType: true
          }
        }
      }
    })

    return NextResponse.json(completeContract)
  } catch (error: any) {
    console.error('Employee contract creation error:', error)
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0]
      if (field === 'contractNumber') {
        return NextResponse.json(
          { error: 'Contract number conflict. Please try again.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create employee contract' },
      { status: 500 }
    )
  }
}