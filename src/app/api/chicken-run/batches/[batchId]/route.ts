import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const batch = await prisma.chickenBatch.findUnique({
      where: { id: params.batchId },
      include: {
        supplier: { select: { id: true, name: true } },
        mortalityLogs: { orderBy: { date: 'asc' } },
        feedLogs: { include: { supplier: { select: { id: true, name: true } } }, orderBy: { date: 'asc' } },
        medicationLogs: { orderBy: { date: 'asc' } },
        weightLogs: { orderBy: { weekAge: 'asc' } },
        vaccinationLogs: { orderBy: { date: 'asc' } },
        cullingRecords: {
          include: { birdWeights: { orderBy: { sequenceNo: 'asc' } } },
          orderBy: { cullingDate: 'asc' }
        },
      }
    })

    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    // Compute alive count from mortality records
    const totalMortality = batch.mortalityLogs.reduce((s: number, m: { count: number }) => s + m.count, 0)
    const aliveCount = batch.initialCount - totalMortality
    const totalFeedCost = batch.feedLogs.reduce((s: number, f: { totalCost: unknown }) => s + Number(f.totalCost), 0)
    const totalMedCost = batch.medicationLogs.reduce((s: number, m: { totalCost: unknown }) => s + Number(m.totalCost), 0)
    const ageInDays = Math.floor((Date.now() - new Date(batch.purchaseDate).getTime()) / 86400000)
    const ageInWeeks = Math.floor(ageInDays / 7)
    const feedStage = ageInWeeks <= 2 ? 'Starter' : ageInWeeks <= 5 ? 'Grower' : 'Finisher'
    const mortalityRate = batch.initialCount > 0 ? ((totalMortality / batch.initialCount) * 100).toFixed(1) : '0.0'
    const mortalityRateNum = batch.initialCount > 0 ? (totalMortality / batch.initialCount) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        ...batch,
        currentAliveCount: aliveCount,
        totalMortality,
        totalFeedCost,
        totalMedCost,
        totalCost: Number(batch.purchaseCostTotal) + totalFeedCost + totalMedCost,
        ageInDays,
        ageInWeeks,
        feedStage,
        mortalityRate,
        mortalityRateNum,
      }
    })
  } catch (error) {
    console.error('GET /api/chicken-run/batches/[batchId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { status, notes, expectedCullDate } = body

    const batch = await prisma.chickenBatch.update({
      where: { id: params.batchId },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(expectedCullDate !== undefined && { expectedCullDate: expectedCullDate ? new Date(expectedCullDate) : null }),
      }
    })

    return NextResponse.json({ success: true, data: batch })
  } catch (error) {
    console.error('PATCH /api/chicken-run/batches/[batchId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
