import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAccountNumber } from '@/lib/expense-account-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account
 * List all expense accounts (with permission check)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions (pass full user object, not just ID)
    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to access expense accounts' },
        { status: 403 }
      )
    }

    // Build where clause based on user role and optional businessId filter
    const isAdmin = user.role === 'admin'
    const { searchParams } = new URL(request.url)
    const filterBusinessId = searchParams.get('businessId')

    let whereClause: any = {}
    if (filterBusinessId) {
      // Filter to a specific business (used when scoping to current business)
      whereClause = { businessId: filterBusinessId }
    } else if (!isAdmin) {
      // Non-admins see only their businesses' accounts
      const userBusinessIds = user.businessMemberships
        ?.map((m: any) => m.businessId) || []
      whereClause = { businessId: { in: userBusinessIds } }
    }

    const accounts = await prisma.expenseAccounts.findMany({
      where: whereClause,
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

    // Compute aggregate deposits and payments for each account in a single query using groupBy
    const accountIds = accounts.map((a) => a.id)
    const depositGroups = await prisma.expenseAccountDeposits.groupBy({
      by: ['expenseAccountId'],
      where: { expenseAccountId: { in: accountIds } },
      _sum: { amount: true },
      _count: { id: true },
      _max: { depositDate: true }, // Get most recent deposit date
    })
    const paymentGroups = await prisma.expenseAccountPayments.groupBy({
      by: ['expenseAccountId'],
      where: { expenseAccountId: { in: accountIds } },
      _sum: { amount: true },
      _max: { amount: true, paymentDate: true }, // Get most recent payment date
      _count: { id: true },
    })

    const depositMap = new Map(depositGroups.map((g) => [g.expenseAccountId, Number(g._sum?.amount ?? 0)]))
    const depositCountMap = new Map(depositGroups.map((g) => [g.expenseAccountId, Number(g._count?.id ?? 0)]))
    const lastDepositDateMap = new Map(depositGroups.map((g) => [g.expenseAccountId, g._max?.depositDate]))
    const paymentMap = new Map(paymentGroups.map((g) => [g.expenseAccountId, Number(g._sum?.amount ?? 0)]))
    const paymentCountMap = new Map(paymentGroups.map((g) => [g.expenseAccountId, Number(g._count?.id ?? 0)]))
    const lastPaymentDateMap = new Map(paymentGroups.map((g) => [g.expenseAccountId, g._max?.paymentDate]))

    // Calculate last activity date for each account (most recent deposit or payment)
    const lastActivityMap = new Map<string, Date>()
    accountIds.forEach((accountId) => {
      const lastDeposit = lastDepositDateMap.get(accountId)
      const lastPayment = lastPaymentDateMap.get(accountId)

      let lastActivity: Date | null = null
      if (lastDeposit && lastPayment) {
        lastActivity = new Date(lastDeposit) > new Date(lastPayment) ? new Date(lastDeposit) : new Date(lastPayment)
      } else if (lastDeposit) {
        lastActivity = new Date(lastDeposit)
      } else if (lastPayment) {
        lastActivity = new Date(lastPayment)
      }

      if (lastActivity) {
        lastActivityMap.set(accountId, lastActivity)
      }
    })

    // Find the largest payment amount for each account and the payee for that payment
    const payments = await prisma.expenseAccountPayments.findMany({
      where: { expenseAccountId: { in: accountIds } },
      include: {
        payeeUser: { select: { name: true } },
        payeeEmployee: { select: { fullName: true } },
        payeePerson: { select: { fullName: true } },
        payeeBusiness: { select: { name: true } },
      },
    })

    const largestPaymentMap = new Map()
    for (const p of payments) {
      const aid = p.expenseAccountId
      const amt = Number(p.amount ?? 0)
      const existing = largestPaymentMap.get(aid)
      if (!existing || amt > existing.amount || (amt === existing.amount && new Date(p.paymentDate) > new Date(existing.paymentDate))) {
        // compute payee name
        const payeeName = p.payeeUser?.name || p.payeeEmployee?.fullName || p.payeePerson?.fullName || p.payeeBusiness?.name || null
        largestPaymentMap.set(aid, { id: p.id, amount: amt, payeeName, paymentDate: p.paymentDate })
      }
    }

    // Sort accounts by most recent activity (deposits or payments)
    // Accounts with recent activity appear first, accounts with no activity appear last (sorted by createdAt)
    const sortedAccounts = accounts.sort((a, b) => {
      const aLastActivity = lastActivityMap.get(a.id)
      const bLastActivity = lastActivityMap.get(b.id)

      // Both have activity - compare activity dates (most recent first)
      if (aLastActivity && bLastActivity) {
        return bLastActivity.getTime() - aLastActivity.getTime()
      }

      // Only a has activity - a comes first
      if (aLastActivity && !bLastActivity) {
        return -1
      }

      // Only b has activity - b comes first
      if (!aLastActivity && bLastActivity) {
        return 1
      }

      // Neither has activity - sort by createdAt (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({
      success: true,
      data: {
        accounts: sortedAccounts.map((account) => ({
          id: account.id,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          balance: Number(account.balance),
          description: account.description,
          isActive: account.isActive,
          lowBalanceThreshold: Number(account.lowBalanceThreshold),
          // Sibling-related fields
          parentAccountId: account.parentAccountId,
          siblingNumber: account.siblingNumber,
          isSibling: account.isSibling,
          canMerge: account.canMerge,
          createdBy: account.createdBy,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
          creator: account.creator,
          depositsTotal: depositMap.get(account.id) ?? 0,
          paymentsTotal: paymentMap.get(account.id) ?? 0,
          depositCount: depositCountMap.get(account.id) ?? 0,
          paymentCount: paymentCountMap.get(account.id) ?? 0,
          largestPayment: largestPaymentMap.get(account.id)?.amount ?? 0,
          largestPaymentPayee: largestPaymentMap.get(account.id)?.payeeName ?? null,
          largestPaymentId: largestPaymentMap.get(account.id)?.id ?? null,
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions (pass full user object, not just ID)
    const permissions = getEffectivePermissions(user)
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
        createdBy: user.id,
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
