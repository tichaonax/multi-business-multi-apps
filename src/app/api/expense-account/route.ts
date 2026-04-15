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

    const permissions = getEffectivePermissions(user)

    // Build where clause based on user role and optional businessId filter
    const isAdmin = user.role === 'admin'
    const { searchParams } = new URL(request.url)
    const filterBusinessId = searchParams.get('businessId')

    const allForSetup = searchParams.get('allForSetup') === 'true'
    const simple = searchParams.get('simple') === 'true' // lightweight mode: id, name, number, type, balance only

    let whereClause: any = {}
    if (isAdmin && filterBusinessId) {
      // Admins scoped to a specific business via query param
      whereClause = { businessId: filterBusinessId }
    } else if (!isAdmin && allForSetup && getEffectivePermissions(user).canManageAutoDeposits) {
      // Users with auto-deposit setup permission can see all accounts system-wide
      whereClause = {}
    } else if (!isAdmin) {
      // Fetch explicit grants for this user
      const grants = await prisma.expenseAccountGrants.findMany({
        where: { userId: user.id },
        select: { expenseAccountId: true },
      })
      const grantedAccountIds = grants.map(g => g.expenseAccountId)

      // Require either business permission or at least one grant
      if (!permissions.canAccessExpenseAccount && grantedAccountIds.length === 0) {
        return NextResponse.json(
          { error: 'You do not have permission to access expense accounts' },
          { status: 403 }
        )
      }

      if (filterBusinessId) {
        // Include accounts in the filtered business AND any explicitly granted accounts
        const orClauses: any[] = [{ businessId: filterBusinessId }]
        if (grantedAccountIds.length > 0) {
          orClauses.push({ id: { in: grantedAccountIds } })
        }
        whereClause = orClauses.length === 1 ? orClauses[0] : { OR: orClauses }
      } else {
        const userBusinessIds = user.businessMemberships?.map((m: any) => m.businessId) || []
        const orClauses: any[] = []
        if (permissions.canAccessExpenseAccount) {
          orClauses.push({ businessId: { in: userBusinessIds } })
        }
        if (grantedAccountIds.length > 0) {
          orClauses.push({ id: { in: grantedAccountIds } })
        }
        whereClause = orClauses.length === 1 ? orClauses[0] : { OR: orClauses }
      }
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
        business: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compute aggregate deposits and payments for each account in a single query using groupBy
    const accountIds = accounts.map((a) => a.id)

    // Simple mode: lightweight account list scoped to accounts the user can WRITE to (deposit into).
    // Used by the transfer modal destination selector.
    if (simple) {
      // For non-admins, restrict to accounts with actual write access:
      // - Business accounts where canMakeExpenseDeposits is true
      // - Explicitly granted accounts with FULL (not VIEW) grant
      let writeableIds: string[] = accountIds
      if (!isAdmin) {
        const userBusinessIds = user.businessMemberships?.map((m: any) => m.businessId) || []
        const fullGrants = await prisma.expenseAccountGrants.findMany({
          where: { userId: user.id, permissionLevel: 'FULL' },
          select: { expenseAccountId: true },
        })
        const fullGrantIds = new Set(fullGrants.map(g => g.expenseAccountId))

        writeableIds = accounts
          .filter(a => {
            // Transfers only allowed on non-business accounts with FULL grant
            if (a.businessId) return false
            return fullGrantIds.has(a.id)
          })
          .map(a => a.id)
      }

      const writeableAccounts = accounts.filter(a => writeableIds.includes(a.id))
      const writeableAccountIds = writeableAccounts.map(a => a.id)

      const [simpleDeposits, simplePayments] = await Promise.all([
        prisma.expenseAccountDeposits.groupBy({
          by: ['expenseAccountId'],
          where: { expenseAccountId: { in: writeableAccountIds } },
          _sum: { amount: true },
        }),
        prisma.expenseAccountPayments.groupBy({
          by: ['expenseAccountId'],
          where: { expenseAccountId: { in: writeableAccountIds }, status: { in: ['SUBMITTED', 'APPROVED', 'PAID'] } },
          _sum: { amount: true },
        }),
      ])
      const depMap = new Map(simpleDeposits.map(g => [g.expenseAccountId, Number(g._sum?.amount ?? 0)]))
      const payMap = new Map(simplePayments.map(g => [g.expenseAccountId, Number(g._sum?.amount ?? 0)]))
      return NextResponse.json({
        success: true,
        data: {
          accounts: writeableAccounts.map(a => ({
            id: a.id,
            accountName: a.accountName,
            accountNumber: a.accountNumber,
            accountType: a.accountType,
            isActive: a.isActive,
            balance: (depMap.get(a.id) ?? 0) - (payMap.get(a.id) ?? 0),
          })),
        },
      })
    }

    // For RENT-type accounts, fetch the landlord supplier details
    const rentAccountIds = accounts.filter(a => a.accountType === 'RENT').map(a => a.id)
    const rentLandlordMap = new Map<string, { landlordSupplierId: string; landlordSupplierName: string }>()
    if (rentAccountIds.length > 0) {
      const rentConfigs = await prisma.businessRentConfig.findMany({
        where: { expenseAccountId: { in: rentAccountIds }, isActive: true },
        select: {
          expenseAccountId: true,
          landlordSupplierId: true,
          landlordSupplier: { select: { name: true } },
        },
      })
      for (const rc of rentConfigs) {
        if (rc.landlordSupplierId && rc.landlordSupplier) {
          rentLandlordMap.set(rc.expenseAccountId, {
            landlordSupplierId: rc.landlordSupplierId,
            landlordSupplierName: rc.landlordSupplier.name,
          })
        }
      }
    }

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
    // Committed payments (PAID + SUBMITTED + APPROVED) — used for balance calculation
    const submittedPaymentGroups = await prisma.expenseAccountPayments.groupBy({
      by: ['expenseAccountId'],
      where: { expenseAccountId: { in: accountIds }, status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] } },
      _sum: { amount: true },
    })

    const submittedPaymentMap = new Map(submittedPaymentGroups.map((g) => [g.expenseAccountId, Number(g._sum?.amount ?? 0)]))
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
    // Also collect last 2 payments per account for the mini transaction list
    const [payments, recentDepositsData] = await Promise.all([
      prisma.expenseAccountPayments.findMany({
        where: { expenseAccountId: { in: accountIds } },
        include: {
          payeeUser: { select: { name: true } },
          payeeEmployee: { select: { fullName: true } },
          payeePerson: { select: { fullName: true } },
          payeeBusiness: { select: { name: true } },
          category: { select: { name: true, emoji: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.expenseAccountDeposits.findMany({
        where: { expenseAccountId: { in: accountIds } },
        select: {
          id: true,
          expenseAccountId: true,
          sourceType: true,
          amount: true,
          depositDate: true,
          autoGeneratedNote: true,
          manualNote: true,
          sourceBusiness: { select: { name: true } },
        },
        orderBy: { depositDate: 'desc' },
      }),
    ])

    const largestPaymentMap = new Map()
    const recentPaymentsMap = new Map<string, any[]>()
    for (const p of payments) {
      const aid = p.expenseAccountId
      const amt = Number(p.amount ?? 0)
      const existing = largestPaymentMap.get(aid)
      const payeeName = p.payeeUser?.name || p.payeeEmployee?.fullName || p.payeePerson?.fullName || p.payeeBusiness?.name || null
      if (!existing || amt > existing.amount || (amt === existing.amount && new Date(p.paymentDate) > new Date(existing.paymentDate))) {
        largestPaymentMap.set(aid, { id: p.id, amount: amt, payeeName, paymentDate: p.paymentDate })
      }
      // Collect last 2 payments per account (payments are sorted desc)
      const recentList = recentPaymentsMap.get(aid) ?? []
      if (recentList.length < 2) {
        recentList.push({
          id: p.id,
          type: 'PAYMENT',
          amount: amt,
          date: (p.paymentDate as Date).toISOString(),
          description: payeeName ? `Payment to ${payeeName}` : 'General Payment',
          paymentType: (p as any).paymentType ?? 'REGULAR',
          categoryName: (p as any).category?.name ?? null,
          categoryEmoji: (p as any).category?.emoji ?? null,
        })
        recentPaymentsMap.set(aid, recentList)
      }
    }

    // Collect last 2 deposits per account (already sorted desc)
    const recentDepositsMap = new Map<string, any[]>()
    for (const d of recentDepositsData) {
      const existing = recentDepositsMap.get(d.expenseAccountId) ?? []
      if (existing.length < 2) {
        const description = d.autoGeneratedNote || d.manualNote || (d.sourceBusiness?.name ? `From ${d.sourceBusiness.name}` : 'Deposit')
        existing.push({
          id: d.id,
          type: 'DEPOSIT',
          amount: Number(d.amount),
          date: (d.depositDate as Date).toISOString(),
          description,
          sourceType: d.sourceType,
        })
        recentDepositsMap.set(d.expenseAccountId, existing)
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
          balance: (depositMap.get(account.id) ?? 0) - (submittedPaymentMap.get(account.id) ?? 0),
          description: account.description,
          isActive: account.isActive,
          businessId: account.businessId ?? null,
          businessName: account.business?.name ?? null,
          lowBalanceThreshold: Number(account.lowBalanceThreshold),
          // Sibling-related fields
          parentAccountId: account.parentAccountId,
          siblingNumber: account.siblingNumber,
          isSibling: account.isSibling,
          canMerge: account.canMerge,
          accountType: account.accountType,
          createdBy: account.createdBy,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
          creator: account.creator,
          // Landlord data for RENT-type accounts
          landlordSupplierId: rentLandlordMap.get(account.id)?.landlordSupplierId ?? null,
          landlordSupplierName: rentLandlordMap.get(account.id)?.landlordSupplierName ?? null,
          depositsTotal: depositMap.get(account.id) ?? 0,
          paymentsTotal: paymentMap.get(account.id) ?? 0,
          depositCount: depositCountMap.get(account.id) ?? 0,
          paymentCount: paymentCountMap.get(account.id) ?? 0,
          largestPayment: largestPaymentMap.get(account.id)?.amount ?? 0,
          largestPaymentPayee: largestPaymentMap.get(account.id)?.payeeName ?? null,
          largestPaymentId: largestPaymentMap.get(account.id)?.id ?? null,
          recentDeposits: recentDepositsMap.get(account.id) ?? [],
          recentPayments: recentPaymentsMap.get(account.id) ?? [],
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
    const { accountName, description, lowBalanceThreshold, accountType = 'GENERAL' } = body

    // Validate accountType
    if (!['GENERAL', 'PERSONAL'].includes(accountType)) {
      return NextResponse.json({ error: 'accountType must be GENERAL or PERSONAL' }, { status: 400 })
    }

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
        accountType,
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

    // Auto-grant FULL access to the creator so they can always see their own account
    await prisma.expenseAccountGrants.upsert({
      where: { expenseAccountId_userId: { expenseAccountId: account.id, userId: user.id } },
      create: { expenseAccountId: account.id, userId: user.id, grantedBy: user.id, permissionLevel: 'FULL' },
      update: {},
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
            accountType: account.accountType,
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
