import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/eod/overrides?businessId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns all manager override records for the audit trail (Phase 12).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const perms = getEffectivePermissions(user, businessId)
    if (user.role !== 'admin' && !perms.canCloseBooks) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const where: any = { businessId, isManagerOverride: true }
    if (from || to) {
      where.reportDate = {}
      if (from) where.reportDate.gte = new Date(from + 'T00:00:00')
      if (to) {
        const toDate = new Date(to + 'T00:00:00')
        toDate.setHours(23, 59, 59, 999)
        where.reportDate.lte = toDate
      }
    }

    const records = await prisma.salespersonEodReport.findMany({
      where,
      include: {
        salesperson: { select: { id: true, name: true, email: true } },
        submittedBy: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: records })
  } catch (error: any) {
    console.error('[eod/overrides GET]', error)
    return NextResponse.json({ error: 'Failed to fetch override log' }, { status: 500 })
  }
}
