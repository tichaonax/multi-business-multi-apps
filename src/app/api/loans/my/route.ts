import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/loans/my
 * Returns loans where the current user is a manager or lender.
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loans = await prisma.businessLoan.findMany({
      where: {
        OR: [
          { managedByUserId: user.id },
          { managers: { some: { userId: user.id } } },
          { lenderUserId: user.id },
        ],
      },
      select: {
        id: true,
        loanNumber: true,
        description: true,
        totalAmount: true,
        lockedBalance: true,
        lenderName: true,
        status: true,
        createdAt: true,
        expenseAccount: { select: { id: true, accountNumber: true, balance: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ loans })
  } catch (error) {
    console.error('GET /api/loans/my error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
