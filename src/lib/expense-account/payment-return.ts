// MBM-308: shared helpers for the standalone/advance payment "return unused
// funds" workflow (return-request / return-confirm routes, and the
// reminder sweep's return-aware outstanding calculation).

export function returnConfirmGroupKey(paymentId: string): string {
  return `return-confirm:${paymentId}`
}
