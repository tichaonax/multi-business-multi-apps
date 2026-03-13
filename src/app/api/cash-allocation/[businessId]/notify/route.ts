import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Params = { params: Promise<{ businessId: string }> }

/**
 * POST /api/cash-allocation/[businessId]/notify
 * Body: { date: "YYYY-MM-DD" }
 *
 * Called by whoever runs EOD (does NOT require canRunCashAllocationReport).
 * Creates an empty DRAFT CashAllocationReport stub so it appears in the
 * cash-allocation approver's bell notification. The approver then opens the
 * cash allocation page and clicks "Generate Report" to populate line items.
 *
 * Idempotent: if a report already exists for that date, does nothing.
 * Only requires active business membership.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params

    if (user.role !== 'admin') {
      const membership = await prisma.businessMemberships.findFirst({
        where: { businessId, userId: user.id, isActive: true },
      })
      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { date } = body

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 })
    }

    const reportDate = new Date(date)

    // Idempotent: only create if no report exists for this business+date
    const existing = await prisma.cashAllocationReport.findFirst({
      where: { businessId, reportDate },
    })

    if (existing) {
      return NextResponse.json({ success: true, created: false, reportId: existing.id })
    }

    const report = await prisma.cashAllocationReport.create({
      data: {
        businessId,
        reportDate,
        status: 'DRAFT',
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, created: true, reportId: report.id })
  } catch (err) {
    console.error('[POST /api/cash-allocation/notify]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
