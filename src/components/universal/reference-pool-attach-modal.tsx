'use client'

import { ProductAttachSearch } from '@/components/universal/product-attach-search'

interface Props {
  businessId: string
  imageId: string
  url: string
  /** How many of this business's own products already use this image —
   * shown so it's clear an earlier attach actually took, not just relying on
   * the grid's badge (MBM-294 follow-up). */
  linkedItemCount: number
  /** Called on close; `attached` is true if the image was just attached to a
   * product — worth refreshing the caller's own gallery/pool view. */
  onClose: (attached: boolean) => void
}

/**
 * Lightweight "attach this reference-pool image to one of my products" modal
 * (MBM-294) — unlike the full Business Image Gallery detail modal, a pool
 * image isn't "this business's own" yet, so there's nothing to tag, no
 * linked-items list, no primary/remove actions. Once attached, it shows up
 * in the full detail modal from the business's own gallery going forward.
 */
export function ReferencePoolAttachModal({ businessId, imageId, url, linkedItemCount, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onClose(false)}>
      <div className="card w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary">Reference Image</h3>
          <button onClick={() => onClose(false)} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
        </div>

        <div className="w-full aspect-video rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
          <img src={url} alt="" className="max-w-full max-h-full object-contain" />
        </div>

        <p className="text-xs text-secondary">
          {linkedItemCount > 0
            ? `This image is from the shared category reference pool — already used by ${linkedItemCount} of your product${linkedItemCount === 1 ? '' : 's'}.`
            : 'This image is from the shared category reference pool — not tied to any of your products yet.'}
        </p>

        <div>
          <p className="text-xs font-medium text-secondary mb-1">Add to a product</p>
          <ProductAttachSearch businessId={businessId} imageId={imageId} onAttached={() => onClose(true)} />
        </div>

        <button onClick={() => onClose(false)} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
