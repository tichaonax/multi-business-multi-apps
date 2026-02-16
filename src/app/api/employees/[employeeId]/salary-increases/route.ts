import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

// GET - Get salary increases for an employee
export async function GET(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> })
 {

    const { employeeId } = await params
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { employeeId } = await params

    // Check if user can view employee salary information
    if (!hasPermission(user, 'canViewEmployees') && !hasPermission(user, 'canManageEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get employee to verify they exist and user has access
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        businesses: {
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
    const salaryIncreases = await prisma.employeeSalaryIncreases.findMany({
      where: { employeeId: employeeId },
      include: {
        users_payroll_periods_approvedByTousers: {
          select: {
            id: true,
            fullName: true,
            jobTitles: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedIncreases = salaryIncreases.map((increase: any) => ({
      id: increase.id,
      previousSalary: Number(increase.previousSalary),
      newSalary: Number(increase.newSalary),
      increaseAmount: Number(increase.increaseAmount),
      increasePercentage: Number(increase.increasePercent),
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
        jobTitle: increase.approver.jobTitles?.title || null
      } : null,
      approvedAt: increase.approvedAt
    }))

    return NextResponse.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        businessName: employee.businesses?.name || null
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
export async function POST(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> })
 {

    const { employeeId } = await params
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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

    // Get employee with current contract (use canonical relation names)
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      include: {
        employee_contracts_employee_contracts_employeeIdToemployees: {
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
            notes: true,
            contractNumber: true
          }
        },
        businesses: {
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

    if (!employee.employee_contracts_employee_contracts_employeeIdToemployees || !employee.employee_contracts_employee_contracts_employeeIdToemployees[0]) {
      return NextResponse.json({ error: 'No active contract found for employee' }, { status: 400 })
    }

    const currentContract = (employee.employee_contracts_employee_contracts_employeeIdToemployees as any)[0]
    const currentSalary = Number(currentContract.baseSalary)
    const increaseAmount = (currentSalary * Number(increasePercentage)) / 100
    const newSalary = currentSalary + increaseAmount

    // Create salary increase record and new contract in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create salary increase record
      const salaryIncrease = await (tx.employeeSalaryIncreases.create as any)({
        data: {
          employeeId: employeeId,
          previousSalary: new Prisma.Decimal(String(currentSalary)),
          newSalary: new Prisma.Decimal(String(newSalary)),
          increaseAmount: new Prisma.Decimal(String(increaseAmount)),
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
        // do not include approver here to avoid strict include typing; we'll fetch it explicitly if needed
      })

      // Mark current contract as superseded
      await tx.employeeContracts.update({
        where: { id: currentContract.id },
        data: {
          status: 'superseded',
          notes: currentContract.notes ?
            `${currentContract.notes}\n\n[SUPERSEDED] This contract was replaced due to salary increase approved on ${new Date().toISOString().split('T')[0]}` :
            `[SUPERSEDED] This contract was replaced due to salary increase approved on ${new Date().toISOString().split('T')[0]}`
        }
      })

      // Get current contract's benefits to copy to new contract
      const currentContractBenefits = await tx.contractBenefits.findMany({
        where: { contractId: currentContract.id },
        include: {
          benefit_types: true
        }
      })

      // Generate new contract number
      const contractCount = await tx.employeeContracts.count()
      const newContractNumber = `CTR${String(contractCount + 1).padStart(6, '0')}`

      // Create new contract with updated salary
      const newContractData: Prisma.EmployeeContractUncheckedCreateInput = {
        id: randomUUID(),
        contractNumber: newContractNumber,
        version: currentContract.version + 1,
        status: 'active',
        employeeId: employeeId,
        jobTitleId: currentContract.jobTitleId,
        compensationTypeId: currentContract.compensationTypeId,
        baseSalary: new Prisma.Decimal(String(newSalary)),
        isCommissionBased: currentContract.isCommissionBased,
        isSalaryBased: currentContract.isSalaryBased,
        startDate: new Date(effectiveDate),
        endDate: currentContract.endDate,
        customResponsibilities: currentContract.customResponsibilities,
        additionalBusinesses: currentContract.additionalBusinesses,
        primaryBusinessId: (employee as any).primaryBusinessId,
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
      const newContract = await tx.employeeContracts.create({
        data: newContractData
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

        await tx.contractBenefits.createMany({
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