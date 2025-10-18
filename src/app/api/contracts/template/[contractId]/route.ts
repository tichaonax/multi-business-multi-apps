import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

// GET - Fetch contract data suitable for copying as a template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view contracts
    if (!hasPermission(session.user, 'canViewEmployeeContracts')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

  const resolvedParams = await params
  const { contractId } = resolvedParams

    // Fetch contract data with all related information needed for copying
    const contract = await prisma.employeeContracts.findUnique({
      where: { id: contractId },
      include: {
        // Include all copyable data
        job_titles: {
          select: {
            id: true,
            title: true,
            department: true,
            description: true,
            responsibilities: true
          }
        },
        compensation_types: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true
          }
        },
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
            fullName: true,
            jobTitleId: true
          }
        },
        contract_benefits: {
          include: {
            benefit_types: {
              select: {
                id: true,
                name: true,
                type: true,
                defaultAmount: true,
                isPercentage: true
              }
            }
          }
        },
        // Include source employee info for reference
        employees_employee_contracts_employeeIdToemployees: {
          select: {
            id: true,
            fullName: true,
            isActive: true,
            employeeNumber: true
          }
        }
      }
    }) as any

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Transform contract data for template use
    const templateData = {
      // Copyable contract fields
      jobTitleId: contract.jobTitleId,
      compensationTypeId: contract.compensationTypeId,
      baseSalary: contract.baseSalary.toString(),
      customResponsibilities: contract.customResponsibilities,
      probationPeriodMonths: contract.probationPeriodMonths,
      primaryBusinessId: contract.primaryBusinessId,
      supervisorId: contract.supervisorId,
      isCommissionBased: contract.isCommissionBased,
      isSalaryBased: contract.isSalaryBased,
      commissionAmount: contract.commissionAmount?.toString(),
      livingAllowance: contract.livingAllowance?.toString(),
      contractDurationMonths: contract.contractDurationMonths,
      notes: contract.notes,

      // Benefits data
      benefits: contract.contract_benefits.map((benefit: any) => ({
        benefitTypeId: benefit.benefitTypeId || benefit.benefitType?.id || '',
        amount: benefit.amount != null ? String(benefit.amount) : '',
        isPercentage: !!benefit.isPercentage,
        notes: benefit.notes || ''
      })),

      // Related data for form population
      jobTitle: contract.job_titles,
      compensationType: contract.compensationTypes,
      primaryBusiness: contract.businesses_employee_contracts_primaryBusinessIdTobusinesses,
      supervisor: contract.employees_employee_contracts_supervisorIdToemployees,

      // Source employee info (for display purposes)
      sourceEmployee: {
        id: contract.employees_employee_contracts_employeeIdToemployees.id,
        fullName: contract.employees_employee_contracts_employeeIdToemployees.fullName,
        employeeNumber: contract.employees_employee_contracts_employeeIdToemployees.employeeNumber,
        isActive: contract.employees_employee_contracts_employeeIdToemployees.isActive
      },

      // Template metadata
      templateMetadata: {
        originalContractId: contract.id,
        originalContractNumber: contract.contractNumber,
        createdAt: contract.createdAt
      }
    }

    return NextResponse.json({
      success: true,
      data: templateData
    })

  } catch (error) {
    console.error('Error fetching contract template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract template' },
      { status: 500 }
    )
  }
}