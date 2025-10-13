import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasUserPermission, isSystemAdmin } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'
import { deleteExpenseWithRollback } from '@/lib/transaction-utils'

import { randomBytes } from 'crypto';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { expenseId } = await params

    // Check if user has permission to access personal finance
    if (!hasUserPermission(user, 'canAccessPersonalFinance')) {
      return NextResponse.json({ error: 'Insufficient permissions to access personal finance' }, { status: 403 })
    }

    // Build where clause - admins can view any expense, others only their own
    const whereClause: any = {
      id: expenseId
    }

    // Non-admin users can only access their own expenses
    if (!isSystemAdmin(user)) {
      whereClause.userId = session.user.id
    }

    const expense = await prisma.personalExpenses.findFirst({
      where: whereClause,
      include: {
        projectTransactions: {
          include: {
            project: true,
            projectContractor: {
              include: {
                person: true
              }
            }
          }
        }
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Fetch category information if available
    let categoryObject = null
    if (expense.category) {
      categoryObject = await prisma.expenseCategories.findUnique({
        where: { id: expense.category }
      })
    }

    // Convert Decimal amounts to numbers for JSON serialization
    const expenseWithConvertedAmount = {
      ...expense,
      amount: expense.amount ? Number(expense.amount) : 0,
      categoryObject
    }

    return NextResponse.json(expenseWithConvertedAmount)
  } catch (error) {
    console.error('Expense fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { expenseId } = await params

    // Check if user has permission to edit personal expenses
    if (!hasUserPermission(user, 'canEditPersonalExpenses')) {
      return NextResponse.json({ error: 'Insufficient permissions to edit expenses' }, { status: 403 })
    }

    const { description, category, amount, date, tags, paymentType, projectId, contractorId } = await request.json()

    if (!description || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Description and valid amount are required' }, { status: 400 })
    }

    // Find the existing expense
    const existingExpense = await prisma.personalExpenses.findFirst({
      where: {
        id: expenseId,
        userId: session.user.id
      }
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const isAdmin = isSystemAdmin(session.user)

    // Check ownership and time-based permissions for editing
    if (!isAdmin) {
      // Non-admin users can only edit their own expenses
      if (existingExpense.userId !== session.user.id) {
        return NextResponse.json({ error: 'Insufficient permissions to edit this expense' }, { status: 403 })
      }

      // Check 24-hour window for non-admin users
      const creationDate = new Date(existingExpense.createdAt)
      const now = new Date()
      const hoursSinceCreation = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60)

      if (hoursSinceCreation > 24) {
        return NextResponse.json({
          error: 'Cannot edit expense after 24 hours. Please contact an administrator.',
          isTimeRestricted: true,
          hoursRemaining: 0
        }, { status: 403 })
      }
    }

    const amountDifference = Number(amount) - Number(existingExpense.amount)

    // If amount is increasing, check available balance
    if (amountDifference > 0) {
      const budgetEntries = await prisma.personalBudgets.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
      })

      const currentBalance = budgetEntries.reduce((acc, entry) => {
        return entry.type === 'deposit'
          ? acc + Number(entry.amount)
          : acc - Number(entry.amount)
      }, 0)

      if (currentBalance < amountDifference) {
        return NextResponse.json({
          error: `Insufficient funds for increase. Available: $${currentBalance.toFixed(2)}, Additional Required: $${amountDifference.toFixed(2)}`
        }, { status: 400 })
      }
    }

    // Update the expense
    const updatedExpense = await prisma.personalExpenses.update({
      where: { id: expenseId },
      data: {
        description,
        category: paymentType === 'contractor' ? 'Contractor Payment'
          : paymentType === 'loan' ? 'Loan'
          : (category || 'Other'),
        amount: Number(amount),
        date: new Date(date),
        tags: paymentType || tags || ''
      }
    })

    // If amount changed, update the budget accordingly
    if (amountDifference !== 0) {
      await prisma.personalBudgets.create({
        data: {
          userId: session.user.id,
          amount: Math.abs(amountDifference), // Always positive amount
          description: `Expense adjustment: ${description}`,
          type: amountDifference > 0 ? 'expense' : 'deposit' // If increase = expense, if decrease = deposit
        }
      })
    }

    // Handle ProjectTransaction for contractor/project payments
    if (paymentType === 'contractor' || paymentType === 'project') {
      if (projectId && (paymentType !== 'contractor' || contractorId)) {
        // For contractor payments, validate that the person is active
        if (paymentType === 'contractor' && contractorId) {
          const projectContractor = await prisma.projectContractors.findUnique({
            where: { id: contractorId },
            select: {
              person: {
                select: {
                  isActive: true,
                  fullName: true
                }
              }
            }
          })
          
          if (!projectContractor) {
            return NextResponse.json({ error: 'Contractor not found' }, { status: 400 })
          }
          
          // Check if the person is inactive
          if (projectContractor.person?.isActive === false) {
            return NextResponse.json({ 
              error: `Cannot make payment to inactive person: ${projectContractor.person.fullName}. Please reactivate the person first.` 
            }, { status: 400 })
          }
        }
        
        // Check if ProjectTransaction already exists
        const existingTransaction = await prisma.projectTransactions.findFirst({
          where: { personalExpenseId: expenseId }
        })

        if (existingTransaction) {
          // Update existing transaction
          await prisma.projectTransactions.update({
            where: { id: existingTransaction.id },
            data: {
              projectId,
              projectContractorId: paymentType === 'contractor' ? contractorId : null,
              transactionType: paymentType === 'contractor' ? 'contractor_payment' : 'project_expense',
              amount: Number(amount),
              description
            }
          })
        } else {
          // Create new transaction
          await prisma.projectTransactions.create({
            data: {
              projectId,
              personalExpenseId: expenseId,
              projectContractorId: paymentType === 'contractor' ? contractorId : null,
              transactionType: paymentType === 'contractor' ? 'contractor_payment' : 'project_expense',
              amount: Number(amount),
              description,
              status: 'pending',
              createdBy: session.user.id
            }
          })
        }
      }
    } else {
      // If changing away from contractor/project payment, delete any existing ProjectTransaction
      await prisma.projectTransactions.deleteMany({
        where: { personalExpenseId: expenseId }
      })
    }

    // Fetch the complete expense data with all relationships to return updated information
    const completeExpense = await prisma.personalExpenses.findUnique({
      where: { id: expenseId },
      include: {
        projectTransactions: {
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            },
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
            }
          }
        }
      }
    })

    // Convert Decimal amounts to numbers for JSON serialization
    const expenseWithConvertedAmount = {
      ...completeExpense,
      amount: completeExpense?.amount ? Number(completeExpense.amount) : 0
    }

    return NextResponse.json(expenseWithConvertedAmount)
  } catch (error) {
    console.error('Expense update error:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { expenseId } = await params

    // Check if user has permission to delete personal expenses
    if (!hasUserPermission(user, 'canDeletePersonalExpenses')) {
      return NextResponse.json({ error: 'Insufficient permissions to delete expenses' }, { status: 403 })
    }

    // Verify expense exists and ownership
    const expense = await prisma.personalExpenses.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        description: true
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const isAdmin = isSystemAdmin(session.user)

    // Check ownership and time-based permissions
    if (!isAdmin) {
      // Non-admin users can only delete their own expenses
      if (expense.userId !== session.user.id) {
        return NextResponse.json({ error: 'Insufficient permissions to delete this expense' }, { status: 403 })
      }

      // Check 24-hour window for non-admin users
      const creationDate = new Date(expense.createdAt)
      const now = new Date()
      const hoursSinceCreation = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60)

      if (hoursSinceCreation > 24) {
        return NextResponse.json({
          error: 'Cannot delete expense after 24 hours. Please contact an administrator.',
          isTimeRestricted: true,
          hoursRemaining: 0
        }, { status: 403 })
      }
    }

    // Use atomic transaction for deletion with complete rollback
    const result = await deleteExpenseWithRollback({
      expenseId: expenseId,
      userId: session.user.id,
      rollbackReason: isAdmin ? 'Admin deletion' : 'User deletion within 24-hour window',
      auditNotes: `Expense deleted by ${session.user.name} (${session.user.email})`
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete expense' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Expense deleted successfully',
      rollbackSummary: result.rollback
    })

  } catch (error: any) {
    console.error('Expense deletion error:', error)

    // Handle specific database errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Expense not found or already deleted' },
        { status: 404 }
      )
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete expense due to database constraints' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}