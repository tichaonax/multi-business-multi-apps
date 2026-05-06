import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { getEmployeeLeavePolicy, calculateAccruedLeave } from '@/lib/payroll/leave-accrual'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canAccessPayroll')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const url = new URL(request.url)
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString())

    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      select: { isActive: true, fullName: true, employeeNumber: true, hireDate: true },
    })

    if (!employee || !employee.isActive) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 })
    }

    // Fetch the configured leave policy (never hardcode defaults again)
    const policy = await getEmployeeLeavePolicy(prisma, employeeId)

    let leaveBalance = await prisma.employeeLeaveBalance.findUnique({
      where: { employeeId_year: { employeeId, year } },
    })

    if (!leaveBalance) {
      leaveBalance = await prisma.employeeLeaveBalance.create({
        data: {
          id: randomUUID(),
          employeeId,
          year,
          annualLeaveDays: policy.maxAnnualDays,
          usedAnnualDays: 0,
          remainingAnnual: policy.maxAnnualDays,
          sickLeaveDays: policy.sickDaysPerYear,
          usedSickDays: 0,
          remainingSick: policy.sickDaysPerYear,
          updatedAt: new Date(),
        },
      })
    }

    // Compute accrued-to-date so the UI can show true current entitlement
    const accruedToDate = employee.hireDate
      ? calculateAccruedLeave(
          new Date(employee.hireDate),
          year,
          policy.annualAccrualPerMonth,
          policy.maxAnnualDays
        )
      : policy.maxAnnualDays

    return NextResponse.json({
      ...leaveBalance,
      accruedToDate,
      policy: {
        annualAccrualPerMonth: policy.annualAccrualPerMonth,
        maxAnnualDays: policy.maxAnnualDays,
        sickDaysPerYear: policy.sickDaysPerYear,
        carryoverEnabled: policy.carryoverEnabled,
        maxCarryoverDays: policy.maxCarryoverDays,
      },
      employee: {
        fullName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        hireDate: employee.hireDate,
      },
    })
  } catch (error) {
    console.error('Leave balance fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch leave balance' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canManageEmployees')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { year, annualLeaveDays, sickLeaveDays, usedAnnualDays, usedSickDays } =
      await request.json()

    if (!year) return NextResponse.json({ error: 'Year is required' }, { status: 400 })

    // Use policy as the fallback when caller omits a value — never hardcode 21/10
    const policy = await getEmployeeLeavePolicy(prisma, employeeId)

    const resolvedAnnual = annualLeaveDays ?? policy.maxAnnualDays
    const resolvedSick   = sickLeaveDays   ?? policy.sickDaysPerYear
    const resolvedUsedA  = usedAnnualDays  ?? 0
    const resolvedUsedS  = usedSickDays    ?? 0

    const remainingAnnual = Math.max(0, resolvedAnnual - resolvedUsedA)
    const remainingSick   = Math.max(0, resolvedSick   - resolvedUsedS)

    const leaveBalance = await prisma.employeeLeaveBalance.upsert({
      where: { employeeId_year: { employeeId, year: parseInt(year) } },
      update: {
        annualLeaveDays: resolvedAnnual,
        sickLeaveDays:   resolvedSick,
        usedAnnualDays:  resolvedUsedA,
        usedSickDays:    resolvedUsedS,
        remainingAnnual,
        remainingSick,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        employeeId,
        year: parseInt(year),
        annualLeaveDays: resolvedAnnual,
        sickLeaveDays:   resolvedSick,
        usedAnnualDays:  resolvedUsedA,
        usedSickDays:    resolvedUsedS,
        remainingAnnual,
        remainingSick,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(leaveBalance)
  } catch (error) {
    console.error('Leave balance update error:', error)
    return NextResponse.json({ error: 'Failed to update leave balance' }, { status: 500 })
  }
}
