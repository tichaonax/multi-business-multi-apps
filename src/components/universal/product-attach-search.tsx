'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'

/**
 * Debounced "search a product, click to attach this image to it" control —
 * shared by the Business Image Gallery's per-image detail panel and the
 * Reference Pool browser (MBM-294). Always attaches by reference via the
 * existing `POST .../images/from-gallery` endpoint (Phase 4) — never
 * duplicates the image blob.
 *
 * Scanner support (same pattern as `product-search-modal.tsx` elsewhere in
 * this app): the input is autofocused, so a physical barcode scanner's
 * keystrokes just type into it like a fast typist — no separate scan
 * handling needed. `GET /api/universal/products` already matches `search`
 * against product/variant barcodes as well as name/SKU, and the call is
 * already scoped to this `businessId`, so a scanned code can only ever
 * resolve to a product in the current business.
 */
export function ProductAttachSearch({ businessId, imageId, onAttached }: { businessId: string; imageId: string; onAttached: () => void }) {
  const toast = useToastContext()
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; sku: string }>>([])
  const [searching, setSearching] = useState(false)
  const [attaching, setAttaching] = useState(false)

  useEffect(() => {
    const text = searchText.trim()
    if (!text) { setSearchResults([]); return }
    setSearching(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/universal/products?businessId=${businessId}&search=${encodeURIComponent(text)}&limit=8&page=1`)
        const data = await res.json().catch(() => ({}))
        setSearchResults(res.ok ? (data.data ?? []) : [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [searchText, businessId])

  async function handleAttach(productId: string) {
    setAttaching(true)
    try {
      const res = await fetch(`/api/universal/products/${productId}/images/from-gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: [imageId] }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to attach image') }
      toast.push('Image added to product')
      setSearchText('')
      setSearchResults([])
      // Reach the live customer display as early as possible — the newly
      // attached image becomes the product's primary photo immediately, and
      // the display's own per-item image already falls back to that when no
      // dedicated advertising image is set, but only on its own refresh.
      const bc = new BroadcastChannel('customer-display')
      bc.postMessage({ type: 'DISPLAY_REFRESH', businessId, terminalId: null, payload: {} })
      bc.close()
      onAttached()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to attach image')
    } finally {
      setAttaching(false)
    }
  }

  return (
    <div>
      <input
        type="text"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        placeholder="Search by name, SKU, or scan a barcode..."
        autoFocus
        className="w-full text-sm rounded-md border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white py-1.5 px-2"
      />
      {searching && <p className="text-xs text-secondary mt-1">Searching…</p>}
      {searchResults.length > 0 && (
        <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
          {searchResults.map(p => (
            <button
              key={p.id}
              onClick={() => handleAttach(p.id)}
              disabled={attaching}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {p.name} <span className="text-xs text-secondary">({p.sku})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
