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

    const expenses = await prisma.personalExpenses.findMany({
      where: { userId: session.user.id },
      include: {
        expense_category: {
          include: {
            domain: true,
          },
        },
        expense_subcategory: true,
        project_transactions: {
          include: {
            project_contractors: {
              include: {
                persons: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true
                  }
                }
              }
            },
            construction_projects: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        loan_transactions: {
          include: {
            inter_business_loans: {
              include: {
                businesses_inter_business_loans_borrowerBusinessIdTobusinesses: { select: { name: true } },
                persons_borrower: { select: { fullName: true } },
                persons_lender: { select: { fullName: true } },
                businesses_inter_business_loans_lenderBusinessIdTobusinesses: { select: { name: true } }
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

    // Convert Decimal amounts to numbers for JSON serialization and add frontend-compatible aliases
    const expensesWithConvertedAmounts = (expenses as any[]).map(expense => ({
      ...expense,
      amount: expense.amount ? Number(expense.amount) : 0,
      // Add category object with name, emoji, and color (from new structure)
      categoryObject: expense.expense_category || null,
      subcategoryObject: expense.expense_subcategory || null,
      // Frontend-compatible property aliases
      projectTransactions: (expense.project_transactions || []).map((pt: any) => ({
        ...pt,
        amount: Number(pt.amount),
        projectContractors: pt.project_contractors,
        constructionProjects: pt.construction_projects
      })),
      loanTransactions: (expense.loan_transactions || []).map((lt: any) => ({
        ...lt,
        amount: Number(lt.amount),
        interBusinessLoans: lt.inter_business_loans ? {
          ...lt.inter_business_loans,
          principalAmount: Number(lt.inter_business_loans.principalAmount),
          remainingBalance: Number(lt.inter_business_loans.remainingBalance),
          totalAmount: Number(lt.inter_business_loans.totalAmount),
          interestRate: Number(lt.inter_business_loans.interestRate),
          borrowerBusiness: lt.inter_business_loans.businesses_inter_business_loans_borrowerBusinessIdTobusinesses,
          borrowerPerson: lt.inter_business_loans.persons_borrower,
          lenderBusiness: lt.inter_business_loans.businesses_inter_business_loans_lenderBusinessIdTobusinesses,
          lenderPerson: lt.inter_business_loans.persons_lender
        } : null
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
      categoryId,
      subcategoryId,
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
    const budgetEntries = await prisma.personalBudgets.findMany({
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
      categoryId,
      subcategoryId,
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