import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/my-grants
 * Returns expense accounts the current user has been explicitly granted access to.
 * Used by the sidebar to show cross-business accounts.
 * Admins return an empty list (they navigate via the full account list instead).
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Admins see all accounts — no need for individual grants in sidebar
    if (user.role === 'admin') {
      return NextResponse.json({ success: true, data: [] })
    }

    const grants = await prisma.expenseAccountGrants.findMany({
      where: { userId: user.id },
      include: {
        expenseAccount: {
          select: { id: true, accountName: true, accountNumber: true, isActive: true },
        },
      },
      orderBy: { grantedAt: 'desc' },
    })

    const accounts = grants
      .filter((g: any) => g.expenseAccount.isActive)
      .map((g: any) => ({
        id: g.expenseAccount.id,
        accountName: g.expenseAccount.accountName,
        accountNumber: g.expenseAccount.accountNumber,
        permissionLevel: g.permissionLevel,
      }))

    return NextResponse.json({ success: true, data: accounts })
  } catch (error) {
    console.error('Error fetching my grants:', error)
    return NextResponse.json({ error: 'Failed to fetch grants' }, { status: 500 })
  }
}
