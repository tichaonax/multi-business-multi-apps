import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { canUserViewAccount } from '@/lib/expense-account-access'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/[accountId]/reports
 * Generate expense account reports with analytics for charts
 *
 * Query params:
 * - startDate: Filter from this date (optional)
 * - endDate: Filter up to this date (optional)
 * - payeeType: Filter by payee type (optional)
 * - categoryId: Filter by category (optional)
 * - groupBy: Group results by (category | payee | month) (optional)
 *
 * Returns:
 * - byCategory: Expense breakdown by category (for pie chart)
 * - byPayee: Expense breakdown by payee (for top payees)
 * - trends: Monthly expense trends (for line/bar chart)
 * - summary: Overall statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = getEffectivePermissions(user)
    const { accountId } = await params

    if (!permissions.canViewExpenseReports && user.role !== 'admin') {
      if (!(await canUserViewAccount(user.id, accountId))) {
        return NextResponse.json(
          { error: 'You do not have permission to view expense reports' },
          { status: 403 }
        )
      }
    }

    // Check if expense account exists
    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: { id: true, accountName: true, accountNumber: true, accountType: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Expense account not found' },
        { status: 404 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const payeeType = searchParams.get('payeeType')
    const categoryId = searchParams.get('categoryId')

    // Build where clause (only submitted payments)
    const where: any = {
      expenseAccountId: accountId,
      status: 'SUBMITTED',
    }

    if (startDate || endDate) {
      where.paymentDate = {}
      if (startDate) {
        where.paymentDate.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.paymentDate.lt = end
      }
    }

    if (payeeType) {
      where.payeeType = payeeType
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    // Fetch all payments with relations
    const payments = await prisma.expenseAccountPayments.findMany({
      where,
      include: {
        payeeUser: {
          select: { id: true, name: true, email: true },
        },
        payeeEmployee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
          },
        },
        payeePerson: {
          select: {
            id: true,
            fullName: true,
            nationalId: true,
          },
        },
        payeeBusiness: {
          select: { id: true, name: true, type: true },
        },
        category: {
          select: { id: true, name: true, emoji: true, color: true },
        },
        subcategory: {
          select: { id: true, name: true, emoji: true },
        },
      },
      orderBy: { paymentDate: 'desc' },
    })

    // Calculate total amount
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    // 1. BY CATEGORY (for pie chart)
    const categoryMap = new Map<string, any>()
    payments.forEach((payment) => {
      if (!payment.categoryId || !payment.category) return
      const catId = payment.categoryId
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          categoryId: catId,
          categoryName: payment.category.name,
          emoji: payment.category.emoji,
          color: payment.category.color,
          totalAmount: 0,
          paymentCount: 0,
          percentage: 0,
        })
      }
      const cat = categoryMap.get(catId)!
      cat.totalAmount += Number(payment.amount)
      cat.paymentCount++
    })

    const byCategory = Array.from(categoryMap.values()).map((cat) => ({
      ...cat,
      percentage: totalAmount > 0 ? (cat.totalAmount / totalAmount) * 100 : 0,
    }))

    // Sort by amount descending
    byCategory.sort((a, b) => b.totalAmount - a.totalAmount)

    // 2. BY PAYEE (for top payees)
    const payeeMap = new Map<string, any>()
    payments.forEach((payment) => {
      let payeeId: string
      let payeeName: string

      if (payment.payeeType === 'USER' && payment.payeeUser) {
        payeeId = payment.payeeUser.id
        payeeName = payment.payeeUser.name
      } else if (payment.payeeType === 'EMPLOYEE' && payment.payeeEmployee) {
        payeeId = payment.payeeEmployee.id
        payeeName = payment.payeeEmployee.fullName
      } else if (payment.payeeType === 'PERSON' && payment.payeePerson) {
        payeeId = payment.payeePerson.id
        payeeName = payment.payeePerson.fullName
      } else if (payment.payeeType === 'BUSINESS' && payment.payeeBusiness) {
        payeeId = payment.payeeBusiness.id
        payeeName = payment.payeeBusiness.name
      } else {
        return // Skip if no payee found
      }

      const key = `${payment.payeeType}-${payeeId}`
      if (!payeeMap.has(key)) {
        payeeMap.set(key, {
          payeeType: payment.payeeType,
          payeeId,
          payeeName,
          totalAmount: 0,
          paymentCount: 0,
        })
      }
      const payee = payeeMap.get(key)!
      payee.totalAmount += Number(payment.amount)
      payee.paymentCount++
    })

    const byPayee = Array.from(payeeMap.values())

    // Sort by amount descending
    byPayee.sort((a, b) => b.totalAmount - a.totalAmount)

    // 3. TRENDS (monthly aggregation for line/bar chart)
    const trendsMap = new Map<string, any>()
    payments.forEach((payment) => {
      const date = new Date(payment.paymentDate)
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!trendsMap.has(period)) {
        trendsMap.set(period, {
          period,
          totalAmount: 0,
          paymentCount: 0,
        })
      }
      const trend = trendsMap.get(period)!
      trend.totalAmount += Number(payment.amount)
      trend.paymentCount++
    })

    const trends = Array.from(trendsMap.values())

    // Sort by period ascending (chronological)
    trends.sort((a, b) => a.period.localeCompare(b.period))

    // 4. SUMMARY
    const summary = {
      totalSpent: totalAmount,
      averagePayment: payments.length > 0 ? totalAmount / payments.length : 0,
      totalPayments: payments.length,
      mostExpensiveCategory: byCategory.length > 0 ? byCategory[0].categoryName : 'N/A',
      mostFrequentPayee: byPayee.length > 0 ? byPayee[0].payeeName : 'N/A',
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      accountInfo: {
        id: account.id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
      },
    }

    // 5. PERSONAL-ONLY: deposit source breakdown + income vs expenses monthly
    let byDepositSource: any[] = []
    let incomeVsExpenses: any[] = []

    if (account.accountType === 'PERSONAL') {
      const depositWhere: any = { expenseAccountId: accountId }
      if (startDate || endDate) {
        depositWhere.depositDate = {}
        if (startDate) depositWhere.depositDate.gte = new Date(startDate)
        if (endDate) depositWhere.depositDate.lte = new Date(endDate)
      }

      const deposits = await prisma.expenseAccountDeposits.findMany({
        where: depositWhere,
        select: {
          id: true,
          amount: true,
          depositDate: true,
          sourceType: true,
          depositSourceId: true,
          depositSource: { select: { id: true, name: true, emoji: true } },
        },
      })

      const totalDepositAmount = deposits.reduce((s, d) => s + Number(d.amount), 0)

      // By deposit source
      const sourceMap = new Map<string, any>()
      deposits.forEach((d) => {
        const key = d.depositSourceId || d.sourceType
        const name = d.depositSource ? `${d.depositSource.emoji || ''} ${d.depositSource.name}`.trim() : d.sourceType
        if (!sourceMap.has(key)) {
          sourceMap.set(key, { sourceId: key, sourceName: name, totalAmount: 0, depositCount: 0, percentage: 0 })
        }
        const entry = sourceMap.get(key)!
        entry.totalAmount += Number(d.amount)
        entry.depositCount++
      })
      byDepositSource = Array.from(sourceMap.values())
        .map((s) => ({ ...s, percentage: totalDepositAmount > 0 ? (s.totalAmount / totalDepositAmount) * 100 : 0 }))
        .sort((a, b) => b.totalAmount - a.totalAmount)

      // Income vs expenses by month
      const monthSet = new Map<string, { month: string; income: number; expenses: number }>()
      deposits.forEach((d) => {
        const date = new Date(d.depositDate)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthSet.has(key)) monthSet.set(key, { month: key, income: 0, expenses: 0 })
        monthSet.get(key)!.income += Number(d.amount)
      })
      payments.forEach((p) => {
        const date = new Date(p.paymentDate)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthSet.has(key)) monthSet.set(key, { month: key, income: 0, expenses: 0 })
        monthSet.get(key)!.expenses += Number(p.amount)
      })
      incomeVsExpenses = Array.from(monthSet.values()).sort((a, b) => a.month.localeCompare(b.month))
    }

    return NextResponse.json({
      success: true,
      data: {
        byCategory,
        byPayee,
        trends,
        summary,
        accountType: account.accountType,
        ...(account.accountType === 'PERSONAL' && { byDepositSource, incomeVsExpenses }),
      },
    })
  } catch (error) {
    console.error('Error generating expense account report:', error)
    return NextResponse.json(
      { error: 'Failed to generate expense account report' },
      { status: 500 }
    )
  }
}
