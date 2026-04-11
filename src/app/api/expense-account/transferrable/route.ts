import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/transferrable
 * Returns non-business expense accounts the current user can transfer funds from.
 * - Admins: all active non-business accounts
 * - Regular users: non-business accounts where they have a FULL grant
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let accounts: any[]

    if (user.role === 'admin') {
      // Admins can transfer from any non-business account
      accounts = await prisma.expenseAccounts.findMany({
        where: { businessId: null, isActive: true },
        select: { id: true, accountName: true, accountNumber: true, balance: true },
        orderBy: { accountName: 'asc' },
      })
    } else {
      // Regular users: only non-business accounts with FULL grant
      const grants = await prisma.expenseAccountGrants.findMany({
        where: { userId: user.id, permissionLevel: 'FULL' },
        include: {
          expenseAccount: {
            select: { id: true, accountName: true, accountNumber: true, balance: true, isActive: true, businessId: true },
          },
        },
      })

      accounts = grants
        .filter((g: any) => g.expenseAccount.isActive && g.expenseAccount.businessId === null)
        .map((g: any) => ({
          id: g.expenseAccount.id,
          accountName: g.expenseAccount.accountName,
          accountNumber: g.expenseAccount.accountNumber,
          balance: Number(g.expenseAccount.balance ?? 0),
        }))
    }

    return NextResponse.json({ success: true, data: accounts })
  } catch (error) {
    console.error('Error fetching transferrable accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
