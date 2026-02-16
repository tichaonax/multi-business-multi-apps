import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only system admins can access this endpoint
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all users with their personal expense counts
    const usersWithExpenses = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            personal_expenses: true
          }
        }
      },
      where: {
        isActive: true
      },
      orderBy: [
        {
          personal_expenses: {
            _count: 'desc'
          }
        },
        { name: 'asc' }
      ]
    })

    // Get additional statistics for users with personal expenses
    const usersWithTransactionData = await Promise.all(
      usersWithExpenses.map(async (user) => {
        if (user._count.personal_expenses > 0) {
          // Get total amount and recent activity
          const expenseSummary = await prisma.personalExpenses.aggregate({
            where: {
              userId: user.id
            },
            _sum: {
              amount: true
            }
          })

          const recentExpense = await prisma.personalExpenses.findFirst({
            where: {
              userId: user.id
            },
            orderBy: { date: 'desc' },
            select: {
              date: true,
              amount: true,
              description: true
            }
          })

          // Calculate available amount (budget balance)
          const budgetEntries = await prisma.personalBudgets.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
          })

          const availableAmount = budgetEntries.reduce((acc, entry) => {
            return entry.type === 'deposit'
              ? acc + Number(entry.amount)
              : acc - Number(entry.amount)
          }, 0)

          return {
            ...user,
            totalExpenses: Number(expenseSummary._sum.amount || 0),
            totalAvailable: availableAmount,
            recentActivity: recentExpense
          }
        }

        return {
          ...user,
          totalExpenses: 0,
          totalAvailable: 0,
          recentActivity: null
        }
      })
    )

    return NextResponse.json(usersWithTransactionData)
  } catch (error) {
    console.error('Admin personal finance users fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users with personal finance data' },
      { status: 500 }
    )
  }
}