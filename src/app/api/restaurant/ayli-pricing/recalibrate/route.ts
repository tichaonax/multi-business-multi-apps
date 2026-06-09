import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'
import { computePricingOptions, SimulationLine, SizeMultipliers } from '@/lib/ayli-pricing-calculator'

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canCreateAYLICombos')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { calibrationId, targetPrice: fallbackTargetPrice } = await req.json()
    if (!calibrationId) return NextResponse.json({ error: 'calibrationId required' }, { status: 400 })

    const calibration = await (prisma as any).ayliPricingCalibrations.findUnique({
      where: { id: calibrationId },
    })
    if (!calibration) return NextResponse.json({ error: 'Calibration not found' }, { status: 404 })

    // Restore target price and multipliers from stored targetPrices, with fallback from request
    const storedTarget = (calibration.targetPrices as any)?.target ?? (fallbackTargetPrice ? Number(fallbackTargetPrice) : null)
    const storedMultipliers: SizeMultipliers = (calibration.targetPrices as any)?.multipliers
      ?? { small: 1, medium: 2, large: 3 }

    if (!storedTarget) {
      return NextResponse.json({ error: 'No target price found in this calibration' }, { status: 422 })
    }

    // Load current buying prices from pool items to override what was stored in simulation lines
    const storedLines = calibration.simulationLines as Array<{
      comboItemId: string; poolItemId: string; name: string; emoji: string
      weightKg: number; itemCategory: string; buyingPricePerKg: number | null
    }>

    const poolItemIds = [...new Set(storedLines.map(l => l.poolItemId))]
    const poolItems = await prisma.asYouLikeItPoolItems.findMany({
      where: { id: { in: poolItemIds } },
      select: { id: true, buyingPricePerKg: true },
    })
    const currentBuyingPrices: Record<string, number | null> = {}
    for (const pi of poolItems) {
      currentBuyingPrices[pi.id] = pi.buyingPricePerKg != null ? Number(pi.buyingPricePerKg) : null
    }

    // Rebuild simulation lines with current buying prices
    const updatedLines: SimulationLine[] = storedLines.map(l => ({
      ...l,
      buyingPricePerKg: currentBuyingPrices[l.poolItemId] ?? null,
    }))

    // Re-run the pricing algorithm with same weights + current costs
    const generatedOptions = computePricingOptions(updatedLines, storedTarget, storedMultipliers)

    // Update the SAME calibration record in-place (no new record)
    const updated = await (prisma as any).ayliPricingCalibrations.update({
      where: { id: calibrationId },
      data: {
        simulationLines: updatedLines,
        generatedOptions,
        targetPrices: { target: storedTarget, multipliers: storedMultipliers },
        status: 'DRAFT',
        appliedAt: null,
      },
    })

    return NextResponse.json({ ...updated, generatedOptions })
  } catch (error) {
    console.error('AYLI recalibrate error:', error)
    return NextResponse.json({ error: 'Failed to recalibrate' }, { status: 500 })
  }
}
