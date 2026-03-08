import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { debitBusinessAccount } from '@/lib/expense-account-utils'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/expense-account/[accountId]/payment-batch
 * Cashier submits a batch of REQUEST payments.
 *
 * Body: { paymentIds: string[], notes?: string }
 *
 * Steps:
 * 1. Validate all paymentIds belong to this account and have REQUEST status
 * 2. Check business primary account has sufficient funds
 * 3. Debit business account → deposit into expense account
 * 4. Transition payments REQUEST → SUBMITTED
 * 5. Create PaymentBatchSubmissions record
 * 6. Return print data
 */
export async function POST(
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

    if (!permissions.canSubmitPaymentBatch && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to submit payment batches' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { paymentIds, notes } = body as { paymentIds: string[]; notes?: string }

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json({ error: 'No payment IDs provided' }, { status: 400 })
    }

    // Load account and its linked business
    const account = await prisma.expenseAccounts.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        accountName: true,
        isActive: true,
        businessId: true,
        business: { select: { id: true, name: true } },
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Expense account not found' }, { status: 404 })
    }

    if (!account.isActive) {
      return NextResponse.json({ error: 'Cannot submit batch for inactive expense account' }, { status: 400 })
    }

    if (!account.businessId) {
      return NextResponse.json(
        { error: 'This expense account is not linked to a business — cannot fund from business account' },
        { status: 400 }
      )
    }

    // Validate all selected payments
    const payments = await prisma.expenseAccountPayments.findMany({
      where: { id: { in: paymentIds }, expenseAccountId: accountId, status: 'REQUEST' },
      include: {
        payeeUser: { select: { id: true, name: true } },
        payeeEmployee: { select: { id: true, fullName: true } },
        payeePerson: { select: { id: true, fullName: true } },
        payeeBusiness: { select: { id: true, name: true } },
        payeeSupplier: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, emoji: true } },
        subcategory: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    })

    if (payments.length !== paymentIds.length) {
      const foundIds = payments.map((p) => p.id)
      const missing = paymentIds.filter((id) => !foundIds.includes(id))
      return NextResponse.json(
        { error: `Some payments not found or not in REQUEST status: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)

    // Check business account has sufficient balance
    const businessAccount = await prisma.businessAccounts.findUnique({
      where: { businessId: account.businessId },
      select: { balance: true },
    })

    if (!businessAccount) {
      return NextResponse.json({ error: 'Business account not found' }, { status: 400 })
    }

    if (Number(businessAccount.balance) < totalAmount) {
      return NextResponse.json(
        {
          error: `Insufficient business account balance. Available: $${Number(businessAccount.balance).toFixed(2)}, Required: $${totalAmount.toFixed(2)}`,
          available: Number(businessAccount.balance),
          required: totalAmount,
        },
        { status: 400 }
      )
    }

    // Step 1: Debit business account and get businessTxId
    const debitResult = await debitBusinessAccount(
      account.businessId,
      totalAmount,
      `Payment batch for ${account.accountName}`,
      user.id,
      accountId,
      account.accountName
    )

    // Get the latest business transaction ID (the one we just created)
    const latestBizTx = await prisma.businessTransactions.findFirst({
      where: { businessId: account.businessId, referenceType: 'EXPENSE_DEPOSIT', referenceId: accountId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    // Step 2: Atomic transaction — create deposit, transition payments, create batch record
    const result = await prisma.$transaction(async (tx) => {
      // Create deposit record
      const deposit = await tx.expenseAccountDeposits.create({
        data: {
          expenseAccountId: accountId,
          sourceType: 'BUSINESS',
          sourceBusinessId: account.businessId!,
          amount: totalAmount,
          depositDate: new Date(),
          autoGeneratedNote: `Payment batch funded from ${account.business?.name ?? 'business account'}`,
          createdBy: user.id,
        },
      })

      // Transition payments to SUBMITTED
      await tx.expenseAccountPayments.updateMany({
        where: { id: { in: paymentIds } },
        data: {
          status: 'SUBMITTED',
          submittedBy: user.id,
          submittedAt: new Date(),
        },
      })

      // Create batch record
      const batch = await tx.paymentBatchSubmissions.create({
        data: {
          businessId: account.businessId!,
          expenseAccountId: accountId,
          submittedBy: user.id,
          totalAmount,
          depositId: deposit.id,
          businessTxId: latestBizTx?.id ?? null,
          paymentCount: payments.length,
          notes: notes?.trim() || null,
        },
      })

      // Link payments to batch
      await tx.expenseAccountPayments.updateMany({
        where: { id: { in: paymentIds } },
        data: { batchSubmissionId: batch.id },
      })

      // Recalculate and update expense account balance
      const depositsAgg = await tx.expenseAccountDeposits.aggregate({
        where: { expenseAccountId: accountId },
        _sum: { amount: true },
      })
      const paymentsAgg = await tx.expenseAccountPayments.aggregate({
        where: { expenseAccountId: accountId, status: 'SUBMITTED' },
        _sum: { amount: true },
      })
      const newBalance = Number(depositsAgg._sum.amount || 0) - Number(paymentsAgg._sum.amount || 0)
      await tx.expenseAccounts.update({
        where: { id: accountId },
        data: { balance: newBalance },
      })

      return { batch, deposit, newBalance }
    })

    // Build print data
    const printData = {
      batchId: result.batch.id,
      businessName: account.business?.name ?? '',
      accountName: account.accountName,
      cashierName: user.name,
      submittedAt: result.batch.submittedAt.toISOString(),
      totalAmount,
      paymentCount: payments.length,
      payments: payments.map((p) => {
        const payeeName =
          p.payeeUser?.name ??
          (p.payeeEmployee as any)?.fullName ??
          p.payeePerson?.fullName ??
          (p.payeeBusiness as any)?.name ??
          (p.payeeSupplier as any)?.name ??
          '—'
        return {
          id: p.id,
          payeeName,
          categoryName: p.category ? `${p.category.emoji ?? ''} ${p.category.name}`.trim() : '—',
          subcategoryName: p.subcategory?.name ?? null,
          amount: Number(p.amount),
          notes: p.notes,
          createdBy: p.creator?.name ?? '—',
        }
      }),
    }

    return NextResponse.json({
      success: true,
      message: `Batch of ${payments.length} payment(s) submitted successfully`,
      data: {
        batchId: result.batch.id,
        totalAmount,
        paymentCount: payments.length,
        newExpenseAccountBalance: result.newBalance,
        newBusinessAccountBalance: debitResult.newBalance,
        printData,
      },
    })
  } catch (error) {
    console.error('Error submitting payment batch:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit payment batch' },
      { status: 500 }
    )
  }
}
