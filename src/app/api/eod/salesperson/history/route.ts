import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/eod/salesperson/history?businessId=&from=&to=&page=
 * Returns the calling user's own EOD submission history, paginated.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = 20

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    // Fetch deadline so we can hide today's PENDING record before it's due
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { eodDeadlineTime: true },
    })

    // Check if the EOD deadline for today has passed
    const deadlineTime = business?.eodDeadlineTime ?? null
    let deadlinePassed = false
    if (deadlineTime) {
      const [hours, minutes] = deadlineTime.split(':').map(Number)
      const now = new Date()
      deadlinePassed = now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)
    } else {
      // No deadline set — always show today
      deadlinePassed = true
    }

    // Today's local date
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const where: any = { businessId, salespersonId: user.id }

    // Hide today's PENDING record until the deadline has passed
    if (!deadlinePassed) {
      where.NOT = { reportDate: todayStart, status: 'PENDING' }
    }

    if (from || to) {
      where.reportDate = {}
      if (from) where.reportDate.gte = new Date(from + 'T00:00:00')
      if (to) {
        const toDate = new Date(to + 'T00:00:00')
        toDate.setHours(23, 59, 59, 999)
        where.reportDate.lte = toDate
      }
    }

    const [records, total] = await Promise.all([
      prisma.salespersonEodReport.findMany({
        where,
        include: {
          submittedBy: { select: { id: true, name: true } },
        },
        orderBy: { reportDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.salespersonEodReport.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: records,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error: any) {
    console.error('[eod/salesperson/history GET]', error)
    return NextResponse.json({ error: 'Failed to fetch EOD history' }, { status: 500 })
  }
}
