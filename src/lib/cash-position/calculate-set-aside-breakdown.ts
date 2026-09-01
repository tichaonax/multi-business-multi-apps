import { prisma } from '@/lib/prisma'

/**
 * MBM-287 plan §2.1: "Set Aside" as a per-purpose table rather than one
 * number — This Period / Lifetime Contributed / Lifetime Disbursed / Still
 * Available, for each contribution purpose (Payroll, Rent, Stock, Savings,
 * ...). Unbounded — no time cutoff — since period and lifetime are shown
 * side by side rather than one figure trying to approximate both (this
 * supersedes the old rolling 7-day earmark window for this calculation).
 *
 * Purpose grouping: PAYROLL_FUNDING is its own distinct entryType; every
 * other CASH_ALLOCATION entry is grouped by its `notes` field, the existing
 * de facto purpose label (same field GET /api/cash-bucket's allocation
 * breakdown already groups by) — free-text today, see the plan's
 * follow-up note about a future reusable-purpose-list fast-follow.
 */

export interface SetAsideRow {
  purpose: string
  entryType: 'PAYROLL_FUNDING' | 'CASH_ALLOCATION'
  thisPeriod: number
  lifetimeContributed: number
  lifetimeDisbursed: number
  stillAvailable: number
}

export async function calculateSetAsideBreakdown(params: {
  businessIds?: string[]
  periodStart: Date
  periodEnd: Date
}): Promise<SetAsideRow[]> {
  const { businessIds, periodStart, periodEnd } = params
  const baseWhere = {
    paymentChannel: 'CASH',
    deletedAt: null,
    direction: 'OUTFLOW' as const,
    ...(businessIds && businessIds.length > 0 ? { businessId: { in: businessIds } } : {}),
  }

  const [payrollThisPeriod, payrollLifetime, allocThisPeriod, allocLifetime, totalDisbursed] = await Promise.all([
    prisma.cashBucketEntry.aggregate({
      where: { ...baseWhere, entryType: 'PAYROLL_FUNDING', entryDate: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
    }),
    prisma.cashBucketEntry.aggregate({
      where: { ...baseWhere, entryType: 'PAYROLL_FUNDING', entryDate: { lt: periodEnd } },
      _sum: { amount: true },
    }),
    prisma.cashBucketEntry.groupBy({
      by: ['notes'] as any,
      where: { ...baseWhere, entryType: 'CASH_ALLOCATION', entryDate: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
    }),
    prisma.cashBucketEntry.groupBy({
      by: ['notes'] as any,
      where: { ...baseWhere, entryType: 'CASH_ALLOCATION', entryDate: { lt: periodEnd } },
      _sum: { amount: true },
    }),
    // Disbursement is tracked as a single "money that left the box" total,
    // not tagged to a specific allocation purpose in CashBucketEntry itself
    // — net it against purposes largest-first, same technique the existing
    // allocation-detail endpoint already uses, so purposes don't go negative.
    prisma.cashBucketEntry.aggregate({
      where: { ...baseWhere, entryType: 'PAYMENT_APPROVAL', entryDate: { lt: periodEnd } },
      _sum: { amount: true },
    }),
  ])

  const rows: SetAsideRow[] = []

  const payrollLifetimeAmt = Number(payrollLifetime._sum.amount ?? 0)
  rows.push({
    purpose: 'Payroll',
    entryType: 'PAYROLL_FUNDING',
    thisPeriod: Number(payrollThisPeriod._sum.amount ?? 0),
    lifetimeContributed: payrollLifetimeAmt,
    lifetimeDisbursed: 0, // filled in by the netting pass below
    stillAvailable: payrollLifetimeAmt,
  })

  const allocThisPeriodMap = new Map((allocThisPeriod as any[]).map(r => [r.notes ?? 'Unspecified', Number(r._sum.amount ?? 0)]))
  for (const r of allocLifetime as any[]) {
    const purpose = r.notes ?? 'Unspecified'
    const lifetimeContributed = Number(r._sum.amount ?? 0)
    rows.push({
      purpose,
      entryType: 'CASH_ALLOCATION',
      thisPeriod: allocThisPeriodMap.get(purpose) ?? 0,
      lifetimeContributed,
      lifetimeDisbursed: 0,
      stillAvailable: lifetimeContributed,
    })
  }

  // Net total disbursements (PAYMENT_APPROVAL cash outflow) against purposes,
  // largest lifetime-contributed first — mirrors GET /api/cash-bucket's
  // existing reduction technique for its (now-superseded) windowed version.
  let remaining = Number(totalDisbursed._sum.amount ?? 0)
  const sorted = [...rows].sort((a, b) => b.lifetimeContributed - a.lifetimeContributed)
  for (const row of sorted) {
    if (remaining <= 0) break
    const reduction = Math.min(row.lifetimeContributed, remaining)
    row.lifetimeDisbursed = reduction
    row.stillAvailable = row.lifetimeContributed - reduction
    remaining -= reduction
  }

  return rows
    .filter(r => r.lifetimeContributed > 0.009 || r.thisPeriod > 0.009)
    .sort((a, b) => b.lifetimeContributed - a.lifetimeContributed)
}
