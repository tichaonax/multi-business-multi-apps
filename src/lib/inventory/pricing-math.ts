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
  priceChangeAlertPct: number
  decimalErrorMultiples: number[]
  benchmarkTolerancePct: number
  highImpactThreshold: number
}

export const DEFAULT_PRICING_EXCEPTION_CONFIG: PricingExceptionConfig = {
  minimumMarginPct: 10,
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

const SUGGEST = {
  setSellingPrice: 'Set selling price',
  setCostPrice: 'Set cost price',
  reviewUnitOfMeasure: 'Review unit of measure',
  correctDecimalError: 'Correct possible decimal error',
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
  previous: PreviousPrices | null = null
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
