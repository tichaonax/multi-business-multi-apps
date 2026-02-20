import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getGlobalPayrollAccount } from '@/lib/payroll-account-utils'

function generateLoanNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 900000) + 100000
  return `OL-${year}-${random}`
}

/**
 * GET /api/payroll/account/outgoing-loans
 * List all employee loans sourced from the payroll account
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageLending && !permissions.canAccessPayrollAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const payrollAccount = await getGlobalPayrollAccount()
    if (!payrollAccount) {
      return NextResponse.json({ error: 'Payroll account not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = { payrollAccountId: payrollAccount.id }
    if (status && status !== 'ALL') where.status = status

    const loans = await prisma.accountOutgoingLoans.findMany({
      where,
      include: {
        recipientEmployee: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            phone: true,
            businesses: {
              select: {
                name: true,
                address: true,
                phone: true,
                umbrellaBusinessName: true,
                umbrellaBusinessAddress: true,
                umbrellaBusinessPhone: true,
              },
            },
          },
        },
        approvedByEmployee: { select: { id: true, fullName: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        loans: loans.map((l: any) => {
          const biz = l.recipientEmployee?.businesses
          const lenderBusiness = biz ? {
            name: biz.name,
            address: biz.address || biz.umbrellaBusinessAddress || null,
            phone: biz.phone || biz.umbrellaBusinessPhone || null,
          } : null
          return ({
          id: l.id,
          loanNumber: l.loanNumber,
          loanType: l.loanType,
          lenderBusiness,
          recipientEmployee: l.recipientEmployee
            ? { id: l.recipientEmployee.id, fullName: l.recipientEmployee.fullName, employeeNumber: l.recipientEmployee.employeeNumber, phone: l.recipientEmployee.phone ?? null }
            : null,
          principalAmount: Number(l.principalAmount),
          remainingBalance: Number(l.remainingBalance),
          monthlyInstallment: l.monthlyInstallment ? Number(l.monthlyInstallment) : null,
          totalMonths: l.totalMonths,
          remainingMonths: l.remainingMonths,
          interestRate: l.interestRate ? Number(l.interestRate) : null,
          disbursementDate: l.disbursementDate.toISOString(),
          dueDate: l.dueDate?.toISOString() ?? null,
          status: l.status,
          purpose: l.purpose,
          paymentType: l.paymentType,
          contractSigned: l.contractSigned,
          contractSignedAt: l.contractSignedAt?.toISOString() ?? null,
          notes: l.notes ?? null,
          approvedByEmployee: l.approvedByEmployee,
          createdBy: l.creator,
          createdAt: l.createdAt.toISOString(),
        })}),
        summary: {
          totalCount: loans.length,
          activeCount: loans.filter((l: any) => l.status === 'ACTIVE').length,
          pendingCount: loans.filter((l: any) => ['PENDING_APPROVAL', 'PENDING_CONTRACT'].includes(l.status)).length,
          totalOutstanding: loans.reduce((s: number, l: any) => s + Number(l.remainingBalance), 0),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching payroll account outgoing loans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/payroll/account/outgoing-loans
 * Create a new EMPLOYEE loan sourced from the payroll account
 * Loan starts as PENDING_APPROVAL — no balance check until approval
 *
 * Body:
 * - recipientEmployeeId: string (required)
 * - principalAmount: number (required)
 * - monthlyInstallment: number (required)
 * - totalMonths: number (required)
 * - disbursementDate: string ISO date (required)
 * - interestRate: number (optional)
 * - dueDate: string ISO date (optional)
 * - purpose: string (optional)
 * - notes: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageLending && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied — canManageLending required' }, { status: 403 })
    }

    const payrollAccount = await getGlobalPayrollAccount()
    if (!payrollAccount) {
      return NextResponse.json({ error: 'Payroll account not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      recipientEmployeeId,
      principalAmount,
      monthlyInstallment,
      totalMonths,
      interestRate,
      disbursementDate,
      dueDate,
      purpose,
      notes,
    } = body

    if (!recipientEmployeeId) {
      return NextResponse.json({ error: 'recipientEmployeeId is required' }, { status: 400 })
    }
    if (!principalAmount || Number(principalAmount) <= 0) {
      return NextResponse.json({ error: 'Invalid principal amount' }, { status: 400 })
    }
    if (!monthlyInstallment || Number(monthlyInstallment) <= 0) {
      return NextResponse.json({ error: 'monthlyInstallment is required for employee loans' }, { status: 400 })
    }
    if (!totalMonths || Number(totalMonths) <= 0) {
      return NextResponse.json({ error: 'totalMonths is required for employee loans' }, { status: 400 })
    }
    if (!disbursementDate) {
      return NextResponse.json({ error: 'disbursementDate is required' }, { status: 400 })
    }

    // Check employee exists
    const employee = await prisma.employees.findUnique({
      where: { id: recipientEmployeeId },
      select: { id: true, fullName: true, employeeNumber: true },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // One active loan per employee rule
    const existingLoan = await prisma.accountOutgoingLoans.findFirst({
      where: {
        recipientEmployeeId,
        status: { in: ['PENDING_APPROVAL', 'PENDING_CONTRACT', 'ACTIVE'] },
      },
    })
    if (existingLoan) {
      return NextResponse.json({
        error: 'Employee already has an active loan. Only one loan per employee is allowed at a time.',
      }, { status: 409 })
    }

    // Generate unique loan number
    let loanNumber = generateLoanNumber()
    let attempts = 0
    while (attempts < 5) {
      const exists = await prisma.accountOutgoingLoans.findUnique({ where: { loanNumber } })
      if (!exists) break
      loanNumber = generateLoanNumber()
      attempts++
    }

    const loan = await prisma.accountOutgoingLoans.create({
      data: {
        loanNumber,
        payrollAccountId: payrollAccount.id,
        expenseAccountId: null,
        loanType: 'EMPLOYEE',
        recipientEmployeeId,
        principalAmount: Number(principalAmount),
        remainingBalance: Number(principalAmount),
        monthlyInstallment: Number(monthlyInstallment),
        totalMonths: Number(totalMonths),
        remainingMonths: Number(totalMonths),
        interestRate: interestRate ? Number(interestRate) : null,
        disbursementDate: new Date(disbursementDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'PENDING_APPROVAL',
        purpose: purpose ?? null,
        notes: notes ?? null,
        paymentType: 'PAYROLL_DEDUCTION',
        createdBy: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        loan: {
          id: loan.id,
          loanNumber: loan.loanNumber,
          status: loan.status,
          principalAmount: Number(loan.principalAmount),
          loanType: loan.loanType,
          payrollAccountId: loan.payrollAccountId,
          employee,
        },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating payroll account employee loan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
