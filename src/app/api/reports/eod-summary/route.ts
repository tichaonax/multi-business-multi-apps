import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/reports/eod-summary
 * Returns aggregate EOD report totals (expectedCash, cashCounted, variance)
 * for a business over a date range or all time.
 *
 * Query params:
 * - businessId: required
 * - startDate: YYYY-MM-DD (required unless allTime=true)
 * - endDate:   YYYY-MM-DD (required unless allTime=true)
 * - allTime:   'true' to ignore date filter
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const allTime = searchParams.get('allTime') === 'true'

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    if (!allTime && (!startDateStr || !endDateStr)) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    // Build date filter — reportDate is a DATE column (midnight UTC)
    let dateFilter: { gte?: Date; lte?: Date } | undefined
    if (!allTime && startDateStr && endDateStr) {
      dateFilter = {
        gte: new Date(startDateStr + 'T00:00:00.000Z'),
        lte: new Date(endDateStr + 'T00:00:00.000Z'),
      }
    }

    const reports = await prisma.savedReports.findMany({
      where: {
        businessId,
        reportType: 'END_OF_DAY',
        isLocked: true,
        ...(dateFilter ? { reportDate: dateFilter } : {}),
      },
      select: {
        expectedCash: true,
        cashCounted: true,
        variance: true,
        reportDate: true,
      },
    })

    const reportCount = reports.length
    let totalExpectedCash = 0
    let totalCashCounted = 0
    let totalVariance = 0
    let reportsWithVariance = 0
    let reportsWithNullExpected = 0

    for (const r of reports) {
      const expected = r.expectedCash !== null ? Number(r.expectedCash) : null
      const counted = r.cashCounted !== null ? Number(r.cashCounted) : null
      const variance = r.variance !== null ? Number(r.variance) : null

      if (expected !== null) {
        totalExpectedCash += expected
      } else {
        reportsWithNullExpected++
      }

      if (counted !== null) {
        totalCashCounted += counted
      }

      if (variance !== null) {
        totalVariance += variance
        if (variance !== 0) reportsWithVariance++
      }
    }

    return NextResponse.json({
      success: true,
      reportCount,
      totalExpectedCash: Number(totalExpectedCash.toFixed(2)),
      totalCashCounted: Number(totalCashCounted.toFixed(2)),
      totalVariance: Number(totalVariance.toFixed(2)),
      reportsWithVariance,
      reportsWithNullExpected,
    })
  } catch (error) {
    console.error('Error fetching EOD summary:', error)
    return NextResponse.json({ error: 'Failed to fetch EOD summary' }, { status: 500 })
  }
}
