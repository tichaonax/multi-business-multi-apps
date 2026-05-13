import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { createEODPaymentBatches, createEODMealBatch } from '@/lib/eod-payment-batch-utils'
import { processRentTransfer } from '@/lib/eod-utils'

/**
 * Compute UTC start (inclusive) and end (exclusive) for a local business day
 * in Africa/Harare (UTC+2, no DST). Using explicit offset avoids depending on
 * the server's system timezone — dev runs in Houston CDT which would shift
 * boundaries by 7-8 hours and cause wrong order counts.
 */
function getHarareDayBounds(reportDate: string): { start: Date; end: Date } {
  const [year, month, day] = reportDate.split('-').map(Number)
  const HARARE_OFFSET_MS = 2 * 60 * 60 * 1000 // Africa/Harare is always UTC+2, no DST
  const midnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0)
  const start = new Date(midnightUTC - HARARE_OFFSET_MS) // local midnight → UTC
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

/**
 * POST /api/reports/save
 *
 * Save and lock a report snapshot (end-of-day or end-of-week)
 *
 * Request Body:
 * {
 *   businessId: string
 *   reportType: 'END_OF_DAY' | 'END_OF_WEEK' | 'END_OF_MONTH'
 *   reportDate: string (ISO date)
 *   periodStart: string (ISO datetime)
 *   periodEnd: string (ISO datetime)
 *   managerName: string
 *   cashCounted?: number (optional, for till reconciliation)
 *   reportData: object (complete report snapshot)
 * }
 *
 * Response:
 * {
 *   success: true
 *   reportId: string
 *   message: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body = await req.json()
    const {
      businessId,
      reportType,
      reportDate,
      periodStart,
      periodEnd,
      managerName,
      cashCounted,
      confirmedEcocashAmount,
      salespersonCashTotal,
      salespersonEcocashTotal,
      reportData
    } = body

    // 3. Validate required fields
    if (!businessId || !reportType || !reportDate || !managerName || !reportData) {
      return NextResponse.json(
        { error: 'Missing required fields: businessId, reportType, reportDate, managerName, reportData' },
        { status: 400 }
      )
    }

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Missing period dates: periodStart and periodEnd are required' },
        { status: 400 }
      )
    }

    // 4. Validate report type
    const validReportTypes = ['END_OF_DAY', 'END_OF_WEEK', 'END_OF_MONTH']
    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { error: `Invalid reportType. Must be one of: ${validReportTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // 5. Check business access
    const isAdmin = user.role?.toLowerCase() === 'admin'

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: businessId,
          userId: user.id,
          isActive: true
        }
      })

      if (!membership) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this business' },
          { status: 403 }
        )
      }
    }

    // 6. Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // 7. Check for existing report (prevent duplicates)
    const existingReport = await prisma.savedReports.findUnique({
      where: {
        businessId_reportType_reportDate: {
          businessId: businessId,
          reportType: reportType,
          reportDate: new Date(reportDate + 'T00:00:00.000Z')
        }
      }
    })

    if (existingReport) {
      return NextResponse.json(
        {
          error: `A ${reportType} report for ${reportDate} already exists for this business`,
          reportId: existingReport.id,
          existingReport: {
            id: existingReport.id,
            managerName: existingReport.managerName,
            signedAt: existingReport.signedAt,
            isLocked: existingReport.isLocked
          }
        },
        { status: 409 } // Conflict
      )
    }

    // 8. Compute authoritative period boundaries from reportDate using Africa/Harare timezone.
    // Do NOT trust client-provided periodStart/periodEnd — the client may run in a different
    // timezone (e.g. dev server in Houston CDT) and shift the boundaries by hours.
    const hararePeriod = getHarareDayBounds(reportDate as string)
    const queryStart = hararePeriod.start
    const queryEnd = hararePeriod.end

    const dateFilter = {
      OR: [
        { transactionDate: { gte: queryStart, lt: queryEnd } },
        { transactionDate: null, createdAt: { gte: queryStart, lt: queryEnd } },
      ],
    }

    const cashAgg = await prisma.businessOrders.aggregate({
      where: { businessId, status: 'COMPLETED', paymentMethod: 'CASH', ...dateFilter },
      _sum: { totalAmount: true },
    })
    const expectedCash = Number(cashAgg._sum.totalAmount ?? 0)
    const variance = (cashCounted !== undefined && cashCounted !== null)
      ? parseFloat(cashCounted.toString()) - expectedCash
      : null

    // 9. Re-query actual order totals server-side
    const ordersAgg = await prisma.businessOrders.aggregate({
      where: { businessId, status: 'COMPLETED', ...dateFilter },
      _sum: { totalAmount: true },
      _count: { id: true },
    })
    const totalSales = Number(ordersAgg._sum.totalAmount ?? 0)
    const totalOrders = ordersAgg._count.id
    const receiptsIssued = totalOrders

    // 10. Save report to database
    const savedReport = await prisma.savedReports.create({
      data: {
        businessId: businessId,
        reportType: reportType,
        reportDate: new Date(reportDate + 'T00:00:00.000Z'),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        reportData: reportData, // Store complete snapshot as JSON
        managerName: managerName,
        managerUserId: user.id, // Link to authenticated user
        signedAt: new Date(),
        expectedCash: expectedCash,
        cashCounted: cashCounted !== undefined && cashCounted !== null ? parseFloat(cashCounted.toString()) : null,
        confirmedEcocashAmount: confirmedEcocashAmount !== undefined && confirmedEcocashAmount !== null ? parseFloat(confirmedEcocashAmount.toString()) : null,
        salespersonCashTotal: salespersonCashTotal !== undefined && salespersonCashTotal !== null ? parseFloat(salespersonCashTotal.toString()) : null,
        salespersonEcocashTotal: salespersonEcocashTotal !== undefined && salespersonEcocashTotal !== null ? parseFloat(salespersonEcocashTotal.toString()) : null,
        variance: variance,
        totalSales: totalSales,
        totalOrders: totalOrders,
        receiptsIssued: receiptsIssued,
        createdBy: user.id,
        isLocked: true // Always locked on creation
      }
    })

    // 11. Batch any queued expense payments into an EOD payment batch for cashier review
    let eodPaymentBatch: { batchId: string; paymentCount: number } | null = null
    if (reportType === 'END_OF_DAY') {
      try {
        const batchResult = await createEODPaymentBatches(businessId, new Date(reportDate + 'T00:00:00'))
        if (batchResult.batchId) {
          eodPaymentBatch = { batchId: batchResult.batchId, paymentCount: batchResult.paymentCount }
        }
        // Consolidate individual MEAL_PROGRAM payments into one MEAL_BATCH request
        await createEODMealBatch(businessId, new Date(reportDate + 'T00:00:00'))
      } catch (batchError) {
        // Non-fatal — log but don't fail the EOD save
        console.error('createEODPaymentBatches error (non-fatal):', batchError)
      }

      // Create the rent transfer deposit so it appears as a line item when the
      // cashier opens the cash allocation report (non-fatal — no rent config is fine)
      try {
        await processRentTransfer(businessId, reportDate, user.id)
      } catch (rentErr: any) {
        if (!['NO_RENT_CONFIG', 'RENT_ACCOUNT_INACTIVE'].includes(rentErr.message?.split(':')[0])) {
          console.error('processRentTransfer error (non-fatal):', rentErr)
        }
      }
    }

    // 12. Return success response
    return NextResponse.json({
      success: true,
      reportId: savedReport.id,
      message: `${reportType} report saved and locked successfully`,
      report: {
        id: savedReport.id,
        reportType: savedReport.reportType,
        reportDate: savedReport.reportDate,
        managerName: savedReport.managerName,
        signedAt: savedReport.signedAt,
        totalSales: savedReport.totalSales,
        totalOrders: savedReport.totalOrders,
        isLocked: savedReport.isLocked
      },
      eodPaymentBatch,
    })

  } catch (error: any) {
    console.error('Error saving report:', error)

    return NextResponse.json(
      {
        error: 'Failed to save report',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports/save
 *
 * Check if a report can be saved (not a duplicate)
 *
 * Query Params:
 * - businessId: string
 * - reportType: string
 * - reportDate: string (ISO date)
 *
 * Response:
 * {
 *   canSave: boolean
 *   existingReport?: { id, managerName, signedAt, isLocked }
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get query parameters
    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')
    const reportType = searchParams.get('reportType')
    const reportDate = searchParams.get('reportDate')

    if (!businessId || !reportType || !reportDate) {
      return NextResponse.json(
        { error: 'Missing required query parameters: businessId, reportType, reportDate' },
        { status: 400 }
      )
    }

    // 3. Check for existing report
    const existingReport = await prisma.savedReports.findUnique({
      where: {
        businessId_reportType_reportDate: {
          businessId: businessId,
          reportType: reportType,
          reportDate: new Date(reportDate + 'T00:00:00.000Z')
        }
      },
      select: {
        id: true,
        managerName: true,
        signedAt: true,
        isLocked: true,
        totalSales: true,
        totalOrders: true,
        cashCounted: true,
        expectedCash: true,
      }
    })

    if (existingReport) {
      return NextResponse.json({
        canSave: false,
        existingReport: existingReport
      })
    }

    return NextResponse.json({
      canSave: true
    })

  } catch (error: any) {
    console.error('Error checking report status:', error)

    return NextResponse.json(
      {
        error: 'Failed to check report status',
        details: error.message
      },
      { status: 500 }
    )
  }
}
