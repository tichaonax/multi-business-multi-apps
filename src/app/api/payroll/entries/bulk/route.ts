import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePayrollContractEntries } from '@/lib/payroll/contract-selection'
import { nanoid } from 'nanoid'
import { getServerUser } from '@/lib/get-server-user'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
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

    // For umbrella businesses, also include employees from all child businesses
    const isUmbrella = (period.businesses as any)?.isUmbrellaBusiness === true
    let allBusinessIds = [businessId]
    if (isUmbrella) {
      const childBusinesses = await prisma.businesses.findMany({
        where: { umbrellaBusinessId: businessId },
        select: { id: true },
      })
      allBusinessIds = [businessId, ...childBusinesses.map((b: any) => b.id)]
    }

    // Get all active employees for this business (minimal fields).
    // Also include employees who were terminated within the payroll period
    // because they should receive a final paycheck for that period.
    const employees = await prisma.employees.findMany({
      where: {
        primaryBusinessId: { in: allBusinessIds },
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
        primaryBusinessId: true,
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

    // Pre-fetch month-restricted benefit types so we can filter them at creation time.
    // e.g. Annual Bonus (paymentMonth=11) should only appear in November payroll.
    const monthRestrictedTypes = await prisma.benefitTypes.findMany({
      where: { paymentMonth: { not: null } },
      select: { id: true, name: true, paymentMonth: true },
    })
    const paymentMonthMap = new Map(monthRestrictedTypes.map((b: any) => [b.id, b.paymentMonth as number]))
    // Also build a name-based map as fallback for benefits without benefitTypeId in pdfGenerationData
    const paymentMonthByName = new Map(monthRestrictedTypes.map((b: any) => [String(b.name || '').toLowerCase().trim(), b.paymentMonth as number]))

    // Fetch active payroll-deduction loans for all new employees in one query
    const newEmployeeIds = newEmployees.map(e => e.id)
    const activeLoans = await prisma.accountOutgoingLoans.findMany({
      where: {
        recipientEmployeeId: { in: newEmployeeIds },
        status: 'ACTIVE',
        paymentType: 'PAYROLL_DEDUCTION',
      },
      select: { recipientEmployeeId: true, monthlyInstallment: true },
    })
    const loanDeductionMap = new Map(
      activeLoans.map((l: any) => [l.recipientEmployeeId, Number(l.monthlyInstallment ?? 0)])
    )

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
        employee.primaryBusinessId ?? businessId
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

        // Calculate benefits total and deductions from contract benefits.
        // Benefits may be stored in contract_benefits (relation) OR pdfGenerationData.benefits (JSON).
        // Use whichever has data. Apply paymentMonth restriction to exclude time-limited benefits
        // (e.g. Annual Bonus only applies in November → paymentMonth=11).
        let benefitsTotal = 0
        let totalDeductions = 0
        const entryId = `PE-${nanoid(12)}`

        // Helper: process a single benefit into totals + benefitRecords.
        // rawAmount: the stored value (may be a percentage rate if isPercentage=true)
        // isPercentage: if true, actual amount = rawAmount% × proratedBaseSalary
        const processBenefit = (benefitTypeId: string | null, benefitName: string, benefitType: string, rawAmount: number, isPercentage: boolean) => {
          if (!rawAmount || rawAmount === 0) return
          // Apply month restriction (e.g. Annual Bonus → paymentMonth=11 → skip outside November)
          // Check by benefitTypeId first, then fall back to name-based lookup
          const restrictedMonth = benefitTypeId
            ? (paymentMonthMap.get(benefitTypeId) ?? paymentMonthByName.get(String(benefitName || '').toLowerCase().trim()))
            : paymentMonthByName.get(String(benefitName || '').toLowerCase().trim())
          if (restrictedMonth && restrictedMonth !== period.month) return

          // Compute actual dollar amount
          const amount = isPercentage
            ? Math.round((rawAmount / 100) * proratedBaseSalary * 100) / 100
            : rawAmount

          if (benefitType === 'deduction') {
            totalDeductions += amount
          } else {
            benefitsTotal += amount
            benefitRecords.push({
              id: `PEB-${nanoid(12)}`,
              payrollEntryId: entryId,
              benefitTypeId,
              benefitName: benefitName || 'Unknown Benefit',
              amount,
              isActive: true,
              source: 'contract',
              createdAt: new Date(),
              updatedAt: new Date()
            })
          }
        }

        const contractBenefits = contract.contract_benefits || []
        if (contractBenefits.length > 0) {
          // Use relation data (contract_benefits table)
          for (const benefit of contractBenefits) {
            const rawAmount = Number(benefit.amount ?? benefit.benefit_types?.defaultAmount ?? 0)
            const isPercentage = benefit.benefit_types?.isPercentage === true || benefit.isPercentage === true
            processBenefit(
              benefit.benefitTypeId,
              benefit.benefit_types?.name || 'Unknown Benefit',
              benefit.benefit_types?.type || 'benefit',
              rawAmount,
              isPercentage
            )
          }
        } else {
          // Fall back to pdfGenerationData.benefits (JSON snapshot on contract record)
          const pdfBenefits: any[] = (contract as any).pdfGenerationData?.benefits || []
          for (const b of pdfBenefits) {
            const rawAmount = Number(b.amount || 0)
            const isPercentage = b.isPercentage === true
            processBenefit(
              b.benefitTypeId || null,
              b.name || 'Unknown Benefit',
              b.type || 'benefit',
              rawAmount,
              isPercentage
            )
          }
        }

        // Calculate gross pay including benefits
        const grossPay = proratedBaseSalary + benefitsTotal
        const loanDeduction = loanDeductionMap.get(employee.id) ?? 0
        const netPay = grossPay - totalDeductions - loanDeduction

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
          loanDeductions: loanDeduction,
          miscDeductions: 0,
          totalDeductions: totalDeductions + loanDeduction,
          netPay,
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          contractStartDate: effectiveStartDate,
          contractEndDate: effectiveEndDate,
          isProrated,
          processedBy: user.id,
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
      await tx.payrollEntries.createMany({
        data: entries
      })

      if (benefitRecords.length > 0) {
        await tx.payrollEntryBenefits.createMany({
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
