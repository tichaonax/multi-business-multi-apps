'use client'

import { useGlobalCart } from '@/contexts/global-cart-context'
import { useToastContext } from '@/components/ui/toast'

export interface LinkedProduct {
  productImageId: string
  productId: string
  productName: string
  sku: string | null
  price: number
  isPrimary: boolean
  stockQuantity: number
  stockLabel: string
  variants: Array<{ id: string; name: string | null; sku: string; stockQuantity: number }>
}

interface Props {
  businessId: string
  businessType: string
  items: LinkedProduct[]
  /** The reference/pool image's own URL — used as the cart line's thumbnail
   * when adding straight to cart from here. */
  imageUrl?: string
  /** Set Primary / Remove — only relevant once viewing from the business's
   * own gallery detail panel. The Reference Pool's lighter attach modal
   * shows this same list read-only (plus Add to Cart), since editing which
   * products use a not-yet-your-own pool image isn't a thing yet. */
  showManageActions?: boolean
  onSetPrimary?: (item: LinkedProduct) => void
  onRemove?: (item: LinkedProduct) => void
  busyProductImageId?: string | null
  emptyLabel?: string
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

/**
 * Shared "which of my products use this image" list, with price and an
 * Add to Cart shortcut per item (MBM-294 follow-up) — used by both the full
 * Business Image Gallery detail panel and the Reference Pool attach modal,
 * so "search for a new product" and "see who's already using this image"
 * live in the same place instead of requiring a tab switch.
 */
export function LinkedProductsList({
  businessId, businessType, items, imageUrl, showManageActions, onSetPrimary, onRemove, busyProductImageId, emptyLabel,
}: Props) {
  const { addToCart } = useGlobalCart()
  const toast = useToastContext()

  // The business you're browsing the pool/gallery for is always the current
  // business here (unlike the global barcode-scan modal's cross-business
  // "Add to Cart", which may need to switch business first) — so a
  // single-variant item can go straight into the global cart in place,
  // without navigating away. That cart is shown app-wide by the header's
  // mini-cart, which is how the user keeps browsing and "checks out" later.
  // A multi- (or zero-) variant item still needs the POS's own size/variant
  // picker, so that case falls back to the old navigate-and-autoAdd route.
  // The global cart also silently refuses any item priced at $0 or less —
  // fall back for those too rather than show a false "Added" toast for
  // something that never actually landed in the cart.
  function handleAddToCart(item: LinkedProduct) {
    if (item.variants.length === 1 && item.price > 0) {
      const variant = item.variants[0]
      addToCart({
        productId: item.productId,
        variantId: variant.id,
        name: item.productName,
        sku: item.sku ?? variant.sku,
        price: item.price,
        stock: item.stockQuantity,
        imageUrl: imageUrl ?? null,
      })
      toast.push(`Added ${item.productName} to cart`, { type: 'success' })
      return
    }

    const url = `/${businessType}/pos?businessId=${businessId}&addProduct=${item.productId}&autoAdd=true`
    if (localStorage.getItem('currentBusinessId') !== businessId) {
      localStorage.setItem('currentBusinessId', businessId)
    }
    window.location.href = url
  }

  if (items.length === 0) {
    return <p className="text-sm text-secondary">{emptyLabel ?? 'Not linked to any product yet.'}</p>
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.productImageId} className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
          <div>
            <div className="font-medium text-primary">
              {item.productName} {item.isPrimary && <span className="text-xs text-blue-600">(primary)</span>}
            </div>
            <div className="text-xs text-secondary">{item.sku ?? '—'} · {fmt(item.price)} · {item.stockLabel}</div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleAddToCart(item)}
              className="text-xs px-2 py-1 rounded border border-blue-300 dark:border-blue-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              🛒 Add to Cart
            </button>
            {showManageActions && !item.isPrimary && onSetPrimary && (
              <button
                onClick={() => onSetPrimary(item)}
                disabled={busyProductImageId === item.productImageId}
                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Set Primary
              </button>
            )}
            {showManageActions && onRemove && (
              <button
                onClick={() => onRemove(item)}
                disabled={busyProductImageId === item.productImageId}
                className="text-xs px-2 py-1 rounded border border-red-300 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
