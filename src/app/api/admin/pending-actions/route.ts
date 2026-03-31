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
    const canRequestPettyCash = canApprovePettyCash || await hasSystemPermission(user.id, 'petty_cash.request')
    if (canApprovePettyCash) {
      pendingPettyCash = await prisma.pettyCashRequests.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          requestedAmount: true,
          purpose: true,
          notes: true,
          requestedAt: true,
          paymentChannel: true,
          priority: true,
          requester: { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: 'desc' }, { requestedAt: 'asc' }],
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
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      pendingCashAllocations = await prisma.cashAllocationReport.findMany({
        where: { status: { in: ['DRAFT', 'IN_PROGRESS'] }, createdAt: { gte: fourteenDaysAgo } },
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

      if ((pendingCashAllocations as any[]).length > 0) {
        const reportIds = (pendingCashAllocations as any[]).map((r: any) => r.id)

        // Sum reportedAmount per report from line items (expense account deposits)
        const lineTotals = await prisma.cashAllocationLineItem.groupBy({
          by: ['reportId'],
          where: { reportId: { in: reportIds } },
          _sum: { reportedAmount: true },
        })
        const totalByReport: Record<string, number> = Object.fromEntries(
          lineTotals.map((t) => [t.reportId, Number(t._sum.reportedAmount ?? 0)])
        )

        // Add payroll EOD contributions to totalByReport
        const dailyReports = (pendingCashAllocations as any[]).filter(
          (r: any) => !r.isGrouped && r.reportDate && r.business?.id
        )
        if (dailyReports.length > 0) {
          const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          const payrollDeposits = await prisma.payrollAccountDeposits.findMany({
            where: {
              businessId: { in: dailyReports.map((r: any) => r.business.id) },
              transactionType: 'EOD_AUTO_CONTRIBUTION',
              depositDate: { gte: twoWeeksAgo },
            },
            select: { businessId: true, depositDate: true, amount: true },
          })
          for (const r of dailyReports) {
            const reportDateStr = new Date(r.reportDate).toISOString().split('T')[0]
            const match = payrollDeposits.find((pd) => {
              const pdDateStr = new Date(pd.depositDate).toISOString().split('T')[0]
              return pd.businessId === r.business.id && pdDateStr === reportDateStr
            })
            if (match) {
              totalByReport[r.id] = (totalByReport[r.id] ?? 0) + Number(match.amount)
            }
          }
        }

        // For daily (non-grouped) reports: fetch cashCounted from the matching EOD SavedReport
        // This is the expected cashbox deposit (cash Letwin hands to cashier)
        const cashCountedByKey: Record<string, number | null> = {}
        if (dailyReports.length > 0) {
          const savedReports = await prisma.savedReports.findMany({
            where: {
              reportType: 'END_OF_DAY',
              OR: dailyReports.map((r: any) => ({
                businessId: r.business.id,
                reportDate: new Date(r.reportDate),
              })),
            },
            select: { businessId: true, reportDate: true, cashCounted: true },
          })
          savedReports.forEach((sr) => {
            const key = `${sr.businessId}_${new Date(sr.reportDate).toISOString().split('T')[0]}`
            cashCountedByKey[key] = sr.cashCounted !== null ? Number(sr.cashCounted) : null
          })
        }

        pendingCashAllocations = (pendingCashAllocations as any[]).map((r: any) => {
          let cashboxDeposit: number | null = null
          if (r.isGrouped) {
            // Grouped: totalCashReceived is the cash handed over
            cashboxDeposit = r.groupedRun?.totalCashReceived ?? null
          } else if (r.reportDate && r.business?.id) {
            const key = `${r.business.id}_${new Date(r.reportDate).toISOString().split('T')[0]}`
            cashboxDeposit = cashCountedByKey[key] ?? null
          }
          return {
            ...r,
            totalReported: totalByReport[r.id] ?? 0,
            cashboxDeposit,
          }
        })
      }
    }

    // My own APPROVED petty cash requests — approved by cashier, requester needs to collect cash
    const myApprovedPettyCash = await prisma.pettyCashRequests.findMany({
      where: { status: 'APPROVED', requestedBy: user.id },
      select: {
        id: true,
        purpose: true,
        approvedAmount: true,
        approvedAt: true,
        business: { select: { name: true } },
      },
      orderBy: { approvedAt: 'desc' },
      take: 20,
    })

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

    // My own pending payment requests — shown so submitters can track their status.
    // Includes QUEUED/REQUEST (pre-EOD) and PENDING_APPROVAL (picked up by EOD batch, awaiting cashier).
    const myQueuedGrouped = await prisma.expenseAccountPayments.groupBy({
      by: ['expenseAccountId', 'status'],
      where: { status: { in: ['QUEUED', 'REQUEST', 'PENDING_APPROVAL'] }, createdBy: user.id, paymentType: { notIn: ['LOAN_REPAYMENT', 'LOAN_EXPENSE'] } },
      _count: { id: true },
      _sum: { amount: true },
    })
    let myPendingPayments: object[] = []
    if (myQueuedGrouped.length > 0) {
      const myAccountIds = [...new Set(myQueuedGrouped.map((g) => g.expenseAccountId))]
      const myAccounts = await prisma.expenseAccounts.findMany({
        where: { id: { in: myAccountIds } },
        select: { id: true, accountName: true, accountNumber: true, business: { select: { id: true, name: true } } },
      })
      myPendingPayments = myAccounts.map((acct) => {
        const rows = myQueuedGrouped.filter((g) => g.expenseAccountId === acct.id)
        const requestCount = rows.reduce((s, r) => s + r._count.id, 0)
        const totalAmount = rows.reduce((s, r) => s + Number(r._sum.amount ?? 0), 0)
        const awaitingCashier = rows.some((r) => r.status === 'PENDING_APPROVAL')
        return { ...acct, requestCount, totalAmount, awaitingCashier }
      })
    }

    // Pending meal program batch payments — QUEUED MEAL_BATCH payments awaiting cashier approval
    // Each is a consolidated EOD batch (one per expense account per day)
    let pendingMealPrograms: object[] = []
    if (sysAdmin || permissions.canSubmitPaymentBatch) {
      const mealBatches = await prisma.expenseAccountPayments.findMany({
        where: {
          status: 'QUEUED',
          paymentType: 'MEAL_BATCH',
        },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          notes: true,
          expenseAccountId: true,
        },
        orderBy: { paymentDate: 'asc' },
      })
      if (mealBatches.length > 0) {
        const mealAccountIds = [...new Set(mealBatches.map((b) => b.expenseAccountId))]
        const mealAccounts = await prisma.expenseAccounts.findMany({
          where: { id: { in: mealAccountIds } },
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            business: { select: { id: true, name: true } },
          },
        })
        pendingMealPrograms = mealBatches.map((batch) => {
          const acct = mealAccounts.find((a) => a.id === batch.expenseAccountId)
          return {
            ...acct,
            batchPaymentId: batch.id,
            paymentCount: 1,
            totalAmount: Number(batch.amount),
            paymentDate: batch.paymentDate,
            notes: batch.notes,
          }
        })
      }
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
          payments: { select: { amount: true, paymentChannel: true, paymentType: true } },
        },
        orderBy: { eodDate: 'asc' },
      })
      // Compute totalAmount and per-channel counts per batch, excluding LOAN_REPAYMENT entries
      pendingPaymentBatches = (pendingPaymentBatches as any[])
        .map((b: any) => {
          const actionable = (b.payments as any[]).filter((p: any) => p.paymentType !== 'LOAN_REPAYMENT' && p.paymentType !== 'LOAN_EXPENSE')
          return {
            ...b,
            totalAmount: actionable.reduce((s: number, p: any) => s + Number(p.amount), 0),
            cashCount: actionable.filter((p: any) => p.paymentChannel !== 'ECOCASH').length,
            ecocashCount: actionable.filter((p: any) => p.paymentChannel === 'ECOCASH').length,
            payments: undefined,
          }
        })
        .filter((b: any) => b.cashCount + b.ecocashCount > 0) // exclude batches with only loan repayments

      // Accounts with pending (QUEUED/REQUEST/SUBMITTED) payments awaiting cashier action
      // Exclude payments submitted by the current user — submitters should not see their own requests
      // Group by [expenseAccountId, paymentChannel, priority] to get per-channel + urgency counts
      const pendingPaymentWhere = {
        status: { in: ['QUEUED', 'REQUEST', 'SUBMITTED'] },
        createdBy: { not: user.id },
        paymentType: { notIn: ['LOAN_REPAYMENT', 'LOAN_EXPENSE', 'LOAN_DISBURSEMENT', 'TRANSFER_OUT', 'TRANSFER_RETURN'] },
      }
      const grouped = await prisma.expenseAccountPayments.groupBy({
        by: ['expenseAccountId', 'paymentChannel', 'priority'],
        where: pendingPaymentWhere,
        _count: { id: true },
        _sum: { amount: true },
      })
      if (grouped.length > 0) {
        const accountIds = [...new Set(grouped.map((g) => g.expenseAccountId))]
        const accounts = await prisma.expenseAccounts.findMany({
          where: { id: { in: accountIds } },
          select: {
            id: true,
            accountName: true,
            accountNumber: true,
            business: { select: { id: true, name: true } },
          },
        })

        // For accounts with exactly 1 pending payment, fetch its ID to enable deep-linking from the bell dropdown
        const singlePaymentMap: Record<string, string> = {}
        const singleAccountIds = accountIds.filter(aid => {
          const rows = grouped.filter(g => g.expenseAccountId === aid)
          return rows.reduce((s, r) => s + r._count.id, 0) === 1
        })
        if (singleAccountIds.length > 0) {
          const singlePayments = await prisma.expenseAccountPayments.findMany({
            where: { ...pendingPaymentWhere, expenseAccountId: { in: singleAccountIds } },
            select: { id: true, expenseAccountId: true },
          })
          singlePayments.forEach((p: any) => { singlePaymentMap[p.expenseAccountId] = p.id })
        }

        pendingPaymentRequests = accounts.map((acct) => {
          const rows = grouped.filter((g) => g.expenseAccountId === acct.id)
          const cashRows = rows.filter((g) => (g as any).paymentChannel !== 'ECOCASH')
          const ecocashRows = rows.filter((g) => (g as any).paymentChannel === 'ECOCASH')
          const urgentCount = rows.filter((g) => (g as any).priority === 'URGENT').reduce((s, r) => s + r._count.id, 0)
          return {
            ...acct,
            requestCount: rows.reduce((s, r) => s + r._count.id, 0),
            totalAmount: rows.reduce((s, r) => s + Number(r._sum.amount ?? 0), 0),
            cashCount: cashRows.reduce((s, r) => s + r._count.id, 0),
            ecocashCount: ecocashRows.reduce((s, r) => s + r._count.id, 0),
            urgentCount,
            singlePaymentId: singlePaymentMap[acct.id] ?? null,
          }
        })
        // Sort so accounts with urgent payments appear first
        pendingPaymentRequests = (pendingPaymentRequests as any[]).sort((a: any, b: any) => (b.urgentCount ?? 0) - (a.urgentCount ?? 0))
      }
    }

    // Pending bulk stock (stock-take) drafts — drafts started by the current user that are still DRAFT
    const stockTakeDraftRows = await prisma.stockTakeDrafts.findMany({
      where: { createdById: user.id, status: 'DRAFT' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: { select: { items: true } },
        business: { select: { id: true, name: true, type: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })
    const pendingStockTakeDrafts = (stockTakeDraftRows as any[]).map((d) => ({
      id: d.id,
      title: d.title ?? 'Untitled Stock Take',
      itemCount: d._count.items,
      updatedAt: d.updatedAt.toISOString(),
      businessId: d.business?.id ?? null,
      businessName: d.business?.name ?? '—',
      businessType: d.business?.type ?? 'clothing',
    }))

    const total =
      (loanLockRequests as unknown[]).length +
      (pendingSupplierPayments as unknown[]).length +
      (pendingPettyCash as unknown[]).length +
      (outstandingPettyCash as unknown[]).length +
      (pendingCashAllocations as unknown[]).length +
      (pendingPaymentBatches as unknown[]).length +
      (pendingPaymentRequests as unknown[]).length +
      (pendingMealPrograms as unknown[]).length +
      (myPendingPayments as unknown[]).length +
      myApprovedPaymentsMapped.length +
      myApprovedPettyCash.length +
      pendingStockTakeDrafts.length

    return NextResponse.json({
      loanLockRequests,
      pendingSupplierPayments,
      pendingPettyCash,
      outstandingPettyCash,
      outstandingPettyCashTotal,
      pendingCashAllocations,
      pendingPaymentBatches,
      pendingPaymentRequests,
      pendingMealPrograms,
      myPendingPayments,
      myApprovedPayments: myApprovedPaymentsMapped,
      myApprovedPettyCash,
      pendingStockTakeDrafts,
      canApprovePettyCash,
      canRequestPettyCash,
      canApproveCashAlloc: canApproveCashAllocation,
      total,
    })
  } catch (error) {
    console.error('GET /api/admin/pending-actions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
