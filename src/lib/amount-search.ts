// Whole-dollar amount search, client-side counterpart to the server-side
// search in expense-account/[accountId]/transactions/route.ts — "$20" or
// "20" matches $20.00 through $20.99, ignoring cents (and any cents typed
// in the search term itself, so "20.50" matches the same $20.xx range
// rather than requiring an exact cents match).
export function parseWholeDollarSearch(search: string): number | null {
  const cleaned = search.trim().replace(/^\$/, '')
  return /^\d+(\.\d+)?$/.test(cleaned) ? Math.floor(parseFloat(cleaned)) : null
}

export function matchesAmountSearch(amount: number | null | undefined, search: string): boolean {
  if (amount == null) return false
  const whole = parseWholeDollarSearch(search)
  return whole !== null && Math.floor(amount) === whole
}
