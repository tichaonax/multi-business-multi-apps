import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

async function hasPettyCashApprove(userId: string): Promise<boolean> {
  const record = await prisma.userPermissions.findFirst({
    where: { userId, granted: true, permission: { name: 'petty_cash.approve' } },
  })
  return !!record
}

/**
 * GET /api/petty-cash/requests/[requestId]/transactions
 * Returns all spend transactions for a request + balance summary.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { requestId } = await params

    const pcRequest = await prisma.pettyCashRequests.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        requestedBy: true,
        status: true,
        approvedAmount: true,
        spentAmount: true,
      },
    })
    if (!pcRequest) return NextResponse.json({ error: 'Petty cash request not found' }, { status: 404 })

    // Only the requester or an approver can view transactions
    const canApprove = isSystemAdmin(user) || await hasPettyCashApprove(user.id)
    if (pcRequest.requestedBy !== user.id && !canApprove) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const transactions = await prisma.pettyCashTransaction.findMany({
      where: { requestId },
      include: {
        category: { select: { id: true, name: true, emoji: true } },
        creator: { select: { id: true, name: true } },
        payment: { select: { id: true, status: true, paymentDate: true, paymentChannel: true, ecocashTransactionCode: true } },
      },
      orderBy: { transactionDate: 'desc' },
    })

    // Resolve payee names via batch queries
    const supplierIds = [...new Set(transactions.filter(t => t.payeeSupplierId).map(t => t.payeeSupplierId as string))]
    const employeeIds = [...new Set(transactions.filter(t => t.payeeEmployeeId).map(t => t.payeeEmployeeId as string))]
    const userIds = [...new Set(transactions.filter(t => t.payeeUserId).map(t => t.payeeUserId as string))]
    const [suppliers, employees, payeeUsers] = await Promise.all([
      supplierIds.length ? prisma.businessSuppliers.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true, phone: true } }) : [],
      employeeIds.length ? prisma.employees.findMany({ where: { id: { in: employeeIds } }, select: { id: true, firstName: true, lastName: true, phone: true } }) : [],
      userIds.length ? prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
    ])
    const supplierMap = Object.fromEntries((suppliers as any[]).map(s => [s.id, s]))
    const employeeMap = Object.fromEntries((employees as any[]).map(e => [e.id, e]))
    const userMap = Object.fromEntries((payeeUsers as any[]).map(u => [u.id, u.name]))

    const approvedAmount = Number(pcRequest.approvedAmount ?? 0)
    const spentAmount = Number(pcRequest.spentAmount)
    const remainingBalance = approvedAmount - spentAmount

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map((t: typeof transactions[number]) => {
          let payeeName: string | null = null
          let payeePhone: string | null = null
          if (t.payeeSupplierId && supplierMap[t.payeeSupplierId]) {
            payeeName = supplierMap[t.payeeSupplierId].name
            payeePhone = supplierMap[t.payeeSupplierId].phone ?? null
          } else if (t.payeeEmployeeId && employeeMap[t.payeeEmployeeId]) {
            const e = employeeMap[t.payeeEmployeeId]
            payeeName = `${e.firstName} ${e.lastName}`
            payeePhone = e.phone ?? null
          } else if (t.payeeUserId && userMap[t.payeeUserId]) {
            payeeName = userMap[t.payeeUserId]
          }
          return {
            id: t.id,
            amount: Number(t.amount),
            description: t.description,
            payeeType: t.payeeType,
            payeeName,
            payeePhone,
            transactionDate: t.transactionDate.toISOString(),
            category: t.category,
            creator: t.creator,
            paymentId: t.paymentId,
            paymentStatus: t.payment?.status ?? null,
            paymentChannel: (t.payment as any)?.paymentChannel ?? 'CASH',
            ecocashTransactionCode: (t.payment as any)?.ecocashTransactionCode ?? null,
            createdAt: t.createdAt.toISOString(),
          }
        }),
        summary: {
          approvedAmount,
          spentAmount,
          remainingBalance,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching petty cash transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

/**
 * POST /api/petty-cash/requests/[requestId]/transactions
 * Record a direct spend from an approved petty cash request.
 *
 * Auth: the requester themselves OR any user with petty_cash.approve.
 * Request must be APPROVED. Amount must not exceed remaining balance.
 *
 * Body: {
 *   amount, description, transactionDate?,
 *   categoryId?, payeeType?, payeeSupplierId?, payeeEmployeeId?, payeeUserId?
 * }
 *
 * Creates:
 *   1. ExpenseAccountPayment (PETTY_CASH_SPEND, SUBMITTED) — debits expense account
 *   2. PettyCashTransaction — links the spend to the request
 *   3. Updates PettyCashRequests.spentAmount atomically
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { requestId } = await params
    const body = await request.json()

    const {
      amount,
      description,
      transactionDate,
      categoryId,
      subcategoryId,
      payeeType = 'NONE',
      payeeSupplierId,
      payeeEmployeeId,
      payeeUserId,
      payeePersonId,
      paymentChannel = 'CASH',
      ecocashTransactionCode,
    } = body

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }
    if (paymentChannel === 'ECOCASH' && !ecocashTransactionCode?.trim()) {
      return NextResponse.json({ error: 'EcoCash transaction code is required for EcoCash payments' }, { status: 400 })
    }

    const pcRequest = await prisma.pettyCashRequests.findUnique({
      where: { id: requestId },
    })
    if (!pcRequest) return NextResponse.json({ error: 'Petty cash request not found' }, { status: 404 })

    // Auth: requester themselves or an approver
    const canApprove = isSystemAdmin(user) || await hasPettyCashApprove(user.id)
    if (pcRequest.requestedBy !== user.id && !canApprove) {
      return NextResponse.json({ error: 'You do not have permission to record spends for this request' }, { status: 403 })
    }

    if (pcRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Cannot record a spend on a ${pcRequest.status} request` },
        { status: 400 }
      )
    }

    const spendAmount = Number(amount)
    const approvedAmount = Number(pcRequest.approvedAmount)
    const spentSoFar = Number(pcRequest.spentAmount)
    const remainingBalance = approvedAmount - spentSoFar

    if (spendAmount > remainingBalance) {
      return NextResponse.json(
        {
          error: `Amount ($${spendAmount.toFixed(2)}) exceeds remaining petty cash balance ($${remainingBalance.toFixed(2)})`,
        },
        { status: 400 }
      )
    }

    const txDate = transactionDate ? new Date(transactionDate) : new Date()
    const now = new Date()

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create ExpenseAccountPayment — debits the expense account
      const payment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: pcRequest.expenseAccountId,
          amount: spendAmount,
          paymentDate: txDate,
          notes: description.trim(),
          status: 'PAID',
          paymentType: 'PETTY_CASH_SPEND',
          paidAt: txDate,
          payeeType,
          paymentChannel,
          ...(paymentChannel === 'ECOCASH' ? { ecocashTransactionCode: ecocashTransactionCode.trim() } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(subcategoryId ? { subcategoryId } : {}),
          ...(payeeSupplierId ? { payeeSupplierId } : {}),
          ...(payeeEmployeeId ? { payeeEmployeeId } : {}),
          ...(payeeUserId ? { payeeUserId } : {}),
          ...(payeePersonId ? { payeePersonId } : {}),
          createdBy: user.id,
          submittedBy: user.id,
          submittedAt: now,
        },
      })

      // 2. Update expense account balance
      await updateExpenseAccountBalanceTx(tx, pcRequest.expenseAccountId)

      // 3. Create PettyCashTransaction linked to the payment
      const transaction = await tx.pettyCashTransaction.create({
        data: {
          requestId,
          businessId: pcRequest.businessId,
          expenseAccountId: pcRequest.expenseAccountId,
          amount: spendAmount,
          description: description.trim(),
          payeeType,
          ...(categoryId ? { categoryId } : {}),
          ...(payeeSupplierId ? { payeeSupplierId } : {}),
          ...(payeeEmployeeId ? { payeeEmployeeId } : {}),
          ...(payeeUserId ? { payeeUserId } : {}),
          transactionDate: txDate,
          // Note: payeePersonId is stored on ExpenseAccountPayments only (no FK on PettyCashTransaction)
          paymentId: payment.id,
          createdBy: user.id,
        },
        include: {
          category: { select: { id: true, name: true, emoji: true } },
          creator: { select: { id: true, name: true } },
        },
      })

      // 4. Increment spentAmount on the request atomically
      const updatedRequest = await tx.pettyCashRequests.update({
        where: { id: requestId },
        data: { spentAmount: { increment: spendAmount } },
        select: { spentAmount: true, approvedAmount: true },
      })

      return { transaction, payment, updatedRequest }
    })

    const newSpent = Number(result.updatedRequest.spentAmount)
    const newRemaining = Number(result.updatedRequest.approvedAmount) - newSpent

    return NextResponse.json({
      success: true,
      message: 'Spend recorded',
      data: {
        transaction: {
          id: result.transaction.id,
          amount: Number(result.transaction.amount),
          description: result.transaction.description,
          payeeType: result.transaction.payeeType,
          transactionDate: result.transaction.transactionDate.toISOString(),
          category: result.transaction.category,
          creator: result.transaction.creator,
          paymentId: result.transaction.paymentId,
          createdAt: result.transaction.createdAt.toISOString(),
        },
        summary: {
          approvedAmount: Number(result.updatedRequest.approvedAmount),
          spentAmount: newSpent,
          remainingBalance: newRemaining,
        },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error recording petty cash spend:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record spend' },
      { status: 500 }
    )
  }
}
