import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'

async function hasSystemPermission(userId: string, permissionName: string): Promise<boolean> {
  const grant = await prisma.userPermissions.findFirst({
    where: { userId, granted: true, permission: { name: permissionName } },
  })
  return !!grant
}

/**
 * GET /api/admin/pending-actions
 * Returns items requiring the current user's attention, based on their permissions.
 * - canManageBusinessLoans → loan lock requests
 * - canViewSupplierPaymentQueue → pending supplier payment requests
 * - petty_cash.approve (system permission) → pending petty cash requests
 * Returns empty sections (not 403) for users who lack a section's permission.
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    const sysAdmin = isSystemAdmin(user)

    // Loan lock requests — only for system admins (role=admin), not for loan managers
    let loanLockRequests: object[] = []
    if (sysAdmin) {
      loanLockRequests = await prisma.businessLoan.findMany({
        where: { status: 'LOCK_REQUESTED' },
        select: {
          id: true,
          loanNumber: true,
          description: true,
          lenderName: true,
          lockRequestedAt: true,
          lockRequester: { select: { id: true, name: true } },
          managedBy: { select: { id: true, name: true } },
          expenseAccount: { select: { balance: true } },
        },
        orderBy: { lockRequestedAt: 'asc' },
      })
    }

    // Pending supplier payment requests — for payment queue approvers
    let pendingSupplierPayments: object[] = []
    if (permissions.canViewSupplierPaymentQueue) {
      pendingSupplierPayments = await prisma.supplierPaymentRequests.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          amount: true,
          notes: true,
          dueDate: true,
          submittedAt: true,
          submitter: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: 'asc' },
        take: 50,
      })
    }

    // Pending petty cash requests — for users with petty_cash.approve system permission
    let pendingPettyCash: object[] = []
    const canApprovePettyCash = sysAdmin || await hasSystemPermission(user.id, 'petty_cash.approve')
    if (canApprovePettyCash) {
      pendingPettyCash = await prisma.pettyCashRequests.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          requestedAmount: true,
          purpose: true,
          notes: true,
          requestedAt: true,
          requester: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
        },
        orderBy: { requestedAt: 'asc' },
      })
    }

    // Pending cash allocation reports — only for users with explicit cash_allocation.approve system permission
    // (excludes business owners/managers who run EOD but don't reconcile)
    const canApproveCashAllocation = sysAdmin || await hasSystemPermission(user.id, 'cash_allocation.approve')
    let pendingCashAllocations: object[] = []
    if (canApproveCashAllocation) {
      pendingCashAllocations = await prisma.cashAllocationReport.findMany({
        where: { status: { in: ['DRAFT', 'IN_PROGRESS'] } },
        select: {
          id: true,
          reportDate: true,
          status: true,
          createdAt: true,
          business: { select: { id: true, name: true, type: true } },
          _count: { select: { lineItems: true } },
        },
        orderBy: { reportDate: 'desc' },
        take: 50,
      })
    }

    // Pending EOD payment batches — for users with canSubmitPaymentBatch
    // Each item is a PENDING_REVIEW EODPaymentBatch waiting for cashier review
    let pendingPaymentBatches: object[] = []
    // Also keep legacy QUEUED/REQUEST count for backward compat with older sidebar code
    let pendingPaymentRequests: object[] = []
    if (sysAdmin || permissions.canSubmitPaymentBatch) {
      pendingPaymentBatches = await prisma.eODPaymentBatch.findMany({
        where: { status: 'PENDING_REVIEW' },
        select: {
          id: true,
          eodDate: true,
          business: { select: { id: true, name: true, type: true } },
          _count: { select: { payments: true } },
        },
        orderBy: { eodDate: 'asc' },
      })

      // Legacy: accounts with QUEUED/REQUEST payments not yet batched
      const grouped = await prisma.expenseAccountPayments.groupBy({
        by: ['expenseAccountId'],
        where: { status: { in: ['QUEUED', 'REQUEST'] } },
        _count: { id: true },
      })
      if (grouped.length > 0) {
        const accountIds = grouped.map((g) => g.expenseAccountId)
        const accounts = await prisma.expenseAccounts.findMany({
          where: { id: { in: accountIds } },
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            business: { select: { id: true, name: true } },
          },
        })
        pendingPaymentRequests = accounts.map((acct) => ({
          ...acct,
          requestCount: grouped.find((g) => g.expenseAccountId === acct.id)?._count.id ?? 0,
        }))
      }
    }

    const total =
      (loanLockRequests as unknown[]).length +
      (pendingSupplierPayments as unknown[]).length +
      (pendingPettyCash as unknown[]).length +
      (pendingCashAllocations as unknown[]).length +
      (pendingPaymentBatches as unknown[]).length +
      (pendingPaymentRequests as unknown[]).length

    return NextResponse.json({
      loanLockRequests,
      pendingSupplierPayments,
      pendingPettyCash,
      pendingCashAllocations,
      pendingPaymentBatches,
      pendingPaymentRequests,
      total,
    })
  } catch (error) {
    console.error('GET /api/admin/pending-actions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
