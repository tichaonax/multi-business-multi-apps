import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { getGlobalPayrollAccount } from '@/lib/payroll-account-utils'

/**
 * GET /api/dashboard/eod-accounts
 *
 * Returns the current balance for each EOD auto-deposit account (excluding rent) and
 * the cumulative payroll contribution, per business.
 *
 * Account balance = the expense account's actual current balance (deposits minus any
 * payments already made from it — e.g. a loan repayment sent to the loan owner debits
 * this figure, same as it debits the account itself). Previously this summed historical
 * cashAllocationLineItem.actualAmount instead, which only ever grew and never reflected
 * money that had since been paid back out — showing an inflated "balance" even after a
 * loan had been fully repaid.
 *
 * Payroll cash contribution = SUM of EOD_AUTO_CONTRIBUTION (plus any MANUAL_ADJUSTMENT
 * correction — see /api/payroll/account/adjust-business-contribution) payrollAccountDeposits
 * for that business. Unlike a per-business expense account, the payroll account is one
 * shared global account — there's no per-business "payroll balance" to read, so this
 * stays a cumulative contribution figure rather than a net balance.
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userBusinessIds = user.businessMemberships?.map((m: any) => m.businessId) || []

    let accessibleBusinessIds: string[] = []
    if (isSystemAdmin(user)) {
      const businesses = await prisma.businesses.findMany({
        where: { isActive: true, isUmbrellaBusiness: false },
        select: { id: true },
      })
      accessibleBusinessIds = businesses.map(b => b.id)
    } else {
      accessibleBusinessIds = userBusinessIds.filter((id: string) =>
        hasPermission(user, 'canAccessFinancialData', id)
      )
    }

    if (accessibleBusinessIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Get rent account IDs to exclude
    const rentConfigs = await prisma.businessRentConfig.findMany({
      where: { businessId: { in: accessibleBusinessIds }, isActive: true },
      select: { expenseAccountId: true },
    })
    const rentAccountIds = new Set(rentConfigs.map(r => r.expenseAccountId))

    // Get EOD auto-deposit configs (excluding rent) for accessible businesses
    const configs = await prisma.expenseAccountAutoDeposit.findMany({
      where: {
        businessId: { in: accessibleBusinessIds },
        isActive: true,
        expenseAccountId: { notIn: Array.from(rentAccountIds) },
      },
      select: {
        businessId: true,
        dailyAmount: true,
        expenseAccount: {
          select: { id: true, accountName: true, accountNumber: true, balance: true, isLoanAccount: true },
        },
        business: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    })

    const relevantAccountIds = configs.map(c => c.expenseAccount.id)

    // For loan accounts, fetch the loan's lock-time balance snapshot + status so we can
    // compute "available to withdraw" the same way the loan detail page and withdrawal
    // request routes do: |lockedBalance| - |currentBalance|. Only meaningful once LOCKED —
    // withdrawal requests aren't allowed before that (see withdrawal-requests/route.ts).
    const loanAccountIds = configs.filter(c => c.expenseAccount.isLoanAccount).map(c => c.expenseAccount.id)
    const loans = loanAccountIds.length > 0
      ? await prisma.businessLoan.findMany({
          where: { expenseAccountId: { in: loanAccountIds } },
          select: { expenseAccountId: true, status: true, lockedBalance: true },
        })
      : []
    const loanInfoByAccountId = new Map(
      loans.filter(l => l.expenseAccountId).map(l => [l.expenseAccountId as string, l])
    )

    // Sum actualAmount from LOCKED cash allocation line items per expense account, per
    // contributing business. Used ONLY for the shared-account "who contributed how much"
    // breakdown below — a historical attribution figure, not a live balance. The headline
    // number per account uses the account's real current balance (see configs loop below).
    const lineItems = relevantAccountIds.length > 0
      ? await prisma.cashAllocationLineItem.findMany({
          where: {
            expenseAccountId: { in: relevantAccountIds },
            actualAmount: { not: null },
            report: { status: 'LOCKED' },
          },
          select: {
            expenseAccountId: true,
            actualAmount: true,
            report: { select: { businessId: true } },
          },
        })
      : []

    const cashBoxByAccountId = new Map<string, number>()
    // Per-business contribution: Map<accountId, Map<businessId, amount>>
    const cashBoxByAccountAndBiz = new Map<string, Map<string, number>>()
    for (const li of lineItems) {
      const accountId = li.expenseAccountId
      const bizId = li.report?.businessId
      const amount = Number(li.actualAmount)
      cashBoxByAccountId.set(accountId, (cashBoxByAccountId.get(accountId) ?? 0) + amount)
      if (bizId) {
        if (!cashBoxByAccountAndBiz.has(accountId)) cashBoxByAccountAndBiz.set(accountId, new Map())
        const bizMap = cashBoxByAccountAndBiz.get(accountId)!
        bizMap.set(bizId, (bizMap.get(bizId) ?? 0) + amount)
      }
    }

    // Sum EOD payroll contributions per business (cash set aside for payroll)
    const payrollRows = await prisma.payrollAccountDeposits.groupBy({
      by: ['businessId'],
      where: {
        businessId: { in: accessibleBusinessIds },
        transactionType: { in: ['EOD_AUTO_CONTRIBUTION', 'MANUAL_ADJUSTMENT'] },
      },
      _sum: { amount: true },
    })
    const payrollCashByBusiness = new Map(
      payrollRows.map(r => [r.businessId, Number(r._sum.amount ?? 0)])
    )

    // Build per-business groups
    const byBusiness = new Map<string, {
      business: { id: string; name: string; type: string }
      accounts: {
        id: string
        accountName: string
        dailyAmount: number
        cashBoxBalance: number
        isLoanAccount: boolean
        loanBalanceOwed?: number
        availableToWithdraw?: number
        loanStatus?: string
      }[]
      payrollCashBox: number
      canViewPayroll: boolean
    }>()

    for (const c of configs) {
      const bizId = c.businessId
      if (!byBusiness.has(bizId)) {
        byBusiness.set(bizId, {
          business: c.business,
          accounts: [],
          payrollCashBox: payrollCashByBusiness.get(bizId) ?? 0,
          canViewPayroll: isSystemAdmin(user) || hasPermission(user, 'canAccessPayroll', bizId),
        })
      }

      const currentBalance = Number(c.expenseAccount.balance)
      const loanInfo = c.expenseAccount.isLoanAccount ? loanInfoByAccountId.get(c.expenseAccount.id) : undefined

      if (loanInfo) {
        // Loan account: show the actual amount still owed (informational) and, once
        // LOCKED, the accumulated holding-bucket amount ready to be requested this cycle —
        // same formula used by the loan detail page and withdrawal request routes.
        const loanBalanceOwed = Math.abs(currentBalance)
        const availableToWithdraw = loanInfo.status === 'LOCKED'
          ? Math.max(0, Math.abs(Number(loanInfo.lockedBalance ?? 0)) - Math.abs(currentBalance))
          : undefined

        byBusiness.get(bizId)!.accounts.push({
          id: c.expenseAccount.id,
          accountName: c.expenseAccount.accountName,
          dailyAmount: Number(c.dailyAmount),
          // Headline figure = what's actually ready to request, not the raw (negative)
          // loan balance — matches the "holding bucket" concept this widget represents.
          cashBoxBalance: availableToWithdraw ?? 0,
          isLoanAccount: true,
          loanBalanceOwed,
          availableToWithdraw,
          loanStatus: loanInfo.status,
        })
      } else {
        byBusiness.get(bizId)!.accounts.push({
          id: c.expenseAccount.id,
          accountName: c.expenseAccount.accountName,
          dailyAmount: Number(c.dailyAmount),
          // Real current balance — nets out any payments already made from this account,
          // unlike the old ever-growing historical sum.
          cashBoxBalance: currentBalance,
          isLoanAccount: false,
        })
      }
    }

    // Add businesses that have payroll but no auto-deposit configs
    for (const [bizId, payrollAmount] of payrollCashByBusiness) {
      if (!byBusiness.has(bizId) && payrollAmount > 0) {
        const biz = await prisma.businesses.findUnique({
          where: { id: bizId },
          select: { id: true, name: true, type: true },
        })
        if (biz) {
          byBusiness.set(bizId, {
            business: biz,
            accounts: [],
            payrollCashBox: payrollAmount,
            canViewPayroll: isSystemAdmin(user) || hasPermission(user, 'canAccessPayroll', bizId),
          })
        }
      }
    }

    // Not `payrollCashBox > 0` — a manual correction (see
    // adjust-business-contribution) can legitimately leave this at exactly 0 or
    // negative, and hiding the group then would hide the only way to fix it. Every
    // business here already got added for a real reason (has accounts, or is a key
    // in payrollCashByBusiness — which only contains businesses with actual deposit
    // rows), so keep the group whenever payroll is even viewable for it.
    const allGroups = Array.from(byBusiness.values()).filter(
      g => g.accounts.length > 0 || g.canViewPayroll
    )

    // Detect shared accounts: expenseAccountIds that appear in more than one business group
    const accountIdCount = new Map<string, number>()
    for (const g of allGroups) {
      for (const a of g.accounts) {
        accountIdCount.set(a.id, (accountIdCount.get(a.id) ?? 0) + 1)
      }
    }
    const sharedAccountIds = new Set<string>(
      [...accountIdCount.entries()].filter(([, count]) => count > 1).map(([id]) => id)
    )

    // Build deduplicated sharedAccounts list (one entry per unique shared account)
    // Include per-business contributions so the UI can show which business contributes more
    const seenShared = new Set<string>()
    const sharedAccounts: {
      id: string
      accountName: string
      dailyAmount: number
      cashBoxBalance: number
      isLoanAccount: boolean
      loanBalanceOwed?: number
      availableToWithdraw?: number
      loanStatus?: string
      businessContributions: { businessId: string; businessName: string; cashBoxBalance: number }[]
    }[] = []
    for (const g of allGroups) {
      for (const a of g.accounts) {
        if (sharedAccountIds.has(a.id) && !seenShared.has(a.id)) {
          seenShared.add(a.id)
          const bizMap = cashBoxByAccountAndBiz.get(a.id)
          const contributions = bizMap
            ? [...bizMap.entries()]
                .map(([bizId, balance]) => ({
                  businessId: bizId,
                  businessName: allGroups.find(grp => grp.business.id === bizId)?.business.name ?? bizId,
                  cashBoxBalance: balance,
                }))
                .sort((x, y) => y.cashBoxBalance - x.cashBoxBalance)
            : []
          sharedAccounts.push({ ...a, businessContributions: contributions })
        }
      }
    }

    // Remove shared accounts from each business group and add per-business subtotal
    const groups = allGroups.map(g => ({
      ...g,
      accounts: g.accounts.filter(a => !sharedAccountIds.has(a.id)),
      // Payroll's cash box can't go below zero (see CashBox's neverNegative prop on the
      // dashboard widget) — clamp its contribution here too so this subtotal matches what
      // the individual cards on screen add up to.
      subtotal:
        g.accounts
          .filter(a => !sharedAccountIds.has(a.id))
          .reduce((s, a) => s + a.cashBoxBalance, 0) + Math.max(0, g.payrollCashBox),
    }))

    // Global payroll account balance — one shared account across every business, distinct
    // from the per-business "cumulative contribution" figures above (deposits minus ALL
    // payments, not just this business's share of them). Surfaced here so the same
    // correction available on the dedicated Payroll Account page doesn't require leaving
    // the dashboard (see MBM-269 follow-up).
    const canViewGlobalPayroll = isSystemAdmin(user) || userBusinessIds.some((id: string) => hasPermission(user, 'canAccessPayroll', id))
    let payrollAccount: { balance: number } | null = null
    if (canViewGlobalPayroll) {
      const account = await getGlobalPayrollAccount()
      if (account) {
        const [depositsAgg, paymentsAgg] = await Promise.all([
          prisma.payrollAccountDeposits.aggregate({ where: { payrollAccountId: account.id }, _sum: { amount: true } }),
          prisma.payrollAccountPayments.aggregate({ where: { payrollAccountId: account.id }, _sum: { amount: true } }),
        ])
        payrollAccount = {
          balance: Number(depositsAgg._sum.amount || 0) - Number(paymentsAgg._sum.amount || 0),
        }
      }
    }

    return NextResponse.json({
      success: true,
      sharedAccounts,
      data: groups,
      payrollAccount,
    })
  } catch (err) {
    console.error('[GET /api/dashboard/eod-accounts]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
