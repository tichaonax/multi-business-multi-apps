'use client'

import { useEffect, useState } from 'react'

interface GalleryImage { id: string; imageId: string; url: string }
interface Domain { id: string; name: string; emoji: string }

interface Props {
  businessId: string
  itemId: string
  onSelect: (imageId: string) => void
  onClose: () => void
}

/**
 * Pick an existing reference-pool/product-gallery image as an item's
 * advertising image, instead of uploading a new file (MBM-294 integration).
 *
 * Opens pre-filtered to the item's own category (subcategory -> category ->
 * domain fallback, same endpoint the POS Quick-Edit "Choose from Gallery"
 * picker uses), but lets the category be overridden via the dropdown so any
 * category's pool is browsable — some products don't have great matches in
 * their own category, or the intended ad photo genuinely lives elsewhere.
 * Always by reference — no new `Images` row is created either way.
 */
export function AdImagePoolPicker({ businessId, itemId, onSelect, onClose }: Props) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [domains, setDomains] = useState<Domain[]>([])
  const [domainId, setDomainId] = useState('') // '' = auto-detected from the item's own category

  // Domain list only needs fetching once — independent of which category is
  // currently selected for browsing.
  useEffect(() => {
    fetch(`/api/business/${businessId}/images/reference-pool?limit=1`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setDomains(d?.allDomains ?? []))
      .catch(() => setDomains([]))
  }, [businessId])

  useEffect(() => {
    setLoading(true)
    const url = domainId
      ? `/api/business/${businessId}/images/reference-pool?domainId=${domainId}`
      : `/api/pos/quick-edit/gallery-images?sourceTable=BUSINESS_PRODUCT&itemId=${itemId}`
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        // The two endpoints return slightly different shapes (imageId vs id-as-imageId) — normalize.
        const rows = d?.images ?? []
        setImages(rows.map((r: any) => ({ id: r.id, imageId: r.imageId ?? r.id, url: r.url })))
      })
      .catch(() => setImages([]))
      .finally(() => setLoading(false))
  }, [businessId, itemId, domainId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary">🗂 Choose from Pool</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Category</label>
          <select
            value={domainId}
            onChange={e => setDomainId(e.target.value)}
            className="w-full rounded-md border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white py-1.5 px-2 text-sm"
          >
            <option value="">Auto (this item's own category)</option>
            {domains.map(d => (
              <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-secondary py-8 text-sm">Loading…</p>
        ) : images.length === 0 ? (
          <p className="text-center text-secondary py-8 text-sm">No pool images available yet for this category.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2 max-h-80 overflow-y-auto">
            {images.map(img => (
              <button
                key={img.id}
                onClick={() => onSelect(img.imageId)}
                className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <button onClick={onClose} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}
