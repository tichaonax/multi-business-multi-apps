/**
 * Calculate the EcoCash fee for a given transaction amount.
 * - FIXED: always returns feeValue regardless of amount
 * - PERCENTAGE: returns (amount × rate%) floored to minimumFee
 */
export function calcEcocashFee(
  amount: number,
  feeType: string,
  feeValue: number,
  minimumFee: number = 0
): number {
  if (feeType === 'FIXED') return feeValue
  const pct = (amount * feeValue) / 100
  return Math.max(pct, minimumFee)
}
