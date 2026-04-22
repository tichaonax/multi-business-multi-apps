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

    const where: any = { businessId, salespersonId: user.id }

    if (from || to) {
      where.reportDate = {}
      if (from) where.reportDate.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
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
