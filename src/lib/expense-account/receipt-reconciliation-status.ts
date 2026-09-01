export type ReceiptReconciliationStatus =
  | 'NOT_STARTED'
  | 'PARTIALLY_RECEIPTED'
  | 'PENDING_REVIEW'
  | 'FULLY_RECEIPTED'
  | 'OVER_LIMIT'

export const RECONCILIATION_STATUS_LABELS: Record<ReceiptReconciliationStatus, string> = {
  NOT_STARTED: '⬜ Not Started',
  PARTIALLY_RECEIPTED: '🟡 Partially Receipted',
  PENDING_REVIEW: '🔵 Pending Review',
  FULLY_RECEIPTED: '🟢 Fully Receipted',
  OVER_LIMIT: '🔴 Over Limit',
}

/**
 * MBM-286: a payment's amount-reconciliation state, derived — never stored —
 * from its expected amount, receipt total, and review workflow status
 * (ExpensePaymentReceiptReviews.status, from MBM-271). Computing this on the
 * fly means it can never drift out of sync with the underlying numbers.
 */
export function reconciliationStatus(params: {
  expectedAmount: number
  receiptTotal: number
  reviewStatus: 'PENDING' | 'SUBMITTED' | 'APPROVED'
}): ReceiptReconciliationStatus {
  const { expectedAmount, receiptTotal, reviewStatus } = params

  if (receiptTotal === 0) return 'NOT_STARTED'
  if (receiptTotal > expectedAmount) return 'OVER_LIMIT'
  if (receiptTotal === expectedAmount && reviewStatus === 'APPROVED') return 'FULLY_RECEIPTED'
  if (reviewStatus === 'SUBMITTED') return 'PENDING_REVIEW'
  return 'PARTIALLY_RECEIPTED'
}
