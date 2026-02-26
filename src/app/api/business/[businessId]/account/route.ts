import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/business/[businessId]/account
 * Returns the business account with computed true balance.
 * Accessible to: system admins, business owners/managers, members with canAccessFinancialData
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    // Permission check: system admin OR member of this business with canAccessFinancialData
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: { userId: user.id, businessId, isActive: true },
      }) as any
      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      const perms = getEffectivePermissions(user, businessId)
      if (!perms.canAccessFinancialData) {
        return NextResponse.json({ error: 'You do not have permission to access financial data' }, { status: 403 })
      }
    }

    // Load business
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, type: true, isActive: true },
    })
    if (!business || !business.isActive) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Load account
    const account = await (prisma.businessAccounts as any).findUnique({
      where: { businessId },
    })

    if (!account) {
      return NextResponse.json({
        success: true,
        data: {
          account: null,
          business: { id: business.id, name: business.name, type: business.type },
          hasAccount: false,
        },
      })
    }

    // Compute true balance: SUM credits - SUM debits from transaction rows
    const CREDIT_TYPES = ['deposit', 'transfer', 'loan_received', 'CREDIT']
    const DEBIT_TYPES = ['withdrawal', 'loan_disbursement', 'loan_payment', 'DEBIT']

    const [creditsAgg, debitsAgg] = await Promise.all([
      (prisma.businessTransactions as any).aggregate({
        where: { businessId, type: { in: CREDIT_TYPES } },
        _sum: { amount: true },
      }),
      (prisma.businessTransactions as any).aggregate({
        where: { businessId, type: { in: DEBIT_TYPES } },
        _sum: { amount: true },
      }),
    ])

    const totalCredits = Number(creditsAgg._sum?.amount ?? 0)
    // DEBIT-type transactions store amount as a negative number; take absolute value
    const totalDebits = Math.abs(Number(debitsAgg._sum?.amount ?? 0))
    const computedBalance = totalCredits - totalDebits

    // Silent self-repair if column is stale
    const storedBalance = Number(account.balance)
    if (Math.abs(storedBalance - computedBalance) > 0.005) {
      prisma.businessAccounts.update({
        where: { businessId },
        data: { balance: computedBalance },
      }).catch(() => {})
    }

    // Last transaction date
    const lastTx = await (prisma.businessTransactions as any).findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        account: {
          id: account.id,
          businessId: account.businessId,
          balance: computedBalance,
          totalCredits,
          totalDebits,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
          lastTransactionAt: lastTx?.createdAt ?? null,
        },
        business: { id: business.id, name: business.name, type: business.type },
        hasAccount: true,
      },
    })
  } catch (error) {
    console.error('Error fetching business account:', error)
    return NextResponse.json({ error: 'Failed to fetch business account' }, { status: 500 })
  }
}
