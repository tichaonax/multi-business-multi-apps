export type StockStatusLevel = 'out' | 'low' | 'in'

export interface StockStatusResult {
  status: StockStatusLevel
  label: string
  color: string
  canOrder: boolean
}

/**
 * Shared in/low/out-of-stock classification (MBM-294 Phase 8) — extracted
 * from `UniversalProductCard.getStockStatus()` so the image-gallery reverse
 * lookup (and anything else that needs this) reuses the exact same
 * thresholds instead of re-deriving them. Behavior-preserving: with no
 * `reorderLevel` passed, this returns identical output to the original
 * inline implementation.
 */
export function getStockStatus(params: {
  stockQuantity: number
  reorderLevel?: number | null
  hasInventoryTracking?: boolean
}): StockStatusResult {
  const { stockQuantity, reorderLevel, hasInventoryTracking = false } = params

  if (stockQuantity <= 0) {
    return { status: 'out', label: 'Out of Stock', color: 'text-red-600', canOrder: false }
  }

  const threshold = reorderLevel && reorderLevel > 0 ? reorderLevel : (hasInventoryTracking ? 10 : 5)
  if (stockQuantity <= threshold) {
    return { status: 'low', label: `Low Stock (${stockQuantity})`, color: 'text-orange-600', canOrder: true }
  }

  return { status: 'in', label: `In Stock (${stockQuantity})`, color: 'text-green-600', canOrder: true }
}
