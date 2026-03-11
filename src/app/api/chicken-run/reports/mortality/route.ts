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
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const batches = await prisma.chickenBatch.findMany({
      where: { businessId },
      select: {
        id: true,
        batchNumber: true,
        initialCount: true,
        mortalityLogs: { select: { count: true, reason: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const byReason: Record<string, number> = {
      DISEASE: 0, INJURY: 0, PREDATOR: 0, UNKNOWN: 0, OTHER: 0,
    }
    let totalDeaths = 0

    type BatchRow = typeof batches[number]
    const byBatch = batches.map((b: BatchRow) => {
      const batchByReason: Record<string, number> = {
        DISEASE: 0, INJURY: 0, PREDATOR: 0, UNKNOWN: 0, OTHER: 0,
      }
      let batchTotal = 0
      for (const log of b.mortalityLogs) {
        const r = log.reason as string
        batchByReason[r] = (batchByReason[r] ?? 0) + log.count
        byReason[r] = (byReason[r] ?? 0) + log.count
        batchTotal += log.count
        totalDeaths += log.count
      }
      const mortalityRate = b.initialCount > 0 ? parseFloat(((batchTotal / b.initialCount) * 100).toFixed(2)) : 0
      return {
        batchId: b.id,
        batchNumber: b.batchNumber,
        initialCount: b.initialCount,
        totalDeaths: batchTotal,
        mortalityRate,
        byReason: batchByReason,
      }
    })

    return NextResponse.json({
      success: true,
      data: { byBatch, byReason, totalDeaths },
    })
  } catch (error) {
    console.error('GET /api/chicken-run/reports/mortality error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
