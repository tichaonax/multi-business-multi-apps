import { prisma } from '@/lib/prisma'

/**
 * MBM-287: the one shared definition of a business's cash position for a
 * given period — called by /api/cash-bucket, the dashboard, and the Cash
 * Position Report, so they can never silently disagree the way the
 * dashboard's own hand-written query and the Cash Bucket page's query used
 * to (see the plan doc's finding #2).
 *
 * Deliberately scoped to the CASH payment channel only, not CASH+ECOCASH
 * combined — this is a "physical cash box" model (Opening + In − Out =
 * Closing must hold exactly), and the existing Cash Bucket UI already
 * treats EcoCash as a separate wallet, not part of the cashbox. EcoCash
 * keeps its own separate figure wherever it's shown today; it's not mixed
 * into this waterfall.
 */

const CASH_IN_TYPES = ['EOD_RECEIPT', 'DIRECT_DEPOSIT', 'PETTY_CASH_RETURN', 'ECOCASH_CONVERSION']
const SET_ASIDE_TYPES = ['CASH_ALLOCATION', 'PAYROLL_FUNDING']
const EXPENSE_TYPES = ['PAYMENT_APPROVAL', 'PETTY_CASH']

export interface CashPositionRow {
  businessId: string
  businessName: string
  openingBalance: number
  cashIn: number
  setAside: number
  expenses: number
  // Net of any entryType outside the three named buckets above (e.g.
  // MANUAL_ADJUSTMENT) within the period — keeps closingBalance exactly
  // reconciling (Opening + In − SetAside − Expenses + Adjustments =
  // Closing) no matter what entry types exist, including ones not
  // explicitly enumerated here. Usually zero; shown as its own line only
  // when non-zero rather than silently folded into another bucket.
  adjustments: number
  closingBalance: number
  currentlyEarmarked: number
  availableBalance: number
}

export interface CashPositionResult {
  businesses: CashPositionRow[]
  combined: Omit<CashPositionRow, 'businessId' | 'businessName'>
}

async function sumEntries(params: {
  businessIds?: string[]
  entryDateWhere?: { lt?: Date; gte?: Date }
  entryTypes?: string[]
  direction?: 'INFLOW' | 'OUTFLOW'
}) {
  const { businessIds, entryDateWhere, entryTypes, direction } = params
  const rows = await prisma.cashBucketEntry.groupBy({
    by: ['businessId'] as any,
    where: {
      paymentChannel: 'CASH',
      deletedAt: null,
      ...(businessIds && businessIds.length > 0 ? { businessId: { in: businessIds } } : {}),
      ...(entryDateWhere ? { entryDate: entryDateWhere } : {}),
      ...(entryTypes ? { entryType: { in: entryTypes } } : {}),
      ...(direction ? { direction } : {}),
    },
    _sum: { amount: true },
  })
  const map = new Map<string, number>()
  for (const r of rows as any[]) map.set(r.businessId, Number(r._sum.amount ?? 0))
  return map
}

/**
 * "Currently earmarked" — allocations (CASH_ALLOCATION + PAYROLL_FUNDING)
 * not yet matched by a corresponding PAYMENT_APPROVAL disbursement, as of
 * `asOf` — unbounded, no time cutoff (see plan §2.1: shown alongside period
 * figures now, so it no longer needs an arbitrary window to stay "close
 * enough"). Nets the largest allocations against disbursed amounts first,
 * same technique GET /api/cash-bucket already used under the old window.
 */
async function currentlyEarmarked(businessIds: string[] | undefined, asOf: Date): Promise<Map<string, number>> {
  const [allocated, disbursed] = await Promise.all([
    sumEntries({ businessIds, entryDateWhere: { lt: asOf }, entryTypes: SET_ASIDE_TYPES, direction: 'OUTFLOW' }),
    sumEntries({ businessIds, entryDateWhere: { lt: asOf }, entryTypes: ['PAYMENT_APPROVAL'], direction: 'OUTFLOW' }),
  ])
  const result = new Map<string, number>()
  for (const [businessId, allocatedTotal] of allocated) {
    const disbursedTotal = disbursed.get(businessId) ?? 0
    result.set(businessId, Math.max(0, allocatedTotal - disbursedTotal))
  }
  return result
}

