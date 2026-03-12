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

    // APPROVED petty cash requests with remaining balance — cashier needs to settle these
    let outstandingPettyCash: object[] = []
    let outstandingPettyCashTotal = 0
    if (canApprovePettyCash) {
      const approved = await prisma.pettyCashRequests.findMany({
        where: { status: 'APPROVED' },
        select: {
          id: true,
          purpose: true,
          approvedAmount: true,
          spentAmount: true,
          approvedAt: true,
          requester: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
        },
        orderBy: { approvedAt: 'asc' },
      })
      // Only include requests that still have cash outstanding
      type OutstandingItem = {
        id: string; purpose: string; requesterName: string; businessName: string
        approvedAmount: number; spentAmount: number; remainingBalance: number; approvedAt: string | null
      }
      const mapped: OutstandingItem[] = approved.map((r: typeof approved[number]) => ({
        id: r.id,
        purpose: r.purpose,
        requesterName: r.requester?.name ?? '—',
        businessName: r.business?.name ?? '—',
        approvedAmount: Number(r.approvedAmount ?? 0),
        spentAmount: Number(r.spentAmount),
        remainingBalance: Number(r.approvedAmount ?? 0) - Number(r.spentAmount),
        approvedAt: r.approvedAt?.toISOString() ?? null,
      }))
      outstandingPettyCash = mapped.filter((r) => r.remainingBalance > 0)
      outstandingPettyCashTotal = (outstandingPettyCash as OutstandingItem[]).reduce(
        (sum, r) => sum + r.remainingBalance,
        0
      )
    }

    // Pending cash allocation reports — only for users with explicit cash_allocation.approve system permission
    // (excludes business owners/managers who run EOD but don't reconcile)
    const canApproveCashAllocation = sysAdmin || await hasSystemPermission(user.id, 'cash_allocation.approve')
    let pendingCashAllocations: object[] = []
    if (canApproveCashAllocation) {
      pendingCashAllocations = await prisma.cashAllocationReport.findMany({
        where: { status: { in: ['DRAFT', 'IN_PROGRESS'] }, lineItems: { some: {} } },
        select: {
          id: true,
          reportDate: true,
          status: true,
          isGrouped: true,
          createdAt: true,
          business: { select: { id: true, name: true, type: true } },
          groupedRun: { select: { id: true, totalCashReceived: true, dates: { select: { date: true } } } },
          _count: { select: { lineItems: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      // Sum reportedAmount per report from line items
      if ((pendingCashAllocations as any[]).length > 0) {
        const reportIds = (pendingCashAllocations as any[]).map((r: any) => r.id)
        const lineTotals = await prisma.cashAllocationLineItem.groupBy({
          by: ['reportId'],
          where: { reportId: { in: reportIds } },
          _sum: { reportedAmount: true },
        })
        const totalByReport: Record<string, number> = Object.fromEntries(
          lineTotals.map((t) => [t.reportId, Number(t._sum.reportedAmount ?? 0)])
        )
        pendingCashAllocations = (pendingCashAllocations as any[]).map((r: any) => ({
          ...r,
          totalReported: totalByReport[r.id] ?? 0,
        }))
      }
    }

    // My own APPROVED payments — cashier has approved, requester needs to collect cash
    const myApprovedPayments = await prisma.expenseAccountPayments.findMany({
      where: { status: 'APPROVED', createdBy: user.id },
      select: {
        id: true,
        amount: true,
        notes: true,
        updatedAt: true,
        category: { select: { name: true } },
        expenseAccount: { select: { business: { select: { name: true } } } },
        payeeUser: { select: { name: true } },
        payeeEmployee: { select: { fullName: true, phone: true } },
        payeePerson: { select: { fullName: true, phone: true } },
        payeeSupplier: { select: { name: true, phone: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })
    const myApprovedPaymentsMapped = myApprovedPayments.map((p: any) => {
      const payeeName = p.payeeEmployee?.fullName ?? p.payeePerson?.fullName ?? p.payeeSupplier?.name ?? p.payeeUser?.name ?? null
      const payeePhone = p.payeeEmployee?.phone ?? p.payeePerson?.phone ?? p.payeeSupplier?.phone ?? null
      return {
        id: p.id,
        amount: Number(p.amount),
        notes: p.notes ?? null,
        categoryName: p.category?.name ?? null,
        businessName: p.expenseAccount?.business?.name ?? '—',
        approvedAt: p.updatedAt?.toISOString() ?? null,
        payeeName,
        payeePhone,
      }
    })

    // My own pending payment requests (QUEUED/REQUEST) — always shown so submitters can track their status
    const myQueuedGrouped = await prisma.expenseAccountPayments.groupBy({
      by: ['expenseAccountId'],
      where: { status: { in: ['QUEUED', 'REQUEST'] }, createdBy: user.id },
      _count: { id: true },
      _sum: { amount: true },
    })
    let myPendingPayments: object[] = []
    if (myQueuedGrouped.length > 0) {
      const myAccountIds = myQueuedGrouped.map((g) => g.expenseAccountId)
      const myAccounts = await prisma.expenseAccounts.findMany({
        where: { id: { in: myAccountIds } },
        select: { id: true, accountName: true, accountNumber: true, business: { select: { id: true, name: true } } },
      })
      myPendingPayments = myAccounts.map((acct) => ({
        ...acct,
        requestCount: myQueuedGrouped.find((g) => g.expenseAccountId === acct.id)?._count.id ?? 0,
        totalAmount: Number(myQueuedGrouped.find((g) => g.expenseAccountId === acct.id)?._sum.amount ?? 0),
      }))
    }

    // Pending EOD payment batches — for users with canSubmitPaymentBatch
    // Each item is a PENDING_REVIEW EODPaymentBatch waiting for cashier review
    let pendingPaymentBatches: object[] = []
    // Also keep legacy QUEUED/REQUEST count for backward compat with older sidebar code
    let pendingPaymentRequests: object[] = []
    if (sysAdmin || permissions.canSubmitPaymentBatch) {
      // Only show batches that have payments NOT submitted by the current user
      // (submitters should not see their own requests in the bell)
      pendingPaymentBatches = await prisma.eODPaymentBatch.findMany({
        where: { status: 'PENDING_REVIEW', payments: { some: { createdBy: { not: user.id } } } },
        select: {
          id: true,
          eodDate: true,
          business: { select: { id: true, name: true, type: true } },
          _count: { select: { payments: true } },
          payments: { select: { amount: true } },
        },
        orderBy: { eodDate: 'asc' },
      })
      // Compute totalAmount per batch
      pendingPaymentBatches = (pendingPaymentBatches as any[]).map((b: any) => ({
        ...b,
        totalAmount: (b.payments as any[]).reduce((s: number, p: any) => s + Number(p.amount), 0),
        payments: undefined,
      }))

      // Legacy: accounts with QUEUED/REQUEST payments not yet batched
      // Exclude payments submitted by the current user — submitters should not see their own requests
      const grouped = await prisma.expenseAccountPayments.groupBy({
        by: ['expenseAccountId'],
        where: { status: { in: ['QUEUED', 'REQUEST'] }, createdBy: { not: user.id } },
        _count: { id: true },
        _sum: { amount: true },
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
          totalAmount: Number(grouped.find((g) => g.expenseAccountId === acct.id)?._sum.amount ?? 0),
        }))
      }
    }

    const total =
      (loanLockRequests as unknown[]).length +
      (pendingSupplierPayments as unknown[]).length +
      (pendingPettyCash as unknown[]).length +
      (outstandingPettyCash as unknown[]).length +
      (pendingCashAllocations as unknown[]).length +
      (pendingPaymentBatches as unknown[]).length +
      (pendingPaymentRequests as unknown[]).length +
      (myPendingPayments as unknown[]).length +
      myApprovedPaymentsMapped.length

    return NextResponse.json({
      loanLockRequests,
      pendingSupplierPayments,
      pendingPettyCash,
      outstandingPettyCash,
      outstandingPettyCashTotal,
      pendingCashAllocations,
      pendingPaymentBatches,
      pendingPaymentRequests,
      myPendingPayments,
      myApprovedPayments: myApprovedPaymentsMapped,
      canApprovePettyCash,
      canApproveCashAlloc: canApproveCashAllocation,
      total,
    })
  } catch (error) {
    console.error('GET /api/admin/pending-actions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
