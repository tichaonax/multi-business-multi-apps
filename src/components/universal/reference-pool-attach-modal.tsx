'use client'

import { useState, useEffect } from 'react'
import { ProductAttachSearch } from '@/components/universal/product-attach-search'
import { LinkedProductsList, LinkedProduct } from '@/components/universal/linked-products-list'

interface Props {
  businessId: string
  businessType: string
  imageId: string
  url: string
  /** How many of this business's own products already use this image —
   * shown so it's clear an earlier attach actually took, not just relying on
   * the grid's badge (MBM-294 follow-up). */
  linkedItemCount: number
  /** How many *other* businesses' products already use this shared image —
   * shown separately from `linkedItemCount` (this business's own count) as
   * groundwork for opening the pool to more business types later. */
  otherBusinessCount: number
  /** Called on close; `attached` is true if the image was just attached to a
   * product — worth refreshing the caller's own gallery/pool view. */
  onClose: (attached: boolean) => void
}

/**
 * "Attach this reference-pool image to one of my products" modal (MBM-294).
 * Shows the image's existing associations (if any) with price, stock, and an
 * Add to Cart shortcut right alongside the search-to-attach box, so seeing
 * who already uses it and adding a new one don't require two separate trips.
 */
export function ReferencePoolAttachModal({ businessId, businessType, imageId, url, linkedItemCount, otherBusinessCount, onClose }: Props) {
  const [linkedItems, setLinkedItems] = useState<LinkedProduct[]>([])
  const [loadingLinks, setLoadingLinks] = useState(linkedItemCount > 0)
  const [changed, setChanged] = useState(false)

  useEffect(() => {
    // A pool image with nothing attached yet has nothing to fetch (and would
    // 404 — see the detail endpoint's visibility guard) — skip the call.
    if (linkedItemCount === 0) { setLoadingLinks(false); return }
    let cancelled = false
    setLoadingLinks(true)
    fetch(`/api/business/${businessId}/images/${imageId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) setLinkedItems(d?.linkedItems ?? []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingLinks(false) })
    return () => { cancelled = true }
  }, [businessId, imageId, linkedItemCount])

  function handleAttached() {
    setChanged(true)
    // Stay open (unlike a plain one-shot attach-and-close) and refetch so the
    // just-added product shows up in "Your products using this image" right
    // away — lets you confirm it worked, or keep adding more, without
    // reopening the modal.
    fetch(`/api/business/${businessId}/images/${imageId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setLinkedItems(d.linkedItems ?? []) })
      .catch(() => {})
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onClose(changed)}>
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary">Reference Image</h3>
          <button onClick={() => onClose(changed)} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
        </div>

        <div className="w-full aspect-video rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
          <img src={url} alt="" className="max-w-full max-h-full object-contain" />
        </div>

        <p className="text-xs text-secondary">
          {linkedItemCount > 0
            ? `This image is from the shared category reference pool — already used by ${linkedItemCount} of your product${linkedItemCount === 1 ? '' : 's'}.`
            : 'This image is from the shared category reference pool — not tied to any of your products yet.'}
          {otherBusinessCount > 0 && (
            <> Also used by <strong>{otherBusinessCount}</strong> other business{otherBusinessCount === 1 ? '' : 'es'} on this pool image.</>
          )}
        </p>

        {(loadingLinks || linkedItems.length > 0) && (
          <div>
            <p className="text-xs font-medium text-secondary mb-2">Your products using this image</p>
            {loadingLinks ? (
              <p className="text-sm text-secondary">Loading…</p>
            ) : (
              <LinkedProductsList
                businessId={businessId}
                businessType={businessType}
                items={linkedItems}
                emptyLabel="Not linked to any of your products yet."
              />
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-secondary mb-1">Add to a product</p>
          <ProductAttachSearch businessId={businessId} imageId={imageId} onAttached={handleAttached} />
        </div>

        <button onClick={() => onClose(changed)} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
