/**
 * MBM-350 — shared by every till. Before payment, ask the server for the
 * current price of each cart line (/api/pos/current-prices) and report the
 * lines whose price has changed since they were added. The till then corrects
 * those lines and shows `priceChangeAlert(...)`, so the cashier confirms the
 * new total before the customer pays.
 *
 * Never blocks a sale on its own failure: if the server can't be reached this
 * returns no changes and the till carries on with the cart as it is.
 */
import type { ReactNode } from 'react'

export interface PriceCheckLine {
  /** The till's own id for the cart line — returned in the changes */
  key: string
  name: string
  price: number
  productId?: string
  variantId?: string
  inventoryItemId?: string
  baleId?: string
}

export interface PriceChange {
  key: string
  name: string
  oldPrice: number
  newPrice: number
}

export async function findPriceChanges(businessId: string | null | undefined, lines: PriceCheckLine[]): Promise<PriceChange[]> {
  // A $0 line is deliberately free (reward, BOGO) — never "correct" it
  const toCheck = lines.filter(l => Number(l.price) > 0 && (l.productId || l.variantId || l.inventoryItemId || l.baleId))
  if (!businessId || toCheck.length === 0) return []
  try {
    const res = await fetch('/api/pos/current-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        lines: toCheck.map(({ key, productId, variantId, inventoryItemId, baleId }) => ({ key, productId, variantId, inventoryItemId, baleId })),
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    const prices: Record<string, number | null> = data?.prices ?? {}
    const changes: PriceChange[] = []
    for (const l of toCheck) {
      const now = prices[l.key]
      if (now == null || now <= 0) continue
      if (Math.abs(now - Number(l.price)) >= 0.005) changes.push({ key: l.key, name: l.name, oldPrice: Number(l.price), newPrice: now })
    }
    return changes
  } catch (e) {
    console.error('[price-check] could not read current prices, continuing with cart prices:', e)
    return []
  }
}

/** Splits an `inv_<id>` / `bale_<id>` style cart id into the right lookup field. */
export function lineIdsFromCartId(id: string | undefined): Pick<PriceCheckLine, 'productId' | 'inventoryItemId' | 'baleId'> {
  if (!id) return {}
  if (id.startsWith('inv_')) return { inventoryItemId: id.slice(4) }
  if (id.startsWith('bale_')) return { baleId: id.slice(5) }
  if (id.startsWith('cbulk_')) return {}
  return { productId: id }
}

export function priceChangeAlert(changes: PriceChange[], currency: (n: number) => string = n => `$${n.toFixed(2)}`): { title: string; description: ReactNode } {
  return {
    title: 'Prices have changed',
    description: (
      <div>
        <p>The cart has been updated to today&apos;s prices. Check the new total with the customer, then take payment again.</p>
        <ul className="mt-2 list-disc pl-5">
          {changes.map(c => <li key={c.key}>{c.name}: {currency(c.oldPrice)} → {currency(c.newPrice)}</li>)}
        </ul>
      </div>
    ),
  }
}
