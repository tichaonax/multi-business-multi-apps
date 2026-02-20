import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * GET /api/payroll/periods/[periodId]/reports/payroll-register
 * Full payroll register — all employees with all earnings, deductions, and nett pay.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params

    const period = await prisma.payrollPeriods.findUnique({
      where: { id: periodId },
      select: { id: true, year: true, month: true, businesses: { select: { name: true } } },
    })
    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    const slips = await prisma.payrollSlips.findMany({
      where: {
        payrollPeriodId: periodId,
        status: { in: ['CAPTURED', 'DISTRIBUTED'] },
      },
      include: {
        payroll_entries: {
          select: {
            employeeName: true,
            employeeNumber: true,
            nationalId: true,
            baseSalary: true,
          },
        },
        employees: { select: { fullName: true, employeeNumber: true, nationalId: true } },
      },
      orderBy: { payroll_entries: { employeeName: 'asc' } },
    })

    const rows = slips.map((s) => ({
      employeeName: s.payroll_entries?.employeeName || s.employees?.fullName || '',
      employeeNumber: s.payroll_entries?.employeeNumber || s.employees?.employeeNumber || '',
      nationalId: s.payroll_entries?.nationalId || s.employees?.nationalId || '',
      // Earnings
      totalEarnings: Number(s.totalEarnings || 0),
      // Statutory deductions
      payeTax: Number(s.payeTax || 0),
      aidsLevy: Number(s.aidsLevy || 0),
      nssaEmployee: Number(s.nssaEmployee || 0),
      necEmployee: Number(s.necEmployee || 0),
      netPayRound: Number(s.netPayRound || 0),
      // Employee deductions
      loanDeductions: Number(s.loanDeductions || 0),
      advanceDeductions: Number(s.advanceDeductions || 0),
      miscDeductions: Number(s.miscDeductions || 0),
      // Employer contributions
      wcif: Number(s.wcif || 0),
      necCompanyContrib: Number(s.necCompanyContrib || 0),
      // Totals
      totalDeductions: Number(s.totalDeductions || 0),
      nettPay: Number(s.nettPay || 0),
      // Info
      leaveDaysDue: s.leaveDaysDue ? Number(s.leaveDaysDue) : null,
      payPoint: s.payPoint,
      status: s.status,
    }))

    const totals = {
      totalEarnings: rows.reduce((sum, r) => sum + r.totalEarnings, 0),
      payeTax: rows.reduce((sum, r) => sum + r.payeTax, 0),
      aidsLevy: rows.reduce((sum, r) => sum + r.aidsLevy, 0),
      nssaEmployee: rows.reduce((sum, r) => sum + r.nssaEmployee, 0),
      necEmployee: rows.reduce((sum, r) => sum + r.necEmployee, 0),
      loanDeductions: rows.reduce((sum, r) => sum + r.loanDeductions, 0),
      advanceDeductions: rows.reduce((sum, r) => sum + r.advanceDeductions, 0),
      miscDeductions: rows.reduce((sum, r) => sum + r.miscDeductions, 0),
      wcif: rows.reduce((sum, r) => sum + r.wcif, 0),
      necCompanyContrib: rows.reduce((sum, r) => sum + r.necCompanyContrib, 0),
      totalDeductions: rows.reduce((sum, r) => sum + r.totalDeductions, 0),
      nettPay: rows.reduce((sum, r) => sum + r.nettPay, 0),
    }

    return NextResponse.json({
      success: true,
      period: { year: period.year, month: period.month, businessName: period.businesses?.name },
      rows,
      totals,
    })
  } catch (error) {
    console.error('Error generating payroll register:', error)
    return NextResponse.json({ error: 'Failed to generate payroll register' }, { status: 500 })
  }
}
