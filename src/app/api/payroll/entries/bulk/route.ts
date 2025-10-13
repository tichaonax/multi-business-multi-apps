import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { generatePayrollContractEntries } from '@/lib/payroll/contract-selection'
import { nanoid } from 'nanoid'

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
    const period = await prisma.payrollPeriods.findUnique({
      where: { id: payrollPeriodId },
      include: { businesses: true }
    })

    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 })
    }

    // Get all active employees for this business (minimal fields).
    // Also include employees who were terminated within the payroll period
    // because they should receive a final paycheck for that period.
    const employees = await prisma.employees.findMany({
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

    // Get existing entries to check which employees already have entries
    // Note: With multi-contract support, an employee can have multiple entries per contract
    // For bulk add, we'll skip employees who already have any entries to avoid complexity
    const existingEntries = await prisma.payrollEntries.findMany({
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

    console.log(`Bulk add: Processing ${newEmployees.length} employees for payroll entries`)

    // Create payroll entries using the new contract selection logic
    // This automatically handles: multiple contracts per employee, proration, signed contracts only, etc.
    const entries: any[] = []
    const benefitRecords: any[] = []
    const diagnostics: { employeeId: string; contractId?: string; issue: string; details?: string }[] = []
    let employeesWithContracts = 0

    for (const employee of newEmployees) {
      // Generate payroll contract entries for this employee
      // This handles: signed contracts only, multi-contract scenarios, proration, auto-renewal
      const contractEntries = await generatePayrollContractEntries(
        employee.id,
        period.periodStart,
        period.periodEnd,
        employee.terminationDate,
        businessId
      )

      if (contractEntries.length === 0) {
        const details = `Employee ${employee.employeeNumber || employee.id} has no signed contracts overlapping payroll period ${period.id} (${period.periodStart?.toISOString()} - ${period.periodEnd?.toISOString()})`
        diagnostics.push({ employeeId: employee.id, issue: 'no_signed_contracts', details })
        console.warn('Skipping employee with no signed contracts for this payroll period:', employee.id, employee.fullName)
        continue
      }

      employeesWithContracts++

      // Create one payroll entry for each contract period
      for (const contractEntry of contractEntries) {
        const { contract, effectiveStartDate, effectiveEndDate, workDays, proratedBaseSalary, isProrated } = contractEntry

        // Calculate benefits total and deductions from contract benefits
        let benefitsTotal = 0
        let totalDeductions = 0
        const entryId = `PE-${nanoid(12)}`

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
              id: `PEB-${nanoid(12)}`,
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
        const grossPay = proratedBaseSalary + benefitsTotal
        const netPay = grossPay - totalDeductions

        // Diagnostics: record if DOB missing or baseSalary is zero
        if (!employee.dateOfBirth) {
          diagnostics.push({ employeeId: employee.id, contractId: contract.id, issue: 'missing_dateOfBirth' })
          console.warn('Employee missing dateOfBirth:', employee.id, employee.fullName)
        }

        if (!proratedBaseSalary || proratedBaseSalary === 0) {
          diagnostics.push({ employeeId: employee.id, contractId: contract.id, issue: 'zero_baseSalary' })
          console.warn('Employee has zero prorated salary from contract:', employee.id, contract.id, proratedBaseSalary)
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
          baseSalary: proratedBaseSalary,
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
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          contractStartDate: effectiveStartDate,
          contractEndDate: effectiveEndDate,
          isProrated,
          processedBy: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })

        console.log(`  - Entry for ${employee.employeeNumber}: Contract ${contract.contractNumber}, ${effectiveStartDate.toISOString().split('T')[0]} to ${effectiveEndDate.toISOString().split('T')[0]}, ${workDays} days, $${proratedBaseSalary}${isProrated ? ' (prorated)' : ''}`)
      }
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No eligible employees with signed contracts to add to this payroll period', diagnostics },
        { status: 400 }
      )
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
    const allEntries = await prisma.payrollEntries.findMany({
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

    await prisma.payrollPeriods.update({
      where: { id: payrollPeriodId },
      data: totals
    })

    console.log(`Bulk add complete: Created ${entries.length} payroll entries for ${employeesWithContracts} employees`)

    return NextResponse.json({
      success: true,
      count: entries.length,
      employeeCount: employeesWithContracts,
      message: `Added ${entries.length} payroll entries for ${employeesWithContracts} employees (some employees may have multiple contracts)`,
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
