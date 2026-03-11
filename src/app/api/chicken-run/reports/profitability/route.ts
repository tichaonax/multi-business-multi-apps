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

    // Raised batches (COMPLETED or CULLING) with culling records
    const batches = await prisma.chickenBatch.findMany({
      where: {
        businessId,
        status: { in: ['COMPLETED', 'CULLING'] },
      },
      include: {
        feedLogs: { select: { totalCost: true } },
        medicationLogs: { select: { totalCost: true } },
        cullingRecords: {
          where: { weighingStatus: 'CLOSED' },
          select: { quantityCulled: true, totalWeightKg: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    type BatchRow = typeof batches[number]
    const batchBreakdown = batches
      .map((b: BatchRow) => {
        const totalFeedCost = b.feedLogs.reduce((s: number, f: { totalCost: unknown }) => s + Number(f.totalCost), 0)
        const totalMedCost = b.medicationLogs.reduce((s: number, m: { totalCost: unknown }) => s + Number(m.totalCost), 0)
        const totalCost = Number(b.purchaseCostTotal) + totalFeedCost + totalMedCost
        const totalCulledWeightKg = b.cullingRecords.reduce((s: number, c: { totalWeightKg: unknown }) => s + Number(c.totalWeightKg), 0)
        const totalCulled = b.cullingRecords.reduce((s: number, c: { quantityCulled: number }) => s + c.quantityCulled, 0)
        const raisedCostPerKg = totalCulledWeightKg > 0 ? totalCost / totalCulledWeightKg : 0
        return {
          batchId: b.id,
          batchNumber: b.batchNumber,
          status: b.status,
          totalCulled,
          totalCulledWeightKg: parseFloat(totalCulledWeightKg.toFixed(3)),
          totalCost: parseFloat(totalCost.toFixed(2)),
          raisedCostPerKg: parseFloat(raisedCostPerKg.toFixed(2)),
        }
      })
      .filter((b: { totalCulledWeightKg: number }) => b.totalCulledWeightKg > 0)

    const raisedTotal = batchBreakdown.reduce((s: number, b: { totalCulledWeightKg: number }) => s + b.totalCulledWeightKg, 0)
    const raisedTotalCost = batchBreakdown.reduce((s: number, b: { totalCost: number }) => s + b.totalCost, 0)
    const raisedAvgCostPerKg = raisedTotal > 0 ? raisedTotalCost / raisedTotal : 0

    // Purchased inventory (CLOSED, source=PURCHASED)
    const purchasedInventory = await prisma.chickenInventory.findMany({
      where: { businessId, source: 'PURCHASED', weighingStatus: 'CLOSED' },
      select: { costPerKg: true, totalWeightKg: true },
    })

    let purchasedAvgCostPerKg = 0
    if (purchasedInventory.length > 0) {
      const totalPurchasedWeight = purchasedInventory.reduce((s: number, i: { totalWeightKg: unknown }) => s + Number(i.totalWeightKg), 0)
      const totalPurchasedCost = purchasedInventory.reduce((s: number, i: { costPerKg: unknown; totalWeightKg: unknown }) => s + Number(i.costPerKg) * Number(i.totalWeightKg), 0)
      purchasedAvgCostPerKg = totalPurchasedWeight > 0 ? totalPurchasedCost / totalPurchasedWeight : 0
    }

    const savingsPerKg = purchasedAvgCostPerKg - raisedAvgCostPerKg

    return NextResponse.json({
      success: true,
      data: {
        batches: batchBreakdown,
        raisedAvgCostPerKg: parseFloat(raisedAvgCostPerKg.toFixed(2)),
        purchasedAvgCostPerKg: parseFloat(purchasedAvgCostPerKg.toFixed(2)),
        savingsPerKg: parseFloat(savingsPerKg.toFixed(2)),
      },
    })
  } catch (error) {
    console.error('GET /api/chicken-run/reports/profitability error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
