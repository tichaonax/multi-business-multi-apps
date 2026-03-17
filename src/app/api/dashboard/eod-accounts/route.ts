import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/dashboard/eod-accounts
 *
 * Returns the cumulative physical cash-box balance for each EOD auto-deposit
 * account (excluding rent) and for the payroll contribution, per business.
 *
 * Cash-box balance = SUM of actualAmount from LOCKED CashAllocationLineItem
 * records for that expense account (i.e. what cashiers have physically set aside).
 *
 * Payroll cash-box balance = SUM of EOD_AUTO_CONTRIBUTION payrollAccountDeposits
 * for that business (physical cash set aside for payroll).
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
          select: { id: true, accountName: true, accountNumber: true },
        },
        business: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    })

    const relevantAccountIds = configs.map(c => c.expenseAccount.id)

    // Sum actualAmount from LOCKED cash allocation line items per expense account
    // (this is the cumulative physical cash set aside in each box by cashiers)
    const lineItems = relevantAccountIds.length > 0
      ? await prisma.cashAllocationLineItem.findMany({
          where: {
            expenseAccountId: { in: relevantAccountIds },
            actualAmount: { not: null },
            report: { status: 'LOCKED' },
          },
          select: { expenseAccountId: true, actualAmount: true },
        })
      : []

    const cashBoxByAccountId = new Map<string, number>()
    for (const li of lineItems) {
      const prev = cashBoxByAccountId.get(li.expenseAccountId) ?? 0
      cashBoxByAccountId.set(li.expenseAccountId, prev + Number(li.actualAmount))
    }

    // Sum EOD payroll contributions per business (cash set aside for payroll)
    const payrollRows = await prisma.payrollAccountDeposits.groupBy({
      by: ['businessId'],
      where: {
        businessId: { in: accessibleBusinessIds },
        transactionType: 'EOD_AUTO_CONTRIBUTION',
      },
      _sum: { amount: true },
    })
    const payrollCashByBusiness = new Map(
      payrollRows.map(r => [r.businessId, Number(r._sum.amount ?? 0)])
    )

    // Build per-business groups
    const byBusiness = new Map<string, {
      business: { id: string; name: string; type: string }
      accounts: { id: string; accountName: string; dailyAmount: number; cashBoxBalance: number }[]
      payrollCashBox: number
    }>()

    for (const c of configs) {
      const bizId = c.businessId
      if (!byBusiness.has(bizId)) {
        byBusiness.set(bizId, {
          business: c.business,
          accounts: [],
          payrollCashBox: payrollCashByBusiness.get(bizId) ?? 0,
        })
      }
      byBusiness.get(bizId)!.accounts.push({
        id: c.expenseAccount.id,
        accountName: c.expenseAccount.accountName,
        dailyAmount: Number(c.dailyAmount),
        cashBoxBalance: cashBoxByAccountId.get(c.expenseAccount.id) ?? 0,
      })
    }

    // Add businesses that have payroll but no auto-deposit configs
    for (const [bizId, payrollAmount] of payrollCashByBusiness) {
      if (!byBusiness.has(bizId) && payrollAmount > 0) {
        const biz = await prisma.businesses.findUnique({
          where: { id: bizId },
          select: { id: true, name: true, type: true },
        })
        if (biz) {
          byBusiness.set(bizId, { business: biz, accounts: [], payrollCashBox: payrollAmount })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: Array.from(byBusiness.values()).filter(
        g => g.accounts.length > 0 || g.payrollCashBox > 0
      ),
    })
  } catch (err) {
    console.error('[GET /api/dashboard/eod-accounts]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
