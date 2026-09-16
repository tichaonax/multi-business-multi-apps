/**
 * MBM-296 — shared financial math for product pricing/cost/value reports.
 *
 * Pure, side-effect-free functions used both server-side (the pricing
 * exceptions report and its siblings) and by the live PricingCalculator
 * component, so the "below cost" / "below landed cost" logic a user sees
 * while entering a price never drifts from what the exceptions report later
 * flags for the same product.
 */

export interface PricingExceptionConfig {
  minimumMarginPct: number
  maximumMarginPct: number
  priceChangeAlertPct: number
  decimalErrorMultiples: number[]
  benchmarkTolerancePct: number
  highImpactThreshold: number
}

export const DEFAULT_PRICING_EXCEPTION_CONFIG: PricingExceptionConfig = {
  minimumMarginPct: 10,
  maximumMarginPct: 90,
  priceChangeAlertPct: 30,
  decimalErrorMultiples: [10, 100, 0.1, 0.01],
  benchmarkTolerancePct: 50,
  highImpactThreshold: 100,
}

export function unitProfitLoss(sellingPrice: number, costPrice: number): number {
  return sellingPrice - costPrice
}

/** Gross margin %, defined against selling price. Null when sellingPrice <= 0 (undefined margin). */
export function grossMarginPct(sellingPrice: number, costPrice: number): number | null {
  if (!sellingPrice || sellingPrice <= 0) return null
  return ((sellingPrice - costPrice) / sellingPrice) * 100
}

export function isLossMaking(sellingPrice: number, costPrice: number): boolean {
  return sellingPrice < costPrice
}

export function isZeroMargin(sellingPrice: number, costPrice: number): boolean {
  return sellingPrice === costPrice
}

export type ExceptionType =
  | 'NO_SELLING_PRICE'
  | 'NO_COST_PRICE'
  | 'NO_PRICE_AT_ALL'
  | 'HIDDEN_FROM_POS'
  | 'VISIBLE_AT_ZERO_PRICE'
  | 'BELOW_COST'
  | 'ZERO_MARGIN'
  | 'LOW_MARGIN'
  | 'HIGH_MARGIN_OUTLIER'
  | 'SELLING_PRICE_CHANGED'
  | 'COST_PRICE_CHANGED'
  | 'BENCHMARK_MISMATCH'
  | 'LIKELY_DECIMAL_ERROR'
  | 'NEGATIVE_VALUE'
  | 'HIGH_FINANCIAL_IMPACT'
  | 'BULK_COST_ALLOCATION_ISSUE'

export type ExceptionSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface SuspiciousFlag {
  type: ExceptionType
  severity: ExceptionSeverity
  reason: string
  suggestedAction: string
}

export interface CategoryBenchmark {
  categoryId: string
  peerCount: number
  avgSellingPrice: number | null
  medianSellingPrice: number | null
  avgMarginPct: number | null
}

export interface PreviousPrices {
  previousSellingPrice: number | null
  previousCostPrice: number | null
}

/** MBM-297 — the product's on-file bulk-pack cost/quantity, if any (Phase B's
 * new fields). `null`/`undefined` on either means "not recorded" — never
 * inferred from `costPrice`, since assuming the current cost price IS the
 * bulk cost would be a guess the reviewing user can't verify either. */
export interface BulkCostInfo {
  unitsPerPack: number | null
  bulkPackCost: number | null
}

const SUGGEST = {
  setSellingPrice: 'Set selling price',
  setCostPrice: 'Set cost price',
  reviewPricing: 'Review pricing',
  reviewUnitOfMeasure: 'Review unit of measure',
  correctDecimalError: 'Correct possible decimal error',
  correctBulkPackQuantity: 'Correct bulk pack quantity',
  setUpBulkPackCost: 'Set up bulk pack cost',
  increaseSellingPrice: 'Increase selling price',
  approveBelowCost: 'Approve below-cost sale',
  reviewSupplierCostIncrease: 'Review supplier cost increase',
  reviewPriceChange: 'Review price change',
  reviewProductSetup: 'Review product setup',
} as const

/**
 * Detects every applicable exception for one product record. A product can
 * carry multiple flags at once (e.g. BELOW_COST *and* LIKELY_DECIMAL_ERROR) —
 * the caller decides how to summarise/sort them for display.
 */
