import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, getEffectivePermissions } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'
import { createAuditLog } from '@/lib/audit'
import { emitNotification } from '@/lib/notifications/notification-emitter'

const REVERSIBLE_STATUSES = ['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'PAID']

function getPayeeName(p: any): string {
  if (p.payeeSupplier?.name) return p.payeeSupplier.name
  if (p.payeeEmployee?.fullName) return p.payeeEmployee.fullName
  if (p.payeeUser?.name) return p.payeeUser.name
  return 'Unknown payee'
}

function buildReversalNotes(payments: any[]): string {
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const fmtAmt = (n: number) => `$${Number(n).toFixed(2)}`

  const lines = payments.map(p => {
    const date = fmtDate(new Date(p.paymentDate))
    const payee = getPayeeName(p)
    const amount = fmtAmt(p.amount)
    const note = p.notes ? ` — ${p.notes}` : ''
    const cat = p.category?.name ? ` [${p.category.name}]` : ''
    return `• ${date}: ${payee} ${amount}${cat}${note}`
  })

  return `Converted from ${payments.length} expense payment${payments.length !== 1 ? 's' : ''}:\n${lines.join('\n')}`
}

/**
 * GET /api/expense-account/reverse-to-petty-cash?businessId=xxx&userId=xxx
 *
 * Returns reversible payments for a given user in a given business.
 * Also returns the list of active expense account holders in the business.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!isSystemAdmin(user) && !getEffectivePermissions(user, businessId ?? undefined).canReversePaymentsToPettyCash) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const userId = searchParams.get('userId')

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    // Find ALL active expense accounts for this business (not just the first one)
    const accounts = await prisma.expenseAccounts.findMany({
      where: { businessId, isActive: true },
      select: { id: true, accountName: true, accountNumber: true },
    })
    const accountIds = accounts.map(a => a.id)

    // If no userId, return distinct requesters who have reversible payments across any account
    if (!userId) {
      if (accountIds.length === 0) return NextResponse.json({ success: true, data: { users: [], accounts: [] } })

      const distinctCreators = await prisma.expenseAccountPayments.findMany({
        where: {
          expenseAccountId: { in: accountIds },
          status: { in: REVERSIBLE_STATUSES },
        },
        select: { createdBy: true, creator: { select: { id: true, name: true, email: true } } },
        distinct: ['createdBy'],
      })
      const users = distinctCreators.map(p => p.creator)
      return NextResponse.json({ success: true, data: { users, accounts } })
    }

    if (accountIds.length === 0) {
      return NextResponse.json({ success: true, data: { payments: [], accounts: [] } })
    }

    // Load reversible payments for the selected user across all accounts for this business
    const payments = await prisma.expenseAccountPayments.findMany({
      where: {
        expenseAccountId: { in: accountIds },
        createdBy: userId,
        status: { in: REVERSIBLE_STATUSES },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        paymentDate: true,
        notes: true,
        payeeType: true,
        payeeSupplier: { select: { id: true, name: true } },
        payeeEmployee: { select: { id: true, fullName: true } },
        payeeUser: { select: { id: true, name: true } },
        category: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { paymentDate: 'desc' },
    })

    return NextResponse.json({ success: true, data: { payments, accounts } })
  } catch (error) {
    console.error('[reverse-to-petty-cash GET]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/expense-account/reverse-to-petty-cash
 *
 * Admin / permitted manager selects one or more expense account payments
 * that were incorrectly submitted as direct payments and converts them into
 * a single petty cash request on behalf of the original requester.
 *
 * What happens atomically:
 *   1. All selected payments are marked REVERSED (excluded from balance calc)
 *   2. Expense account balance is recalculated
 *   3. A PettyCashRequest is created in APPROVED status for the total amount
 *      (no new deposit — the freed-up balance IS the petty cash fund)
 *   4. PaymentReversalLog row is created for the audit trail
 *   5. AuditLogs row is created
 *
 * The cash bucket is left unchanged — the original PAYMENT_APPROVAL OUTFLOW
 * entries already represent the physical cash that left. A new OUTFLOW would
 * double-count.
 *
 * Body: { paymentIds: string[], reversalNote: string, businessId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { paymentIds, reversalNote, businessId } = body

    // Permission check (needs businessId from body)
    if (!isSystemAdmin(user) && !getEffectivePermissions(user, businessId).canReversePaymentsToPettyCash) {
      return NextResponse.json(
        { error: 'You do not have permission to reverse payments to petty cash' },
        { status: 403 }
      )
    }

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json({ error: 'paymentIds must be a non-empty array' }, { status: 400 })
    }
    if (!reversalNote?.trim()) {
      return NextResponse.json({ error: 'reversalNote is required' }, { status: 400 })
    }
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Load all payments including payee details for the readable notes summary
    const payments = await prisma.expenseAccountPayments.findMany({
      where: { id: { in: paymentIds } },
      include: {
        expenseAccount: { select: { id: true, accountName: true, businessId: true } },
        creator: { select: { id: true, name: true } },
        payeeSupplier: { select: { name: true } },
        payeeEmployee: { select: { fullName: true } },
        payeeUser: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { paymentDate: 'asc' },
    })

    if (payments.length !== paymentIds.length) {
      const found = payments.map(p => p.id)
      const missing = paymentIds.filter((id: string) => !found.includes(id))
      return NextResponse.json({ error: `Payments not found: ${missing.join(', ')}` }, { status: 404 })
    }

    // All payments must belong to the requested business
    for (const p of payments) {
      if (p.expenseAccount.businessId !== businessId) {
        return NextResponse.json(
          { error: `Payment ${p.id} does not belong to business ${businessId}` },
          { status: 400 }
        )
      }
    }

    // All payments must share the same expense account (same requester)
    const expenseAccountIds = [...new Set(payments.map(p => p.expenseAccountId))]
    if (expenseAccountIds.length > 1) {
      return NextResponse.json(
        { error: 'All selected payments must belong to the same expense account (same requester)' },
        { status: 400 }
      )
    }
    const expenseAccountId = expenseAccountIds[0]

    // Validate statuses
    for (const p of payments) {
      if (!REVERSIBLE_STATUSES.includes(p.status)) {
        return NextResponse.json(
          { error: `Payment ${p.id} has status "${p.status}" which cannot be reversed. Only ${REVERSIBLE_STATUSES.join(', ')} are allowed.` },
          { status: 400 }
        )
      }
      if ((p as any).reversedAt) {
        return NextResponse.json(
          { error: `Payment ${p.id} has already been reversed` },
          { status: 400 }
        )
      }
    }

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const requestedBy = payments[0].createdBy
    const now = new Date()

    // Verify the expense account is still active
    const expenseAccount = await prisma.expenseAccounts.findUnique({
      where: { id: expenseAccountId },
      select: { id: true, accountName: true, isActive: true },
    })
    if (!expenseAccount || !expenseAccount.isActive) {
      return NextResponse.json({ error: 'Expense account not found or inactive' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Mark all payments as REVERSED using raw SQL (new fields not in Prisma client yet)
      await tx.$executeRaw`
        UPDATE expense_account_payments
        SET
          status            = 'REVERSED',
          reversed_at       = ${now},
          reversed_by       = ${user.id},
          reversal_note     = ${reversalNote.trim()}
        WHERE id = ANY(${paymentIds}::text[])
      `

      // 2. Recalculate expense account balance (REVERSED no longer counts)
      await updateExpenseAccountBalanceTx(tx, expenseAccountId)

      // 3. Create PettyCashRequest in APPROVED status
      //    No new deposit is created — the balance freed by the reversal IS the fund.
      const pettyCashRequest = await tx.pettyCashRequests.create({
        data: {
          businessId,
          expenseAccountId,
          requestedBy,
          approvedBy: user.id,
          status: 'APPROVED',
          requestedAmount: totalAmount,
          approvedAmount: totalAmount,
          purpose: reversalNote.trim(),
          notes: buildReversalNotes(payments),
          requestedAt: now,
          approvedAt: now,
          // depositId intentionally null — funds come from the freed-up balance
        },
      })

      // 4. Back-link: set reversalPettyCashId on all reversed payments
      await tx.$executeRaw`
        UPDATE expense_account_payments
        SET reversal_petty_cash_id = ${pettyCashRequest.id}
        WHERE id = ANY(${paymentIds}::text[])
      `

      // 5. Create PaymentReversalLog using raw SQL (new table not in Prisma client yet)
      const logId = `rlog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      await tx.$executeRaw`
        INSERT INTO payment_reversal_logs
          (id, "businessId", "reversedBy", "reversalNote", "pettyCashRequestId", "totalAmount", "paymentIds", "createdAt")
        VALUES
          (${logId}, ${businessId}, ${user.id}, ${reversalNote.trim()}, ${pettyCashRequest.id}, ${totalAmount}, ${JSON.stringify(paymentIds)}, ${now})
      `

      return { pettyCashRequest, logId }
    })

    // 6. Audit log
    await createAuditLog({
      userId: user.id,
      action: 'PAYMENT_REVERSED_TO_PETTY_CASH',
      entityType: 'PaymentReversalLog',
      entityId: result.logId,
      businessId,
      oldValues: { paymentIds, statuses: payments.map(p => ({ id: p.id, status: p.status, amount: Number(p.amount) })) },
      newValues: { reversedStatus: 'REVERSED', pettyCashRequestId: result.pettyCashRequest.id, totalAmount },
      metadata: { reversalNote: reversalNote.trim(), reversedBy: user.name },
    })

    // 7. Notify the requester
    const requester = payments[0].creator
    if (requester) {
      await emitNotification({
        userIds: [requestedBy],
        type: 'PAYMENTS_REVERSED_TO_PETTY_CASH',
        title: 'Payments Converted to Petty Cash',
        message: `${payments.length} payment(s) totalling $${totalAmount.toFixed(2)} have been converted to a petty cash request by ${user.name}. Please record your actual expenses and settle the request.`,
        linkUrl: `/petty-cash/${result.pettyCashRequest.id}`,
      })
    }

    return NextResponse.json({
      success: true,
      message: `${payments.length} payment(s) reversed. Petty cash request created for $${totalAmount.toFixed(2)}.`,
      data: {
        pettyCashRequestId: result.pettyCashRequest.id,
        totalAmount,
        reversedPaymentIds: paymentIds,
      },
    })
  } catch (error) {
    console.error('[reverse-to-petty-cash]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reverse payments' },
      { status: 500 }
    )
  }
}
