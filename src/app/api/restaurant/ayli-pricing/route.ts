import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { computePricingOptions, SimulationLine, SizeMultipliers } from '@/lib/ayli-pricing-calculator'

const MAX_HISTORY = 5

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const comboId = searchParams.get('comboId')
    if (!comboId) return NextResponse.json({ error: 'comboId required' }, { status: 400 })

    const records = await (prisma as any).ayliPricingCalibrations.findMany({
      where: { comboId },
      orderBy: { version: 'desc' },
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('AYLI pricing GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch calibrations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { comboId, businessId, simulationLines, targetPrice, multipliers } = await req.json()
    if (!comboId || !businessId || !simulationLines || !targetPrice) {
      return NextResponse.json({ error: 'comboId, businessId, simulationLines and targetPrice required' }, { status: 400 })
    }

    const lines: SimulationLine[] = simulationLines
    const sizeMultipliers: SizeMultipliers = multipliers ?? { small: 1, medium: 2, large: 3 }
    const generatedOptions = computePricingOptions(lines, Number(targetPrice), sizeMultipliers)

    // Find next version number (max existing + 1, capped at MAX_HISTORY)
    const existing = await (prisma as any).ayliPricingCalibrations.findMany({
      where: { comboId },
      orderBy: { version: 'desc' },
    })

    let nextVersion: number
    if (existing.length < MAX_HISTORY) {
      nextVersion = (existing[0]?.version ?? 0) + 1
    } else {
      // Delete oldest to make room
      const oldest = existing[existing.length - 1]
      await (prisma as any).ayliPricingCalibrations.delete({ where: { id: oldest.id } })
      nextVersion = (existing[0]?.version ?? 0) + 1
    }

    const record = await (prisma as any).ayliPricingCalibrations.create({
      data: {
        comboId,
        businessId,
        version: nextVersion,
        status: 'DRAFT',
        simulationLines,
        targetPrices: { target: Number(targetPrice), multipliers: sizeMultipliers },
        generatedOptions,
        selectedOptions: {},
      }
    })

    return NextResponse.json({ ...record, generatedOptions }, { status: 201 })
  } catch (error) {
    console.error('AYLI pricing POST error:', error)
    return NextResponse.json({ error: 'Failed to save calibration' }, { status: 500 })
  }
}
