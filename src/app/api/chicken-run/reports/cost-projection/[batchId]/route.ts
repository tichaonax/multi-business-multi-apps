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
        feedLogs: { select: { totalCost: true } },
        medicationLogs: { select: { totalCost: true } },
        weightLogs: { orderBy: { weekAge: 'desc' }, take: 1 },
        cullingRecords: {
          where: { weighingStatus: 'CLOSED' },
          select: { quantityCulled: true, totalWeightKg: true },
        },
      },
    })

    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const totalFeedCost = batch.feedLogs.reduce((s: number, f: { totalCost: unknown }) => s + Number(f.totalCost), 0)
    const totalMedCost = batch.medicationLogs.reduce((s: number, m: { totalCost: unknown }) => s + Number(m.totalCost), 0)
    const currentTotalCost = Number(batch.purchaseCostTotal) + totalFeedCost + totalMedCost

    const ageInDays = Math.max(1, Math.floor((Date.now() - new Date(batch.purchaseDate).getTime()) / 86400000))
    const costPerDay = currentTotalCost / ageInDays

    // Determine expected cull date and remaining days
    const STANDARD_CULL_DAYS = 56
    const expectedCullDate = batch.expectedCullDate
      ? new Date(batch.expectedCullDate)
      : new Date(new Date(batch.purchaseDate).getTime() + STANDARD_CULL_DAYS * 86400000)

    const remainingDays = Math.max(0, Math.floor((expectedCullDate.getTime() - Date.now()) / 86400000))
    const projectedTotalCost = currentTotalCost + costPerDay * remainingDays

    // Avg weight: use latest weight log or default 1.8kg
    const latestWeight = batch.weightLogs[0]
    const avgWeightKg = latestWeight ? Number(latestWeight.avgWeightKg) : 1.8

    const projectedCostPerBird = batch.initialCount > 0 ? projectedTotalCost / batch.initialCount : 0
    const projectedTotalWeightKg = batch.initialCount * avgWeightKg
    const projectedCostPerKg = projectedTotalWeightKg > 0 ? projectedTotalCost / projectedTotalWeightKg : 0

    return NextResponse.json({
      success: true,
      data: {
        currentCost: parseFloat(currentTotalCost.toFixed(2)),
        projectedTotalCost: parseFloat(projectedTotalCost.toFixed(2)),
        projectedCostPerBird: parseFloat(projectedCostPerBird.toFixed(2)),
        projectedCostPerKg: parseFloat(projectedCostPerKg.toFixed(2)),
        remainingDays,
        ageInDays,
        costPerDay: parseFloat(costPerDay.toFixed(2)),
        expectedCullDate: expectedCullDate.toISOString(),
        avgWeightKgUsed: avgWeightKg,
      },
    })
  } catch (error) {
    console.error('GET /api/chicken-run/reports/cost-projection/[batchId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
