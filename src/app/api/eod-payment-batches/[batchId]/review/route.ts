import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'

/**
 * POST /api/eod-payment-batches/[batchId]/review
 * Cashier submits the EOD batch review — approves or rejects each payment.
 *
 * Body: { approvedPaymentIds: string[], rejectedPaymentIds: string[], notes?: string }
 *
 * For APPROVED items (atomic):
 *   - status → APPROVED
 *   - Cash bucket debited (sum of approved amounts)
 *   - ExpenseAccountDeposit created per expense account
 *   - PaymentBatchSubmissions record created per expense account
 *   - Expense account balances recalculated
 *
 * For REJECTED items:
 *   - status → QUEUED, eodBatchId cleared (re-enters queue for next EOD)
 *
 * EODPaymentBatch updated: REVIEWED, counts, totalApproved
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canSubmitPaymentBatch && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { batchId } = await params
    const body = await request.json()
    const {
      approvedPaymentIds = [],
      rejectedPaymentIds = [],
      notes,
    }: { approvedPaymentIds: string[]; rejectedPaymentIds: string[]; notes?: string } = body

    if (approvedPaymentIds.length === 0 && rejectedPaymentIds.length === 0) {
      return NextResponse.json({ error: 'No payment IDs provided' }, { status: 400 })
    }

    const batch = await prisma.eODPaymentBatch.findUnique({
      where: { id: batchId },
      include: { business: { select: { id: true, name: true } } },
    })

    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    if (batch.status !== 'PENDING_REVIEW') {
      return NextResponse.json(
        { error: `Batch is already ${batch.status} and cannot be reviewed again` },
        { status: 400 }
      )
    }

    // Load all payments that belong to this batch
    const allIds = [...approvedPaymentIds, ...rejectedPaymentIds]
    const payments = await prisma.expenseAccountPayments.findMany({
      where: { id: { in: allIds }, eodBatchId: batchId },
      include: {
        expenseAccount: { select: { id: true, accountName: true, businessId: true } },
        payeeUser: { select: { id: true, name: true, email: true } },
        payeeEmployee: { select: { id: true, fullName: true, phone: true } },
        payeePerson: { select: { id: true, fullName: true, phone: true } },
        payeeBusiness: { select: { id: true, name: true, phone: true } },
        payeeSupplier: { select: { id: true, name: true, phone: true, contactPerson: true } },
        category: { select: { id: true, name: true, emoji: true } },
        subcategory: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    })

    const foundIds = payments.map((p) => p.id)
    const missing = allIds.filter((id) => !foundIds.includes(id))
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Some payments not found in this batch: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const approvedPayments = payments.filter((p) => approvedPaymentIds.includes(p.id))
    const rejectedPayments = payments.filter((p) => rejectedPaymentIds.includes(p.id))
    const totalApproved = approvedPayments.reduce((s, p) => s + Number(p.amount), 0)

    // Split approved payments by channel
    const cashApproved = approvedPayments.filter((p) => (p as any).paymentChannel !== 'ECOCASH')
    const ecocashApproved = approvedPayments.filter((p) => (p as any).paymentChannel === 'ECOCASH')
    const totalCashApproved = cashApproved.reduce((s, p) => s + Number(p.amount), 0)

    // Verify sufficient CASH bucket balance
    if (cashApproved.length > 0) {
      const bucketRows = await prisma.cashBucketEntry.groupBy({
        by: ['direction'],
        where: { businessId: batch.businessId, paymentChannel: 'CASH' },
        _sum: { amount: true },
      })
      const bucketInflow = Number(bucketRows.find(r => r.direction === 'INFLOW')?._sum.amount ?? 0)
      const bucketOutflow = Number(bucketRows.find(r => r.direction === 'OUTFLOW')?._sum.amount ?? 0)
      const bucketBalance = bucketInflow - bucketOutflow
      if (bucketBalance < totalCashApproved) {
        return NextResponse.json(
          { error: `Insufficient 💵 cash in bucket for ${batch.business?.name ?? 'this business'}. Available: $${bucketBalance.toFixed(2)}, Required: $${totalCashApproved.toFixed(2)}` },
          { status: 400 }
        )
      }
    }

    // Verify sufficient rent-specific CASH_ALLOCATION earmark in the cash bucket.
    // Rent payments must come from the portion of cash that was daily-earmarked for rent,
    // not just from the total cash bucket balance.
    const rentPaymentsToApprove = cashApproved.filter((p) => (p as any).paymentType === 'RENT_PAYMENT')
    if (rentPaymentsToApprove.length > 0) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      for (const rentPayment of rentPaymentsToApprove) {
        const accountName = (rentPayment as any).expenseAccount?.accountName
        if (!accountName) continue

        const earmarkAgg = await prisma.cashBucketEntry.aggregate({
          where: {
            businessId: batch.businessId,
            entryType: 'CASH_ALLOCATION',
            direction: 'OUTFLOW',
            notes: accountName,
            entryDate: { gte: startOfMonth },
            deletedAt: null,
          },
          _sum: { amount: true },
        })
        const earmarked = Number(earmarkAgg._sum.amount ?? 0)
        const required = Number(rentPayment.amount)

        if (earmarked < required) {
          return NextResponse.json(
            {
              error: `Insufficient rent allocation for "${accountName}". Only $${earmarked.toFixed(2)} has been earmarked from daily EOD cash allocations this month, but $${required.toFixed(2)} is required. More daily EOD allocations are needed before this rent payment can be approved.`,
            },
            { status: 400 }
          )
        }
      }
    }

    // Verify sufficient EcoCash wallet balance (debit happens at Mark as Sent, but check now to prevent approval of undeliverable payments)
    if (ecocashApproved.length > 0) {
      const totalEcocashApproved = ecocashApproved.reduce((s, p) => s + Number(p.amount), 0)
      const ecocashRows = await prisma.cashBucketEntry.groupBy({
        by: ['direction'],
        where: { businessId: batch.businessId, paymentChannel: 'ECOCASH' },
        _sum: { amount: true },
      })
      const ecocashInflow = Number(ecocashRows.find(r => r.direction === 'INFLOW')?._sum.amount ?? 0)
      const ecocashOutflow = Number(ecocashRows.find(r => r.direction === 'OUTFLOW')?._sum.amount ?? 0)
      const ecocashBalance = ecocashInflow - ecocashOutflow
      if (ecocashBalance < totalEcocashApproved) {
        return NextResponse.json(
          { error: `Insufficient 📱 EcoCash wallet for ${batch.business?.name ?? 'this business'}. Available: $${ecocashBalance.toFixed(2)}, Required: $${totalEcocashApproved.toFixed(2)}. Top up EcoCash wallet first.` },
          { status: 400 }
        )
      }
    }

    const now = new Date()

    const result = await prisma.$transaction(async (tx: any) => {
      const batchSubmissions: { id: string; expenseAccountId: string; totalAmount: number }[] = []

      if (approvedPayments.length > 0) {
        // Debit cash bucket for CASH payments only
        // EcoCash payments are only approved here — CashBucketEntry is created when "Mark as Sent" later
        if (cashApproved.length > 0) {
          await tx.cashBucketEntry.create({
            data: {
              businessId: batch.businessId,
              entryType: 'PAYMENT_APPROVAL',
              direction: 'OUTFLOW',
              amount: totalCashApproved,
              paymentChannel: 'CASH',
              referenceType: 'EOD_BATCH',
              referenceId: batchId,
              notes: `${cashApproved.length} cash payment(s) approved`,
              entryDate: now,
              createdBy: user.id,
            },
          })
        }

        // For CASH payments: create deposit + PaymentBatchSubmissions per expense account
        const byCashAccount = new Map<string, typeof cashApproved>()
        for (const p of cashApproved) {
          const acc = byCashAccount.get(p.expenseAccountId) ?? []
          acc.push(p)
          byCashAccount.set(p.expenseAccountId, acc)
        }

        for (const [accountId, accountPayments] of byCashAccount) {
          const accountTotal = accountPayments.reduce((s, p) => s + Number(p.amount), 0)

          // Create BUSINESS deposit for all accounts (including rent).
          // Rent accounts are funded exactly once at approval — the daily EOD no longer
          // deposits into the expense account; only the cash bucket earmark is set.
          const deposit = await tx.expenseAccountDeposits.create({
            data: {
              expenseAccountId: accountId,
              sourceType: 'BUSINESS',
              sourceBusinessId: batch.businessId,
              amount: accountTotal,
              depositDate: now,
              autoGeneratedNote: `EOD batch approval ${now.toISOString().split('T')[0]}`,
              createdBy: user.id,
            },
          })
          const depositId = deposit.id

          const batchSub = await tx.paymentBatchSubmissions.create({
            data: {
              businessId: batch.businessId,
              expenseAccountId: accountId,
              submittedBy: user.id,
              submittedAt: now,
              totalAmount: accountTotal,
              depositId: depositId,
              paymentCount: accountPayments.length,
              notes: notes?.trim() || null,
            },
          })

          batchSubmissions.push({ id: batchSub.id, expenseAccountId: accountId, totalAmount: accountTotal })

          for (const p of accountPayments) {
            await tx.expenseAccountPayments.update({
              where: { id: p.id },
              data: { status: 'APPROVED', batchSubmissionId: batchSub.id },
            })
          }

          await updateExpenseAccountBalanceTx(tx, accountId)
        }

        // For ECOCASH payments: just mark APPROVED — no deposit or bucket entry yet.
        // Funds are sent via EcoCash separately; "Mark as Sent" creates deposit + CashBucketEntry.
        for (const p of ecocashApproved) {
          await tx.expenseAccountPayments.update({
            where: { id: p.id },
            data: { status: 'APPROVED' },
          })
        }
      }

      // Rejected payments return to QUEUED (re-enter queue for next EOD)
      if (rejectedPayments.length > 0) {
        await tx.expenseAccountPayments.updateMany({
          where: { id: { in: rejectedPayments.map((p) => p.id) } },
          data: { status: 'QUEUED', eodBatchId: null },
        })
      }

      // Update EOD batch status
      await tx.eODPaymentBatch.update({
        where: { id: batchId },
        data: {
          status: 'REVIEWED',
          reviewedBy: user.id,
          reviewedAt: now,
          approvedCount: approvedPayments.length,
          rejectedCount: rejectedPayments.length,
          totalApproved: totalApproved > 0 ? totalApproved : null,
          notes: notes?.trim() || null,
        },
      })

      return { batchSubmissions, totalApproved, approvedCount: approvedPayments.length }
    })

    // Propagate APPROVED status to any linked supplier payment requests (non-blocking)
    if (approvedPaymentIds.length > 0) {
      prisma.supplierPaymentRequests.updateMany({
        where: { linkedPaymentId: { in: approvedPaymentIds }, status: 'QUEUED' },
        data: { status: 'APPROVED' },
      }).catch(() => { /* non-critical */ })
    }

    // Notify payment requesters of approved/rejected outcomes (per-user so each sees only their payments)
    const resolvePayeeName = (p: any) =>
      p.payeeUser?.name ?? p.payeeEmployee?.fullName ?? p.payeePerson?.fullName ?? p.payeeBusiness?.name ?? p.payeeSupplier?.name ?? null

    const buildPaymentLine = (p: any) => {
      const payee = resolvePayeeName(p)
      const cat = p.category?.name || null
      const note = p.notes?.trim() || null
      const channel = (p as any).paymentChannel === 'ECOCASH' ? '📱 EcoCash' : '💵 Cash'
      const urgent = (p as any).priority === 'URGENT' ? '🚨 ' : ''
      const detail = [payee, cat, note].filter(Boolean).join(' · ')
      return `${urgent}$${Number(p.amount).toFixed(2)} ${detail ? `— ${detail} ` : ''}[${channel}]`
    }

    try {
      if (approvedPayments.length > 0) {
        const byUser = approvedPayments.reduce((acc, p) => {
          const uid = p.creator?.id; if (!uid) return acc
          ;(acc[uid] = acc[uid] || []).push(p); return acc
        }, {} as Record<string, any[]>)
        for (const [uid, payments] of Object.entries(byUser)) {
          const total = payments.reduce((s, p) => s + Number(p.amount), 0)
          const preview = payments.length === 1
            ? buildPaymentLine(payments[0])
            : `$${total.toFixed(2)} total — ${payments.slice(0, 3).map(p => `${resolvePayeeName(p) ?? '?'} ($${Number(p.amount).toFixed(2)})`).join(', ')}${payments.length > 3 ? ` +${payments.length - 3} more` : ''}`
          await emitNotification({
            userIds: [uid],
            type: 'PAYMENT_APPROVED',
            title: 'Payment Approved',
            message: `Approved by ${user.name} — ${preview}`,
            linkUrl: '/expense-accounts/my-payments',
          })
        }
      }
      if (rejectedPayments.length > 0) {
        const byUser = rejectedPayments.reduce((acc, p) => {
          const uid = p.creator?.id; if (!uid) return acc
          ;(acc[uid] = acc[uid] || []).push(p); return acc
        }, {} as Record<string, any[]>)
        for (const [uid, payments] of Object.entries(byUser)) {
          const preview = payments.length === 1
            ? buildPaymentLine(payments[0])
            : `${payments.slice(0, 3).map(p => `${resolvePayeeName(p) ?? '?'} ($${Number(p.amount).toFixed(2)})`).join(', ')}${payments.length > 3 ? ` +${payments.length - 3} more` : ''}`
          await emitNotification({
            userIds: [uid],
            type: 'PAYMENT_REJECTED',
            title: 'Payment Returned to Queue',
            message: `Returned by ${user.name} — ${preview}`,
            linkUrl: '/expense-accounts/my-payments',
          })
        }
      }
    } catch { /* non-critical */ }

    // Build print data
    const printData = {
      batchId,
      businessName: batch.business?.name ?? '',
      cashierName: user.name,
      reviewedAt: now.toISOString(),
      totalApproved: result.totalApproved,
      approvedCount: result.approvedCount,
      rejectedCount: rejectedPayments.length,
      payments: approvedPayments.map((p) => {
        const payeeName =
          p.payeeUser?.name ??
          p.payeeEmployee?.fullName ??
          p.payeePerson?.fullName ??
          p.payeeBusiness?.name ??
          (p.payeeSupplier as any)?.name ??
          '—'
        const payeePhone =
          p.payeeEmployee?.phone ??
          p.payeePerson?.phone ??
          p.payeeBusiness?.phone ??
          (p.payeeSupplier as any)?.phone ??
          p.payeeUser?.email ??
          null
        const payeeContact = (p.payeeSupplier as any)?.contactPerson ?? null
        return {
          id: p.id,
          adHoc: p.adHoc,
          payeeName,
          payeePhone,
          payeeContact,
          categoryName: p.category ? `${p.category.emoji ?? ''} ${p.category.name}`.trim() : '—',
          amount: Number(p.amount),
          notes: p.notes,
          requestedBy: p.creator?.name ?? '—',
          expenseAccount: p.expenseAccount?.accountName ?? '—',
        }
      }),
    }

    return NextResponse.json({
      success: true,
      message: `Review submitted: ${result.approvedCount} approved, ${rejectedPayments.length} returned to queue`,
      data: { printData },
    })
  } catch (error) {
    console.error('Error submitting EOD batch review:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit review' },
      { status: 500 }
    )
  }
}
