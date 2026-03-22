import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * POST /api/stock-take/reports/[id]/void
 *
 * Voids a report. Manager only (canAccessFinancialData).
 * Does NOT reverse stock changes — stock updates are permanent.
 * Body: { reason? }
 */

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params

    const report = await prisma.stockTakeReports.findUnique({ where: { id } })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const canVoid = isSystemAdmin(user) || hasPermission(user, 'canAccessFinancialData', report.businessId)
    if (!canVoid) return NextResponse.json({ error: 'Forbidden — requires financial access' }, { status: 403 })

    if (report.status === 'VOIDED') return NextResponse.json({ error: 'Report already voided' }, { status: 409 })

    await prisma.stockTakeReports.update({
      where: { id },
      data: { status: 'VOIDED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[stock-take/reports/void POST]', error)
    return NextResponse.json({ error: 'Void failed' }, { status: 500 })
  }
}
