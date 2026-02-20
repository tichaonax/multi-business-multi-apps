import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/payroll/account/funding-sources
 * List all active expense accounts with balance > 0, for the multi-source funding modal
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canMakeExpensePayments && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const accounts = await prisma.expenseAccounts.findMany({
      where: {
        isActive: true,
        businessId: { not: null },
        balance: { gt: 0 },
      },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        balance: true,
        businessId: true,
        business: { select: { id: true, name: true, type: true } },
      },
      orderBy: { balance: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        accounts: accounts.map((a: (typeof accounts)[number]) => ({
          id: a.id,
          accountName: a.accountName,
          accountNumber: a.accountNumber,
          balance: Number(a.balance),
          businessId: a.businessId,
          business: a.business,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching payroll funding sources:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
