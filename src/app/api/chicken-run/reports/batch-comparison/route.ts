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
    const batchIdsParam = searchParams.get('batchIds')
    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })
    if (!batchIdsParam) return NextResponse.json({ error: 'batchIds required' }, { status: 400 })

    const batchIds = batchIdsParam.split(',').map(s => s.trim()).filter(Boolean)
    if (batchIds.length < 2) return NextResponse.json({ error: 'At least 2 batchIds required' }, { status: 400 })

    const batches = await prisma.chickenBatch.findMany({
      where: { id: { in: batchIds }, businessId },
      include: {
        mortalityLogs: { select: { count: true } },
        feedLogs: { select: { totalCost: true, quantityKg: true } },
        medicationLogs: { select: { totalCost: true } },
        cullingRecords: {
          where: { weighingStatus: 'CLOSED' },
          select: { quantityCulled: true, totalWeightKg: true },
        },
      },
    })

    type BatchRow = typeof batches[number]
    const result = batches.map((b: BatchRow) => {
      const totalMortality = b.mortalityLogs.reduce((s: number, m: { count: number }) => s + m.count, 0)
      const mortalityRate = b.initialCount > 0 ? parseFloat(((totalMortality / b.initialCount) * 100).toFixed(2)) : 0
      const totalFeedCost = b.feedLogs.reduce((s: number, f: { totalCost: unknown }) => s + Number(f.totalCost), 0)
      const totalMedCost = b.medicationLogs.reduce((s: number, m: { totalCost: unknown }) => s + Number(m.totalCost), 0)
      const totalCost = Number(b.purchaseCostTotal) + totalFeedCost + totalMedCost
      const totalCulled = b.cullingRecords.reduce((s: number, c: { quantityCulled: number }) => s + c.quantityCulled, 0)
      const totalCulledWeightKg = b.cullingRecords.reduce((s: number, c: { totalWeightKg: unknown }) => s + Number(c.totalWeightKg), 0)
      const yieldPercent = b.initialCount > 0 ? parseFloat(((totalCulled / b.initialCount) * 100).toFixed(2)) : 0
      const costPerBird = totalCulled > 0 ? totalCost / totalCulled : totalCost / b.initialCount
      const costPerKg = totalCulledWeightKg > 0 ? totalCost / totalCulledWeightKg : 0
      const totalFeedKg = b.feedLogs.reduce((s: number, f: { quantityKg: unknown }) => s + Number(f.quantityKg), 0)
      const fcr = totalCulledWeightKg > 0 ? totalFeedKg / totalCulledWeightKg : 0
      const ageInDays = Math.floor((Date.now() - new Date(b.purchaseDate).getTime()) / 86400000)

      return {
        batchId: b.id,
        batchNumber: b.batchNumber,
        status: b.status,
        initialCount: b.initialCount,
        ageInDays,
        totalCost: parseFloat(totalCost.toFixed(2)),
        costPerBird: parseFloat(costPerBird.toFixed(2)),
        costPerKg: parseFloat(costPerKg.toFixed(2)),
        fcr: parseFloat(fcr.toFixed(3)),
        mortalityRate,
        yieldPercent,
        totalCulled,
        totalCulledWeightKg: parseFloat(totalCulledWeightKg.toFixed(3)),
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('GET /api/chicken-run/reports/batch-comparison error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
