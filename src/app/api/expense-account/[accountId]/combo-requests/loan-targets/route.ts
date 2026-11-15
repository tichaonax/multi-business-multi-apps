import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount } from '@/lib/expense-account-access'

/**
 * GET /api/expense-account/[accountId]/combo-requests/loan-targets
 * MBM-333: businesses a business-loan combo from this account can go to,
 * each with its active expense accounts (names only — no balances), oldest
 * (primary) first. Excludes this account's own business and the umbrella.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId } = await params
    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      if (!(await canUserViewAccount(user.id, accountId))) {
        return NextResponse.json({ error: 'You do not have permission to access this expense account' }, { status: 403 })
      }
    }

    const source = await prisma.expenseAccounts.findUnique({ where: { id: accountId }, select: { businessId: true } })
    if (!source) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const businesses = await prisma.businesses.findMany({
      where: {
        isActive: true,
        isUmbrellaBusiness: false,
        ...(source.businessId ? { id: { not: source.businessId } } : {}),
      },
      select: {
        id: true,
        name: true,
        expense_accounts: {
          where: { isActive: true, id: { not: accountId } },
          select: { id: true, accountName: true, accountNumber: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: businesses
        .filter(b => b.expense_accounts.length > 0)
        .map(b => ({ id: b.id, name: b.name, accounts: b.expense_accounts })),
    })
  } catch (error) {
    console.error('Error loading loan targets:', error)
    return NextResponse.json({ error: 'Failed to load businesses' }, { status: 500 })
  }
}
