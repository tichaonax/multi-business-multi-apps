import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { canUserWriteAccount } from '@/lib/expense-account-access'
import { updateExpenseAccountBalanceTx, validateDepositAmount } from '@/lib/expense-account-utils'
import { createAuditLog } from '@/lib/audit'

/**
 * POST /api/expense-account/[accountId]/transfer
 * Transfer funds from this account to another accessible expense account.
 *
 * Body: { destinationAccountId, amount, notes }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Transfers are only allowed on accounts not tied to any business (businessId = null).
    // Permission is based on FULL grant on the source account (or admin).

    const { accountId: sourceAccountId } = await params
    const body = await request.json()
    const { destinationAccountId, amount, notes } = body

    // Validate inputs
    if (!destinationAccountId) {
      return NextResponse.json({ error: 'Destination account is required' }, { status: 400 })
    }
    if (sourceAccountId === destinationAccountId) {
      return NextResponse.json({ error: 'Source and destination accounts must be different' }, { status: 400 })
    }
    if (!notes?.trim()) {
      return NextResponse.json({ error: 'Transfer notes are required' }, { status: 400 })
    }

    const amountValidation = validateDepositAmount(Number(amount))
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.error }, { status: 400 })
    }
    const transferAmount = Number(amount)

    // Fetch both accounts (need businessId to enforce non-business restriction)
    const [sourceAccount, destAccount] = await Promise.all([
      prisma.expenseAccounts.findUnique({ where: { id: sourceAccountId }, select: { id: true, accountName: true, accountNumber: true, isActive: true, businessId: true } }),
      prisma.expenseAccounts.findUnique({ where: { id: destinationAccountId }, select: { id: true, accountName: true, accountNumber: true, isActive: true, businessId: true } }),
    ])

    if (!sourceAccount) return NextResponse.json({ error: 'Source account not found' }, { status: 404 })
    if (!destAccount) return NextResponse.json({ error: 'Destination account not found' }, { status: 404 })
    if (!sourceAccount.isActive) return NextResponse.json({ error: 'Source account is not active' }, { status: 400 })
    if (!destAccount.isActive) return NextResponse.json({ error: 'Destination account is not active' }, { status: 400 })

    // Only allow transfers between accounts not tied to any business
    if (sourceAccount.businessId) {
      return NextResponse.json({ error: 'Transfers are only allowed on accounts not tied to a business' }, { status: 403 })
    }
    if (destAccount.businessId) {
      return NextResponse.json({ error: 'Destination account must not be tied to a business' }, { status: 403 })
    }

    // User must have FULL grant on the source account (or be admin)
    const sourceAccessOk = user.role === 'admin' || await canUserWriteAccount(user.id, sourceAccountId)
    if (!sourceAccessOk) {
      return NextResponse.json({ error: 'You do not have access to the source account' }, { status: 403 })
    }

    // User must have FULL grant on the destination account (or be admin)
    const destAccessOk = user.role === 'admin' || await canUserWriteAccount(user.id, destinationAccountId)
    if (!destAccessOk) {
      return NextResponse.json({ error: 'You do not have access to the destination account' }, { status: 403 })
    }

    // Execute transfer atomically
    const result = await prisma.$transaction(async (tx) => {
      // Authoritative balance check inside transaction
      const [depositsAgg, paymentsAgg] = await Promise.all([
        tx.expenseAccountDeposits.aggregate({
          where: { expenseAccountId: sourceAccountId },
          _sum: { amount: true },
        }),
        tx.expenseAccountPayments.aggregate({
          where: { expenseAccountId: sourceAccountId, status: { in: ['SUBMITTED', 'APPROVED', 'PAID'] } },
          _sum: { amount: true },
        }),
      ])
      const sourceBalance = Number(depositsAgg._sum.amount ?? 0) - Number(paymentsAgg._sum.amount ?? 0)

      if (transferAmount > sourceBalance) {
        throw new Error(`Insufficient balance. Available: $${sourceBalance.toFixed(2)}, requested: $${transferAmount.toFixed(2)}`)
      }

      const now = new Date()

      // Create TRANSFER_OUT payment on source account
      const sourcePayment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: sourceAccountId,
          paymentType: 'TRANSFER_OUT',
          payeeType: 'ACCOUNT_TRANSFER',
          status: 'SUBMITTED',
          amount: transferAmount,
          notes: notes.trim(),
          paymentDate: now,
          createdBy: user.id,
          submittedBy: user.id,
          submittedAt: now,
        },
      })

      // Create ACCOUNT_TRANSFER deposit on destination account
      const destDeposit = await tx.expenseAccountDeposits.create({
        data: {
          expenseAccountId: destinationAccountId,
          sourceType: 'ACCOUNT_TRANSFER',
          amount: transferAmount,
          depositDate: now,
          autoGeneratedNote: `Transfer from "${sourceAccount.accountName}" — ${notes.trim()}`,
          createdBy: user.id,
        },
      })

      // Update both account balances
      await updateExpenseAccountBalanceTx(tx, sourceAccountId)
      await updateExpenseAccountBalanceTx(tx, destinationAccountId)

      return { sourcePayment, destDeposit }
    })

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'EXPENSE_ACCOUNT_TRANSFER',
      entityType: 'ExpenseAccountTransfer',
      entityId: result.sourcePayment.id,
      newValues: {
        amount: transferAmount,
        sourceAccountId,
        sourceAccountName: sourceAccount.accountName,
        destinationAccountId,
        destinationAccountName: destAccount.accountName,
        notes: notes.trim(),
        transferredBy: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        sourcePaymentId: result.sourcePayment.id,
        destinationDepositId: result.destDeposit.id,
        amount: transferAmount,
        sourceAccountId,
        destinationAccountId,
      },
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process transfer'
    console.error('Error processing account transfer:', error)
    if (message.startsWith('Insufficient balance')) {
      return NextResponse.json({ error: message }, { status: 422 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
