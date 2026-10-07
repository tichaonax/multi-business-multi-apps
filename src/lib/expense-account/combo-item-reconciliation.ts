// MBM-303: shared per-item receipt-accountability logic — used by the combo
// request detail GET route (to show the "accounted for" chip) and the
// receipt-approve gate (to block the cashier's final sign-off). Keeping this
// in one place means the two can never drift out of sync with each other.

export interface ComboItemForReconciliation {
  id: string
  description: string
  approvedAmount: number | null
  estimatedAmount: number | null
  noReceiptReason: string | null
  receipts: { amount: number }[]
}

// Mirrors combo-request-mark-paid-modal.tsx's `originalAmount` exactly:
// approvedAmount > 0 takes precedence over estimatedAmount; approvedAmount
// === 0 means "not funded" (excluded from a partial approval, never counts
// toward accountability).
export function comboItemTargetAmount(item: { approvedAmount: number | null; estimatedAmount: number | null }): number {
  if (item.approvedAmount !== null) {
    return item.approvedAmount > 0 ? item.approvedAmount : 0
  }
  return item.estimatedAmount ?? 0
}

export function comboItemIsExcluded(item: { approvedAmount: number | null }): boolean {
  return item.approvedAmount !== null && item.approvedAmount === 0
}

export function comboItemReceiptedAmount(item: { receipts: { amount: number }[] }): number {
  return item.receipts.reduce((sum, r) => sum + Number(r.amount), 0)
}

export function isComboItemAccountedFor(item: ComboItemForReconciliation): boolean {
  if (comboItemIsExcluded(item)) return true
  if (item.noReceiptReason) return true
  const target = comboItemTargetAmount(item)
  const receipted = comboItemReceiptedAmount(item)
  return receipted >= target - 0.01
}
