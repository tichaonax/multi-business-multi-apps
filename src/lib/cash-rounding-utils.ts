export type RoundDirection = 'UP' | 'DOWN' | 'EXACT'

export interface CashRoundingConfig {
  enabled: boolean
  step: number
  upThreshold: number
}

export interface CashRoundingResult {
  originalAmount: number
  roundedAmount: number
  adjustment: number      // positive = up, negative = down
  direction: RoundDirection
  isAutoApply: boolean    // true when |adjustment| <= upThreshold
}

export interface AYLILine {
  poolItemId: string
  productName: string
  emoji: string
  weightKg: number
  pricePerKg: number
  linePrice: number
}

export interface AYLIDistributionResult {
  lines: AYLILine[]
  totalPrice: number
}

export function getCashRoundingConfig(business: {
  cashRoundingEnabled?: boolean | null
  cashRoundingStep?: number | string | null
  cashRoundingUpThreshold?: number | string | null
}): CashRoundingConfig {
  return {
    enabled: business.cashRoundingEnabled ?? true,
    step: business.cashRoundingStep != null ? Number(business.cashRoundingStep) : 0.50,
    upThreshold: business.cashRoundingUpThreshold != null ? Number(business.cashRoundingUpThreshold) : 0.05,
  }
}

export function calcCashRounding(amount: number, config: CashRoundingConfig): CashRoundingResult {
  if (!config.enabled || amount <= 0) {
    return { originalAmount: amount, roundedAmount: amount, adjustment: 0, direction: 'EXACT', isAutoApply: false }
  }

  const { step, upThreshold } = config
  const roundUp = Math.ceil(amount / step) * step
  const roundDown = Math.floor(amount / step) * step

  // Already on a step boundary
  if (Math.abs(amount - roundDown) < 0.001) {
    return { originalAmount: amount, roundedAmount: amount, adjustment: 0, direction: 'EXACT', isAutoApply: false }
  }

  const upDiff = Math.round((roundUp - amount) * 100) / 100
  const downDiff = Math.round((amount - roundDown) * 100) / 100

  // Always prefer rounding up; round down only when explicitly triggered by user
  // upDiff < step is always true here (we already handled the exact case)
  const isAutoApply = upDiff <= upThreshold

  return {
    originalAmount: amount,
    roundedAmount: roundUp,
    adjustment: upDiff,
    direction: 'UP',
    isAutoApply,
  }
}

// Spreads `adjustment` proportionally across AYLI lines using largest-remainder
// so the sum of new linePrices equals exactly originalTotal + adjustment.
export function distributeRoundingAdjustment(
  lines: AYLILine[],
  adjustment: number
): AYLIDistributionResult {
  if (lines.length === 0) return { lines: [], totalPrice: 0 }

  const totalLinePrice = lines.reduce((sum, l) => sum + l.linePrice, 0)
  const adjCents = Math.round(adjustment * 100)

  // Compute raw (fractional) cent share per line
  const rawShares = lines.map((l) => (l.linePrice / totalLinePrice) * adjCents)

  // Floor each share, then distribute remainder cents to lines with largest fractions
  const floored = rawShares.map(Math.floor)
  const remainder = adjCents - floored.reduce((s, v) => s + v, 0)
  const fractions = rawShares.map((r, i) => ({ i, frac: r - floored[i] }))
  fractions.sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < remainder; k++) floored[fractions[k].i]++

  const newLines = lines.map((l, i) => {
    const newLinePrice = Math.round((l.linePrice + floored[i] / 100) * 100) / 100
    const newPricePerKg = l.weightKg > 0 ? Math.round((newLinePrice / l.weightKg) * 100) / 100 : l.pricePerKg
    return { ...l, linePrice: newLinePrice, pricePerKg: newPricePerKg }
  })

  const newTotal = Math.round(newLines.reduce((s, l) => s + l.linePrice, 0) * 100) / 100

  return { lines: newLines, totalPrice: newTotal }
}
