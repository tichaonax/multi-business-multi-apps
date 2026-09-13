'use client'

import Link from 'next/link'

interface ProductCellProps {
  imageUrl: string | null
  name: string
  sku?: string | null
  subtitle?: string | null
  businessType: string | null
  editItemId: string
  canEdit: boolean
  /** The report page's own path, e.g. "/inventory/reports/pricing-exceptions" — closing the edit form navigates back here instead of stranding the user on the generic inventory page. */
  returnTo?: string
}

/**
 * MBM-296 follow-up — shared "which product is this" cell for every
 * pricing/inventory report table: a thumbnail (when the item has one) plus
 * the product name, linking to that item's edit screen for users who can
 * manage inventory (reusing the existing `?productId=` deep-link already
 * supported by every business type's inventory page — see e.g.
 * src/app/grocery/inventory/page.tsx's productId effect). Users without
 * canManageInventory just see the plain name — no link, since none of these
 * inventory pages currently have a separate read-only detail view to send
 * them to instead.
 */
export function ProductCell({ imageUrl, name, sku, subtitle, businessType, editItemId, canEdit, returnTo }: ProductCellProps) {
  const href = businessType
    ? `/${businessType}/inventory?productId=${encodeURIComponent(editItemId)}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`
    : null

  return (
    <div className="flex items-center gap-2 min-w-0">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800" />
      ) : (
        <span className="w-8 h-8 rounded flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-[8px] text-secondary flex-shrink-0">No image</span>
      )}
      <div className="min-w-0">
        {canEdit && href ? (
          <Link href={href} className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block" title="Edit this item">
            {name}
          </Link>
        ) : (
          <p className="font-medium text-primary truncate">{name}</p>
        )}
        {sku && <p className="text-xs text-gray-400">{sku}</p>}
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  )
}
