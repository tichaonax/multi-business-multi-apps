import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has access to Personal Finance Reports
    if (!hasUserPermission(user, 'canViewPersonalReports')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }

    // Build date filter
    const dateFilter = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z') // Include the entire end date
      }
    }

    // Get all personal expenses for the user in the date range
    const personalExpenses = await prisma.personalExpenses.findMany({
      where: {
        userId: user.id,
        ...dateFilter
      },
      include: {
        projectTransactions: {
          include: {
            projectContractor: {
              include: {
                person: {
                  select: {
                    fullName: true
                  }
                }
              }
            },
            constructionProject: {
              select: {
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
      orderBy: {
        date: 'desc'
      }
    })

    // Calculate totals
    const totalExpenses = personalExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0)
    const totalTransactions = personalExpenses.length

    // Fetch all unique category IDs for lookup
    const categoryIds = [...new Set(personalExpenses.map(expense => expense.category).filter(Boolean))]
    const categories = await prisma.expenseCategories.findMany({
      where: { id: { in: categoryIds } }
    })
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]))

    // Group by category
    const categoryBreakdownMap = new Map<string, { amount: number, count: number }>()
    personalExpenses.forEach(expense => {
      const categoryObject = expense.category ? categoryMap.get(expense.category) : null
      const categoryName = categoryObject?.name || expense.category || 'Uncategorized'
      const existing = categoryBreakdownMap.get(categoryName) || { amount: 0, count: 0 }
      categoryBreakdownMap.set(categoryName, {
        amount: existing.amount + parseFloat(expense.amount.toString()),
        count: existing.count + 1
      })
    })

    const categoryBreakdown = Array.from(categoryBreakdownMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount) // Sort by amount descending

    // Group by month
    const monthMap = new Map<string, { amount: number, count: number }>()
    personalExpenses.forEach(expense => {
      const monthKey = new Date(expense.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      })
      const existing = monthMap.get(monthKey) || { amount: 0, count: 0 }
      monthMap.set(monthKey, {
        amount: existing.amount + parseFloat(expense.amount.toString()),
        count: existing.count + 1
      })
    })

    const monthlyData = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()) // Sort chronologically

    // Group by contractor/recipient
    const contractorMap = new Map<string, { amount: number, count: number }>()
    personalExpenses.forEach(expense => {
      let contractorName = 'Direct Expense'

      // Check if this expense is linked to a project contractor
      if (expense.projectTransactions && expense.project_transactions.length > 0) {
        const projectTransaction = expense.projectTransactions[0]
        if (projectTransaction.projectContractor?.persons?.fullName) {
          contractorName = projectTransaction.projectContractor.persons.fullName
        } else if (projectTransaction.constructionProject?.name) {
          contractorName = `Project: ${projectTransaction.constructionProject.name}`
        }
      }

      // Check if this expense is linked to a loan
      if (expense.loanTransactions && expense.loanTransactions.length > 0) {
        const loanTransaction = expense.loanTransactions[0]
        const loan = loanTransaction.loan
        if (loan.borrowerBusiness?.name) {
          contractorName = `Loan to: ${loan.borrowerBusiness.name}`
        } else if (loan.borrowerPerson?.fullName) {
          contractorName = `Loan to: ${loan.borrowerPerson.fullName}`
        } else if (loan.lenderBusiness?.name) {
          contractorName = `Loan from: ${loan.lenderBusiness.name}`
        }
      }

      const existing = contractorMap.get(contractorName) || { amount: 0, count: 0 }
      contractorMap.set(contractorName, {
        amount: existing.amount + parseFloat(expense.amount.toString()),
        count: existing.count + 1
      })
    })

    const topContractors = Array.from(contractorMap.entries())
      .map(([contractorName, data]) => ({
        contractorName,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount) // Sort by amount descending
      .slice(0, 10) // Top 10 contractors

    const reportData = {
      totalExpenses,
      totalTransactions,
      categoryBreakdown,
      monthlyData,
      topContractors
    }

    return NextResponse.json(reportData)

  } catch (error) {
    console.error('Personal reports error:', error)
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    )
  }
}