export function detectSuspicious(
  input: {
    sellingPrice: number | null
    costPrice: number | null
    quantityOnHand: number
    quantitySoldInPeriod: number
    posAvailabilityStatus: 'AVAILABLE' | 'HIDDEN_NO_PRICE' | 'VISIBLE_AT_ZERO_PRICE' | 'INACTIVE'
  },
  config: PricingExceptionConfig = DEFAULT_PRICING_EXCEPTION_CONFIG,
  benchmark: CategoryBenchmark | null = null,
  previous: PreviousPrices | null = null,
  bulkCost: BulkCostInfo | null = null
): SuspiciousFlag[] {
  const flags: SuspiciousFlag[] = []
  const { sellingPrice, costPrice } = input

  const hasSelling = sellingPrice !== null && sellingPrice !== undefined
  const hasCost = costPrice !== null && costPrice !== undefined
  const validSelling = hasSelling && sellingPrice! > 0
  const validCost = hasCost && costPrice! > 0

  if (hasSelling && sellingPrice! < 0) {
    flags.push({ type: 'NEGATIVE_VALUE', severity: 'CRITICAL', reason: 'Selling price is negative', suggestedAction: SUGGEST.reviewProductSetup })
  }
  if (hasCost && costPrice! < 0) {
    flags.push({ type: 'NEGATIVE_VALUE', severity: 'CRITICAL', reason: 'Cost price is negative', suggestedAction: SUGGEST.reviewProductSetup })
  }

  if (!hasCost && !hasSelling) {
    flags.push({ type: 'NO_PRICE_AT_ALL', severity: 'CRITICAL', reason: 'Both cost price and selling price are missing', suggestedAction: SUGGEST.setCostPrice })
  } else {
    if (!validSelling) {
      flags.push({ type: 'NO_SELLING_PRICE', severity: 'CRITICAL', reason: 'No selling price, or selling price is zero/invalid', suggestedAction: SUGGEST.setSellingPrice })
    }
    if (!validCost) {
      flags.push({ type: 'NO_COST_PRICE', severity: 'WARNING', reason: 'No cost price, or cost price is zero/invalid', suggestedAction: SUGGEST.setCostPrice })
    }
  }

  if (input.posAvailabilityStatus === 'HIDDEN_NO_PRICE') {
    flags.push({ type: 'HIDDEN_FROM_POS', severity: 'WARNING', reason: 'Product is filtered out of the POS listing because it has no valid selling price', suggestedAction: SUGGEST.setSellingPrice })
  }
  if (input.posAvailabilityStatus === 'VISIBLE_AT_ZERO_PRICE') {
    flags.push({ type: 'VISIBLE_AT_ZERO_PRICE', severity: 'CRITICAL', reason: 'Product has no selling price but remains visible and sellable in the POS at $0.00', suggestedAction: SUGGEST.setSellingPrice })
  }

  if (validSelling && validCost) {
    if (isLossMaking(sellingPrice!, costPrice!)) {
      flags.push({ type: 'BELOW_COST', severity: 'CRITICAL', reason: `Selling price ($${sellingPrice!.toFixed(2)}) is below cost price ($${costPrice!.toFixed(2)})`, suggestedAction: SUGGEST.approveBelowCost })
    } else if (isZeroMargin(sellingPrice!, costPrice!)) {
      flags.push({ type: 'ZERO_MARGIN', severity: 'WARNING', reason: 'Selling price equals cost price — zero gross profit', suggestedAction: SUGGEST.increaseSellingPrice })
    } else {
      const margin = grossMarginPct(sellingPrice!, costPrice!)
      if (margin !== null && margin < config.minimumMarginPct) {
        flags.push({ type: 'LOW_MARGIN', severity: 'WARNING', reason: `Gross margin (${margin.toFixed(1)}%) is below the configured minimum (${config.minimumMarginPct}%)`, suggestedAction: SUGGEST.increaseSellingPrice })
      } else if (margin !== null && margin > config.maximumMarginPct) {
        // An unusually high margin isn't necessarily wrong — could be a
        // legitimately premium item — but is worth a look, same tier as
        // LOW_MARGIN: could just as easily be a cost-side decimal error.
        flags.push({ type: 'HIGH_MARGIN_OUTLIER', severity: 'WARNING', reason: `Gross margin (${margin.toFixed(1)}%) is above the configured maximum (${config.maximumMarginPct}%)`, suggestedAction: SUGGEST.reviewPricing })
      }
    }

    // Likely decimal-placement error: selling price is ~10x/100x/0.1x/0.01x
    // of cost price in a way that produces an absurd margin either direction.
    for (const multiple of config.decimalErrorMultiples) {
      const expected = costPrice! * multiple
      if (expected > 0 && Math.abs(sellingPrice! - expected) / expected < 0.05 && multiple !== 1) {
        flags.push({ type: 'LIKELY_DECIMAL_ERROR', severity: 'CRITICAL', reason: `Selling price looks like cost price shifted by a factor of ${multiple}× — possible decimal entry error`, suggestedAction: SUGGEST.correctDecimalError })
        break
      }
    }

    const highImpact = Math.abs(unitProfitLoss(sellingPrice!, costPrice!)) * Math.max(input.quantityOnHand, input.quantitySoldInPeriod)
    if (isLossMaking(sellingPrice!, costPrice!) && highImpact >= config.highImpactThreshold) {
      flags.push({ type: 'HIGH_FINANCIAL_IMPACT', severity: 'CRITICAL', reason: `Potential loss of $${highImpact.toFixed(2)} across current stock/recent sales exceeds the $${config.highImpactThreshold} threshold`, suggestedAction: SUGGEST.approveBelowCost })
    }

    // Bulk Cost Allocation Issue (MBM-297) — a case/bulk-pack purchase cost
    // saved as if it were the cost of one individual unit. Two distinct
    // signals, deliberately never guessing the bulk cost from costPrice
    // alone — the reviewing user may not know that number either, so only a
    // bulk cost that was actually recorded gets the strong, direct check.
    if (bulkCost && bulkCost.bulkPackCost !== null && bulkCost.bulkPackCost > 0) {
      const unitsPerPack = bulkCost.unitsPerPack ?? 1
      const closeToBulkCost = Math.abs(costPrice! - bulkCost.bulkPackCost) / bulkCost.bulkPackCost < 0.05
      if (unitsPerPack <= 1 && closeToBulkCost) {
        flags.push({
          type: 'BULK_COST_ALLOCATION_ISSUE',
          severity: 'CRITICAL',
          reason: `Recorded unit cost ($${costPrice!.toFixed(2)}) matches the bulk-pack cost on file ($${bulkCost.bulkPackCost.toFixed(2)}) with only ${unitsPerPack} unit(s) per pack recorded — looks like the full case cost, not the per-unit cost`,
          suggestedAction: SUGGEST.correctBulkPackQuantity,
        })
      }
    } else {
      // No bulk cost on file at all — a softer, heuristic-only signal: a
      // low-value item selling below cost with a meaningful $ impact is the
      // classic shape of this mistake, but confirming it needs the user to
      // supply the real bulk cost via the full item editor, not a guess here.
      const lowValueItem = sellingPrice! > 0 && sellingPrice! < 20
      if (isLossMaking(sellingPrice!, costPrice!) && lowValueItem && highImpact >= config.highImpactThreshold) {
        flags.push({
          type: 'BULK_COST_ALLOCATION_ISSUE',
          severity: 'WARNING',
          reason: `Low-value item selling below cost with a significant potential impact ($${highImpact.toFixed(2)}) — a common pattern when a bulk/case purchase cost was recorded as the cost of one individual unit`,
          suggestedAction: SUGGEST.setUpBulkPackCost,
        })
      }
    }
  }

  if (validSelling && benchmark && benchmark.peerCount >= 5 && benchmark.avgSellingPrice) {
    const diffPct = (Math.abs(sellingPrice! - benchmark.avgSellingPrice) / benchmark.avgSellingPrice) * 100
    if (diffPct > config.benchmarkTolerancePct) {
      flags.push({
        type: 'BENCHMARK_MISMATCH',
        severity: 'INFO',
        reason: `Selling price differs from the category average ($${benchmark.avgSellingPrice.toFixed(2)}, ${benchmark.peerCount} peers) by ${diffPct.toFixed(0)}%`,
        suggestedAction: SUGGEST.reviewProductSetup,
      })
    }
  }

  if (previous) {
    if (validSelling && previous.previousSellingPrice && previous.previousSellingPrice > 0) {
      const diffPct = (Math.abs(sellingPrice! - previous.previousSellingPrice) / previous.previousSellingPrice) * 100
      if (diffPct > config.priceChangeAlertPct) {
        flags.push({ type: 'SELLING_PRICE_CHANGED', severity: 'INFO', reason: `Selling price changed by ${diffPct.toFixed(0)}% from the previous price ($${previous.previousSellingPrice.toFixed(2)})`, suggestedAction: SUGGEST.reviewPriceChange })
      }
    }
    if (validCost && previous.previousCostPrice && previous.previousCostPrice > 0) {
      const diffPct = ((costPrice! - previous.previousCostPrice) / previous.previousCostPrice) * 100
      if (Math.abs(diffPct) > config.priceChangeAlertPct) {
        flags.push({ type: 'COST_PRICE_CHANGED', severity: 'INFO', reason: `Cost price changed by ${diffPct.toFixed(0)}% from the previous cost ($${previous.previousCostPrice.toFixed(2)})`, suggestedAction: SUGGEST.reviewSupplierCostIncrease })
      }
    }
  }

  return flags
}

export function highestSeverity(flags: SuspiciousFlag[]): ExceptionSeverity | null {
  if (flags.some(f => f.severity === 'CRITICAL')) return 'CRITICAL'
  if (flags.some(f => f.severity === 'WARNING')) return 'WARNING'
  if (flags.length > 0) return 'INFO'
  return null
}
