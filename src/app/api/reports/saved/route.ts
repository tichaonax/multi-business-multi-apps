import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/reports/saved
 *
 * Retrieve saved/locked reports
 *
 * Query Parameters:
 * - businessId: string (required)
 * - reportType?: string (optional: 'END_OF_DAY' | 'END_OF_WEEK' | 'END_OF_MONTH')
 * - startDate?: string (optional: ISO date)
 * - endDate?: string (optional: ISO date)
 * - limit?: number (default: 50)
 * - offset?: number (default: 0)
 * - includeData?: boolean (default: false - whether to include full reportData JSON)
 *
 * Response:
 * {
 *   success: true
 *   reports: [
 *     {
 *       id, reportType, reportDate, managerName, signedAt,
 *       totalSales, totalOrders, receiptsIssued, isLocked,
 *       reportData? (if includeData=true)
 *     }
 *   ]
 *   pagination: { total, limit, offset, hasMore }
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeData = searchParams.get('includeData') === 'true'

    if (!businessId) {
      return NextResponse.json(
        { error: 'Missing required parameter: businessId' },
        { status: 400 }
      )
    }

    // 3. Check business access
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

    // 4. Build query filters
    const where: any = {
      businessId: businessId
    }

    if (reportType) {
      where.reportType = reportType
    }

    if (startDate || endDate) {
      where.reportDate = {}
      if (startDate) {
        where.reportDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.reportDate.lte = new Date(endDate)
      }
    }

    // 5. Get total count
    const total = await prisma.savedReports.count({ where })

    // 6. Fetch reports
    const reports = await prisma.savedReports.findMany({
      where,
      select: {
        id: true,
        reportType: true,
        reportDate: true,
        periodStart: true,
        periodEnd: true,
        managerName: true,
        managerUserId: true,
        signedAt: true,
        expectedCash: true,
        cashCounted: true,
        variance: true,
        totalSales: true,
        totalOrders: true,
        receiptsIssued: true,
        isLocked: true,
        createdAt: true,
        createdBy: true,
        reportData: includeData, // Only include if requested
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        reportDate: 'desc' // Most recent first
      },
      take: limit,
      skip: offset
    })

    // 7. Return response
    return NextResponse.json({
      success: true,
      reports: reports,
      pagination: {
        total: total,
        limit: limit,
        offset: offset,
        hasMore: offset + reports.length < total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error: any) {
    console.error('Error fetching saved reports:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch saved reports',
        details: error.message
      },
      { status: 500 }
    )
  }
}
