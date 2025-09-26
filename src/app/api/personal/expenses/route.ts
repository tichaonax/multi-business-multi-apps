import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'
import { createExpenseWithTransaction } from '@/lib/transaction-utils'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to access personal finance
    if (!hasUserPermission(user, 'canAccessPersonalFinance')) {
      return NextResponse.json({ error: 'Insufficient permissions to access personal finance' }, { status: 403 })
    }

    console.log('Fetching expenses for user:', session.user.id)

    const expenses = await prisma.personalExpense.findMany({
      where: { userId: session.user.id },
      include: {
        projectTransactions: {
          include: {
            projectContractor: {
              include: {
                person: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true
                  }
                }
              }
            },
            constructionProject: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        loanTransactions: {
          include: {
            loan: {
              include: {
                borrowerBusiness: { select: { name: true } },
                borrowerPerson: { select: { fullName: true } },
                lenderBusiness: { select: { name: true } }
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

    console.log('Found expenses:', expenses.length)

    // Fetch all unique category IDs
    const categoryIds = [...new Set(expenses.map(expense => expense.category).filter(Boolean))]

    // Fetch category information
    const categories = await prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } }
    })

    // Create a map for quick category lookup
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]))

    // Convert Decimal amounts to numbers for JSON serialization
    const expensesWithConvertedAmounts = expenses.map(expense => ({
      ...expense,
      amount: expense.amount ? Number(expense.amount) : 0,
      // Add category object with name, emoji, and color
      categoryObject: expense.category ? categoryMap.get(expense.category) || null : null,
      projectTransactions: expense.projectTransactions.map(pt => ({
        ...pt,
        amount: Number(pt.amount)
      })),
      loanTransactions: expense.loanTransactions.map(lt => ({
        ...lt,
        amount: Number(lt.amount),
        loan: {
          ...lt.loan,
          principalAmount: Number(lt.loan.principalAmount),
          remainingBalance: Number(lt.loan.remainingBalance),
          totalAmount: Number(lt.loan.totalAmount),
          interestRate: Number(lt.loan.interestRate)
        }
      }))
    }))

    console.log('Returning expenses array:', expensesWithConvertedAmounts.length)
    return NextResponse.json(expensesWithConvertedAmounts)
  } catch (error) {
    console.error('Expenses fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to add personal expenses
    if (!hasUserPermission(user, 'canAddPersonalExpenses')) {
      return NextResponse.json({ error: 'Insufficient permissions to add expenses' }, { status: 403 })
    }

    const {
      amount,
      description,
      category,
      date,
      paymentType,
      businessType,
      projectType,
      projectTypeId,
      projectId,
      contractorId,
      projectSubType,
      loanId,
      loanType,
      recipientType,
      interestRate,
      dueDate,
      terms,
      notes
    } = await request.json()

    if (!amount || amount <= 0 || !description) {
      return NextResponse.json({ error: 'Amount and description are required' }, { status: 400 })
    }

    // Check available balance before creating expense
    const budgetEntries = await prisma.personalBudget.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    const currentBalance = budgetEntries.reduce((acc, entry) => {
      return entry.type === 'deposit'
        ? acc + Number(entry.amount)
        : acc - Number(entry.amount)
    }, 0)

    const requestedAmount = Number(amount)
    if (currentBalance < requestedAmount) {
      return NextResponse.json({
        error: `Insufficient funds. Available: $${currentBalance.toFixed(2)}, Required: $${requestedAmount.toFixed(2)}`
      }, { status: 400 })
    }

    // Use atomic transaction for all expense creation operations
    const result = await createExpenseWithTransaction({
      amount: Number(amount),
      description,
      category,
      paymentType,
      businessType,
      projectType,
      projectTypeId,
      projectId,
      contractorId,
      projectSubType,
      loanId,
      loanType,
      recipientType,
      interestRate: interestRate ? Number(interestRate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      terms,
      notes,
      date: new Date(date),
      userId: session.user.id,
      createdBy: session.user.id
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Transaction failed' }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Expense creation error:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}