import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAccountNumber } from '@/lib/expense-account-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account
 * List all expense accounts (with permission check)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = await getEffectivePermissions(session.user.id)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to access expense accounts' },
        { status: 403 }
      )
    }

    // Get all expense accounts
    const accounts = await prisma.expenseAccounts.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        accounts: accounts.map((account) => ({
          id: account.id,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          balance: Number(account.balance),
          description: account.description,
          isActive: account.isActive,
          lowBalanceThreshold: Number(account.lowBalanceThreshold),
          createdBy: account.createdBy,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
          creator: account.creator,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching expense accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense accounts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/expense-account
 * Create a new expense account (admin only)
 *
 * Body:
 * - accountName: string (required)
 * - description?: string
 * - lowBalanceThreshold?: number (default: 500)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = await getEffectivePermissions(session.user.id)
    if (!permissions.canCreateExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to create expense accounts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { accountName, description, lowBalanceThreshold } = body

    // Validate required fields
    if (!accountName || accountName.trim() === '') {
      return NextResponse.json(
        { error: 'Account name is required' },
        { status: 400 }
      )
    }

    // Check if account name already exists
    const existing = await prisma.expenseAccounts.findFirst({
      where: {
        accountName: accountName.trim(),
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An expense account with this name already exists' },
        { status: 400 }
      )
    }

    // Generate unique account number
    const accountNumber = await generateAccountNumber()

    // Set default low balance threshold
    const threshold = lowBalanceThreshold !== undefined ? lowBalanceThreshold : 500

    // Validate threshold
    if (threshold < 0) {
      return NextResponse.json(
        { error: 'Low balance threshold must be non-negative' },
        { status: 400 }
      )
    }

    // Create expense account
    const account = await prisma.expenseAccounts.create({
      data: {
        accountNumber,
        accountName: accountName.trim(),
        description: description?.trim() || null,
        balance: 0,
        isActive: true,
        lowBalanceThreshold: threshold,
        createdBy: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Expense account created successfully',
        data: {
          account: {
            id: account.id,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            balance: Number(account.balance),
            description: account.description,
            isActive: account.isActive,
            lowBalanceThreshold: Number(account.lowBalanceThreshold),
            createdBy: account.createdBy,
            createdAt: account.createdAt.toISOString(),
            updatedAt: account.updatedAt.toISOString(),
            creator: account.creator,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating expense account:', error)
    return NextResponse.json(
      { error: 'Failed to create expense account' },
      { status: 500 }
    )
  }
}
