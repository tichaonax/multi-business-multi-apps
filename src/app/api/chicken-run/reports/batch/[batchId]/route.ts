import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { batchId } = await params
    const batch = await prisma.chickenBatch.findUnique({
      where: { id: batchId },
      include: {
        mortalityLogs: { orderBy: { date: 'asc' } },
        feedLogs: { orderBy: { date: 'asc' } },
        medicationLogs: { orderBy: { date: 'asc' } },
        weightLogs: { orderBy: { weekAge: 'asc' } },
        vaccinationLogs: { orderBy: { date: 'asc' } },
        cullingRecords: {
          include: { birdWeights: { orderBy: { sequenceNo: 'asc' } } },
          orderBy: { cullingDate: 'asc' },
        },
      },
    })

    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    // Metrics
    const totalMortality = batch.mortalityLogs.reduce((s: number, m: { count: number }) => s + m.count, 0)
    const mortalityRate = batch.initialCount > 0 ? (totalMortality / batch.initialCount) * 100 : 0
    const totalFeedCost = batch.feedLogs.reduce((s: number, f: { totalCost: unknown }) => s + Number(f.totalCost), 0)
    const totalMedCost = batch.medicationLogs.reduce((s: number, m: { totalCost: unknown }) => s + Number(m.totalCost), 0)
    const purchaseCost = Number(batch.purchaseCostTotal)
    const totalCost = purchaseCost + totalFeedCost + totalMedCost

    const closedCullings = batch.cullingRecords.filter((c: { weighingStatus: string }) => c.weighingStatus === 'CLOSED')
    const totalCulled = closedCullings.reduce((s: number, c: { quantityCulled: number }) => s + c.quantityCulled, 0)
    const totalCulledWeightKg = closedCullings.reduce((s: number, c: { totalWeightKg: unknown }) => s + Number(c.totalWeightKg), 0)
    const yieldPercent = batch.initialCount > 0 ? (totalCulled / batch.initialCount) * 100 : 0
    const costPerBird = totalCulled > 0 ? totalCost / totalCulled : totalCost / batch.initialCount
    const costPerKg = totalCulledWeightKg > 0 ? totalCost / totalCulledWeightKg : 0
    const totalFeedKg = batch.feedLogs.reduce((s: number, f: { quantityKg: unknown }) => s + Number(f.quantityKg), 0)
    const fcr = totalCulledWeightKg > 0 ? totalFeedKg / totalCulledWeightKg : 0

    const ageInDays = Math.floor((Date.now() - new Date(batch.purchaseDate).getTime()) / 86400000)
    const ageInWeeks = Math.floor(ageInDays / 7)
    const feedStage = ageInWeeks <= 2 ? 'Starter' : ageInWeeks <= 5 ? 'Grower' : 'Finisher'

    // Mortality by reason
    const mortalityByReason: Record<string, number> = {}
    for (const log of batch.mortalityLogs) {
      const r = log.reason as string
      mortalityByReason[r] = (mortalityByReason[r] ?? 0) + log.count
    }

    return NextResponse.json({
      success: true,
      data: {
        ...batch,
        // computed metrics
        totalMortality,
        mortalityRate: parseFloat(mortalityRate.toFixed(2)),
        totalFeedCost,
        totalMedCost,
        purchaseCost,
        totalCost,
        totalCulled,
        totalCulledWeightKg: parseFloat(totalCulledWeightKg.toFixed(3)),
        yieldPercent: parseFloat(yieldPercent.toFixed(2)),
        costPerBird: parseFloat(costPerBird.toFixed(2)),
        costPerKg: parseFloat(costPerKg.toFixed(2)),
        totalFeedKg: parseFloat(totalFeedKg.toFixed(3)),
        fcr: parseFloat(fcr.toFixed(3)),
        ageInDays,
        ageInWeeks,
        feedStage,
        mortalityByReason,
      },
    })
  } catch (error) {
    console.error('GET /api/chicken-run/reports/batch/[batchId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
