import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { getDayBoundaryInTimezone, getServerDefaultTimezone } from '@/lib/timezone-utils'
import { calculateCashPosition } from '@/lib/cash-position/calculate-cash-position'

/**
 * GET /api/dashboard/daily-business-summary
 *
 * Today/yesterday Sales (cash/EcoCash split), Expenses, and Set Aside per
 * business type — backs the homepage business cards' "Today"/"Yesterday"
 * drill-down rows. Deliberately reuses the exact same definitions each
 * figure already has elsewhere in the app, so a number shown here always
 * matches what the linked-to report shows:
 *   - Sales: same COMPLETED-orders-excluding-EXPENSE_ACCOUNT definition as
 *     calculateSalesPeriodComparison / /reports/daily-detail
 *   - Expenses: same PAID ExpenseAccountPayments definition as
 *     /reports/daily-detail
 *   - Set Aside: calculateCashPosition's `setAside` (CASH_ALLOCATION +
 *     PAYROLL_FUNDING), same as the Cash Position cards
 * `date` strings (YYYY-MM-DD) are also returned per period so callers can
 * build /reports/daily-detail links directly.
 */

interface DaySummary {
  date: string
  salesTotal: number
  cashSales: number
  ecocashSales: number
  expenses: number
  setAside: number
}

const EMPTY = (date: string): DaySummary => ({ date, salesTotal: 0, cashSales: 0, ecocashSales: 0, expenses: 0, setAside: 0 })

function addInto(target: DaySummary, src: DaySummary) {
  target.salesTotal += src.salesTotal
  target.cashSales += src.cashSales
  target.ecocashSales += src.ecocashSales
  target.expenses += src.expenses
  target.setAside += src.setAside
}

async function summarizeSalesByBusiness(businessIds: string[], start: Date, end: Date) {
  const map = new Map<string, { cash: number; ecocash: number }>()
  for (const id of businessIds) map.set(id, { cash: 0, ecocash: 0 })
  if (businessIds.length === 0) return map
  const rows = await prisma.businessOrders.groupBy({
    by: ['businessId', 'paymentMethod'] as any,
    where: {
      businessId: { in: businessIds },
      status: 'COMPLETED',
      paymentMethod: { not: 'EXPENSE_ACCOUNT' as any },
      createdAt: { gte: start, lt: end },
    },
    _sum: { totalAmount: true },
  })
  for (const r of rows as any[]) {
    const cur = map.get(r.businessId) ?? { cash: 0, ecocash: 0 }
    const amt = Number(r._sum.totalAmount ?? 0)
    if ((r.paymentMethod ?? '').toUpperCase() === 'ECOCASH') cur.ecocash += amt
    else cur.cash += amt
    map.set(r.businessId, cur)
  }
  return map
}

async function summarizeExpensesByBusiness(businessIds: string[], start: Date, end: Date) {
  const map = new Map<string, number>()
  if (businessIds.length === 0) return map
  const accounts = await prisma.expenseAccounts.findMany({
    where: { businessId: { in: businessIds } },
    select: { id: true, businessId: true },
  })
  if (accounts.length === 0) return map
  const acctToBiz = new Map(accounts.map(a => [a.id, a.businessId]))
  const rows = await prisma.expenseAccountPayments.groupBy({
    by: ['expenseAccountId'],
    where: {
      expenseAccountId: { in: accounts.map(a => a.id) },
      paymentDate: { gte: start, lt: end },
      status: 'PAID',
    },
    _sum: { amount: true },
  })
  for (const r of rows) {
    const biz = acctToBiz.get(r.expenseAccountId)
    if (!biz) continue
    map.set(biz, (map.get(biz) ?? 0) + Number(r._sum.amount ?? 0))
  }
  return map
}

async function summarizeDay(businessIds: string[], dateStr: string, start: Date, end: Date) {
  const [salesMap, expensesMap, cashPosition] = await Promise.all([
    summarizeSalesByBusiness(businessIds, start, end),
    summarizeExpensesByBusiness(businessIds, start, end),
    calculateCashPosition({ businessIds, periodStart: start, periodEnd: end }),
  ])
  const setAsideMap = new Map(cashPosition.businesses.map(b => [b.businessId, b.setAside]))

  const perBusiness = new Map<string, DaySummary>()
  for (const id of businessIds) {
    const sales = salesMap.get(id) ?? { cash: 0, ecocash: 0 }
    perBusiness.set(id, {
      date: dateStr,
      salesTotal: sales.cash + sales.ecocash,
      cashSales: sales.cash,
      ecocashSales: sales.ecocash,
      expenses: expensesMap.get(id) ?? 0,
      setAside: setAsideMap.get(id) ?? 0,
    })
  }
  return perBusiness
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let accessibleBusinesses: { id: string; type: string }[] = []
    if (isSystemAdmin(user)) {
      accessibleBusinesses = await prisma.businesses.findMany({
        where: { isActive: true },
        select: { id: true, type: true },
      })
    } else {
      const userBusinessIds = user.businessMemberships?.map(m => m.businessId) || []
      const all = userBusinessIds.length > 0
        ? await prisma.businesses.findMany({ where: { id: { in: userBusinessIds }, isActive: true }, select: { id: true, type: true } })
        : []
      accessibleBusinesses = all.filter(b => hasPermission(user, 'canAccessFinancialData', b.id))
    }

    const businessIds = accessibleBusinesses.map(b => b.id)
    const timezone = request.nextUrl.searchParams.get('timezone') || getServerDefaultTimezone()

    const now = new Date()
    const yesterdayRef = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const todayBoundary = getDayBoundaryInTimezone(timezone, now)
    const yesterdayBoundary = getDayBoundaryInTimezone(timezone, yesterdayRef)

    const [todayMap, yesterdayMap] = await Promise.all([
      summarizeDay(businessIds, todayBoundary.dateStr, todayBoundary.start, todayBoundary.end),
      summarizeDay(businessIds, yesterdayBoundary.dateStr, yesterdayBoundary.start, yesterdayBoundary.end),
    ])

    const byType: Record<string, { businessIds: string[]; today: DaySummary; yesterday: DaySummary }> = {}
    for (const b of accessibleBusinesses) {
      if (!byType[b.type]) {
        byType[b.type] = {
          businessIds: [],
          today: EMPTY(todayBoundary.dateStr),
          yesterday: EMPTY(yesterdayBoundary.dateStr),
        }
      }
      byType[b.type].businessIds.push(b.id)
      addInto(byType[b.type].today, todayMap.get(b.id) ?? EMPTY(todayBoundary.dateStr))
      addInto(byType[b.type].yesterday, yesterdayMap.get(b.id) ?? EMPTY(yesterdayBoundary.dateStr))
    }
    delete byType['umbrella']

    const all = {
      businessIds,
      today: EMPTY(todayBoundary.dateStr),
      yesterday: EMPTY(yesterdayBoundary.dateStr),
    }
    for (const type of Object.keys(byType)) {
      addInto(all.today, byType[type].today)
      addInto(all.yesterday, byType[type].yesterday)
    }

    return NextResponse.json({ success: true, byType, all })
  } catch (error) {
    console.error('Error building daily business summary:', error)
    return NextResponse.json({ error: 'Failed to build daily business summary' }, { status: 500 })
  }
}
