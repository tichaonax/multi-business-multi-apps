import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string }> }

/**
 * GET /api/cash-allocation/[businessId]?date=YYYY-MM-DD
 *   OR ?reportId=xxx  (for grouped reports that have no single date)
 * Returns the cash allocation report, or { exists: false }.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const permissions = getEffectivePermissions(user, businessId)

    if (user.role !== 'admin' && !permissions.canRunCashAllocationReport) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const dateParam = request.nextUrl.searchParams.get('date')
    const reportIdParam = request.nextUrl.searchParams.get('reportId')

    if (!dateParam && !reportIdParam) {
      return NextResponse.json({ error: 'date or reportId query parameter is required' }, { status: 400 })
    }

    const where = reportIdParam
      ? { id: reportIdParam, businessId }
      : { businessId, reportDate: new Date(dateParam!) }

    const report = await prisma.cashAllocationReport.findFirst({
      where,
      include: {
        lineItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        locker: { select: { name: true } },
        business: { select: { name: true } },
        groupedRun: {
          select: {
            id: true,
            managerName: true,
            totalCashReceived: true,
            runDate: true,
            dates: { orderBy: { date: 'asc' }, select: { date: true, totalSales: true, allocationBreakdown: true } },
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json({ exists: false })
    }

    const nonRentItems = report.lineItems.filter((item: { sourceType: string }) => item.sourceType !== 'EOD_RENT_TRANSFER')
    const allChecked = nonRentItems.length > 0 &&
      nonRentItems.every((item: { isChecked: boolean; actualAmount: unknown }) => item.isChecked && item.actualAmount !== null)
    // readyToLock: true when at least one non-rent item is confirmed (partial lock allowed)
    const readyToLock = nonRentItems.length === 0 ||
      nonRentItems.some((item: { isChecked: boolean; actualAmount: unknown }) => item.isChecked && item.actualAmount !== null)

    console.log('[cash-allocation GET] businessId:', businessId, 'business.name:', report.business?.name ?? null)
    return NextResponse.json({
      exists: true,
      businessName: report.business?.name ?? null,
      report: { ...report, lockerName: report.locker?.name ?? null },
      lineItems: report.lineItems,
      allChecked,
      readyToLock,
    })
  } catch (err) {
    console.error('[GET /api/cash-allocation]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
