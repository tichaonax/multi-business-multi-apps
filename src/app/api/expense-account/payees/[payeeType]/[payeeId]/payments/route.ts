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
  { params }: { params: Promise<{ payeeType: string; payeeId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions — either full account access OR report-viewing
    // access is enough to look up a payee's payment history (this endpoint
    // backs both the account drill-down UI and the expense reports' payee
    // popups/pages, which are gated on canViewExpenseReports, not this).
    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && !permissions.canViewExpenseReports && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to access expense accounts' },
        { status: 403 }
      )
    }

    const { payeeType, payeeId } = await params

    // Validate payeeType (CONTRACTOR is an alias for PERSON — stored as PERSON in DB)
    const validPayeeTypes = ['USER', 'EMPLOYEE', 'PERSON', 'CONTRACTOR', 'BUSINESS', 'SUPPLIER']
    if (!validPayeeTypes.includes(payeeType)) {
      return NextResponse.json(
        { error: 'Invalid payee type. Must be USER, EMPLOYEE, PERSON, CONTRACTOR, BUSINESS, or SUPPLIER' },
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
    const payeeFilter: any = { status: { not: 'REJECTED' } }
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
      case 'CONTRACTOR':
        payeeFilter.payeeType = 'PERSON'
        payeeFilter.payeePersonId = payeeId
        break
      case 'BUSINESS':
        payeeFilter.payeeType = 'BUSINESS'
        payeeFilter.payeeBusinessId = payeeId
        break
      case 'SUPPLIER':
        payeeFilter.payeeType = 'SUPPLIER'
        payeeFilter.payeeSupplierId = payeeId
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
      case 'CONTRACTOR':
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
      case 'SUPPLIER':
        payeeInfo = await prisma.businessSuppliers.findUnique({
          where: { id: payeeId },
          select: { id: true, name: true, notes: true, phone: true, email: true },
        })
        break
    }

    if (!payeeInfo) {
      return NextResponse.json(
        { error: 'Payee not found' },
        { status: 404 }
      )
    }

    // Receipt-level attribution only applies to PERSON/BUSINESS/SUPPLIER —
    // ExpensePaymentReceipts has no payeeUserId/payeeEmployeeId, so USER and
    // EMPLOYEE payees keep the original payment-level-only query below
    // (their payments are never COMBO/split-attributed).
    type NormalizedEntry = {
      id: string
      amount: number
      paymentDate: string
      category: { id: string; name: string; emoji: string } | null
      receiptNumber: string | null
      receiptUrl: string | null
      notes: string | null
      status: string
      expenseAccount: { id: string; accountName: string; accountNumber: string }
      createdBy: { id: string; name: string; email: string } | null
      submittedBy: { id: string; name: string; email: string } | null
      createdAt: string
    }

    let allEntries: NormalizedEntry[]

    if (payeeType === 'PERSON' || payeeType === 'CONTRACTOR' || payeeType === 'BUSINESS' || payeeType === 'SUPPLIER') {
      const receiptPayeeField = payeeType === 'BUSINESS' ? 'payeeBusinessId' : payeeType === 'SUPPLIER' ? 'payeeSupplierId' : 'payeePersonId'
      const receiptPayeeType = payeeType === 'CONTRACTOR' ? 'PERSON' : payeeType

      const receiptWhere: any = {
        payeeType: receiptPayeeType,
        [receiptPayeeField]: payeeId,
        expensePayment: {
          status: { not: 'REJECTED' },
          ...(accountId ? { expenseAccountId: accountId } : {}),
        },
      }
      if (Object.keys(dateFilter).length > 0) receiptWhere.receiptDate = dateFilter

      const receipts = await prisma.expensePaymentReceipts.findMany({
        where: receiptWhere,
        select: {
          id: true, amount: true, receiptDate: true, receiptNumber: true, notes: true, description: true, createdAt: true,
          category: { select: { id: true, name: true, emoji: true } },
          creator: { select: { id: true, name: true, email: true } },
          expensePayment: {
            select: {
              status: true,
              expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
              category: { select: { id: true, name: true, emoji: true } },
            },
          },
        },
        orderBy: { receiptDate: 'desc' },
      })

      // Payments with this payee directly, but with NO itemized receipts at
      // all — the fallback case (full amount attributed to the payment-level
      // payee, same as the behavior before receipts existed for it).
      const fallbackPayments = await prisma.expenseAccountPayments.findMany({
        where: { ...payeeFilter, expense_payment_receipts: { none: {} } },
        include: {
          expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
          category: { select: { id: true, name: true, emoji: true } },
          creator: { select: { id: true, name: true, email: true } },
          submitter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { paymentDate: 'desc' },
      })

      const fromReceipts: NormalizedEntry[] = receipts.map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        paymentDate: r.receiptDate.toISOString(),
        category: r.category ?? r.expensePayment.category,
        receiptNumber: r.receiptNumber,
        receiptUrl: null,
        notes: r.notes ?? r.description,
        status: r.expensePayment.status,
        expenseAccount: r.expensePayment.expenseAccount,
        createdBy: r.creator,
        submittedBy: null,
        createdAt: r.createdAt.toISOString(),
      }))
      const fromFallback: NormalizedEntry[] = fallbackPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString(),
        category: p.category,
        receiptNumber: p.receiptNumber,
        receiptUrl: (p as any).receiptUrl ?? null,
        notes: p.notes,
        status: p.status,
        expenseAccount: p.expenseAccount,
        createdBy: p.creator,
        submittedBy: p.submitter,
        createdAt: p.createdAt.toISOString(),
      }))

      allEntries = [...fromReceipts, ...fromFallback].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    } else {
      const payments = await prisma.expenseAccountPayments.findMany({
        where: payeeFilter,
        include: {
          expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
          category: { select: { id: true, name: true, emoji: true } },
          creator: { select: { id: true, name: true, email: true } },
          submitter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { paymentDate: 'desc' },
      })
      allEntries = payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString(),
        category: p.category,
        receiptNumber: p.receiptNumber,
        receiptUrl: (p as any).receiptUrl ?? null,
        notes: p.notes,
        status: p.status,
        expenseAccount: p.expenseAccount,
        createdBy: p.creator,
        submittedBy: p.submitter,
        createdAt: p.createdAt.toISOString(),
      }))
    }

    const totalCount = allEntries.length
    const totalPaid = allEntries.reduce((sum, e) => sum + e.amount, 0)
    const payments = allEntries.slice(offset, offset + limit)

    // Group payments by account
    const accountMap = new Map<string, any>()

    allEntries.forEach((entry) => {
      const accId = entry.expenseAccount.id
      if (!accountMap.has(accId)) {
        accountMap.set(accId, {
          accountId: accId,
          accountName: entry.expenseAccount.accountName,
          accountNumber: entry.expenseAccount.accountNumber,
          totalPaid: 0,
          paymentCount: 0,
        })
      }
      const accountData = accountMap.get(accId)
      accountData.totalPaid += entry.amount
      accountData.paymentCount += 1
    })

    const accountsCount = accountMap.size
    const accountBreakdown = Array.from(accountMap.values())

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
        payments,
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
