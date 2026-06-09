export interface SimulationLine {
  comboItemId: string
  poolItemId: string
  name: string
  emoji: string
  weightKg: number
  itemCategory: string
  buyingPricePerKg: number | null
}

// One option covers all 3 sizes together — base scales with size, per-kg decreases accordingly
export interface AyliPricingOption {
  // Base prices per size (increasing: small < medium < large)
  basePriceSmall: number
  basePriceMedium: number
  basePriceLarge: number
  // Per-kg selling prices per item per size (decreasing: small > medium > large)
  itemPricesSmall: Record<string, number>   // comboItemId → $/kg
  itemPricesMedium: Record<string, number>
  itemPricesLarge: Record<string, number>
  // Effective $/kg per size (base+items / simWeight — decreasing with size)
  effectiveRateSmall: number
  effectiveRateMedium: number
  effectiveRateLarge: number
  estimatedMarginPct: number | null
}

// Default: medium holds 2× small weight, large holds 3× small weight
const DEFAULT_SIZE_MULTIPLIERS = { small: 1, medium: 2, large: 3 }

// 5 options: fraction of target that goes to the base (for the small reference size)
const BASE_FRACTIONS = [0, 0.08, 0.16, 0.24, 0.32]

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function itemPricesForBudget(
  lines: SimulationLine[],
  itemsBudget: number,
  totalWeight: number
): Record<string, number> {
  const pricedLines = lines.filter(l => l.buyingPricePerKg != null && l.buyingPricePerKg > 0)
  const unpricedLines = lines.filter(l => l.buyingPricePerKg == null || l.buyingPricePerKg <= 0)
  const unpricedWeight = unpricedLines.reduce((s, l) => s + l.weightKg, 0)
  const pricedCost = pricedLines.reduce((s, l) => s + l.buyingPricePerKg! * l.weightKg, 0)

  const result: Record<string, number> = {}

  if (pricedLines.length > 0 && pricedCost > 0) {
    const unpricedBudget = unpricedWeight > 0 ? (unpricedWeight / totalWeight) * itemsBudget : 0
    const pricedBudget = itemsBudget - unpricedBudget

    for (const l of pricedLines) {
      const costShare = (l.buyingPricePerKg! * l.weightKg) / pricedCost
      result[l.comboItemId] = round2((costShare * pricedBudget) / l.weightKg)
    }
    if (unpricedWeight > 0) {
      const rate = round2(unpricedBudget / unpricedWeight)
      for (const l of unpricedLines) result[l.comboItemId] = rate
    }
  } else {
    const rate = round2(itemsBudget / totalWeight)
    for (const l of lines) result[l.comboItemId] = rate
  }

  return result
}

export interface SizeMultipliers {
  small: number   // always 1 — the simulation IS the small reference
  medium: number  // e.g. 2 → medium holds 2× what small holds
  large: number   // e.g. 3 → large holds 3× what small holds
}

export function computePricingOptions(
  lines: SimulationLine[],
  targetPrice: number,   // small portion target selling price
  multipliers: SizeMultipliers = DEFAULT_SIZE_MULTIPLIERS,
): AyliPricingOption[] {
  const totalWeight = lines.reduce((s, l) => s + l.weightKg, 0)
  if (totalWeight <= 0 || targetPrice <= 0) return []

  const totalCost = lines.reduce((s, l) =>
    s + (l.buyingPricePerKg != null ? l.buyingPricePerKg * l.weightKg : 0), 0)

  return BASE_FRACTIONS.map(fraction => {
    // Base scales with size multiplier — larger size pays more upfront, less per-kg
    const basePriceSmall = round2(targetPrice * fraction * multipliers.small)
    const basePriceMedium = round2(targetPrice * fraction * multipliers.medium)
    const basePriceLarge = round2(targetPrice * fraction * multipliers.large)

    // Items budget = target − base (less budget for items as base grows)
    const budgetSmall = Math.max(0, targetPrice - basePriceSmall)
    const budgetMedium = Math.max(0, targetPrice - basePriceMedium)
    const budgetLarge = Math.max(0, targetPrice - basePriceLarge)

    // Per-kg prices proportional to buying costs within each size's budget
    const itemPricesSmall = itemPricesForBudget(lines, budgetSmall, totalWeight)
    const itemPricesMedium = itemPricesForBudget(lines, budgetMedium, totalWeight)
    const itemPricesLarge = itemPricesForBudget(lines, budgetLarge, totalWeight)

    // Effective rate = total / simWeight (per-kg equivalent of the full combo price)
    const effectiveRateSmall = round2(targetPrice / totalWeight)   // same for all — total is fixed
    const effectiveRateMedium = round2(targetPrice / totalWeight)
    const effectiveRateLarge = round2(targetPrice / totalWeight)

    const estimatedMarginPct = totalCost > 0
      ? Math.round(((targetPrice - totalCost) / targetPrice) * 100)
      : null

    return {
      basePriceSmall, basePriceMedium, basePriceLarge,
      itemPricesSmall, itemPricesMedium, itemPricesLarge,
      effectiveRateSmall, effectiveRateMedium, effectiveRateLarge,
      estimatedMarginPct,
    }
  })
}
