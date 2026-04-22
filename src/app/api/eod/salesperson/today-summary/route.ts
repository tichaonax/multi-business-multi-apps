import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/eod/salesperson/today-summary?businessId=
 * Returns counts of today's salesperson EOD records by status.
 * Used by the manager dashboard widget (Phase 9).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const perms = getEffectivePermissions(user, businessId)
    if (user.role !== 'admin' && !perms.canCloseBooks) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const records = await prisma.salespersonEodReport.findMany({
      where: { businessId, reportDate: today },
      select: { status: true },
    })

    const pending = records.filter(r => r.status === 'PENDING').length
    const submitted = records.filter(r => r.status === 'SUBMITTED').length
    const overridden = records.filter(r => r.status === 'OVERRIDDEN').length
    const total = records.length

    return NextResponse.json({ success: true, pending, submitted, overridden, total })
  } catch (error: any) {
    console.error('[eod/salesperson/today-summary GET]', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
