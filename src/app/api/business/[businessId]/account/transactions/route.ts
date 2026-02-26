import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/business/[businessId]/account/transactions
 * Paginated list of business transactions with optional filters.
 *
 * Query params:
 *   limit      - number (default 20)
 *   offset     - number (default 0)
 *   type       - "credits" | "debits" | "all" (default "all")
 *   startDate  - ISO date string
 *   endDate    - ISO date string
 *   sortOrder  - "asc" | "desc" (default "desc")
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: { userId: user.id, businessId, isActive: true },
      }) as any
      if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      const perms = getEffectivePermissions(user, businessId)
      if (!perms.canAccessFinancialData) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)
    const typeFilter = searchParams.get('type') ?? 'all' // "credits" | "debits" | "all"
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sortOrder = (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc'

    const CREDIT_TYPES = ['deposit', 'transfer', 'loan_received', 'CREDIT']
    const DEBIT_TYPES = ['withdrawal', 'loan_disbursement', 'loan_payment', 'DEBIT']

    const where: any = { businessId }

    if (typeFilter === 'credits') where.type = { in: CREDIT_TYPES }
    else if (typeFilter === 'debits') where.type = { in: DEBIT_TYPES }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const [transactions, total] = await Promise.all([
      (prisma.businessTransactions as any).findMany({
        where,
        orderBy: { createdAt: sortOrder },
        take: limit,
        skip: offset,
        select: {
          id: true,
          businessId: true,
          amount: true,
          type: true,
          description: true,
          referenceId: true,
          referenceType: true,
          balanceAfter: true,
          createdAt: true,
          createdBy: true,
          notes: true,
        },
      }),
      (prisma.businessTransactions as any).count({ where }),
    ])

    // Resolve destination names for DEBIT transactions that have a referenceId
    // For EXPENSE_DEPOSIT: referenceId = expense account ID
    // For PAYROLL_DEPOSIT: referenceId = payroll account ID
    const expenseIds = transactions
      .filter((tx: any) => tx.referenceType === 'EXPENSE_DEPOSIT' && tx.referenceId)
      .map((tx: any) => tx.referenceId as string)

    const payrollIds = transactions
      .filter((tx: any) => (tx.referenceType === 'PAYROLL_DEPOSIT' || tx.referenceType === 'PAYROLL_EXPENSE') && tx.referenceId)
      .map((tx: any) => tx.referenceId as string)

    const [expenseAccounts, payrollAccounts] = await Promise.all([
      expenseIds.length > 0
        ? prisma.expenseAccounts.findMany({
            where: { id: { in: expenseIds } },
            select: { id: true, accountName: true, accountNumber: true },
          })
        : [],
      payrollIds.length > 0
        ? (prisma.payrollAccounts as any).findMany({
            where: { id: { in: payrollIds } },
            select: { id: true, name: true },
          }).catch(() => [])
        : [],
    ])

    const expenseMap = new Map((expenseAccounts as any[]).map((a) => [a.id, a]))
    const payrollMap = new Map((payrollAccounts as any[]).map((a) => [a.id, a]))

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map((tx: any) => {
          const isCredit = CREDIT_TYPES.includes(tx.type)
          let destination: string | null = null

          if (tx.referenceType === 'EXPENSE_DEPOSIT') {
            if (tx.referenceId && expenseMap.has(tx.referenceId)) {
              const acct = expenseMap.get(tx.referenceId)
              destination = acct.accountName
            } else {
              // Parse from legacy description formats
              const desc = tx.description ?? ''
              if (desc.startsWith('Transfer to ')) {
                destination = desc.replace('Transfer to ', '')
              } else if (desc.startsWith('Deposit to expense account: ')) {
                destination = desc.replace('Deposit to expense account: ', '')
              } else {
                // Legacy "Manual transfer from X" — we know it went to an expense account
                destination = 'Expense Account'
              }
            }
          } else if (tx.referenceType === 'PAYROLL_DEPOSIT' || tx.referenceType === 'PAYROLL_EXPENSE') {
            if (tx.referenceId && payrollMap.has(tx.referenceId)) {
              destination = payrollMap.get(tx.referenceId)?.name ?? 'Payroll Account'
            } else {
              destination = 'Payroll Account'
            }
          }

          return {
            ...tx,
            amount: Number(tx.amount),
            balanceAfter: Number(tx.balanceAfter),
            isCredit,
            destination, // null for credits, name for debits
          }
        }),
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error fetching business transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