export async function calculateCashPosition(params: {
  businessIds?: string[] // undefined/empty = all businesses with any activity
  periodStart: Date
  periodEnd: Date // exclusive — pass "start of day after the last included day"
}): Promise<CashPositionResult> {
  const { businessIds, periodStart, periodEnd } = params

  // Opening balance needs INFLOW minus OUTFLOW for everything before the
  // period, not a plain sum — computed as two directional sums. periodIn/
  // periodOut (unrestricted by entryType) are the source of truth for the
  // period's net movement; cashIn/setAside/expenses are just the named
  // breakdown of it, with `adjustments` catching whatever those three don't
  // (see the field's own comment) so the totals always reconcile exactly.
  const [openingIn, openingOut, periodIn, periodOut, cashIn, setAside, expenses, earmarked] = await Promise.all([
    sumEntries({ businessIds, entryDateWhere: { lt: periodStart }, direction: 'INFLOW' }),
    sumEntries({ businessIds, entryDateWhere: { lt: periodStart }, direction: 'OUTFLOW' }),
    sumEntries({ businessIds, entryDateWhere: { gte: periodStart, lt: periodEnd }, direction: 'INFLOW' }),
    sumEntries({ businessIds, entryDateWhere: { gte: periodStart, lt: periodEnd }, direction: 'OUTFLOW' }),
    sumEntries({ businessIds, entryDateWhere: { gte: periodStart, lt: periodEnd }, entryTypes: CASH_IN_TYPES, direction: 'INFLOW' }),
    sumEntries({ businessIds, entryDateWhere: { gte: periodStart, lt: periodEnd }, entryTypes: SET_ASIDE_TYPES, direction: 'OUTFLOW' }),
    sumEntries({ businessIds, entryDateWhere: { gte: periodStart, lt: periodEnd }, entryTypes: EXPENSE_TYPES, direction: 'OUTFLOW' }),
    currentlyEarmarked(businessIds, periodEnd),
  ])

  const allBusinessIds = new Set<string>([
    ...openingIn.keys(), ...openingOut.keys(), ...periodIn.keys(), ...periodOut.keys(), ...earmarked.keys(),
  ])
  if (businessIds && businessIds.length > 0) {
    for (const id of businessIds) allBusinessIds.add(id)
  }

  const businesses = await prisma.businesses.findMany({
    where: { id: { in: [...allBusinessIds] } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(businesses.map(b => [b.id, b.name]))

  const rows: CashPositionRow[] = [...allBusinessIds].map(businessId => {
    const openingBalance = (openingIn.get(businessId) ?? 0) - (openingOut.get(businessId) ?? 0)
    const periodNet = (periodIn.get(businessId) ?? 0) - (periodOut.get(businessId) ?? 0)
    const cashInAmt = cashIn.get(businessId) ?? 0
    const setAsideAmt = setAside.get(businessId) ?? 0
    const expensesAmt = expenses.get(businessId) ?? 0
    const adjustments = periodNet - (cashInAmt - setAsideAmt - expensesAmt)
    const closingBalance = openingBalance + periodNet
    const earmarkedAmt = earmarked.get(businessId) ?? 0
    return {
      businessId,
      businessName: nameMap.get(businessId) ?? 'Unknown Business',
      openingBalance,
      cashIn: cashInAmt,
      setAside: setAsideAmt,
      expenses: expensesAmt,
      adjustments,
      closingBalance,
      currentlyEarmarked: earmarkedAmt,
      availableBalance: closingBalance - earmarkedAmt,
    }
  }).sort((a, b) => a.businessName.localeCompare(b.businessName))

  const combined = rows.reduce((acc, r) => ({
    openingBalance: acc.openingBalance + r.openingBalance,
    cashIn: acc.cashIn + r.cashIn,
    setAside: acc.setAside + r.setAside,
    expenses: acc.expenses + r.expenses,
    adjustments: acc.adjustments + r.adjustments,
    closingBalance: acc.closingBalance + r.closingBalance,
    currentlyEarmarked: acc.currentlyEarmarked + r.currentlyEarmarked,
    availableBalance: acc.availableBalance + r.availableBalance,
  }), { openingBalance: 0, cashIn: 0, setAside: 0, expenses: 0, adjustments: 0, closingBalance: 0, currentlyEarmarked: 0, availableBalance: 0 })

  return { businesses: rows, combined }
}
