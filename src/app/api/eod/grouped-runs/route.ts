import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/eod/grouped-runs?businessId=xxx&limit=20
 * Returns history of grouped EOD catch-up runs for a business,
 * newest first. Includes per-date breakdown and cash allocation status.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessId = request.nextUrl.searchParams.get('businessId')
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '20'), 100)

    const permissions = getEffectivePermissions(user, businessId)
    const canAccess =
      user.role === 'admin' ||
      permissions.canMakeExpenseDeposits ||
      permissions.canManageBusinessSettings

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const runs = await prisma.groupedEODRun.findMany({
      where: { businessId },
      orderBy: { runDate: 'desc' },
      take: limit,
      include: {
        dates: {
          orderBy: { date: 'asc' },
          select: {
            id: true,
            date: true,
            totalSales: true,
            cashCounted: true,
            allocationBreakdown: true,
          },
        },
        cashAllocation: {
          select: {
            id: true,
            status: true,
            lockedAt: true,
          },
        },
      },
    })

    const data = runs.map((run: typeof runs[number]) => ({
      id: run.id,
      runDate: run.runDate.toISOString(),
      managerName: run.managerName,
      notes: run.notes,
      totalCashReceived: run.totalCashReceived,
      dateCount: run.dates.length,
      dates: run.dates.map((d: typeof run.dates[number]) => d.date),
      totalSales: run.dates.reduce((sum: number, d: typeof run.dates[number]) => sum + d.totalSales, 0),
      cashAllocationReportId: run.cashAllocation[0]?.id ?? null,
      cashAllocationStatus: run.cashAllocation[0]?.status ?? null,
      cashAllocationLockedAt: run.cashAllocation[0]?.lockedAt?.toISOString() ?? null,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[GET /api/eod/grouped-runs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
