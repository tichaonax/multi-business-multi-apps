import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/cash-allocation/summary
 *
 * Query params:
 *   range: today | yesterday | 7days | 30days | custom
 *   startDate: YYYY-MM-DD  (required when range=custom)
 *   endDate:   YYYY-MM-DD  (required when range=custom)
 *   businessIds: comma-separated list (optional filter)
 *
 * Returns: per-business, per-date summary rows
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Admin or global manager access only
    const anyPermissions = getEffectivePermissions(user)
    if (
      user.role !== 'admin' &&
      !anyPermissions.canManageAllBusinesses &&
      !anyPermissions.canViewExpenseReports
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const range = sp.get('range') ?? 'today'
    const businessIdsParam = sp.get('businessIds')

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    let startDate: Date
    let endDate: Date

    switch (range) {
      case 'yesterday': {
        const d = new Date(now)
        d.setDate(d.getDate() - 1)
        const s = d.toISOString().split('T')[0]
        startDate = new Date(s + 'T00:00:00.000Z')
        endDate = new Date(s + 'T23:59:59.999Z')
        break
      }
      case '7days': {
        const d = new Date(now)
        d.setDate(d.getDate() - 6)
        startDate = new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z')
        endDate = new Date(todayStr + 'T23:59:59.999Z')
        break
      }
      case '30days': {
        const d = new Date(now)
        d.setDate(d.getDate() - 29)
        startDate = new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z')
        endDate = new Date(todayStr + 'T23:59:59.999Z')
        break
      }
      case 'custom': {
        const s = sp.get('startDate')
        const e = sp.get('endDate')
        if (!s || !e) {
          return NextResponse.json({ error: 'startDate and endDate required for custom range' }, { status: 400 })
        }
        startDate = new Date(s + 'T00:00:00.000Z')
        endDate = new Date(e + 'T23:59:59.999Z')
        break
      }
      default: // today
        startDate = new Date(todayStr + 'T00:00:00.000Z')
        endDate = new Date(todayStr + 'T23:59:59.999Z')
    }

    const businessIdFilter = businessIdsParam
      ? businessIdsParam.split(',').map(s => s.trim()).filter(Boolean)
      : undefined

    // 1. Fetch existing reports in range
    const reports = await prisma.cashAllocationReport.findMany({
      where: {
        reportDate: { gte: startDate, lte: endDate },
        ...(businessIdFilter ? { businessId: { in: businessIdFilter } } : {}),
      },
      include: {
        business: { select: { id: true, name: true, type: true } },
        lineItems: {
          select: {
            id: true,
            accountName: true,
            sourceType: true,
            reportedAmount: true,
            actualAmount: true,
            isChecked: true,
          },
        },
      },
      orderBy: [{ reportDate: 'desc' }, { businessId: 'asc' }],
    })

    const reportedKeys = new Set(
      reports.map(r => `${r.businessId}_${r.reportDate.toISOString().split('T')[0]}`)
    )

    // 2. Find EOD deposits in range for businesses that have no report yet
    const eodDeposits = await prisma.expenseAccountDeposits.findMany({
      where: {
        sourceType: { in: ['EOD_RENT_TRANSFER', 'EOD_AUTO_DEPOSIT'] },
        depositDate: { gte: startDate, lte: endDate },
        sourceBusinessId: businessIdFilter
          ? { in: businessIdFilter }
          : { not: null },
      },
      select: {
        id: true,
        sourceBusinessId: true,
        depositDate: true,
        amount: true,
        sourceBusiness: { select: { id: true, name: true, type: true } },
      },
      orderBy: { depositDate: 'desc' },
    })

    // Group deposits by (businessId_date), skip ones already covered by a report
    const depositGroups = new Map<string, { bId: string; bName: string; bType: string; date: string; count: number; total: number }>()
    for (const dep of eodDeposits) {
      if (!dep.sourceBusinessId || !dep.sourceBusiness) continue
      const date = dep.depositDate.toISOString().split('T')[0]
      const key = `${dep.sourceBusinessId}_${date}`
      if (reportedKeys.has(key)) continue
      if (!depositGroups.has(key)) {
        depositGroups.set(key, {
          bId: dep.sourceBusinessId,
          bName: dep.sourceBusiness.name,
          bType: dep.sourceBusiness.type,
          date,
          count: 0,
          total: 0,
        })
      }
      const g = depositGroups.get(key)!
      g.count += 1
      g.total += Number(dep.amount)
    }

    const reportRows = reports.map(r => ({
      reportId: r.id,
      businessId: r.businessId,
      businessName: r.business.name,
      businessType: r.business.type,
      date: r.reportDate.toISOString().split('T')[0],
      status: r.status,
      itemCount: r.lineItems.length,
      checkedCount: r.lineItems.filter(li => li.isChecked).length,
      totalReported: r.lineItems.reduce((sum: number, li) => sum + Number(li.reportedAmount), 0),
      totalActual: r.lineItems.reduce((sum: number, li) => sum + Number(li.actualAmount ?? 0), 0),
      lineItems: r.lineItems,
    }))

    const noneRows = Array.from(depositGroups.values()).map(g => ({
      reportId: null,
      businessId: g.bId,
      businessName: g.bName,
      businessType: g.bType,
      date: g.date,
      status: 'NONE',
      itemCount: g.count,
      checkedCount: 0,
      totalReported: g.total,
      totalActual: null,
      lineItems: [],
    }))

    // Merge: existing reports first, then NONE rows sorted by date desc
    const rows = [
      ...reportRows,
      ...noneRows.sort((a, b) => b.date.localeCompare(a.date)),
    ]

    return NextResponse.json({ rows, range, startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] })
  } catch (err) {
    console.error('[GET /api/cash-allocation/summary]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
