import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { nanoid } from 'nanoid'
import { Decimal } from '@prisma/client/runtime/library'

// GET /api/payroll/entries - List payroll entries
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user, 'canAccessPayroll')) {
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

    const entries = await prisma.payrollEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            nationalId: true,
            email: true,
            jobTitles: {
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

    return NextResponse.json(entries)
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user, 'canEditPayrollEntry')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const data = await req.json()
    const {
      payrollPeriodId,
      employeeId,
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

    // Check if entry already exists
    const existingEntry = await prisma.payrollEntry.findUnique({
      where: {
        payrollPeriodId_employeeId: {
          payrollPeriodId,
          employeeId
        }
      }
    })

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Payroll entry for this employee already exists in this period' },
        { status: 400 }
      )
    }

    // Verify period exists and is editable
    const period = await prisma.payrollPeriod.findUnique({
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

    // Fetch employee with active contract
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employee_contracts_employee_contracts_employeeIdToemployees: {
          where: { status: 'active' },
          include: {
            contract_benefits: {
              include: {
                benefitType: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Get active contract
    const activeContract = (employee as any).employee_contracts_employee_contracts_employeeIdToemployees?.[0]

    if (!activeContract) {
      return NextResponse.json(
        { error: 'Employee has no active contract' },
        { status: 400 }
      )
    }

    // Calculate compensation
    const baseSalary = new Decimal(activeContract.baseSalary || 0)
    const commissionAmount = new Decimal(commission || 0)

    // Calculate benefits total
    const benefits = activeContract.contract_benefits || []
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

    // Fetch active advances for deductions
    const activeAdvances = await prisma.employeeAdvance.findMany({
      where: {
        employeeId,
        status: 'active',
        remainingMonths: { gt: 0 }
      }
    })

    let advanceDeductions = new Decimal(0)
    const advanceBreakdown: any[] = []

    for (const advance of activeAdvances) {
      const deductionAmount = new Decimal(advance.deductionAmount)
      advanceDeductions = advanceDeductions.add(deductionAmount)
      advanceBreakdown.push({
        advanceId: advance.id,
        amount: deductionAmount.toNumber(),
        description: advance.reason || 'Salary advance repayment'
      })
    }

    // Calculate totals
    const grossPay = baseSalary.add(commissionAmount).add(benefitsTotal)
    const totalDeductions = advanceDeductions
    const netPay = grossPay.sub(totalDeductions)

    // Create entry
    const entry = await prisma.payrollEntry.create({
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
        workDays: workDays || 0,
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
        processedBy: session.user.id,
        notes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            nationalId: true
          }
        }
      }
    })

    // Update period totals
    await updatePeriodTotals(payrollPeriodId)

    return NextResponse.json(entry, { status: 201 })
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
  const aggregates = await prisma.payrollEntry.aggregate({
    where: { payrollPeriodId: periodId },
    _sum: {
      grossPay: true,
      totalDeductions: true,
      netPay: true
    },
    _count: true
  })

  await prisma.payrollPeriod.update({
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
