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

// Distribute itemsBudget across lines proportional to buying cost share.
// minLinePrice: if an item's computed line price (weight × rate) falls below this, it is
// floored to minLinePrice and its excess reserved; remaining budget redistributed iteratively.
function itemPricesForBudget(
  lines: SimulationLine[],
  itemsBudget: number,
  totalWeight: number,
  minLinePrice: number = 0,
): Record<string, number> {
  const empty: Record<string, number> = {}
  for (const l of lines) empty[l.comboItemId] = 0
  if (itemsBudget <= 0 || totalWeight <= 0 || lines.length === 0) return empty

  const result: Record<string, number> = { ...empty }
  let pending = [...lines]
  let budget = itemsBudget

  while (pending.length > 0 && budget > 0) {
    const pricedP   = pending.filter(l => (l.buyingPricePerKg ?? 0) > 0)
    const unpricedP = pending.filter(l => !((l.buyingPricePerKg ?? 0) > 0))
    const unpricedW = unpricedP.reduce((s, l) => s + l.weightKg, 0)
    const pricedCost = pricedP.reduce((s, l) => s + l.buyingPricePerKg! * l.weightKg, 0)
    const pendingW  = pending.reduce((s, l) => s + l.weightKg, 0)

    const shares: Record<string, number> = {}
    if (pricedP.length > 0 && pricedCost > 0) {
      const unpricedBudget = unpricedW > 0 ? (unpricedW / pendingW) * budget : 0
      const pricedBudget   = budget - unpricedBudget
      for (const l of pricedP)   shares[l.comboItemId] = ((l.buyingPricePerKg! * l.weightKg) / pricedCost) * pricedBudget
      if (unpricedW > 0) {
        const uRate = unpricedBudget / unpricedW
        for (const l of unpricedP) shares[l.comboItemId] = l.weightKg * uRate
      }
    } else {
      const rate = budget / pendingW
      for (const l of pending) shares[l.comboItemId] = l.weightKg * rate
    }

    // Identify items whose computed line price falls below the floor
    const belowFloor = minLinePrice > 0
      ? pending.filter(l => l.weightKg > 0 && (shares[l.comboItemId] ?? 0) < minLinePrice)
      : []

    if (belowFloor.length === 0) {
      for (const l of pending) {
        result[l.comboItemId] = l.weightKg > 0 ? round2((shares[l.comboItemId] ?? 0) / l.weightKg) : 0
      }
      break
    }

    // Assign floor rate to violating items, deduct their fixed budget, remove from pending
    for (const l of belowFloor) {
      result[l.comboItemId] = round2(minLinePrice / l.weightKg)
      budget -= minLinePrice
    }
    const flooredIds = new Set(belowFloor.map(l => l.comboItemId))
    pending = pending.filter(l => !flooredIds.has(l.comboItemId))
  }

  return result
}

export interface SizeMultipliers {
  small: number   // always 1 — the simulation IS the small reference
  medium: number  // e.g. 2 → medium holds 2× what small holds
  large: number   // e.g. 3 → large holds 3× what small holds
}

/**
 * Derives per-kg rates from the combo's defined base prices and (optionally) the min meat
 * weight ratios for each size.
 *
 * The simulation fill IS the small reference — rates are set so that at the captured weights,
 * Σ(weight × rate) = itemsBudgetSmall exactly.  For medium/large the reference fill is scaled
 * from the simulation using the ratio of min meat weights (or multipliers as fallback), producing
 * per-kg rates that decrease from Small → Medium → Large.
 *
 * minLinePrice ($0.10): items whose computed line price would fall below this floor are assigned
 * the floor price, and their reserved budget is excluded before redistributing to other items,
 * keeping the items total exactly on budget.
 */
export function computePricingFromBase(
  lines: SimulationLine[],
  targetPrice: number,
  basePrices: { small: number; medium: number; large: number },
  multipliers: SizeMultipliers = DEFAULT_SIZE_MULTIPLIERS,
  minWeights?: { small: number; medium: number; large: number },
  minLinePrice: number = 0.10,
): {
  itemPricesSmall: Record<string, number>
  itemPricesMedium: Record<string, number>
  itemPricesLarge: Record<string, number>
  estimatedMarginPct: number | null
} {
  const empty = { itemPricesSmall: {}, itemPricesMedium: {}, itemPricesLarge: {}, estimatedMarginPct: null }
  const totalSimWeight = lines.reduce((s, l) => s + l.weightKg, 0)
  if (totalSimWeight <= 0 || targetPrice <= 0) return empty

  // Small reference = simulation fill.
  // Medium/large reference = simulation × (minWeight ratio) or × multiplier if not set.
  const allMinSet = (minWeights?.small ?? 0) > 0 && (minWeights?.medium ?? 0) > 0 && (minWeights?.large ?? 0) > 0
  const refSmall  = totalSimWeight
  const refMedium = allMinSet
    ? totalSimWeight * (minWeights!.medium / minWeights!.small)
    : totalSimWeight * multipliers.medium
  const refLarge  = allMinSet
    ? totalSimWeight * (minWeights!.large  / minWeights!.small)
    : totalSimWeight * multipliers.large

  // Revenue target for each size scales with its reference fill weight
  const revSmall  = targetPrice
  const revMedium = targetPrice * (refMedium / refSmall)
  const revLarge  = targetPrice * (refLarge  / refSmall)

  // Item budgets after base price (floored at 0)
  const budgetSmall  = Math.max(0, revSmall  - basePrices.small)
  const budgetMedium = Math.max(0, revMedium - basePrices.medium)
  const budgetLarge  = Math.max(0, revLarge  - basePrices.large)

  // Distribute each size's scaled budget over the simulation weights.
  // For small: scaledBudget = budgetSmall × (sim/refSmall) = budgetSmall × 1 = budgetSmall.
  // For medium/large: scaledBudget < budgetSize → produces lower per-kg rates.
  const smallRates  = itemPricesForBudget(lines, budgetSmall  * (totalSimWeight / refSmall),  totalSimWeight, minLinePrice)
  const mediumRates = itemPricesForBudget(lines, budgetMedium * (totalSimWeight / refMedium), totalSimWeight, minLinePrice)
  const largeRates  = itemPricesForBudget(lines, budgetLarge  * (totalSimWeight / refLarge),  totalSimWeight, minLinePrice)

  const itemPricesSmall:  Record<string, number> = {}
  const itemPricesMedium: Record<string, number> = {}
  const itemPricesLarge:  Record<string, number> = {}

  for (const l of lines) {
    itemPricesSmall[l.comboItemId]  = smallRates[l.comboItemId]  ?? 0
    itemPricesMedium[l.comboItemId] = mediumRates[l.comboItemId] ?? 0
    itemPricesLarge[l.comboItemId]  = largeRates[l.comboItemId]  ?? 0
  }

  const totalCost = lines.reduce((s, l) =>
    s + (l.buyingPricePerKg != null ? l.buyingPricePerKg * l.weightKg : 0), 0)
  const estimatedMarginPct = totalCost > 0
    ? Math.round(((targetPrice - totalCost) / targetPrice) * 100)
    : null

  return { itemPricesSmall, itemPricesMedium, itemPricesLarge, estimatedMarginPct }
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
