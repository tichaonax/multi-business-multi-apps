import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'
import { Decimal } from '@prisma/client/runtime/library'
import { generatePayrollContractEntries } from '@/lib/payroll/contract-selection'

import { randomBytes } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'
// GET /api/payroll/entries - List payroll entries
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const payrollPeriodId = searchParams.get('payrollPeriodId')
    const employeeId = searchParams.get('employeeId')

    const where: any = {}

    if (payrollPeriodId) {
      where.payrollPeriodId = payrollPeriodId
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    const entries = await prisma.payrollEntries.findMany({
      where,
      include: {
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            dateOfBirth: true,
            hireDate: true,
            email: true,
            job_titles: {
              select: { title: true }
            }
          }
        },
        payrollPeriod: {
          select: {
            id: true,
            year: true,
            month: true,
            status: true
          }
        },
        payrollAdjustments: true
      },
      orderBy: { employeeName: 'asc' }
    })

    // Add employee alias for backwards compatibility (employees -> employee)
    const mappedEntries = entries.map((entry: any) => ({
      ...entry,
      employee: entry.employees // Alias for UI compatibility
    }))

    return NextResponse.json(mappedEntries)
  } catch (error) {
    console.error('Payroll entries fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll entries' },
      { status: 500 }
    )
  }
}

