import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const type = searchParams.get('type') // 'utility' | 'labor' | null (both)

    const [utilityCosts, laborLogs] = await Promise.all([
      type === 'labor' ? [] : prisma.chickenUtilityCost.findMany({
        where: { businessId },
        orderBy: { date: 'desc' },
      }),
      type === 'utility' ? [] : prisma.chickenLaborLog.findMany({
        where: { businessId },
        orderBy: { date: 'desc' },
      }),
    ])

    const totalUtility = (utilityCosts as Array<{ totalCost: unknown }>).reduce(
      (sum: number, c: { totalCost: unknown }) => sum + Number(c.totalCost), 0
    )
    const totalLabor = (laborLogs as Array<{ totalCost: unknown }>).reduce(
      (sum: number, l: { totalCost: unknown }) => sum + Number(l.totalCost), 0
    )

    return NextResponse.json({
      success: true,
      data: { utilityCosts, laborLogs, totalUtility, totalLabor },
    })
  } catch (error) {
    console.error('GET /api/chicken-run/costs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
