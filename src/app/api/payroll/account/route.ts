import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGlobalPayrollAccount } from '@/lib/payroll-account-utils'

/**
 * GET /api/payroll/account
 * Get the global payroll account details
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add permission check for canAccessPayrollAccount

    // Get global payroll account
    const payrollAccount = await getGlobalPayrollAccount()

    if (!payrollAccount) {
      return NextResponse.json(
        { error: 'Payroll account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: payrollAccount.id,
        accountNumber: payrollAccount.accountNumber,
        balance: Number(payrollAccount.balance),
        isActive: payrollAccount.isActive,
        createdAt: payrollAccount.createdAt,
        createdBy: {
          id: payrollAccount.users.id,
          name: payrollAccount.users.name,
          email: payrollAccount.users.email,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching payroll account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll account' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payroll/account
 * Create a new payroll account (admin only)
 *
 * Body:
 * - accountNumber: string (optional, auto-generated if not provided)
 * - businessId: string | null (null for global account)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can create payroll accounts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { accountNumber, businessId } = body

    // Check if account already exists for this business
    if (businessId) {
      const existing = await prisma.payrollAccounts.findFirst({
        where: { businessId },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Payroll account already exists for this business' },
          { status: 400 }
        )
      }
    } else {
      // Check if global account already exists
      const existing = await prisma.payrollAccounts.findFirst({
        where: { businessId: null },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Global payroll account already exists' },
          { status: 400 }
        )
      }
    }

    // Generate account number if not provided
    let generatedAccountNumber = accountNumber
    if (!generatedAccountNumber) {
      if (businessId) {
        // Get business info
        const business = await prisma.businesses.findUnique({
          where: { id: businessId },
          select: { shortName: true, name: true },
        })
        const businessCode = (business?.shortName || business?.name || 'BUS')
          .substring(0, 10)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
        generatedAccountNumber = `PAY-${businessCode}-001`
      } else {
        generatedAccountNumber = 'PAY-GLOBAL-001'
      }
    }

    // Check if account number is unique
    const duplicateAccount = await prisma.payrollAccounts.findUnique({
      where: { accountNumber: generatedAccountNumber },
    })

    if (duplicateAccount) {
      return NextResponse.json(
        { error: 'Account number already exists' },
        { status: 400 }
      )
    }

    // Create payroll account
    const payrollAccount = await prisma.payrollAccounts.create({
      data: {
        businessId: businessId || null,
        accountNumber: generatedAccountNumber,
        balance: 0,
        isActive: true,
        createdBy: session.user.id,
      },
      include: {
        users: {
          select: { id: true, name: true, email: true },
        },
        businesses: businessId
          ? { select: { id: true, name: true, type: true } }
          : undefined,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Payroll account created successfully',
        data: {
          id: payrollAccount.id,
          accountNumber: payrollAccount.accountNumber,
          balance: Number(payrollAccount.balance),
          isActive: payrollAccount.isActive,
          businessId: payrollAccount.businessId,
          business: payrollAccount.businesses || null,
          createdAt: payrollAccount.createdAt,
          createdBy: payrollAccount.users,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating payroll account:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll account' },
      { status: 500 }
    )
  }
}
