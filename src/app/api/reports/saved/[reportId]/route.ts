import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/reports/saved/[reportId]
 *
 * Retrieve a single saved report by ID (with full reportData)
 *
 * Response:
 * {
 *   success: true
 *   report: {
 *     id, businessId, reportType, reportDate, periodStart, periodEnd,
 *     reportData (full JSON snapshot), managerName, managerUserId,
 *     signedAt, expectedCash, cashCounted, variance,
 *     totalSales, totalOrders, receiptsIssued, isLocked,
 *     createdAt, createdBy, user, business
 *   }
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params

    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Fetch report
    const report = await prisma.savedReports.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            phone: true
          }
        }
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // 3. Check business access
    const isAdmin = session.user.role?.toLowerCase() === 'admin'

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: report.businessId,
          userId: session.user.id,
          isActive: true
        }
      })

      if (!membership) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this report' },
          { status: 403 }
        )
      }
    }

    // 4. Return report with full data
    return NextResponse.json({
      success: true,
      report: report
    })

  } catch (error: any) {
    console.error('Error fetching report:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch report',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/reports/saved/[reportId]
 *
 * Delete a saved report (admin only, or if report is not locked)
 *
 * Response:
 * {
 *   success: true
 *   message: string
 * }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params

    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Fetch report
    const report = await prisma.savedReports.findUnique({
      where: { id: reportId }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // 3. Check permissions
    const isAdmin = session.user.role?.toLowerCase() === 'admin'

    // Only admin can delete locked reports
    if (report.isLocked && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete locked reports' },
        { status: 403 }
      )
    }

    // Check business access for non-admin
    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: report.businessId,
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

    // 4. Delete report
    await prisma.savedReports.delete({
      where: { id: reportId }
    })

    // 5. Return success
    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting report:', error)

    return NextResponse.json(
      {
        error: 'Failed to delete report',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/reports/saved/[reportId]
 *
 * Unlock a locked report (admin only - for corrections)
 *
 * Request Body:
 * {
 *   action: 'unlock' | 'lock'
 * }
 *
 * Response:
 * {
 *   success: true
 *   message: string
 *   report: { id, isLocked }
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params

    // 1. Authenticate user (admin only)
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const isAdmin = session.user.role?.toLowerCase() === 'admin'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can lock/unlock reports' },
        { status: 403 }
      )
    }

    // 2. Parse request body
    const body = await req.json()
    const { action } = body

    if (!action || !['lock', 'unlock'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "lock" or "unlock"' },
        { status: 400 }
      )
    }

    // 3. Update report
    const updatedReport = await prisma.savedReports.update({
      where: { id: reportId },
      data: {
        isLocked: action === 'lock'
      },
      select: {
        id: true,
        isLocked: true,
        reportType: true,
        reportDate: true
      }
    })

    // 4. Return success
    return NextResponse.json({
      success: true,
      message: `Report ${action}ed successfully`,
      report: updatedReport
    })

  } catch (error: any) {
    console.error('Error updating report lock status:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update report',
        details: error.message
      },
      { status: 500 }
    )
  }
}
