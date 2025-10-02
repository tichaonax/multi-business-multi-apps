import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import { hasPermission } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params
    const url = new URL(request.url)
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString())

    // Check if user has permission to view employee leave balance
    if (!await hasPermission(session.user, 'canViewEmployeeLeave', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { 
        isActive: true, 
        fullName: true,
        employeeNumber: true,
        hireDate: true
      }
    })

    if (!employee || !employee.isActive) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 })
    }

    // Get or create leave balance for the year
    let leaveBalance = await prisma.employeeLeaveBalance.findUnique({
      where: {
        employeeId_year: {
          employeeId,
          year
        }
      }
    })

    // If no balance exists, create default balance
    if (!leaveBalance) {
      const { Prisma } = require('@prisma/client')
      const { randomUUID } = require('crypto')
      const leaveBalanceData: Prisma.EmployeeLeaveBalanceUncheckedCreateInput = {
        id: randomUUID(),
        employeeId,
        year,
        annualLeaveDays: 21,
        usedAnnualDays: 0,
        remainingAnnual: 21,
        sickLeaveDays: 10,
        usedSickDays: 0,
        remainingSick: 10,
        updatedAt: new Date()
      }
      leaveBalance = await prisma.employeeLeaveBalance.create({
        data: leaveBalanceData
      })
    }

    // Convert Decimal fields to numbers for JSON serialization
    const formattedBalance = {
      ...leaveBalance,
      employee: {
        fullName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        hireDate: employee.hireDate
      }
    }

    return NextResponse.json(formattedBalance)
  } catch (error) {
    console.error('Leave balance fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch leave balance' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
)
 {

    const { employeeId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employeeId } = await params

    // Check if user has permission to manage employee leave balance
    if (!await hasPermission(session.user, 'canManageEmployeeLeave', employeeId)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      year,
      annualLeaveDays,
      sickLeaveDays,
      usedAnnualDays,
      usedSickDays
    } = await request.json()

    if (!year) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 })
    }

    // Calculate remaining days
    const remainingAnnual = Math.max(0, (annualLeaveDays || 0) - (usedAnnualDays || 0))
    const remainingSick = Math.max(0, (sickLeaveDays || 0) - (usedSickDays || 0))

    // Update or create leave balance
    const { Prisma } = require('@prisma/client')
    const { randomUUID } = require('crypto')
    const upsertCreate: Prisma.EmployeeLeaveBalanceUncheckedCreateInput = {
      id: randomUUID(),
      employeeId,
      year: parseInt(year),
      annualLeaveDays: annualLeaveDays || 21,
      sickLeaveDays: sickLeaveDays || 10,
      usedAnnualDays: usedAnnualDays || 0,
      usedSickDays: usedSickDays || 0,
      remainingAnnual,
      remainingSick,
      updatedAt: new Date()
    }
    const upsertUpdate: Prisma.EmployeeLeaveBalanceUncheckedUpdateInput = {
      annualLeaveDays: annualLeaveDays || 21,
      sickLeaveDays: sickLeaveDays || 10,
      usedAnnualDays: usedAnnualDays || 0,
      usedSickDays: usedSickDays || 0,
      remainingAnnual,
      remainingSick,
      updatedAt: new Date()
    }
    const leaveBalance = await prisma.employeeLeaveBalance.upsert({
      where: {
        employeeId_year: {
          employeeId,
          year: parseInt(year)
        }
      },
      update: upsertUpdate,
      create: upsertCreate
    })

    return NextResponse.json(leaveBalance)
  } catch (error) {
    console.error('Leave balance update error:', error)
    return NextResponse.json({ error: 'Failed to update leave balance' }, { status: 500 })
  }
}