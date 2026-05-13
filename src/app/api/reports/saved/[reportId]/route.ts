import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

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
    const user = await getServerUser()
    if (!user) {
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
    const isAdmin = user.role?.toLowerCase() === 'admin'

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          businessId: report.businessId,
          userId: user.id,
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

    // 4. Fetch salesperson EOD records for this business day (non-fatal if absent)
    let salespersonEodRecords: any[] = []
    try {
      salespersonEodRecords = await prisma.salespersonEodReport.findMany({
        where: { businessId: report.businessId, reportDate: report.reportDate },
        include: {
          salesperson: { select: { id: true, name: true } },
          submittedBy: { select: { id: true, name: true } },
        },
        orderBy: { salesperson: { name: 'asc' } },
      })
    } catch (_) {
      // salespersonEodReport table may not exist on older deployments
    }

    // 5. Return report with full data
    return NextResponse.json({
      success: true,
      report: {
        ...report,
        salespersonEodRecords,
      },
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
    const user = await getServerUser()
    if (!user) {
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
    const isAdmin = user.role?.toLowerCase() === 'admin'

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

    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = user.role?.toLowerCase() === 'admin'

    const body = await req.json()
    const { action } = body

    if (!action || !['lock', 'unlock', 'amend-cash-counted'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "lock", "unlock", or "amend-cash-counted"' },
        { status: 400 }
      )
    }

    // lock/unlock: admin only
    if (action === 'lock' || action === 'unlock') {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators can lock/unlock reports' },
          { status: 403 }
        )
      }

      const updatedReport = await prisma.savedReports.update({
        where: { id: reportId },
        data: { isLocked: action === 'lock' },
        select: { id: true, isLocked: true, reportType: true, reportDate: true }
      })

      return NextResponse.json({
        success: true,
        message: `Report ${action}ed successfully`,
        report: updatedReport
      })
    }

    // amend-cash-counted: canCloseBooks or admin
    const report = await prisma.savedReports.findUnique({ where: { id: reportId } })
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (!isAdmin) {
      const perms = getEffectivePermissions(user, report.businessId)
      if (!perms.canCloseBooks) {
        return NextResponse.json({ error: 'Forbidden: canCloseBooks permission required' }, { status: 403 })
      }
    }

    if (!report.isLocked) {
      return NextResponse.json({ error: 'Report must be locked before amending' }, { status: 400 })
    }

    if (report.originalCashCounted !== null && report.originalCashCounted !== undefined) {
      return NextResponse.json({ error: 'Report has already been amended. Only one amendment is allowed.' }, { status: 400 })
    }

    const { cashCounted: newCashCountedRaw, reason } = body
    if (typeof newCashCountedRaw !== 'number' || !isFinite(newCashCountedRaw)) {
      return NextResponse.json({ error: 'cashCounted must be a valid number' }, { status: 400 })
    }
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 })
    }

    const newCashCounted = parseFloat(newCashCountedRaw.toFixed(2))
    const newVariance = report.expectedCash !== null
      ? parseFloat((newCashCounted - Number(report.expectedCash)).toFixed(2))
      : null

    const amended = await prisma.savedReports.update({
      where: { id: reportId },
      data: {
        originalCashCounted: report.cashCounted,
        cashCounted: newCashCounted,
        variance: newVariance,
        cashCountedModifiedAt: new Date(),
        cashCountedModifiedById: user.id,
        cashCountedModifiedByName: user.name ?? user.email,
        cashCountedModifiedReason: reason.trim(),
      },
      select: {
        id: true,
        cashCounted: true,
        originalCashCounted: true,
        variance: true,
        cashCountedModifiedAt: true,
        cashCountedModifiedByName: true,
        cashCountedModifiedReason: true,
      }
    })

    return NextResponse.json({ success: true, report: amended })

  } catch (error: any) {
    console.error('Error updating report:', error)

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to update report', details: error.message },
      { status: 500 }
    )
  }
}
