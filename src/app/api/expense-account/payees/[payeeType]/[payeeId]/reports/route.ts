import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/payees/[payeeType]/[payeeId]/reports
 * Generate payee-specific expense report with aggregated data
 *
 * Query params:
 * - startDate: Filter from this date (optional)
 * - endDate: Filter up to this date (optional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { payeeType: string; payeeId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.canViewExpenseReports) {
      return NextResponse.json(
        { error: 'You do not have permission to view expense reports' },
        { status: 403 }
      )
    }

    const { payeeType, payeeId } = params

    // Validate payeeType
    const validPayeeTypes = ['USER', 'EMPLOYEE', 'PERSON', 'BUSINESS']
    if (!validPayeeTypes.includes(payeeType)) {
      return NextResponse.json(
        { error: 'Invalid payee type. Must be USER, EMPLOYEE, PERSON, or BUSINESS' },
        { status: 400 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // Build payee filter based on type
    const payeeFilter: any = { status: 'SUBMITTED' }
    switch (payeeType) {
      case 'USER':
        payeeFilter.payeeType = 'USER'
        payeeFilter.payeeUserId = payeeId
        break
      case 'EMPLOYEE':
        payeeFilter.payeeType = 'EMPLOYEE'
        payeeFilter.payeeEmployeeId = payeeId
        break
      case 'PERSON':
        payeeFilter.payeeType = 'PERSON'
        payeeFilter.payeePersonId = payeeId
        break
      case 'BUSINESS':
        payeeFilter.payeeType = 'BUSINESS'
        payeeFilter.payeeBusinessId = payeeId
        break
    }

    // Add date filter if provided
    if (Object.keys(dateFilter).length > 0) {
      payeeFilter.paymentDate = dateFilter
    }

    // Fetch payee information
    let payeeInfo: any = null
    switch (payeeType) {
      case 'USER':
        payeeInfo = await prisma.user.findUnique({
          where: { id: payeeId },
          select: { id: true, name: true, email: true },
        })
        break
      case 'EMPLOYEE':
        payeeInfo = await prisma.employees.findUnique({
          where: { id: payeeId },
          select: { id: true, fullName: true, employeeNumber: true },
        })
        break
      case 'PERSON':
        payeeInfo = await prisma.persons.findUnique({
          where: { id: payeeId },
          select: { id: true, fullName: true, nationalId: true },
        })
        break
      case 'BUSINESS':
        payeeInfo = await prisma.business.findUnique({
          where: { id: payeeId },
          select: { id: true, name: true, type: true },
        })
        break
    }

    if (!payeeInfo) {
      return NextResponse.json(
        { error: 'Payee not found' },
        { status: 404 }
      )
    }

    // Get total paid and payment count
    const totalStats = await prisma.expenseAccountPayments.aggregate({
      where: payeeFilter,
      _sum: { amount: true },
      _count: { id: true },
      _avg: { amount: true },
    })

    const totalPaid = Number(totalStats._sum.amount || 0)
    const paymentCount = totalStats._count.id
    const averagePayment = Number(totalStats._avg.amount || 0)

    // Get payments by category (for pie chart)
    const categoryStats = await prisma.expenseAccountPayments.groupBy({
      by: ['categoryId'],
      where: payeeFilter,
      _sum: { amount: true },
      _count: { id: true },
    })

    // Fetch category details
    const categoryIds = categoryStats
      .map((stat) => stat.categoryId)
      .filter((id): id is string => id !== null)

    const categories = await prisma.expenseCategories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, emoji: true },
    })

    const categoryLookup = new Map(categories.map((cat) => [cat.id, cat]))

    const paymentsByCategory = categoryStats.map((stat) => {
      const category = stat.categoryId ? categoryLookup.get(stat.categoryId) : null
      return {
        categoryId: stat.categoryId,
        categoryName: category?.name || 'Uncategorized',
        categoryEmoji: category?.emoji || '📦',
        totalAmount: Number(stat._sum.amount || 0),
        paymentCount: stat._count.id,
      }
    })

    // Get payments by account (for bar chart)
    const accountStats = await prisma.expenseAccountPayments.groupBy({
      by: ['expenseAccountId'],
      where: payeeFilter,
      _sum: { amount: true },
      _count: { id: true },
    })

    // Fetch account details
    const accountIds = accountStats.map((stat) => stat.expenseAccountId)
    const accounts = await prisma.expenseAccounts.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, accountName: true, accountNumber: true },
    })

    const accountLookup = new Map(accounts.map((acc) => [acc.id, acc]))

    const paymentsByAccount = accountStats.map((stat) => {
      const account = accountLookup.get(stat.expenseAccountId)
      return {
        accountId: stat.expenseAccountId,
        accountName: account?.accountName || 'Unknown Account',
        accountNumber: account?.accountNumber || 'N/A',
        totalAmount: Number(stat._sum.amount || 0),
        paymentCount: stat._count.id,
      }
    })

    // Get payment trends over time (monthly aggregation)
    const payments = await prisma.expenseAccountPayments.findMany({
      where: payeeFilter,
      select: {
        paymentDate: true,
        amount: true,
      },
      orderBy: { paymentDate: 'asc' },
    })

    // Group by month
    const monthlyTrends = new Map<string, { month: string; totalAmount: number; paymentCount: number }>()

    payments.forEach((payment) => {
      const date = new Date(payment.paymentDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

      if (!monthlyTrends.has(monthKey)) {
        monthlyTrends.set(monthKey, {
          month: monthLabel,
          totalAmount: 0,
          paymentCount: 0,
        })
      }

      const monthData = monthlyTrends.get(monthKey)!
      monthData.totalAmount += Number(payment.amount)
      monthData.paymentCount += 1
    })

    const paymentTrends = Array.from(monthlyTrends.values()).sort((a, b) => {
      return a.month.localeCompare(b.month)
    })

    // Get unique account count
    const accountsCount = accountStats.length

    return NextResponse.json({
      success: true,
      data: {
        payee: {
          id: payeeInfo.id,
          type: payeeType,
          name:
            payeeInfo.name ||
            payeeInfo.fullName ||
            payeeInfo.displayName ||
            'Unknown',
          ...payeeInfo,
        },
        summary: {
          totalPaid,
          paymentCount,
          averagePayment,
          accountsCount,
        },
        paymentsByCategory,
        paymentsByAccount,
        paymentTrends,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
    })
  } catch (error) {
    console.error('Error generating payee report:', error)
    return NextResponse.json(
      { error: 'Failed to generate payee report' },
      { status: 500 }
    )
  }
}
