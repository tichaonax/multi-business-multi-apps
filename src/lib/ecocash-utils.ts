/**
 * EcoCash fee utilities — single source of truth for all businesses.
 *
 * ALL POS pages and order-creation paths must use these helpers.
 * Never inline the fee formula in a component — route every calculation
 * through here so a bug or rule change is fixed in one place.
 *
 * Config fields read from any business/config object:
 *   ecocashFeeType     'FIXED' | 'PERCENTAGE'   default: 'FIXED'
 *   ecocashFeeValue    number                    default: 0
 *   ecocashMinimumFee  number                    default: 0  (PERCENTAGE only)
 */

export interface EcocashConfig {
  feeType: string    // 'FIXED' | 'PERCENTAGE'
  feeValue: number   // flat amount (FIXED) or percentage rate (PERCENTAGE)
  minimumFee: number // minimum charge floor — only applied for PERCENTAGE type
}

/**
 * Extract EcoCash fee configuration from any business or config object.
 * Centralises the field-name knowledge so callers never touch raw strings.
 */
export function getEcocashConfig(business: any): EcocashConfig {
  return {
    feeType: business?.ecocashFeeType ?? 'FIXED',
    feeValue: Number(business?.ecocashFeeValue ?? 0),
    minimumFee: Number(business?.ecocashMinimumFee ?? 0),
  }
}

/**
 * Core fee calculation — accepts explicit config values.
 *
 * FIXED:      returns feeValue regardless of amount
 * PERCENTAGE: returns (amount × feeValue%) subject to minimumFee floor
 */
export function calcEcocashFee(
  amount: number,
  feeType: string,
  feeValue: number,
  minimumFee: number = 0,
): number {
  if (feeType === 'FIXED') return feeValue
  const pct = (amount * feeValue) / 100
  return Math.max(pct, minimumFee)
}

/**
 * Calculate the EcoCash fee from a business/config object directly.
 * Use this everywhere in POS pages — one line replaces ~5 lines of config reading.
 *
 * @example
 *   const fee = calcEcocashFeeFromBusiness(totals.total, currentBusiness)
 */
export function calcEcocashFeeFromBusiness(amount: number, business: any): number {
  const { feeType, feeValue, minimumFee } = getEcocashConfig(business)
  return calcEcocashFee(amount, feeType, feeValue, minimumFee)
}

/**
 * Return a complete EcoCash payment summary: fee, customer total, and a
 * human-readable fee label for display in the UI and on receipts.
 *
 * @example
 *   const { fee, total, feeLabel } = getEcocashSummary(totals.total, currentBusiness)
 *   // fee      = 0.50
 *   // total    = 2.20
 *   // feeLabel = "3.5%, min $0.50"
 */
export function getEcocashSummary(
  amount: number,
  business: any,
): { fee: number; total: number; feeLabel: string } {
  const { feeType, feeValue, minimumFee } = getEcocashConfig(business)
  const fee = calcEcocashFee(amount, feeType, feeValue, minimumFee)
  const total = amount + fee

  let feeLabel: string
  if (feeType === 'FIXED') {
    feeLabel = 'Fixed'
  } else {
    feeLabel = minimumFee > 0
      ? `${feeValue}%, min $${minimumFee.toFixed(2)}`
      : `${feeValue}%`
  }

  return { fee, total, feeLabel }
}