// POST /api/payroll/entries - Create payroll entry
export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(user, 'canEditPayrollEntry')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      payrollPeriodId,
      employeeId,
      contractId, // Optional: specify which contract to use
      workDays,
      sickDays,
      leaveDays,
      absenceDays,
      overtimeHours,
      commission,
      notes
    } = data

    // Validation
    if (!payrollPeriodId || !employeeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Note: We no longer check for unique (payrollPeriodId, employeeId) constraint
    // because employees can have multiple entries for different contracts.
    // If contractId is specified, check if that specific contract already has an entry.
    if (contractId) {
      const existingEntry = await prisma.payrollEntries.findFirst({
        where: {
          payrollPeriodId,
          employeeId,
          contractId
        }
      })

      if (existingEntry) {
        return NextResponse.json(
          { error: 'Payroll entry for this employee and contract already exists in this period' },
          { status: 400 }
        )
      }
    }

    // Verify period exists and is editable
    const period = await prisma.payrollPeriods.findUnique({
      where: { id: payrollPeriodId }
    })

    if (!period) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    if (period.status === 'closed' || period.status === 'exported') {
      return NextResponse.json(
        { error: 'Cannot add entries to closed or exported payroll period' },
        { status: 400 }
      )
    }

    // Fetch employee basic info
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
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

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Use the contract selection helper to get applicable contracts
    // This handles signed contracts only, proration, multi-contract scenarios, etc.
    const contractEntries = await generatePayrollContractEntries(
      employeeId,
      period.periodStart,
      period.periodEnd,
      employee.terminationDate,
      period.businessId
    )

    if (contractEntries.length === 0) {
      return NextResponse.json(
        {
          error: 'Employee has no signed contracts for this payroll period',
          details: `No signed contracts found that overlap the period ${period.periodStart?.toISOString().split('T')[0]} to ${period.periodEnd?.toISOString().split('T')[0]}`
        },
        { status: 400 }
      )
    }

    // If contractId is specified, use that specific contract
    // Otherwise, use the first applicable contract (usually the most recent)
    let selectedContractEntry = contractEntries[0]
    if (contractId) {
      const matching = contractEntries.find(ce => ce.contract.id === contractId)
      if (!matching) {
        return NextResponse.json(
          {
            error: 'Specified contract is not valid for this payroll period',
            details: `Contract ${contractId} is either not signed or does not overlap the period`,
            availableContracts: contractEntries.map(ce => ({
              contractId: ce.contract.id,
              contractNumber: ce.contract.contractNumber,
              startDate: ce.effectiveStartDate,
              endDate: ce.effectiveEndDate
            }))
          },
          { status: 400 }
        )
      }
      selectedContractEntry = matching
    }

    const { contract, effectiveStartDate, effectiveEndDate, workDays: calculatedWorkDays, proratedBaseSalary, isProrated } = selectedContractEntry

    // Use provided workDays or calculated workDays
    const finalWorkDays = workDays !== undefined ? workDays : calculatedWorkDays

    // Calculate compensation
    const baseSalary = new Decimal(proratedBaseSalary || 0)
    const commissionAmount = new Decimal(commission || 0)

    // Calculate benefits total
    const benefits = contract.contract_benefits || []
    let benefitsTotal = new Decimal(0)
    const benefitsBreakdown: any = {}

    for (const benefit of benefits) {
      const amount = new Decimal(benefit.amount || 0)
      const benefitName = benefit.benefitType?.name || 'Unknown'

      if (benefit.isPercentage) {
        const calculatedAmount = baseSalary.mul(amount).div(100)
        benefitsTotal = benefitsTotal.add(calculatedAmount)
        benefitsBreakdown[benefitName] = calculatedAmount.toNumber()
      } else {
        benefitsTotal = benefitsTotal.add(amount)
        benefitsBreakdown[benefitName] = amount.toNumber()
      }
    }

    // TODO: Fetch active advances for deductions when advance model is implemented
    // const activeAdvances = await prisma.employeeAdvance.findMany({...})
    let advanceDeductions = new Decimal(0)
    const advanceBreakdown: any[] = []

    // Calculate totals
    const grossPay = baseSalary.add(commissionAmount).add(benefitsTotal)
    const totalDeductions = advanceDeductions
    const netPay = grossPay.sub(totalDeductions)

    // Create entry with contract tracking fields
    const entry = await prisma.payrollEntries.create({
      data: {
        id: `PE-${nanoid(12)}`,
        payrollPeriodId,
        employeeId,
        employeeNumber: employee.employeeNumber,
        employeeName: employee.fullName,
        nationalId: employee.nationalId,
        dateOfBirth: employee.dateOfBirth,
        hireDate: employee.hireDate,
        terminationDate: employee.terminationDate,
        workDays: finalWorkDays,
        sickDays: sickDays || 0,
        leaveDays: leaveDays || 0,
        absenceDays: absenceDays || 0,
        overtimeHours: overtimeHours || 0,
        baseSalary: baseSalary.toNumber(),
        commission: commissionAmount.toNumber(),
        benefitsTotal: benefitsTotal.toNumber(),
        benefitsBreakdown: benefitsBreakdown,
        advanceDeductions: advanceDeductions.toNumber(),
        advanceBreakdown: advanceBreakdown,
        grossPay: grossPay.toNumber(),
        totalDeductions: totalDeductions.toNumber(),
        netPay: netPay.toNumber(),
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        contractStartDate: effectiveStartDate,
        contractEndDate: effectiveEndDate,
        isProrated,
        processedBy: user.id,
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            nationalId: true
          }
        }
      }
    })

    // Add employee alias for backwards compatibility
    const mappedEntry = {
      ...entry,
      employee: (entry as any).employees
    }

    // Update period totals
    await updatePeriodTotals(payrollPeriodId)

    return NextResponse.json(mappedEntry, { status: 201 })
  } catch (error) {
    console.error('Payroll entry creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll entry' },
      { status: 500 }
    )
  }
}

// Helper function to update period totals
async function updatePeriodTotals(periodId: string) {
  const aggregates = await prisma.payrollEntries.aggregate({
    where: { payrollPeriodId: periodId },
    _sum: {
      grossPay: true,
      totalDeductions: true,
      netPay: true
    },
    _count: true
  })

  await prisma.payrollPeriods.update({
    where: { id: periodId },
    data: {
      totalEmployees: aggregates._count,
      totalGrossPay: aggregates._sum.grossPay || 0,
      totalDeductions: aggregates._sum.totalDeductions || 0,
      totalNetPay: aggregates._sum.netPay || 0,
      updatedAt: new Date()
    }
  })
}
