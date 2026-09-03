import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getAvailableCashForAllocation } from '@/lib/eod-utils'

type Params = { params: Promise<{ businessId: string }> }

/**
 * GET /api/business/[businessId]/allocation-backlog
 *
 * Summarizes outstanding EOD allocation backlog (rent, auto-deposits, payroll) for a
 * business — days where the auto-allocation was skipped for lack of real available cash
 * (see EodAllocationSkips / recordAllocationSkip in eod-utils.ts) and hasn't been caught
 * up since. Grouped per config so the UI can offer one "Catch Up" action per account.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const permissions = getEffectivePermissions(user, businessId)
    if (user.role !== 'admin' && !permissions.canRunCashAllocationReport && !permissions.canMakeExpenseDeposits) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const skips = await prisma.eodAllocationSkips.findMany({
      where: { businessId, caughtUpAt: null },
      orderBy: { eodDate: 'asc' },
    })

    type Group = {
      allocationType: string
      configKey: string
      accountName: string
      totalOwed: number
      daysCount: number
      oldestDate: string
      newestDate: string
    }
    const groups = new Map<string, Group>()

    for (const s of skips) {
      const remaining = Number(s.amountSkipped) - Number(s.amountCaughtUp)
      if (remaining <= 0.009) continue
      const key = `${s.allocationType}:${s.configKey}`
      const dateStr = s.eodDate.toISOString().slice(0, 10)
      const existing = groups.get(key)
      if (existing) {
        existing.totalOwed += remaining
        existing.daysCount += 1
        if (dateStr < existing.oldestDate) existing.oldestDate = dateStr
        if (dateStr > existing.newestDate) existing.newestDate = dateStr
        existing.accountName = s.accountName // keep the most recent label
      } else {
        groups.set(key, {
          allocationType: s.allocationType,
          configKey: s.configKey,
          accountName: s.accountName,
          totalOwed: remaining,
          daysCount: 1,
          oldestDate: dateStr,
          newestDate: dateStr,
        })
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    const availableCashNow = await getAvailableCashForAllocation(businessId, todayStr)

    return NextResponse.json({
      availableCashNow,
      backlog: Array.from(groups.values()).sort((a, b) => a.oldestDate.localeCompare(b.oldestDate)),
    })
  } catch (err) {
    console.error('[GET /api/business/[businessId]/allocation-backlog]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
