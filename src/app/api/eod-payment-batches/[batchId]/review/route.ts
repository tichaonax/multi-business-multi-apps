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

    // Verify business has sufficient cash in the physical cash bucket
    if (approvedPayments.length > 0) {
      const bucketRows = await prisma.cashBucketEntry.groupBy({
        by: ['direction'],
        where: { businessId: batch.businessId },
        _sum: { amount: true },
      })
      const bucketInflow = Number(bucketRows.find(r => r.direction === 'INFLOW')?._sum.amount ?? 0)
      const bucketOutflow = Number(bucketRows.find(r => r.direction === 'OUTFLOW')?._sum.amount ?? 0)
      const bucketBalance = bucketInflow - bucketOutflow
      if (bucketBalance < totalApproved) {
        return NextResponse.json(
          {
            error: `Insufficient cash in bucket for ${batch.business?.name ?? 'this business'}. Available: $${bucketBalance.toFixed(2)}, Required: $${totalApproved.toFixed(2)}`,
          },
          { status: 400 }
        )
      }
    }

    const now = new Date()

    // Group approved payments by expense account
    const byAccount = new Map<string, typeof approvedPayments>()
    for (const p of approvedPayments) {
      const acc = byAccount.get(p.expenseAccountId) ?? []
      acc.push(p)
      byAccount.set(p.expenseAccountId, acc)
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const batchSubmissions: { id: string; expenseAccountId: string; totalAmount: number }[] = []

      if (approvedPayments.length > 0) {
        // Debit cash bucket for this business
        await tx.cashBucketEntry.create({
          data: {
            businessId: batch.businessId,
            entryType: 'PAYMENT_APPROVAL',
            direction: 'OUTFLOW',
            amount: totalApproved,
            referenceType: 'EOD_BATCH',
            referenceId: batchId,
            notes: `${approvedPayments.length} payment(s) approved`,
            entryDate: now,
            createdBy: user.id,
          },
        })

        // For each expense account: create deposit + PaymentBatchSubmissions
        for (const [accountId, accountPayments] of byAccount) {
          const accountTotal = accountPayments.reduce((s, p) => s + Number(p.amount), 0)
          const accountName = accountPayments[0].expenseAccount?.accountName ?? accountId

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

          const batchSub = await tx.paymentBatchSubmissions.create({
            data: {
              businessId: batch.businessId,
              expenseAccountId: accountId,
              submittedBy: user.id,
              submittedAt: now,
              totalAmount: accountTotal,
              depositId: deposit.id,
              paymentCount: accountPayments.length,
              notes: notes?.trim() || null,
            },
          })

          batchSubmissions.push({ id: batchSub.id, expenseAccountId: accountId, totalAmount: accountTotal })

          // Mark approved payments + link to batch submission
          for (const p of accountPayments) {
            await tx.expenseAccountPayments.update({
              where: { id: p.id },
              data: {
                status: 'APPROVED',
                batchSubmissionId: batchSub.id,
              },
            })
          }

          // Recalculate expense account balance
          await updateExpenseAccountBalanceTx(tx, accountId)
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

    // Notify payment requesters of approved/rejected outcomes
    try {
      if (approvedPayments.length > 0) {
        const approvedUserIds = [...new Set(approvedPayments.map(p => p.creator?.id).filter((id): id is string => !!id))]
        if (approvedUserIds.length > 0) {
          await emitNotification({
            userIds: approvedUserIds,
            type: 'PAYMENT_APPROVED',
            title: 'Payment Approved',
            message: `${approvedPayments.length} payment(s) approved by ${user.name} — total $${totalApproved.toFixed(2)}`,
            linkUrl: '/expense-accounts/my-payments',
          })
        }
      }
      if (rejectedPayments.length > 0) {
        const rejectedUserIds = [...new Set(rejectedPayments.map(p => p.creator?.id).filter((id): id is string => !!id))]
        if (rejectedUserIds.length > 0) {
          await emitNotification({
            userIds: rejectedUserIds,
            type: 'PAYMENT_REJECTED',
            title: 'Payment Returned to Queue',
            message: `${rejectedPayments.length} payment(s) returned to queue by ${user.name}`,
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
          (p.payeeEmployee as any)?.fullName ??
          p.payeePerson?.fullName ??
          (p.payeeBusiness as any)?.name ??
          (p.payeeSupplier as any)?.name ??
          '—'
        return {
          id: p.id,
          adHoc: p.adHoc,
          payeeName,
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
