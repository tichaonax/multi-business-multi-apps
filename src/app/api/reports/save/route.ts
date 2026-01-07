import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
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
    const isAdmin = session.user.role?.toLowerCase() === 'admin'

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: businessId,
          userId: session.user.id,
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
          reportDate: new Date(reportDate)
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

    // 8. Calculate till reconciliation (if applicable)
    let expectedCash = null
    let variance = null

    if (reportData.paymentMethods && reportData.paymentMethods.CASH) {
      expectedCash = parseFloat(reportData.paymentMethods.CASH.total) || 0

      if (cashCounted !== undefined && cashCounted !== null) {
        const counted = parseFloat(cashCounted.toString())
        variance = counted - expectedCash
      }
    }

    // 9. Extract summary metrics from reportData
    const totalSales = parseFloat(reportData.summary?.totalSales || 0)
    const totalOrders = parseInt(reportData.summary?.totalOrders || 0)
    const receiptsIssued = parseInt(reportData.summary?.receiptsIssued || 0)

    // 10. Save report to database
    const savedReport = await prisma.savedReports.create({
      data: {
        businessId: businessId,
        reportType: reportType,
        reportDate: new Date(reportDate),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        reportData: reportData, // Store complete snapshot as JSON
        managerName: managerName,
        managerUserId: session.user.id, // Link to authenticated user
        signedAt: new Date(),
        expectedCash: expectedCash,
        cashCounted: cashCounted !== undefined && cashCounted !== null ? parseFloat(cashCounted.toString()) : null,
        variance: variance,
        totalSales: totalSales,
        totalOrders: totalOrders,
        receiptsIssued: receiptsIssued,
        createdBy: session.user.id,
        isLocked: true // Always locked on creation
      }
    })

    // 11. Return success response
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
      }
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
  } finally {
    await prisma.$disconnect()
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
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
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
          reportDate: new Date(reportDate)
        }
      },
      select: {
        id: true,
        managerName: true,
        signedAt: true,
        isLocked: true,
        totalSales: true,
        totalOrders: true
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
  } finally {
    await prisma.$disconnect()
  }
}
