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

    const { calibrationId, selectedOptions, customPrices } = await req.json()
    // selectedOptions: { optionIndex: number } — single index into flat options array
    // customPrices (optional): { itemPrices: { [comboItemId]: { small, medium, large } }, basePrices: { small, medium, large } }
    if (!calibrationId || selectedOptions == null) {
      return NextResponse.json({ error: 'calibrationId and selectedOptions required' }, { status: 400 })
    }

    const calibration = await (prisma as any).ayliPricingCalibrations.findUnique({
      where: { id: calibrationId },
    })
    if (!calibration) return NextResponse.json({ error: 'Calibration not found' }, { status: 404 })

    const raw = calibration.generatedOptions as any
    let option: any

    if (customPrices) {
      // User-edited prices from the pricing table — use directly, skip option lookup
      const ip = customPrices.itemPrices as Record<string, { small: number; medium: number; large: number }>
      option = {
        basePriceSmall:   customPrices.basePrices?.small  ?? 0,
        basePriceMedium:  customPrices.basePrices?.medium ?? 0,
        basePriceLarge:   customPrices.basePrices?.large  ?? 0,
        itemPricesSmall:  Object.fromEntries(Object.entries(ip).map(([id, p]) => [id, (p as any).small])),
        itemPricesMedium: Object.fromEntries(Object.entries(ip).map(([id, p]) => [id, (p as any).medium])),
        itemPricesLarge:  Object.fromEntries(Object.entries(ip).map(([id, p]) => [id, (p as any).large])),
      }
    } else if (Array.isArray(raw)) {
      // New format: flat array, single optionIndex
      const idx = selectedOptions.optionIndex ?? 0
      option = raw[idx]
      if (!option) return NextResponse.json({ error: 'Option index out of range' }, { status: 400 })
    } else if (raw?.small && Array.isArray(raw.small)) {
      // Old format: {small:[...], medium:[...], large:[...]} with per-size selected indices
      const si = selectedOptions.small ?? 0
      const mi = selectedOptions.medium ?? selectedOptions.small ?? 0
      const li = selectedOptions.large  ?? selectedOptions.small ?? 0
      const s = raw.small[si]  ?? raw.small[0]  ?? {}
      const m = raw.medium[mi] ?? raw.medium[0] ?? {}
      const l = raw.large[li]  ?? raw.large[0]  ?? {}
      // Normalise to new unified shape
      option = {
        basePriceSmall:   s.basePrice ?? 0,
        basePriceMedium:  m.basePrice ?? 0,
        basePriceLarge:   l.basePrice ?? 0,
        itemPricesSmall:  s.itemPrices ?? {},
        itemPricesMedium: m.itemPrices ?? {},
        itemPricesLarge:  l.itemPrices ?? {},
      }
    } else {
      return NextResponse.json({ error: 'Unrecognised calibration format' }, { status: 422 })
    }

    // option has: basePriceSmall/Medium/Large, itemPricesSmall/Medium/Large
    await prisma.$transaction(async (tx) => {
      const sizeMap: Array<{ key: 'Small' | 'Medium' | 'Large'; sizeName: string }> = [
        { key: 'Small', sizeName: 'small' },
        { key: 'Medium', sizeName: 'medium' },
        { key: 'Large', sizeName: 'large' },
      ]

      // Update combo items — each size has its own itemPrices map
      const allComboItemIds = new Set([
        ...Object.keys(option.itemPricesSmall ?? {}),
        ...Object.keys(option.itemPricesMedium ?? {}),
        ...Object.keys(option.itemPricesLarge ?? {}),
      ])
      for (const comboItemId of allComboItemIds) {
        await tx.asYouLikeItComboItems.update({
          where: { id: comboItemId },
          data: {
            pricePerKgSmall: option.itemPricesSmall?.[comboItemId] ?? 0,
            pricePerKgMedium: option.itemPricesMedium?.[comboItemId] ?? 0,
            pricePerKgLarge: option.itemPricesLarge?.[comboItemId] ?? 0,
          },
        })
      }

      // Update combo sizes — base prices + meat thresholds from simulation
      const combo = await tx.asYouLikeItCombos.findUnique({
        where: { id: calibration.comboId },
        include: { sizes: true },
      })

      // Derive meat threshold from the first meat item captured in the simulation
      const simLines = calibration.simulationLines as Array<{ weightKg: number; itemCategory: string }>
      const firstMeatLine = simLines.find(l => l.itemCategory === 'MEAT')
      const firstMeatKg = firstMeatLine?.weightKg ?? null

      // Multipliers stored when calibration was created
      const storedMultipliers = (calibration.targetPrices as any)?.multipliers ?? { small: 1, medium: 2, large: 3 }
      const meatThresholds: Record<string, number | null> = {
        small: firstMeatKg,
        medium: firstMeatKg != null ? Math.round(firstMeatKg * storedMultipliers.medium * 1000) / 1000 : null,
        large:  firstMeatKg != null ? Math.round(firstMeatKg * storedMultipliers.large  * 1000) / 1000 : null,
      }

      for (const { key, sizeName } of sizeMap) {
        const sizeRecord = combo?.sizes.find((s: any) => s.sizeName === sizeName)
        const basePrice = option[`basePrice${key}`]
        if (sizeRecord) {
          const data: any = {}
          if (basePrice != null) data.basePrice = basePrice
          if (meatThresholds[sizeName] != null) data.meatThresholdKg = meatThresholds[sizeName]
          if (Object.keys(data).length) {
            await tx.asYouLikeItComboSizes.update({ where: { id: sizeRecord.id }, data })
          }
        }
      }

      // Mark calibration as applied
      await (tx as any).ayliPricingCalibrations.update({
        where: { id: calibrationId },
        data: { status: 'APPLIED', selectedOptions, appliedAt: new Date() },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('AYLI pricing apply error:', error)
    return NextResponse.json({ error: 'Failed to apply pricing' }, { status: 500 })
  }
}
