import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/payees/[payeeType]/[payeeId]/payments
 * Fetch all payments to a specific payee across ALL expense accounts
 *
 * Query params:
 * - startDate: Filter from this date (optional)
 * - endDate: Filter up to this date (optional)
 * - limit: Number of payments to return (default: 100)
 * - offset: Number of payments to skip (default: 0)
 * - accountId: Filter by specific expense account (optional)
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
    if (!permissions.canAccessExpenseAccount) {
      return NextResponse.json(
        { error: 'You do not have permission to access expense accounts' },
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
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const accountId = searchParams.get('accountId')

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

    // Add account filter if provided
    if (accountId) {
      payeeFilter.expenseAccountId = accountId
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

    // Fetch total count
    const totalCount = await prisma.expenseAccountPayments.count({
      where: payeeFilter,
    })

    // Fetch payments
    const payments = await prisma.expenseAccountPayments.findMany({
      where: payeeFilter,
      include: {
        expenseAccount: {
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            emoji: true,
          },
        },
        payeeUser: {
          select: { id: true, name: true, email: true },
        },
        payeeEmployee: {
          select: { id: true, fullName: true, employeeNumber: true },
        },
        payeePerson: {
          select: { id: true, fullName: true, nationalId: true },
        },
        payeeBusiness: {
          select: { id: true, name: true, type: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { paymentDate: 'desc' },
      skip: offset,
      take: limit,
    })

    // Calculate total paid
    const totalPaidResult = await prisma.expenseAccountPayments.aggregate({
      where: payeeFilter,
      _sum: { amount: true },
    })

    const totalPaid = Number(totalPaidResult._sum.amount || 0)

    // Group payments by account
    const accountMap = new Map<string, any>()

    payments.forEach((payment) => {
      const accountId = payment.expenseAccount.id
      if (!accountMap.has(accountId)) {
        accountMap.set(accountId, {
          accountId,
          accountName: payment.expenseAccount.accountName,
          accountNumber: payment.expenseAccount.accountNumber,
          totalPaid: 0,
          paymentCount: 0,
          payments: [],
        })
      }

      const accountData = accountMap.get(accountId)
      accountData.totalPaid += Number(payment.amount)
      accountData.paymentCount += 1
      accountData.payments.push({
        id: payment.id,
        amount: Number(payment.amount),
        paymentDate: payment.paymentDate.toISOString(),
        category: payment.category,
        receiptNumber: payment.receiptNumber,
        receiptUrl: payment.receiptUrl,
        notes: payment.notes,
        status: payment.status,
        createdBy: payment.creator,
        createdAt: payment.createdAt.toISOString(),
      })
    })

    // Get unique account count
    const accountsCount = accountMap.size

    // Get aggregate totals by account (for full dataset, not just current page)
    const accountAggregates = await prisma.expenseAccountPayments.groupBy({
      by: ['expenseAccountId'],
      where: payeeFilter,
      _sum: { amount: true },
      _count: { id: true },
    })

    // Fetch account details for aggregates
    const accountIds = accountAggregates.map((agg) => agg.expenseAccountId)
    const accounts = await prisma.expenseAccounts.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, accountName: true, accountNumber: true },
    })

    const accountLookup = new Map(accounts.map((acc) => [acc.id, acc]))

    const accountBreakdown = accountAggregates.map((agg) => {
      const account = accountLookup.get(agg.expenseAccountId)
      return {
        accountId: agg.expenseAccountId,
        accountName: account?.accountName || 'Unknown Account',
        accountNumber: account?.accountNumber || 'N/A',
        totalPaid: Number(agg._sum.amount || 0),
        paymentCount: agg._count.id,
        // Don't include full payment list in account breakdown (it's paginated)
      }
    })

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
        totalPaid,
        paymentCount: totalCount,
        accountsCount,
        accountBreakdown,
        payments: payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentDate: p.paymentDate.toISOString(),
          category: p.category,
          receiptNumber: p.receiptNumber,
          receiptUrl: p.receiptUrl,
          notes: p.notes,
          status: p.status,
          expenseAccount: p.expenseAccount,
          createdBy: p.creator,
          createdAt: p.createdAt.toISOString(),
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching payee payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payee payments' },
      { status: 500 }
    )
  }
}
