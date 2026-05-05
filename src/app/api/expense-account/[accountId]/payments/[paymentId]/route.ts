import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  validatePaymentAmount,
  validatePaymentEdit,
  updateExpenseAccountBalanceTx,
  isWithinEditWindow,
} from '@/lib/expense-account-utils'
import { validatePayee } from '@/lib/payee-utils'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/[accountId]/payments/[paymentId]
 * Get single payment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; paymentId: string }> }
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

    const { accountId, paymentId } = await params

    // Get payment with relations
    const payment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      include: {
        expenseAccount: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            businessId: true,
          },
        },
        payeeUser: {
          select: { id: true, name: true, email: true },
        },
        payeeEmployee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
            nationalId: true,
            phone: true,
          },
        },
        payeePerson: {
          select: {
            id: true,
            fullName: true,
            nationalId: true,
            phone: true,
            email: true,
          },
        },
        payeeBusiness: {
          select: { id: true, name: true, type: true, description: true },
        },
        payeeSupplier: {
          select: { id: true, name: true, phone: true, contactPerson: true, email: true },
        },
        category: {
          select: {
            id: true, name: true, emoji: true, color: true, domainId: true,
            domain: { select: { id: true, name: true, emoji: true } },
          },
        },
        subcategory: {
          select: { id: true, name: true, emoji: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        submitter: {
          select: { id: true, name: true, email: true },
        },
        destinationDeposit: {
          select: {
            id: true,
            expenseAccountId: true,
            expenseAccount: { select: { id: true, accountName: true } },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify payment belongs to the specified account
    if (payment.expenseAccountId !== accountId) {
      return NextResponse.json(
        { error: 'Payment does not belong to this expense account' },
        { status: 400 }
      )
    }

    // Fetch sub-subcategory separately (no Prisma relation defined on payments model)
    const subSubcategory = payment.subSubcategoryId
      ? await prisma.expenseSubSubcategories.findUnique({
          where: { id: payment.subSubcategoryId },
          select: { id: true, name: true, emoji: true },
        })
      : null

    // Fetch reversal fields + lineItems via raw SQL (some not in Prisma client yet)
    const reversalRows = await prisma.$queryRaw<Array<{
      reversed_at: Date | null
      reversed_by: string | null
      reversal_note: string | null
      reversal_petty_cash_id: string | null
      line_items: unknown | null
    }>>`
      SELECT reversed_at, reversed_by, reversal_note, reversal_petty_cash_id, line_items
      FROM expense_account_payments
      WHERE id = ${paymentId}
    `
    const reversalData = reversalRows[0] ?? {}

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: payment.id,
          expenseAccount: payment.expenseAccount,
          payeeType: payment.payeeType,
          payeeUser: payment.payeeUser,
          payeeEmployee: payment.payeeEmployee,
          payeePerson: payment.payeePerson,
          payeeBusiness: payment.payeeBusiness,
          payeeSupplier: payment.payeeSupplier,
          category: payment.category,
          subcategory: payment.subcategory,
          subSubcategory,
          amount: Number(payment.amount),
          paymentType: payment.paymentType,
          paymentDate: payment.paymentDate.toISOString(),
          notes: payment.notes,
          receiptNumber: payment.receiptNumber,
          receiptServiceProvider: payment.receiptServiceProvider,
          receiptReason: payment.receiptReason,
          isFullPayment: payment.isFullPayment,
          batchId: payment.batchId,
          paymentChannel: (payment as any).paymentChannel ?? 'CASH',
          priority: (payment as any).priority ?? 'NORMAL',
          projectId: (payment as any).projectId ?? null,
          status: payment.status,
          createdBy: payment.creator,
          submittedBy: payment.submitter,
          submittedAt: payment.submittedAt?.toISOString(),
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString(),
          // Reversal fields (MBM-153)
          reversedAt: reversalData.reversed_at?.toISOString() ?? null,
          reversedBy: reversalData.reversed_by ?? null,
          reversalNote: reversalData.reversal_note ?? null,
          reversalPettyCashId: reversalData.reversal_petty_cash_id ?? null,
          lineItems: reversalData.line_items ?? null,
          // Transfer destination link (MBM-198)
          destinationDepositId: (payment as any).destinationDepositId ?? null,
          destinationAccountId: (payment as any).destinationDeposit?.expenseAccountId ?? null,
          destinationAccountName: (payment as any).destinationDeposit?.expenseAccount?.accountName ?? null,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 })
  }
}

