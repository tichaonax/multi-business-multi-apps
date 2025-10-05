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

    // Get all active employees for this business (minimal fields)
    const employees = await prisma.employee.findMany({
      where: {
        primaryBusinessId: businessId,
        isActive: true
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
    const contracts = await prisma.employeeContract.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'active'
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

    // Create payroll entries for all new employees (with transaction for benefits)
    const entries = []
    const benefitRecords = []

    for (const employee of newEmployees) {
      const contract = latestContractByEmployee[employee.id]

      if (!contract) {
        continue // Skip employees without contracts
      }

      const baseSalary = Number(contract.baseSalary || 0)
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
      message: `Added ${entries.length} employees to payroll`
    })
  } catch (error) {
    console.error('Bulk add employees error:', error)
    return NextResponse.json(
      { error: 'Failed to add employees to payroll' },
      { status: 500 }
    )
  }
}
