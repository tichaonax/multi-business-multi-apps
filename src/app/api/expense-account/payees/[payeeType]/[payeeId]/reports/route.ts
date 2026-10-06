import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

type ReportEntry = {
  amount: number
  paymentDate: Date
  categoryId: string | null
  categoryName: string | null
  categoryEmoji: string | null
  accountId: string
  accountName: string
  accountNumber: string
}

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
        payeeInfo = await prisma.users.findUnique({
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
        payeeInfo = await prisma.businesses.findUnique({
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

    // Receipt-level attribution only applies to PERSON/BUSINESS — the
    // receipt schema has no payeeUserId/payeeEmployeeId, so USER/EMPLOYEE
    // payees keep the original payment-level-only aggregation below.
    let entries: ReportEntry[]

    if (payeeType === 'PERSON' || payeeType === 'BUSINESS') {
      const receiptPayeeField = payeeType === 'PERSON' ? 'payeePersonId' : 'payeeBusinessId'
      const receipts = await prisma.expensePaymentReceipts.findMany({
        where: {
          payeeType,
          [receiptPayeeField]: payeeId,
          expensePayment: { status: 'SUBMITTED' },
        },
        select: {
          amount: true,
          receiptDate: true,
          category: { select: { id: true, name: true, emoji: true } },
          expensePayment: {
            select: {
              category: { select: { id: true, name: true, emoji: true } },
              expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
            },
          },
        },
      })
      const fallbackPayments = await prisma.expenseAccountPayments.findMany({
        where: { ...payeeFilter, expense_payment_receipts: { none: {} } },
        select: {
          amount: true,
          paymentDate: true,
          category: { select: { id: true, name: true, emoji: true } },
          expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
        },
      })

      entries = [
        ...receipts.map((r): ReportEntry => {
          const cat = r.category ?? r.expensePayment.category
          return {
            amount: Number(r.amount),
            paymentDate: r.receiptDate,
            categoryId: cat?.id ?? null,
            categoryName: cat?.name ?? null,
            categoryEmoji: cat?.emoji ?? null,
            accountId: r.expensePayment.expenseAccount.id,
            accountName: r.expensePayment.expenseAccount.accountName,
            accountNumber: r.expensePayment.expenseAccount.accountNumber,
          }
        }),
        ...fallbackPayments.map((p): ReportEntry => ({
          amount: Number(p.amount),
          paymentDate: p.paymentDate,
          categoryId: p.category?.id ?? null,
          categoryName: p.category?.name ?? null,
          categoryEmoji: p.category?.emoji ?? null,
          accountId: p.expenseAccount.id,
          accountName: p.expenseAccount.accountName,
          accountNumber: p.expenseAccount.accountNumber,
        })),
      ]
    } else {
      const payments = await prisma.expenseAccountPayments.findMany({
        where: payeeFilter,
        select: {
          amount: true,
          paymentDate: true,
          category: { select: { id: true, name: true, emoji: true } },
          expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
        },
      })
      entries = payments.map((p): ReportEntry => ({
        amount: Number(p.amount),
        paymentDate: p.paymentDate,
        categoryId: p.category?.id ?? null,
        categoryName: p.category?.name ?? null,
        categoryEmoji: p.category?.emoji ?? null,
        accountId: p.expenseAccount.id,
        accountName: p.expenseAccount.accountName,
        accountNumber: p.expenseAccount.accountNumber,
      }))
    }

    const totalPaid = entries.reduce((sum, e) => sum + e.amount, 0)
    const paymentCount = entries.length
    const averagePayment = paymentCount > 0 ? totalPaid / paymentCount : 0

    // Payments by category (for pie chart)
    const categoryMap = new Map<string, { categoryId: string | null; categoryName: string; categoryEmoji: string; totalAmount: number; paymentCount: number }>()
    for (const e of entries) {
      const key = e.categoryId ?? 'uncategorized'
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { categoryId: e.categoryId, categoryName: e.categoryName || 'Uncategorized', categoryEmoji: e.categoryEmoji || '📦', totalAmount: 0, paymentCount: 0 })
      }
      const entry = categoryMap.get(key)!
      entry.totalAmount += e.amount
      entry.paymentCount++
    }
    const paymentsByCategory = Array.from(categoryMap.values())

    // Payments by account (for bar chart)
    const accountMap = new Map<string, { accountId: string; accountName: string; accountNumber: string; totalAmount: number; paymentCount: number }>()
    for (const e of entries) {
      if (!accountMap.has(e.accountId)) {
        accountMap.set(e.accountId, { accountId: e.accountId, accountName: e.accountName, accountNumber: e.accountNumber, totalAmount: 0, paymentCount: 0 })
      }
      const entry = accountMap.get(e.accountId)!
      entry.totalAmount += e.amount
      entry.paymentCount++
    }
    const paymentsByAccount = Array.from(accountMap.values())

    // Payment trends over time (monthly aggregation)
    const monthlyTrends = new Map<string, { month: string; totalAmount: number; paymentCount: number }>()
    for (const e of entries) {
      const date = new Date(e.paymentDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      if (!monthlyTrends.has(monthKey)) {
        monthlyTrends.set(monthKey, { month: monthLabel, totalAmount: 0, paymentCount: 0 })
      }
      const monthData = monthlyTrends.get(monthKey)!
      monthData.totalAmount += e.amount
      monthData.paymentCount += 1
    }
    const paymentTrends = Array.from(monthlyTrends.values()).sort((a, b) => a.month.localeCompare(b.month))

    // Unique account count
    const accountsCount = accountMap.size

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
