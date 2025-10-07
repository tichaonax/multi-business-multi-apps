import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payrollPeriodId, businessId } = await request.json()

    if (!payrollPeriodId || !businessId) {
      return NextResponse.json(
        { error: 'Payroll period ID and business ID are required' },
        { status: 400 }
      )
    }

    // Get the payroll period to access dates
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
      include: { business: true }
    })

    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })
    }

    // Get all active employees for this business (minimal fields).
    // Also include employees who were terminated within the payroll period
    // because they should receive a final paycheck for that period.
    const employees = await prisma.employee.findMany({
      where: {
        primaryBusinessId: businessId,
        OR: [
          { isActive: true },
          {
            terminationDate: {
              gte: (period as any).startDate,
              lte: (period as any).endDate
            }
          }
        ]
      },
      select: {
        id: true,
        employeeNumber: true,
        fullName: true,
        nationalId: true,
        dateOfBirth: true,
        hireDate: true,
        terminationDate: true
      }
    })

    // Fetch latest active contract for each employee separately to avoid fragile relation names on Employee
    const employeeIds = employees.map((e: any) => e.id)
    // Fetch contracts that are either active or were terminated during the
    // payroll period. This ensures terminated employees get their final
    // contract calculated for the period.
    // Select contracts that overlap the payroll period. A contract is eligible if:
    // - it started on or before the payroll period end, AND
    // - it is active, OR it was terminated but the termination (endDate)
    //   falls on/after the payroll period start (i.e. it covers at least
    //   part of the payroll period).
    const contracts = await prisma.employeeContract.findMany({
      where: {
        employeeId: { in: employeeIds },
        startDate: { lte: (period as any).endDate },
        AND: [
          {
            OR: [
              { status: 'active' },
              {
                AND: [
                  { status: 'terminated' },
                  { endDate: { gte: (period as any).startDate } }
                ]
              }
            ]
          }
        ]
      },
      orderBy: { startDate: 'desc' },
      include: {
        compensationTypes: true,
        contract_benefits: {
          include: { benefitType: true }
        }
      }
    })

    // Map latest contract by employeeId (first in ordered list)
    const latestContractByEmployee: Record<string, any> = {}
    for (const c of contracts) {
      if (!latestContractByEmployee[c.employeeId]) {
        latestContractByEmployee[c.employeeId] = c
      }
    }

    // Get existing entries to avoid duplicates
    const existingEntries = await prisma.payrollEntry.findMany({
      where: { payrollPeriodId },
      select: { employeeId: true }
    })

  const existingEmployeeIds = new Set(existingEntries.map((e: any) => e.employeeId))

    // Filter out employees already in payroll
    const newEmployees = employees.filter(emp => !existingEmployeeIds.has(emp.id))

    if (newEmployees.length === 0) {
      return NextResponse.json(
        { error: 'All active employees are already in this payroll period' },
        { status: 400 }
      )
    }
    // Exclude employees without an active/latest contract.
    const eligibleEmployees = newEmployees.filter(emp => !!latestContractByEmployee[emp.id])
    const skippedDueToNoActiveContract = newEmployees.filter(emp => !latestContractByEmployee[emp.id])

    // Add diagnostics for skipped employees (no overlapping contract for the period)
    const diagnostics: { employeeId: string; contractId?: string; issue: string; details?: string }[] = []
    for (const skipped of skippedDueToNoActiveContract) {
      const details = `Employee ${skipped.employeeNumber || skipped.id} has no contract overlapping payroll period ${period.id} (${(period as any).startDate.toISOString()} - ${(period as any).endDate.toISOString()})`
      diagnostics.push({ employeeId: skipped.id, issue: 'no_overlapping_contract', details })
      console.warn('Skipping employee with no overlapping contract for this payroll period:', skipped.id, skipped.fullName, details)
    }

    if (eligibleEmployees.length === 0) {
      return NextResponse.json(
        { error: 'No eligible employees with active contracts to add to this payroll period', diagnostics },
        { status: 400 }
      )
    }

    // Create payroll entries for all eligible employees (with transaction for benefits)
    const entries: any[] = []
    const benefitRecords: any[] = []

    for (const employee of eligibleEmployees) {
      const contract = latestContractByEmployee[employee.id]

      if (!contract) {
        continue // Skip employees without contracts
      }

      // Safely convert Prisma Decimal (or numeric) to JS number
      let baseSalary = 0
      try {
        if (contract.baseSalary && typeof contract.baseSalary === 'object' && typeof (contract.baseSalary as any).toNumber === 'function') {
          baseSalary = (contract.baseSalary as any).toNumber()
        } else {
          baseSalary = Number(contract.baseSalary || 0)
        }
      } catch (err) {
        console.warn('Could not parse contract.baseSalary for contract', contract?.id, err)
        baseSalary = Number(contract.baseSalary || 0)
      }
      const workDays = 22 // Default work days

      // Calculate benefits total and deductions from contract benefits
      let benefitsTotal = 0
      let totalDeductions = 0
      const entryId = `PE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  for (const benefit of contract.contract_benefits || []) {
        const amount = Number(
          benefit.amount ?? benefit.benefitType?.defaultAmount ?? 0
        )

        if (benefit.benefitType?.type === 'deduction') {
          totalDeductions += amount
        } else if (benefit.benefitType?.type === 'benefit' || benefit.benefitType?.type === 'allowance') {
          // Add to benefits
          benefitsTotal += amount

          // Create benefit record
          benefitRecords.push({
            id: `PEB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            payrollEntryId: entryId,
            benefitTypeId: benefit.benefitTypeId,
            benefitName: benefit.benefitType?.name || 'Unknown Benefit',
            amount,
            isActive: true,
            source: 'contract',
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      }

      // Calculate gross pay including benefits
      const grossPay = baseSalary + benefitsTotal
      const netPay = grossPay - totalDeductions

      // Diagnostics: record if DOB missing or baseSalary is zero
      if (!employee.dateOfBirth) {
        diagnostics.push({ employeeId: employee.id, contractId: contract.id, issue: 'missing_dateOfBirth' })
        console.warn('Employee missing dateOfBirth:', employee.id, employee.fullName)
      }

      if (!baseSalary || baseSalary === 0) {
        diagnostics.push({ employeeId: employee.id, contractId: contract.id, issue: 'zero_baseSalary' })
        console.warn('Employee has zero baseSalary from contract:', employee.id, contract.id, baseSalary)
      }

      entries.push({
        id: entryId,
        payrollPeriodId,
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        nationalId: employee.nationalId,
        dateOfBirth: employee.dateOfBirth,
        hireDate: employee.hireDate,
        terminationDate: employee.terminationDate,
        workDays,
        sickDays: 0,
        leaveDays: 0,
        absenceDays: 0,
        overtimeHours: 0,
        baseSalary,
        commission: 0,
        livingAllowance: 0,
        vehicleAllowance: 0,
        travelAllowance: 0,
        overtimePay: 0,
        benefitsTotal,
        grossPay,
        advanceDeductions: 0,
        loanDeductions: 0,
        miscDeductions: 0,
        totalDeductions,
        netPay,
        processedBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    // Bulk insert entries and benefits in transaction
    await prisma.$transaction(async (tx) => {
      await tx.payrollEntry.createMany({
        data: entries
      })

      if (benefitRecords.length > 0) {
        await tx.payrollEntryBenefit.createMany({
          data: benefitRecords
        })
      }
    })

    // Update period totals
    const allEntries = await prisma.payrollEntry.findMany({
      where: { payrollPeriodId }
    })

    const totals = allEntries.reduce(
      (acc: any, entry: any) => ({
        totalEmployees: acc.totalEmployees + 1,
        totalGrossPay: acc.totalGrossPay + Number(entry.grossPay),
        totalDeductions: acc.totalDeductions + Number(entry.totalDeductions),
        totalNetPay: acc.totalNetPay + Number(entry.netPay)
      }),
      { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 }
    )

    await prisma.payrollPeriod.update({
      where: { id: payrollPeriodId },
      data: totals
    })

    return NextResponse.json({
      success: true,
      count: entries.length,
      message: `Added ${entries.length} employees to payroll`,
      diagnostics
    })
  } catch (error) {
    console.error('Bulk add employees error:', error)
    return NextResponse.json(
      { error: 'Failed to add employees to payroll' },
      { status: 500 }
    )
  }
}
