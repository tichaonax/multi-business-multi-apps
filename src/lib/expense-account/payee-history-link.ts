// MBM-330 — link to a payee's Payee History report (all time), used wherever a
// receipt or combo line item shows who was paid. Null for one-time (FREEFORM)
// payees and anything without a real payee record.
export function payeeHistoryHref(type: string | null | undefined, id: string | null | undefined, name: string | null | undefined): string | null {
  if (!type || !id || type === 'FREEFORM' || type === 'COMBO') return null
  const params = new URLSearchParams({ payeeType: type, payeeId: id, payeeName: name || '', allTime: 'true' })
  return `/expense-accounts/reports/payee-history?${params.toString()}`
}

/** Receipt rows carry the payee as type + one of three id columns */
export function receiptPayeeHistoryHref(r: {
  payeeType: string | null
  payeePersonId: string | null
  payeeBusinessId: string | null
  payeeSupplierId: string | null
  payeeName: string | null
}): string | null {
  const id = r.payeeType === 'PERSON' ? r.payeePersonId : r.payeeType === 'BUSINESS' ? r.payeeBusinessId : r.payeeType === 'SUPPLIER' ? r.payeeSupplierId : null
  return payeeHistoryHref(r.payeeType, id, r.payeeName)
}
