import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasPermission} from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/universal/close-books?businessId=X&date=YYYY-MM-DD
 * Check if books are closed for a specific date
 *
 * GET /api/universal/close-books?businessId=X&days=7
 * Get all closed dates within the past N days
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const date = searchParams.get('date')
    const days = searchParams.get('days')

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId parameter required' },
        { status: 400 }
      )
    }

    // Batch mode: return all closed dates within past N days
    if (days) {
      const numDays = Math.min(parseInt(days) || 7, 30)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (numDays - 1))
      startDate.setHours(0, 0, 0, 0)

      // Check both explicit book closures AND locked end-of-day reports
      const closedReports = await prisma.savedReports.findMany({
        where: {
          businessId,
          reportDate: { gte: startDate },
          OR: [
            { reportType: 'DAILY_BOOKS_CLOSE' },
            { reportType: 'END_OF_DAY', isLocked: true },
          ],
        },
        select: {
          reportDate: true,
          managerName: true,
          reportType: true,
        },
      })

      // Deduplicate by date (a date may have both types)
      const dateMap = new Map<string, string>()
      for (const r of closedReports) {
        const dateStr = r.reportDate.toISOString().split('T')[0]
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, r.managerName)
        }
      }

      const closedDates = Array.from(dateMap.entries()).map(([date, closedBy]) => ({
        date,
        closedBy,
      }))

      return NextResponse.json({ success: true, closedDates })
    }

    // Single date mode
    if (!date) {
      return NextResponse.json(
        { error: 'date or days parameter required' },
        { status: 400 }
      )
    }

    const reportDate = new Date(date + 'T00:00:00Z')

    const closedBooks = await prisma.savedReports.findFirst({
      where: {
        businessId,
        reportDate,
        OR: [
          { reportType: 'DAILY_BOOKS_CLOSE' },
          { reportType: 'END_OF_DAY', isLocked: true },
        ],
      },
      select: {
        id: true,
        managerName: true,
        signedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      isClosed: !!closedBooks,
      closedBy: closedBooks?.managerName || null,
      closedAt: closedBooks?.signedAt || null,
    })
  } catch (error) {
    console.error('Error checking book closure:', error)
    return NextResponse.json({ error: 'Failed to check book status' }, { status: 500 })
  }
}

/**
 * POST /api/universal/close-books
 * Close books for a specific business day (manager+ only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Check permission: must be manager+ or system admin
    if (!isSystemAdmin(user) && !hasPermission(user, 'canCloseBooks')) {
      return NextResponse.json(
        { error: 'Only managers and above can close books.' },
        { status: 403 }
      )
    }

    const { businessId, date, managerName } = await request.json()

    if (!businessId || !date || !managerName) {
      return NextResponse.json(
        { error: 'businessId, date, and managerName are required' },
        { status: 400 }
      )
    }

    // Validate date is within 7 days
    const closeDate = new Date(date + 'T00:00:00Z')
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    if (closeDate > now) {
      return NextResponse.json({ error: 'Cannot close books for a future date' }, { status: 400 })
    }

    if (closeDate < sevenDaysAgo) {
      return NextResponse.json(
        { error: 'Cannot close books for dates older than 7 days' },
        { status: 400 }
      )
    }

    // Check if already closed
    const existing = await prisma.savedReports.findUnique({
      where: {
        businessId_reportType_reportDate: {
          businessId,
          reportType: 'DAILY_BOOKS_CLOSE',
          reportDate: closeDate,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Books for ${date} are already closed by ${existing.managerName}` },
        { status: 409 }
      )
    }

    // Get daily summary for the report snapshot
    const dayStart = new Date(date + 'T00:00:00Z')
    const dayEnd = new Date(date + 'T23:59:59.999Z')

    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId,
        OR: [
          { transactionDate: { gte: dayStart, lte: dayEnd } },
          { transactionDate: null, createdAt: { gte: dayStart, lte: dayEnd } },
        ],
      },
      select: {
        totalAmount: true,
        isManualEntry: true,
      },
    })

    const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const totalOrders = orders.length
    const manualEntries = orders.filter(o => o.isManualEntry).length

    // Create the close-books report
    const report = await prisma.savedReports.create({
      data: {
        businessId,
        reportType: 'DAILY_BOOKS_CLOSE',
        reportDate: closeDate,
        periodStart: dayStart,
        periodEnd: dayEnd,
        managerName,
        managerUserId: user.id,
        signedAt: new Date(),
        isLocked: true,
        totalSales,
        totalOrders,
        receiptsIssued: totalOrders,
        reportData: {
          totalSales,
          totalOrders,
          manualEntries,
          closedAt: new Date().toISOString(),
          closedBy: managerName,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Books closed for ${date}. ${totalOrders} orders (${manualEntries} manual).`,
      reportId: report.id,
    })
  } catch (error: any) {
    console.error('Error closing books:', error)

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Books for this date are already closed' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Failed to close books' }, { status: 500 })
  }
}
