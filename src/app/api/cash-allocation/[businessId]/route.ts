import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string }> }

/**
 * GET /api/cash-allocation/[businessId]?date=YYYY-MM-DD
 * Returns the cash allocation report for a specific date, or { exists: false }.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const permissions = getEffectivePermissions(user, businessId)

    if (user.role !== 'admin' && !permissions.canRunCashAllocationReport) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const dateParam = request.nextUrl.searchParams.get('date')
    if (!dateParam) {
      return NextResponse.json({ error: 'date query parameter is required (YYYY-MM-DD)' }, { status: 400 })
    }

    const reportDate = new Date(dateParam)

    const report = await prisma.cashAllocationReport.findUnique({
      where: { businessId_reportDate: { businessId, reportDate } },
      include: {
        lineItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    })

    if (!report) {
      return NextResponse.json({ exists: false })
    }

    const allChecked = report.lineItems.length > 0 &&
      report.lineItems.every(item => item.isChecked && item.actualAmount !== null)

    return NextResponse.json({ exists: true, report, lineItems: report.lineItems, allChecked })
  } catch (err) {
    console.error('[GET /api/cash-allocation]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
