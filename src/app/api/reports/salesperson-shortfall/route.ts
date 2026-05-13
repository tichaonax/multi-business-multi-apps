import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/reports/salesperson-shortfall
 *
 * Query params:
 *   businessId    required
 *   from          YYYY-MM-DD (default: 30 days ago)
 *   to            YYYY-MM-DD (default: today)
 *   salespersonId optional — filter to one person
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const salespersonId = searchParams.get('salespersonId') || undefined

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const perms = getEffectivePermissions(user, businessId)
    if (user.role !== 'admin' && !perms.canCloseBooks && !perms.canAccessFinancialData) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allTime = searchParams.get('allTime') === 'true'

    let dateFilter: { gte: Date; lte: Date } | undefined
    if (!allTime) {
      const toDate = to ? new Date(to) : new Date()
      toDate.setHours(23, 59, 59, 999)
      const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      fromDate.setHours(0, 0, 0, 0)
      dateFilter = { gte: fromDate, lte: toDate }
    }

    // Fetch salesperson EOD reports
    const spReports = await prisma.salespersonEodReport.findMany({
      where: {
        businessId,
        ...(dateFilter ? { reportDate: dateFilter } : {}),
        ...(salespersonId ? { salespersonId } : {}),
      },
      select: {
        id: true,
        salespersonId: true,
        reportDate: true,
        cashAmount: true,
        ecocashAmount: true,
        status: true,
        isManagerOverride: true,
        overrideReason: true,
        notes: true,
        submittedAt: true,
        salesperson: { select: { name: true } },
      },
      orderBy: [{ reportDate: 'desc' }, { salespersonId: 'asc' }],
    })

    // Fetch manager EOD reports for the same range (for expectedShare calc)
    const managerReports = await prisma.savedReports.findMany({
      where: {
        businessId,
        reportType: 'END_OF_DAY',
        ...(dateFilter ? { reportDate: dateFilter } : {}),
      },
      select: {
        id: true,
        reportDate: true,
        cashCounted: true,
        confirmedEcocashAmount: true,
        managerName: true,
        originalCashCounted: true,
        cashCountedModifiedAt: true,
        cashCountedModifiedByName: true,
        cashCountedModifiedReason: true,
      },
    })

    // Build manager report lookup: dateKey → manager data
    const managerByDate = new Map<string, { id: string; cashCounted: number; ecocashCounted: number; managerName: string; cashCountedAmended: boolean }>()
    for (const mr of managerReports) {
      const key = new Date(mr.reportDate).toISOString().slice(0, 10)
      managerByDate.set(key, {
        id: mr.id,
        cashCounted: mr.cashCounted !== null ? Number(mr.cashCounted) : 0,
        ecocashCounted: mr.confirmedEcocashAmount !== null ? Number(mr.confirmedEcocashAmount) : 0,
        managerName: mr.managerName,
        cashCountedAmended: mr.originalCashCounted !== null,
        originalCashCounted: mr.originalCashCounted !== null ? Number(mr.originalCashCounted) : null,
        cashCountedModifiedAt: mr.cashCountedModifiedAt ? mr.cashCountedModifiedAt.toISOString() : null,
        cashCountedModifiedByName: mr.cashCountedModifiedByName ?? null,
        cashCountedModifiedReason: mr.cashCountedModifiedReason ?? null,
      })
    }

    // Count submitted salesperson reports per date (for expectedShare denominator)
    const submittedCountByDate = new Map<string, number>()
    for (const r of spReports) {
      if (r.status !== 'PENDING') {
        const key = new Date(r.reportDate).toISOString().slice(0, 10)
        submittedCountByDate.set(key, (submittedCountByDate.get(key) ?? 0) + 1)
      }
    }

    // Classify each row and compute variance
    type RowStatus = 'MISSING' | 'OVERRIDDEN' | 'ZERO' | 'OK'

    const rows = spReports.map(r => {
      const dateKey = new Date(r.reportDate).toISOString().slice(0, 10)
      const cash = Number(r.cashAmount)
      const ecocash = Number(r.ecocashAmount)
      const total = cash + ecocash

      let status: RowStatus = 'OK'
      if (r.status === 'PENDING') status = 'MISSING'
      else if (r.isManagerOverride) status = 'OVERRIDDEN'
      else if (total === 0) status = 'ZERO'

      const manager = managerByDate.get(dateKey)
      const submittedCount = submittedCountByDate.get(dateKey) ?? 0
      const expectedShare =
        manager && submittedCount > 0 && r.status !== 'PENDING'
          ? manager.cashCounted / submittedCount
          : null
      const variance = expectedShare !== null ? cash - expectedShare : null

      return {
        date: dateKey,
        salespersonId: r.salespersonId,
        salespersonName: r.salesperson.name ?? 'Unknown',
        cashAmount: cash,
        ecocashAmount: ecocash,
        total,
        status,
        isManagerOverride: r.isManagerOverride,
        overrideReason: r.overrideReason ?? null,
        notes: r.notes ?? null,
        submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
        expectedShare,
        variance,
        savedReportId: manager?.id ?? null,
        cashCountedAmended: manager?.cashCountedAmended ?? false,
        amendmentDetails: manager?.cashCountedAmended ? {
          originalCashCounted: manager.originalCashCounted,
          newCashCounted: manager.cashCounted,
          modifiedAt: manager.cashCountedModifiedAt,
          modifiedByName: manager.cashCountedModifiedByName,
          reason: manager.cashCountedModifiedReason,
        } : null,
      }
    })

    // Build unique salespersons list (for dropdown)
    const spMap = new Map<string, string>()
    for (const r of spReports) {
      if (!spMap.has(r.salespersonId)) {
        spMap.set(r.salespersonId, r.salesperson.name ?? 'Unknown')
      }
    }
    const salespersons = Array.from(spMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))

    // Overall summary
    const summary = {
      daysWithData: new Set(rows.map(r => r.date)).size,
      daysMissing: rows.filter(r => r.status === 'MISSING').length,
      daysOverridden: rows.filter(r => r.status === 'OVERRIDDEN').length,
      totalCash: rows.reduce((s, r) => s + r.cashAmount, 0),
      totalEcocash: rows.reduce((s, r) => s + r.ecocashAmount, 0),
      totalAmount: rows.reduce((s, r) => s + r.total, 0),
    }

    type PersonEntry = {
      salespersonId: string
      salespersonName: string
      daysPresent: number
      daysMissing: number
      daysOverridden: number
      totalCash: number
      totalEcocash: number
      totalAmount: number
    }

    // Per-person summary (only when not filtered to one person)
    let byPerson: PersonEntry[] | undefined

    if (!salespersonId) {
      const personMap = new Map<string, PersonEntry>()
      for (const r of rows) {
        if (!personMap.has(r.salespersonId)) {
          personMap.set(r.salespersonId, {
            salespersonId: r.salespersonId,
            salespersonName: r.salespersonName,
            daysPresent: 0,
            daysMissing: 0,
            daysOverridden: 0,
            totalCash: 0,
            totalEcocash: 0,
            totalAmount: 0,
          })
        }
        const p = personMap.get(r.salespersonId)!
        p.daysPresent++
        if (r.status === 'MISSING') p.daysMissing++
        if (r.status === 'OVERRIDDEN') p.daysOverridden++
        p.totalCash += r.cashAmount
        p.totalEcocash += r.ecocashAmount
        p.totalAmount += r.total
      }
      byPerson = Array.from(personMap.values()).sort((a, b) =>
        b.daysMissing - a.daysMissing || a.salespersonName.localeCompare(b.salespersonName)
      )
    }

    return NextResponse.json({ success: true, rows, salespersons, summary, byPerson })
  } catch (error: any) {
    console.error('[reports/salesperson-shortfall GET]', error)
    return NextResponse.json({ error: 'Failed to fetch shortfall report' }, { status: 500 })
  }
}
