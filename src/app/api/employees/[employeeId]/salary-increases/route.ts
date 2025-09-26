import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionUser, hasPermission } from '@/lib/permission-utils'

// GET - Get salary increases for an employee
export async function GET(req: NextRequest, { params }: { params: { employeeId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { employeeId } = await params

    // Check if user can view employee salary information
    if (!hasPermission(user, 'canViewEmployees') && !hasPermission(user, 'canManageEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get employee to verify they exist and user has access
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        primaryBusiness: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Get salary increases
    const salaryIncreases = await prisma.employeeSalaryIncrease.findMany({
      where: { employeeId: employeeId },
      include: {
        approver: {
          select: {
            id: true,
            fullName: true,
            jobTitle: {
              select: {
                title: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedIncreases = salaryIncreases.map(increase => ({
      id: increase.id,
      previousSalary: Number(increase.previousSalary),
      newSalary: Number(increase.newSalary),
      increaseAmount: Number(increase.increaseAmount),
      increasePercentage: Number(increase.increasePercentage),
      increaseType: increase.increaseType,
      effectiveDate: increase.effectiveDate,
      reason: increase.reason,
      performancePeriod: increase.performancePeriod,
      status: increase.status,
      notes: increase.notes,
      createdAt: increase.createdAt,
      approver: increase.approver ? {
        id: increase.approver.id,
        fullName: increase.approver.fullName,
        jobTitle: increase.approver.jobTitle?.title
      } : null,
      approvedAt: increase.approvedAt
    }))

    return NextResponse.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        businessName: employee.primaryBusiness?.name
      },
      salaryIncreases: formattedIncreases
    })

  } catch (error) {
    console.error('Salary increase fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch salary increases' },
      { status: 500 }
    )
  }
}

// POST - Create a new salary increase request
export async function POST(req: NextRequest, { params }: { params: { employeeId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { employeeId } = await params
    const data = await req.json()

    // Check if user can approve salary increases
    if (!hasPermission(user, 'canApproveSalaryIncreases')) {
      return NextResponse.json({ error: 'Insufficient permissions to create salary increases' }, { status: 403 })
    }

    const {
      increasePercentage,
      increaseType = 'merit',
      effectiveDate,
      reason,
      performancePeriod,
      notes
    } = data

    // Validation
    if (!increasePercentage || !effectiveDate || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: increasePercentage, effectiveDate, reason' },
        { status: 400 }
      )
    }

    if (increasePercentage <= 0 || increasePercentage > 100) {
      return NextResponse.json(
        { error: 'Increase percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Get employee with current contract
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employeeContracts: {
          where: {
            status: { in: ['active', 'pending_approval'] }
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            version: true,
            status: true,
            baseSalary: true,
            jobTitleId: true,
            compensationTypeId: true,
            isCommissionBased: true,
            isSalaryBased: true,
            startDate: true,
            endDate: true,
            customResponsibilities: true,
            additionalBusinesses: true,
            notes: true
          }
        },
        primaryBusiness: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (!employee.employeeContracts[0]) {
      return NextResponse.json({ error: 'No active contract found for employee' }, { status: 400 })
    }

    const currentContract = employee.employeeContracts[0]
    const currentSalary = Number(currentContract.baseSalary)
    const increaseAmount = (currentSalary * Number(increasePercentage)) / 100
    const newSalary = currentSalary + increaseAmount

    // Create salary increase record and new contract in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create salary increase record
      const salaryIncrease = await tx.employeeSalaryIncrease.create({
        data: {
          employeeId: employeeId,
          previousSalary: currentSalary,
          newSalary: newSalary,
          increaseAmount: increaseAmount,
          increasePercentage: Number(increasePercentage),
          increaseType: increaseType,
          effectiveDate: new Date(effectiveDate),
          reason,
          performancePeriod: performancePeriod,
          approvedBy: user.id,
          approvedAt: new Date(),
          status: 'approved',
          notes
        },
        include: {
          approver: {
            select: {
              id: true,
              fullName: true,
              jobTitle: {
                select: {
                  title: true
                }
              }
            }
          }
        }
      })

      // Mark current contract as superseded
      await tx.employeeContract.update({
        where: { id: currentContract.id },
        data: {
          status: 'superseded',
          notes: currentContract.notes ?
            `${currentContract.notes}\n\n[SUPERSEDED] This contract was replaced due to salary increase approved on ${new Date().toISOString().split('T')[0]}` :
            `[SUPERSEDED] This contract was replaced due to salary increase approved on ${new Date().toISOString().split('T')[0]}`
        }
      })

      // Get current contract's benefits to copy to new contract
      const currentContractBenefits = await tx.employeeContractBenefit.findMany({
        where: { contractId: currentContract.id },
        include: {
          benefitType: true
        }
      })

      // Generate new contract number
      const contractCount = await tx.employeeContract.count()
      const newContractNumber = `CTR${String(contractCount + 1).padStart(6, '0')}`

      // Create new contract with updated salary
      const newContract = await tx.employeeContract.create({
        data: {
          contractNumber: newContractNumber,
          version: currentContract.version + 1,
          status: 'active',
          employeeId: employeeId,
          jobTitleId: currentContract.jobTitleId,
          compensationTypeId: currentContract.compensationTypeId,
          baseSalary: newSalary,
          isCommissionBased: currentContract.isCommissionBased,
          isSalaryBased: currentContract.isSalaryBased,
          startDate: new Date(effectiveDate),
          endDate: currentContract.endDate,
          customResponsibilities: currentContract.customResponsibilities,
          additionalBusinesses: currentContract.additionalBusinesses,
          createdBy: user.id,
          approvedBy: user.id,
          approvedAt: new Date(),
          employeeSignedAt: new Date(), // Auto-sign for salary increase
          managerSignedAt: new Date(),
          notes: (() => {
            // Extract and preserve frequency from original contract
            let frequency = 'monthly' // default
            if (currentContract.notes) {
              const frequencyMatch = currentContract.notes.match(/\[SALARY_FREQUENCY:(monthly|annual)\]/)
              if (frequencyMatch) {
                frequency = frequencyMatch[1]
              }
            }

            // Preserve frequency and add new contract notes
            const frequencyTag = `[SALARY_FREQUENCY:${frequency}]`
            const contractNotes = `Automatic contract generated from salary increase (${increasePercentage}% increase). Previous contract: ${currentContract.contractNumber}. Reason: ${reason}`

            return `${frequencyTag}\n\n${contractNotes}`
          })()
        }
      })

      // Copy benefits from old contract to new contract
      if (currentContractBenefits.length > 0) {
        const benefitsData = currentContractBenefits.map(benefit => ({
          contractId: newContract.id,
          benefitTypeId: benefit.benefitTypeId,
          amount: benefit.amount,
          isPercentage: benefit.isPercentage,
          notes: benefit.notes
        }))

        await tx.employeeContractBenefit.createMany({
          data: benefitsData
        })
      }

      return { salaryIncrease, newContract }
    })

    return NextResponse.json({
      message: 'Salary increase approved and new contract created successfully',
      salaryIncrease: {
        id: result.salaryIncrease.id,
        previousSalary: Number(result.salaryIncrease.previousSalary),
        newSalary: Number(result.salaryIncrease.newSalary),
        increaseAmount: Number(result.salaryIncrease.increaseAmount),
        increasePercentage: Number(result.salaryIncrease.increasePercentage),
        increaseType: result.salaryIncrease.increaseType,
        effectiveDate: result.salaryIncrease.effectiveDate,
        reason: result.salaryIncrease.reason,
        performancePeriod: result.salaryIncrease.performancePeriod,
        status: result.salaryIncrease.status,
        notes: result.salaryIncrease.notes,
        approver: result.salaryIncrease.approver ? {
          fullName: result.salaryIncrease.approver.fullName,
          jobTitle: result.salaryIncrease.approver.jobTitle?.title
        } : null,
        approvedAt: result.salaryIncrease.approvedAt
      },
      newContract: {
        id: result.newContract.id,
        contractNumber: result.newContract.contractNumber,
        version: result.newContract.version,
        status: result.newContract.status,
        baseSalary: Number(result.newContract.baseSalary),
        startDate: result.newContract.startDate
      }
    })

  } catch (error) {
    console.error('Salary increase creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create salary increase' },
      { status: 500 }
    )
  }
}