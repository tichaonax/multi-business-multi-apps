import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasPermission(user, 'canCreateAYLICombos')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { calibrationId } = await req.json()
    if (!calibrationId) return NextResponse.json({ error: 'calibrationId required' }, { status: 400 })

    const calibration = await (prisma as any).ayliPricingCalibrations.findUnique({
      where: { id: calibrationId },
    })
    if (!calibration) return NextResponse.json({ error: 'Calibration not found' }, { status: 404 })

    const selectedOptions = calibration.selectedOptions as Record<string, number>
    const generatedOptions = calibration.generatedOptions as Record<string, any[]>
    const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large']

    const comboItemUpdates: Map<string, { small?: number; medium?: number; large?: number }> = new Map()
    const basePriceUpdates: Map<string, number> = new Map()

    for (const sizeName of sizes) {
      const idx = selectedOptions[sizeName]
      if (idx == null) continue
      const option = generatedOptions[sizeName]?.[idx]
      if (!option) continue

      basePriceUpdates.set(sizeName, option.basePrice)

      for (const [comboItemId, pricePerKg] of Object.entries(option.itemPrices as Record<string, number>)) {
        if (!comboItemUpdates.has(comboItemId)) comboItemUpdates.set(comboItemId, {})
        comboItemUpdates.get(comboItemId)![sizeName as 'small' | 'medium' | 'large'] = pricePerKg
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const [comboItemId, prices] of comboItemUpdates.entries()) {
        const data: any = {}
        if (prices.small != null) data.pricePerKgSmall = prices.small
        if (prices.medium != null) data.pricePerKgMedium = prices.medium
        if (prices.large != null) data.pricePerKgLarge = prices.large
        await tx.asYouLikeItComboItems.update({ where: { id: comboItemId }, data })
      }

      const combo = await tx.asYouLikeItCombos.findUnique({
        where: { id: calibration.comboId },
        include: { sizes: true },
      })
      for (const [sizeName, basePrice] of basePriceUpdates.entries()) {
        const sizeRecord = combo?.sizes.find((s: any) => s.sizeName === sizeName)
        if (sizeRecord) {
          await tx.asYouLikeItComboSizes.update({ where: { id: sizeRecord.id }, data: { basePrice } })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('AYLI pricing restore error:', error)
    return NextResponse.json({ error: 'Failed to restore pricing' }, { status: 500 })
  }
}