/**
 * PATCH /api/expense-account/[accountId]/payments/[paymentId]
 * Update payment (only if status is DRAFT)
 *
 * Body:
 * - amount: number (optional)
 * - notes: string (optional)
 * - categoryId: string (optional)
 * - subcategoryId: string (optional)
 * - paymentDate: string ISO date (optional)
 * - receiptNumber: string (optional)
 * - receiptServiceProvider: string (optional)
 * - receiptReason: string (optional)
 * - isFullPayment: boolean (optional)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(user)
    const isAdmin = isSystemAdmin(user)

    const { accountId, paymentId } = await params

    // Get existing payment — fetched early so we can check ownership before enforcing edit permissions
    const existingPayment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
      include: {
        expenseAccount: {
          select: { balance: true, businessId: true, accountType: true },
        },
      },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (existingPayment.expenseAccountId !== accountId) {
      return NextResponse.json(
        { error: 'Payment does not belong to this expense account' },
        { status: 400 }
      )
    }

    // Own-request edit: creator can edit their own REQUEST/REJECTED payments on non-business accounts
    // without needing the canEditExpenseTransactions privilege.
    const isPersonalAccount = !(existingPayment.expenseAccount as any)?.businessId ||
      (existingPayment.expenseAccount as any)?.accountType === 'PERSONAL'
    const isOwnRequestEdit =
      existingPayment.createdBy === user.id &&
      ['REQUEST', 'REJECTED'].includes(existingPayment.status) &&
      isPersonalAccount

    if (!permissions.canEditExpenseTransactions && !isOwnRequestEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to edit expense transactions' },
        { status: 403 }
      )
    }

    // --- Mark as Paid action ---
    // Read body once here; re-used below for the standard edit flow
    let body: any = {}
    try { body = await request.json() } catch { /* empty body */ }
    if (body.action === 'markPaid') {
      if (existingPayment.status !== 'APPROVED') {
        return NextResponse.json(
          { error: `Only APPROVED payments can be marked as paid. Current status: ${existingPayment.status}` },
          { status: 400 }
        )
      }
      const now = new Date()
      const paidAt = body.paidAt ? new Date(body.paidAt) : now
      const isEcocash = (existingPayment as any).paymentChannel === 'ECOCASH'
      const businessId = (existingPayment.expenseAccount as any)?.businessId as string | null

      // For EcoCash payments: require txCode and create deposit + bucket entry
      if (isEcocash) {
        const ecocashTransactionCode = body.ecocashTransactionCode?.trim()
        if (!ecocashTransactionCode) {
          return NextResponse.json(
            { error: 'ecocashTransactionCode is required to mark an EcoCash payment as sent' },
            { status: 400 }
          )
        }
        if (!businessId) {
          return NextResponse.json({ error: 'Cannot resolve business for this payment' }, { status: 400 })
        }
        const amount = Number(existingPayment.amount)

        // Guard: check EcoCash wallet balance before debiting
        const bucketAgg = await prisma.cashBucketEntry.groupBy({
          by: ['direction'],
          where: { businessId, paymentChannel: 'ECOCASH' },
          _sum: { amount: true },
        })
        const ecocashInflow = Number(bucketAgg.find((r: any) => r.direction === 'INFLOW')?._sum?.amount ?? 0)
        const ecocashOutflow = Number(bucketAgg.find((r: any) => r.direction === 'OUTFLOW')?._sum?.amount ?? 0)
        const ecocashBalance = ecocashInflow - ecocashOutflow
        if (ecocashBalance < amount) {
          return NextResponse.json(
            { error: `Insufficient funds in EcoCash wallet. Available: $${ecocashBalance.toFixed(2)}, Required: $${amount.toFixed(2)}. Top up the EcoCash wallet first.` },
            { status: 400 }
          )
        }

        const updated = await prisma.$transaction(async (tx: any) => {
          // Create expense account deposit (fund the account)
          await tx.expenseAccountDeposits.create({
            data: {
              expenseAccountId: accountId,
              sourceType: 'BUSINESS',
              sourceBusinessId: businessId,
              amount,
              depositDate: paidAt,
              autoGeneratedNote: `EcoCash payment sent (${ecocashTransactionCode})`,
              createdBy: user.id,
            },
          })
          // Create CashBucketEntry OUTFLOW for EcoCash
          await tx.cashBucketEntry.create({
            data: {
              businessId,
              entryType: 'PAYMENT_APPROVAL',
              direction: 'OUTFLOW',
              amount,
              paymentChannel: 'ECOCASH',
              referenceType: 'EXPENSE_PAYMENT',
              referenceId: paymentId,
              notes: `EcoCash: ${ecocashTransactionCode}`,
              entryDate: paidAt,
              createdBy: user.id,
            },
          })
          const p = await tx.expenseAccountPayments.update({
            where: { id: paymentId },
            data: { status: 'PAID', paidAt },
          })
          await updateExpenseAccountBalanceTx(tx, accountId)
          return p
        })
        return NextResponse.json({
          success: true,
          message: 'EcoCash payment marked as sent',
          data: { id: updated.id, status: updated.status, paidAt: updated.paidAt },
        })
      }

      const updated = await prisma.$transaction(async (tx: any) => {
        const p = await tx.expenseAccountPayments.update({
          where: { id: paymentId },
          data: { status: 'PAID', paidAt },
        })
        await updateExpenseAccountBalanceTx(tx, accountId)
        return p
      })

      // Clear "Payment Approved — Action Required" notification for the requester now that it's paid
      if (existingPayment.createdBy) {
        await prisma.appNotification.updateMany({
          where: {
            userId: existingPayment.createdBy,
            type: 'PAYMENT_APPROVED',
            linkUrl: `/expense-accounts/${accountId}/payments/${paymentId}`,
            isRead: false,
          },
          data: { isRead: true, readAt: new Date() },
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Payment marked as paid',
        data: { id: updated.id, status: updated.status, paidAt: updated.paidAt },
      })
    }

    // Auto-transfer (TRANSFER_OUT) payments are system-generated and cannot be edited by anyone
    if (existingPayment.paymentType === 'TRANSFER_OUT') {
      return NextResponse.json(
        { error: 'Auto-transfer payments cannot be edited. They are system-generated records.' },
        { status: 403 }
      )
    }

    // APPROVED, PAID, and REVERSED payments are immutable
    if (['APPROVED', 'PAID', 'REVERSED'].includes(existingPayment.status)) {
      return NextResponse.json(
        { error: `This payment has been ${existingPayment.status.toLowerCase()} and can no longer be edited.` },
        { status: 403 }
      )
    }

    // Rent payments are immutable once submitted — only cancellation is allowed
    if (existingPayment.paymentType === 'RENT_PAYMENT' && existingPayment.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Rent payments cannot be edited after submission. Cancel and re-request if needed.' },
        { status: 403 }
      )
    }

    // Check if within edit window (5 days for non-admins) — own-request edits bypass this
    const editWindowCheck = isWithinEditWindow(existingPayment.createdAt, isAdmin)
    if (!editWindowCheck.allowed && !isOwnRequestEdit) {
      return NextResponse.json(
        { error: editWindowCheck.error },
        { status: 403 }
      )
    }

    // Note: We now allow editing submitted payments with proper validation
    // to prevent negative balances

    // Parse request body (already read above)
    const {
      amount,
      notes,
      adjustmentReason,
      categoryId,
      subcategoryId,
      subSubcategoryId,
      paymentDate,
      receiptNumber,
      receiptServiceProvider,
      receiptReason,
      isFullPayment,
      // Payee fields — admin only
      payeeType,
      payeeUserId,
      payeeEmployeeId,
      payeePersonId,
      payeeBusinessId,
      payeeSupplierId,
      payeeChangeReason,
      paymentChannel,
      priority,
      projectId,
      lineItems,
    } = body

    // Pre-compute adjustment metadata used in notes check, amount block, and transaction
    const originalAmountNum = Number(existingPayment.amount)
    const newAmountNum = amount !== undefined ? Number(amount) : originalAmountNum
    const isAdjustmentOp = amount !== undefined && newAmountNum < originalAmountNum && existingPayment.status === 'SUBMITTED'
    const differenceAmount = isAdjustmentOp ? originalAmountNum - newAmountNum : 0
    const accountBusinessId = existingPayment.expenseAccount?.businessId as string | null

    // Payee changes are admin-only and require a reason (own-request edits may change payee freely)
    const isChangingPayee = payeeType !== undefined
    if (isChangingPayee) {
      if (!isAdmin && !isOwnRequestEdit) {
        return NextResponse.json(
          { error: 'Only system administrators can change the payee on a submitted payment' },
          { status: 403 }
        )
      }
      if (!isOwnRequestEdit && !payeeChangeReason?.trim()) {
        return NextResponse.json(
          { error: 'A reason is required when changing the payee' },
          { status: 400 }
        )
      }
    }

    // Notes are mandatory when modifying a submitted (non-DRAFT) payment.
    // Payee-change edits use payeeChangeReason instead.
    // Downward amount adjustments use adjustmentReason instead.
    // Own-request edits (creator editing their REQUEST/REJECTED) never require notes.
    if (!isOwnRequestEdit && existingPayment.status !== 'DRAFT' && !isChangingPayee && !notes?.trim() && !(isAdjustmentOp && adjustmentReason?.trim())) {
      return NextResponse.json(
        { error: 'Notes are required when modifying a submitted payment — explain the reason for the change.' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}

    // Validate and update amount if provided
    if (amount !== undefined) {
      const amountValidation = validatePaymentAmount(Number(amount))
      if (!amountValidation.valid) {
        return NextResponse.json(
          { error: amountValidation.error },
          { status: 400 }
        )
      }

      // Guard: downward only — upward edits must use the normal payment workflow
      if (newAmountNum > originalAmountNum) {
        return NextResponse.json(
          {
            error: 'Amount cannot be increased through payment edit. Create a new payment instead.',
            code: 'UPWARD_EDIT_NOT_ALLOWED',
          },
          { status: 400 }
        )
      }

      // Require adjustment reason for balance-affecting downward edits
      if (isAdjustmentOp && !adjustmentReason?.trim()) {
        return NextResponse.json(
          {
            error: 'adjustmentReason is required when changing the payment amount',
            code: 'ADJUSTMENT_REASON_REQUIRED',
          },
          { status: 400 }
        )
      }

      // Validate that this change won't cause negative balances
      const editValidation = await validatePaymentEdit(
        paymentId,
        accountId,
        Number(amount)
      )
      if (!editValidation.valid) {
        return NextResponse.json(
          { error: editValidation.error },
          { status: 400 }
        )
      }

      updateData.amount = Number(amount)
    }

    // Validate and update category if provided
    if (categoryId !== undefined) {
      const category = await prisma.expenseCategories.findUnique({
        where: { id: categoryId },
      })
      if (!category) {
        return NextResponse.json(
          { error: 'Expense category not found' },
          { status: 404 }
        )
      }
      updateData.categoryId = categoryId
    }

    // Validate and update subcategory if provided
    if (subcategoryId !== undefined) {
      if (subcategoryId) {
        const subcategory = await prisma.expenseSubcategories.findUnique({
          where: { id: subcategoryId },
        })
        if (!subcategory) {
          return NextResponse.json(
            { error: 'Expense subcategory not found' },
            { status: 404 }
          )
        }
      }
      updateData.subcategoryId = subcategoryId || null
    }

    // Validate and update sub-subcategory if provided
    if (subSubcategoryId !== undefined) {
      if (subSubcategoryId) {
        const subSubcategory = await prisma.expenseSubSubcategories.findUnique({
          where: { id: subSubcategoryId },
        })
        if (!subSubcategory) {
          return NextResponse.json(
            { error: 'Expense sub-subcategory not found' },
            { status: 404 }
          )
        }
      }
      updateData.subSubcategoryId = subSubcategoryId || null
    }

    // Validate and update payment date if provided
    if (paymentDate !== undefined) {
      const payDate = new Date(paymentDate)
      // Compare date strings only to avoid millisecond clock-skew between client and server
      const serverToday = new Date().toISOString().split('T')[0]
      const payDateStr = new Date(paymentDate).toISOString().split('T')[0]
      if (payDateStr > serverToday) {
        return NextResponse.json(
          { error: 'Payment date cannot be in the future' },
          { status: 400 }
        )
      }
      updateData.paymentDate = payDate
    }

    // Update payee fields (admin only — already validated above)
    if (isChangingPayee) {
      updateData.payeeType = payeeType
      updateData.payeeUserId = payeeUserId || null
      updateData.payeeEmployeeId = payeeEmployeeId || null
      updateData.payeePersonId = payeePersonId || null
      updateData.payeeBusinessId = payeeBusinessId || null
      updateData.payeeSupplierId = payeeSupplierId || null
      // Append reason to notes for audit trail
      const reasonNote = `[Payee changed by admin: ${payeeChangeReason.trim()}]`
      updateData.notes = notes?.trim()
        ? `${notes.trim()}\n${reasonNote}`
        : (existingPayment.notes ? `${existingPayment.notes}\n${reasonNote}` : reasonNote)
    }

    // Update other fields
    if (notes !== undefined && !isChangingPayee) updateData.notes = notes?.trim() || null

    // Append adjustment reason to notes for audit trail when reducing amount
    if (isAdjustmentOp && adjustmentReason?.trim()) {
      const dateStr = new Date().toISOString().split('T')[0]
      const adjustNote = `[Adjusted ${dateStr}: $${originalAmountNum.toFixed(2)} → $${newAmountNum.toFixed(2)}. Reason: ${adjustmentReason.trim()}]`
      const baseNotes = updateData.notes ?? existingPayment.notes ?? ''
      updateData.notes = baseNotes ? `${baseNotes}\n${adjustNote}` : adjustNote
    }

    if (receiptNumber !== undefined) updateData.receiptNumber = receiptNumber?.trim() || null
    if (receiptServiceProvider !== undefined)
      updateData.receiptServiceProvider = receiptServiceProvider?.trim() || null
    if (receiptReason !== undefined) updateData.receiptReason = receiptReason?.trim() || null
    if (isFullPayment !== undefined) updateData.isFullPayment = isFullPayment
    if (paymentChannel !== undefined) updateData.paymentChannel = paymentChannel === 'ECOCASH' ? 'ECOCASH' : 'CASH'
    if (priority !== undefined) updateData.priority = priority === 'URGENT' ? 'URGENT' : 'NORMAL'

    // Own-request edit of a REJECTED payment: reset to REQUEST so cashier sees it again
    if (isOwnRequestEdit && existingPayment.status === 'REJECTED') {
      updateData.status = 'REQUEST'
    }
    // lineItems handled via raw SQL after the transaction (Prisma client not yet regenerated)
    const lineItemsValue = lineItems !== undefined
      ? (Array.isArray(lineItems) && lineItems.length > 0 ? lineItems : null)
      : undefined
    if (projectId !== undefined) {
      if (projectId) {
        const project = await prisma.projects.findUnique({ where: { id: projectId }, select: { id: true } })
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      updateData.projectId = projectId || null
    }

    // Use transaction to update payment and recalculate balance
    const result = await prisma.$transaction(async (tx) => {
      // Update payment
      const updatedPayment = await tx.expenseAccountPayments.update({
        where: { id: paymentId },
        data: updateData,
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
            select: { id: true, name: true, emoji: true },
          },
          subcategory: {
            select: { id: true, name: true, emoji: true },
          },
        },
      })

      let adjustmentDepositId: string | null = null
      let businessCredited = false

      if (isAdjustmentOp) {
        const depositNote = `Adjustment: payment reduced from $${originalAmountNum.toFixed(2)} to $${newAmountNum.toFixed(2)}. Reason: ${(adjustmentReason ?? '').trim()}`
        const deposit = await tx.expenseAccountDeposits.create({
          data: {
            expenseAccountId: accountId,
            sourceType: 'PAYMENT_ADJUSTMENT',
            sourcePaymentId: paymentId,
            sourceBusinessId: accountBusinessId,
            amount: differenceAmount,
            depositDate: new Date(),
            autoGeneratedNote: depositNote,
            createdBy: user.id,
          },
        })
        adjustmentDepositId = deposit.id

        // Credit the originating business account for the difference
        if (accountBusinessId) {
          const CREDIT_TYPES = ['deposit', 'transfer', 'loan_received', 'CREDIT']
          const DEBIT_TYPES = ['withdrawal', 'loan_disbursement', 'loan_payment', 'DEBIT']
          const [creditsAgg, debitsAgg] = await Promise.all([
            (tx.businessTransactions as any).aggregate({
              where: { businessId: accountBusinessId, type: { in: CREDIT_TYPES } },
              _sum: { amount: true },
            }),
            (tx.businessTransactions as any).aggregate({
              where: { businessId: accountBusinessId, type: { in: DEBIT_TYPES } },
              _sum: { amount: true },
            }),
          ])
          const trueBalance = Number(creditsAgg._sum?.amount ?? 0) - Math.abs(Number(debitsAgg._sum?.amount ?? 0))
          const newBizBalance = trueBalance + differenceAmount
          await tx.businessAccounts.update({
            where: { businessId: accountBusinessId },
            data: { balance: newBizBalance },
          })
          await (tx.businessTransactions as any).create({
            data: {
              businessId: accountBusinessId,
              type: 'CREDIT',
              amount: differenceAmount,
              description: `Payment adjustment refund — expense payment reduced by $${differenceAmount.toFixed(2)}`,
              balanceAfter: newBizBalance,
              createdBy: user.id,
              referenceType: 'PAYMENT_ADJUSTMENT',
              referenceId: paymentId,
            },
          })
          businessCredited = true
        }
      }

      // Recalculate and update account balance
      const newBalance = await updateExpenseAccountBalanceTx(tx, accountId)

      return { updatedPayment, newBalance, adjustmentDepositId, businessCredited }
    })

    // Update line_items via raw SQL (Prisma client not yet regenerated for this column)
    if (lineItemsValue !== undefined) {
      if (lineItemsValue === null) {
        await prisma.$executeRaw`UPDATE expense_account_payments SET line_items = NULL WHERE id = ${paymentId}`
      } else {
        await prisma.$executeRaw`UPDATE expense_account_payments SET line_items = ${JSON.stringify(lineItemsValue)}::jsonb WHERE id = ${paymentId}`
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        payment: {
          id: result.updatedPayment.id,
          expenseAccountId: result.updatedPayment.expenseAccountId,
          payeeType: result.updatedPayment.payeeType,
          payeeUser: result.updatedPayment.payeeUser,
          payeeEmployee: result.updatedPayment.payeeEmployee,
          payeePerson: result.updatedPayment.payeePerson,
          payeeBusiness: result.updatedPayment.payeeBusiness,
          category: result.updatedPayment.category,
          subcategory: result.updatedPayment.subcategory,
          subSubcategoryId: result.updatedPayment.subSubcategoryId,
          amount: Number(result.updatedPayment.amount),
          paymentDate: result.updatedPayment.paymentDate.toISOString(),
          notes: result.updatedPayment.notes,
          receiptNumber: result.updatedPayment.receiptNumber,
          status: result.updatedPayment.status,
          createdAt: result.updatedPayment.createdAt.toISOString(),
          updatedAt: result.updatedPayment.updatedAt.toISOString(),
        },
        expenseAccountBalance: result.newBalance,
        ...(isAdjustmentOp && {
          adjustment: {
            depositId: result.adjustmentDepositId,
            differenceAmount,
            businessCredited: result.businessCredited,
            newExpenseAccountBalance: result.newBalance,
          },
        }),
      },
    })
  } catch (error) {
    console.error('Error updating payment:', error)
    const msg = error instanceof Error ? error.message : ''
    const isTechnical = msg.includes('prisma') || msg.includes('Invalid `') || msg.includes('database') || msg.length > 200
    return NextResponse.json(
      { error: isTechnical ? 'Failed to save payment. Please try again.' : (msg || 'Failed to update payment') },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/expense-account/[accountId]/payments/[paymentId]
 * Delete payment (only if status is DRAFT)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; paymentId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.canAdjustExpensePayments) {
      return NextResponse.json(
        { error: 'You do not have permission to delete expense payments' },
        { status: 403 }
      )
    }

    const { accountId, paymentId } = await params

    // Get existing payment
    const existingPayment = await prisma.expenseAccountPayments.findUnique({
      where: { id: paymentId },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify payment belongs to the specified account
    if (existingPayment.expenseAccountId !== accountId) {
      return NextResponse.json(
        { error: 'Payment does not belong to this expense account' },
        { status: 400 }
      )
    }

    // Check if payment is DRAFT (only DRAFT payments can be deleted)
    if (existingPayment.status !== 'DRAFT') {
      return NextResponse.json(
        {
          error: 'Cannot delete submitted payment',
          reason: 'Only DRAFT payments can be deleted. Submitted payments are immutable for audit trail.',
        },
        { status: 403 }
      )
    }

    // Delete payment in transaction and update balance
    await prisma.$transaction(async (tx) => {
      // Delete the payment
      await tx.expenseAccountPayments.delete({
        where: { id: paymentId },
      })

      // Update expense account balance (not necessary for DRAFT, but good practice)
      await updateExpenseAccountBalance(accountId)
    })

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to delete payment',
      },
      { status: 500 }
    )
  }
}
