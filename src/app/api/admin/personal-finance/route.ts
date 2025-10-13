import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only system admins can access this endpoint
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify user exists
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's personal finance transactions
    const personalExpenses = await prisma.personalExpenses.findMany({
      where: {
        userId: userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        projectTransactions: {
          select: {
            id: true,
            paymentMethod: true,
            transactionType: true,
            paymentCategory: true,
            status: true,
            notes: true,
            recipientPerson: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            },
            projectContractor: {
              include: {
                person: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            constructionProject: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            projectStage: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    // Calculate summary statistics
    const totalExpenses = personalExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
    const expensesByCategory = personalExpenses.reduce((acc, expense) => {
      if (expense.category) {
        const categoryName = expense.category
        acc[categoryName] = (acc[categoryName] || 0) + Number(expense.amount)
      }
      return acc
    }, {} as Record<string, number>)

    // Parse contractor information from tags field and derive payment type first
    const transactionsWithContractorInfo = personalExpenses.map(expense => {
      // Parse contractor information from tags field for direct contractor payments
      let contractorInfo = null
      let paymentType = 'category' // default

      if (expense.tags && expense.tags.startsWith('contractor:')) {
        const tagParts = expense.tags.split(':')
        if (tagParts.length === 3) {
          contractorInfo = {
            id: tagParts[1],
            name: tagParts[2]
          }
          paymentType = 'contractor'
        }
      } else if (expense.projectTransactions && expense.project_transactions.length > 0) {
        // Has project transactions, so it's a project payment
        paymentType = 'project'
      } else if (expense.loanTransactions && expense.loanTransactions.length > 0) {
        // Has loan transactions, so it's a loan payment
        paymentType = 'loan'
      }

      return {
        ...expense,
        amount: Number(expense.amount), // Convert decimal to number
        paymentType, // Add derived payment type
        contractorInfo // Add parsed contractor info
      }
    })

    // Calculate payment type statistics from the processed transactions
    const expensesByPaymentType = transactionsWithContractorInfo.reduce((acc, expense) => {
      acc[expense.paymentType] = (acc[expense.paymentType] || 0) + Number(expense.amount)
      return acc
    }, {} as Record<string, number>)

    // Calculate available amount (budget balance)
    const budgetEntries = await prisma.personalBudgets.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    })

    const availableAmount = budgetEntries.reduce((acc, entry) => {
      return entry.type === 'deposit'
        ? acc + Number(entry.amount)
        : acc - Number(entry.amount)
    }, 0)

    return NextResponse.json({
      user,
      transactions: transactionsWithContractorInfo,
      summary: {
        totalExpenses,
        totalTransactions: personalExpenses.length,
        availableAmount,
        expensesByCategory,
        expensesByPaymentType
      }
    })
  } catch (error) {
    console.error('Admin personal finance fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personal finance data' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    const { expenseId, amount, description, notes } = data

    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    // Get the expense to check ownership and timing
    const expense = await prisma.personalExpenses.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        amount: true
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const isAdmin = isSystemAdmin(session.user)

    // Check edit permissions: Admin can always edit, users can edit their own within 24 hours
    if (!isAdmin) {
      // Check if user owns the expense
      if (expense.userId !== session.user.id) {
        return NextResponse.json({ error: 'Insufficient permissions to edit this expense' }, { status: 403 })
      }

      // Check 24-hour window
      const creationDate = new Date(expense.createdAt)
      const now = new Date()
      const hoursSinceCreation = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60)

      if (hoursSinceCreation > 24) {
        return NextResponse.json({
          error: 'Cannot edit expense after 24 hours. Please contact an administrator.'
        }, { status: 403 })
      }
    }

    // Update the personal expense
    const updatedExpense = await prisma.personalExpenses.update({
      where: { id: expenseId },
      data: {
        amount: amount ? Number(amount) : undefined,
        description: description || undefined,
        notes: notes || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(updatedExpense)
  } catch (error) {
    console.error('Admin personal finance update error:', error)
    return NextResponse.json(
      { error: 'Failed to update personal finance transaction' },
      { status: 500 }
    )
  }
}