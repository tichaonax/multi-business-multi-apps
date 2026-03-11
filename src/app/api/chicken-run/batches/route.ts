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

    const [batches, vaccinationSchedules] = await Promise.all([
      prisma.chickenBatch.findMany({
        where: { businessId },
        include: {
          supplier: { select: { id: true, name: true } },
          mortalityLogs: { select: { count: true } },
          feedLogs: { select: { totalCost: true } },
          medicationLogs: { select: { totalCost: true } },
          cullingRecords: { select: { quantityCulled: true, totalWeightKg: true, weighingStatus: true } },
          vaccinationLogs: { select: { scheduleId: true } },
          _count: { select: { mortalityLogs: true, feedLogs: true, medicationLogs: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.chickenVaccinationSchedule.findMany({
        where: { businessId, isActive: true },
        select: { id: true, dayAge: true, name: true },
      }),
    ])

    // Compute derived fields
    const result = batches.map((b: typeof batches[0]) => {
      const totalMortality = b.mortalityLogs.reduce((s: number, m: { count: number }) => s + m.count, 0)
      const aliveCount = b.initialCount - totalMortality
      const totalFeedCost = b.feedLogs.reduce((s: number, f: { totalCost: unknown }) => s + Number(f.totalCost), 0)
      const totalMedCost = b.medicationLogs.reduce((s: number, m: { totalCost: unknown }) => s + Number(m.totalCost), 0)
      const ageInDays = Math.floor((Date.now() - new Date(b.purchaseDate).getTime()) / 86400000)
      const ageInWeeks = Math.floor(ageInDays / 7)
      const feedStage = ageInWeeks <= 2 ? 'Starter' : ageInWeeks <= 5 ? 'Grower' : 'Finisher'
      const mortalityRate = b.initialCount > 0 ? ((totalMortality / b.initialCount) * 100).toFixed(1) : '0.0'

      // Vaccination due: schedule dayAge <= batch ageInDays AND not yet logged for this batch
      const loggedScheduleIds = new Set(b.vaccinationLogs.map((v: { scheduleId: string | null }) => v.scheduleId).filter(Boolean))
      const vaccinationsDue = vaccinationSchedules.filter(
        (s: { id: string; dayAge: number }) => ageInDays >= s.dayAge && !loggedScheduleIds.has(s.id)
      ).length

      return {
        ...b,
        currentAliveCount: aliveCount,
        totalFeedCost,
        totalMedCost,
        totalCost: Number(b.purchaseCostTotal) + totalFeedCost + totalMedCost,
        ageInDays,
        ageInWeeks,
        feedStage,
        mortalityRate,
        vaccinationsDue,
        mortalityLogs: undefined,
        feedLogs: undefined,
        medicationLogs: undefined,
        vaccinationLogs: undefined,
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('GET /api/chicken-run/batches error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { businessId, purchaseDate, initialCount, supplierId, purchaseCostTotal, costPerChick, expectedCullDate, notes } = body

    if (!businessId || !purchaseDate || !initialCount || !purchaseCostTotal || !costPerChick) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Auto-generate batch number: BATCH-YYYY-NNN
    const year = new Date(purchaseDate).getFullYear()
    const count = await prisma.chickenBatch.count({ where: { businessId } })
    const batchNumber = `BATCH-${year}-${String(count + 1).padStart(3, '0')}`

    const batch = await prisma.chickenBatch.create({
      data: {
        batchNumber,
        businessId,
        purchaseDate: new Date(purchaseDate),
        initialCount: parseInt(initialCount),
        currentAliveCount: parseInt(initialCount),
        supplierId: supplierId || null,
        purchaseCostTotal: parseFloat(purchaseCostTotal),
        costPerChick: parseFloat(costPerChick),
        expectedCullDate: expectedCullDate ? new Date(expectedCullDate) : null,
        notes: notes || null,
        createdBy: user.id,
        status: 'GROWING',
      }
    })

    return NextResponse.json({ success: true, data: batch }, { status: 201 })
  } catch (error) {
    console.error('POST /api/chicken-run/batches error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
