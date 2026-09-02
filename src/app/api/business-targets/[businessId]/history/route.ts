import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/** GET /api/business-targets/[businessId]/history — MBM-288 §2.3/§5.2, paginated. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '25'))
    const offset = parseInt(searchParams.get('offset') || '0')

    const [rows, total] = await Promise.all([
      prisma.businessTargetOverrideHistory.findMany({
        where: { businessId },
        include: { changer: { select: { id: true, name: true } } },
        orderBy: { changedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.businessTargetOverrideHistory.count({ where: { businessId } }),
    ])

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        previousValue: r.previousValue ? Number(r.previousValue) : null,
        newValue: r.newValue ? Number(r.newValue) : null,
      })),
      pagination: { total, limit, offset },
    })
  } catch (error) {
    console.error('Error fetching business target history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
