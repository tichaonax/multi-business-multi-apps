'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import { ImageGalleryDetailModal } from '@/components/universal/image-gallery-detail-modal'
import { ImageGalleryInsights } from '@/components/universal/image-gallery-insights'
import { ReferencePoolAttachModal } from '@/components/universal/reference-pool-attach-modal'
import { ReferencePoolBulkUploadModal } from '@/components/universal/reference-pool-bulk-upload-modal'

interface Business {
  id: string
  name: string
  type: string
}

interface GalleryImage {
  id: string
  url: string
  createdAt: string
  uploaderName: string | null
  tags: string[]
  linkedItemCount: number
  stockStatuses: Array<'in' | 'low' | 'out'>
}

interface PoolImage { id: string; url: string }
interface PoolDomain { id: string; name: string; emoji: string; count: number }

const STOCK_BADGE: Record<'in' | 'low' | 'out', { label: string; color: string }> = {
  in: { label: 'In Stock', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  low: { label: 'Low Stock', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  out: { label: 'Out of Stock', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
}

const PAGE_SIZE = 48

export default function ImageGalleryPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const toast = useToastContext()

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessesLoaded, setBusinessesLoaded] = useState(false)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [images, setImages] = useState<GalleryImage[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)

  const [search, setSearch] = useState('')
  const [hasInventory, setHasInventory] = useState<'all' | 'true' | 'false'>('all')
  const [stockStatus, setStockStatus] = useState<'all' | 'in' | 'low' | 'out'>('all')
  const [tag, setTag] = useState('')
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

  const [view, setView] = useState<'mine' | 'pool'>('mine')
  const [poolImages, setPoolImages] = useState<PoolImage[]>([])
  const [poolTotal, setPoolTotal] = useState(0)
  const [poolLoading, setPoolLoading] = useState(false)
  const [poolOffset, setPoolOffset] = useState(0)
  const [poolDomains, setPoolDomains] = useState<PoolDomain[]>([])
  const [allPoolDomains, setAllPoolDomains] = useState<Array<{ id: string; name: string; emoji: string }>>([])
  const [poolDomainId, setPoolDomainId] = useState('')
  const [selectedPoolImage, setSelectedPoolImage] = useState<PoolImage | null>(null)
  const [showBulkUpload, setShowBulkUpload] = useState(false)

  // Clothing-only for now (2026-09-06, per direction): the category-image
  // import/reference pool only exists for clothing today — other business
  // types will get this once clothing itself has been validated.
  useEffect(() => {
    fetch('/api/user/business-memberships')
      .then(r => r.ok ? r.json() : [])
      .then((memberships: any[]) => {
        const list = memberships
          .filter(m => !m.isUmbrellaBusiness && m.businessType === 'clothing')
          .map(m => ({ id: m.businessId, name: m.businessName, type: m.businessType }))
        setBusinesses(list)
      })
      .catch(() => {})
      .finally(() => setBusinessesLoaded(true))
  }, [])

  useEffect(() => {
    if (selectedBusinessId) return
    if (currentBusinessId && businesses.some(b => b.id === currentBusinessId)) {
      setSelectedBusinessId(currentBusinessId)
    } else if (businesses.length > 0) {
      setSelectedBusinessId(businesses[0].id)
    }
  }, [currentBusinessId, businesses, selectedBusinessId])

  useEffect(() => {
    if (!selectedBusinessId) { setAvailableTags([]); return }
    fetch(`/api/business/${selectedBusinessId}/tags`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setAvailableTags((d?.tags ?? []).map((t: any) => t.name)))
      .catch(() => setAvailableTags([]))
  }, [selectedBusinessId])

  // `targetOffset` is passed in explicitly (read fresh from render scope at
  // the call site) rather than closed over from state — `fetchImages` is
  // memoized via useCallback and does NOT get recreated on every offset
  // change, so reading `offset` state from inside its own body would use
  // whatever value was captured the last time its real dependencies changed,
  // not the latest one. That stale-closure bug is what made "Load More"
  // silently refetch page 1 over and over.
  const fetchImages = useCallback(async (targetOffset: number, append: boolean) => {
    if (!selectedBusinessId) return
    setLoading(true)
    // Clear the currently-shown set immediately on a fresh (non-append) fetch
    // — otherwise the old filter's images stay on screen with no visible
    // change until the new response arrives, which reads as "the filter did
    // nothing" even though it's working.
    if (!append) setImages([])
    try {
      const params = new URLSearchParams()
      if (hasInventory !== 'all') params.set('hasInventory', hasInventory)
      if (stockStatus !== 'all') params.set('stockStatus', stockStatus)
      if (search.trim()) params.set('search', search.trim())
      if (tag.trim()) params.set('tag', tag.trim())
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(targetOffset))

      const res = await fetch(`/api/business/${selectedBusinessId}/images?${params}`)
      if (!res.ok) throw new Error('Failed to load gallery')
      const data = await res.json()
      setImages(prev => append ? [...prev, ...data.images] : data.images)
      setTotal(data.total ?? 0)
      setOffset(targetOffset + data.images.length)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load gallery')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, hasInventory, stockStatus, search, tag])

  // Re-run from the top whenever the business or any filter changes.
  useEffect(() => {
    fetchImages(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, hasInventory, stockStatus, tag])

  const fetchPool = useCallback(async (targetOffset: number, append: boolean) => {
    if (!selectedBusinessId) return
    setPoolLoading(true)
    // Same reasoning as fetchImages — clear immediately so switching
    // categories is visibly obvious, not just "the same-looking grid".
    if (!append) setPoolImages([])
    try {
      const params = new URLSearchParams()
      if (poolDomainId) params.set('domainId', poolDomainId)
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(targetOffset))

      const res = await fetch(`/api/business/${selectedBusinessId}/images/reference-pool?${params}`)
      if (!res.ok) throw new Error('Failed to load reference pool')
      const data = await res.json()
      setPoolImages(prev => append ? [...prev, ...data.images] : data.images)
      setPoolTotal(data.total ?? 0)
      setPoolDomains(data.domains ?? [])
      setAllPoolDomains(data.allDomains ?? [])
      setPoolOffset(targetOffset + data.images.length)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load reference pool')
    } finally {
      setPoolLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, poolDomainId])

  useEffect(() => {
    if (view !== 'pool' || !selectedBusinessId) return
    fetchPool(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedBusinessId, poolDomainId])

  function handlePoolAttachClosed(attached: boolean) {
    setSelectedPoolImage(null)
    if (attached && view === 'mine') fetchImages(0, false)
  }

  function handleBulkUploadClosed(uploaded: boolean) {
    setShowBulkUpload(false)
    if (uploaded) fetchPool(0, false)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    fetchImages(0, false)
  }

  function handleImageClosed(changed: boolean) {
    setSelectedImageId(null)
    if (changed) fetchImages(0, false)
  }

  const currentCount = view === 'pool' ? poolTotal : total

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">🖼 Image Gallery</h1>

        {businessesLoaded && businesses.length === 0 ? (
          <p className="text-secondary">
            The Image Gallery is available for clothing businesses only right now — you don't have access to one.
          </p>
        ) : (
        <>
        {/* Compact, sticky toolbar — floats at the top while scrolling the grid below.
            top-20/z-20 matches the offset every other sticky POS toolbar in this app uses,
            so it sits below the global header instead of underneath it. */}
        <div className="sticky top-20 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 mb-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Business"
              value={selectedBusinessId}
              onChange={e => setSelectedBusinessId(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white py-1.5 px-2 text-sm"
            >
              {businesses.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <div className="flex gap-1.5">
              <button
                onClick={() => setView('mine')}
                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium ${view === 'mine' ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-secondary'}`}
              >
                My Gallery
              </button>
              <button
                onClick={() => setView('pool')}
                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium ${view === 'pool' ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-secondary'}`}
              >
                🗂 Pool
              </button>
            </div>

            {view === 'pool' ? (
              <select
                aria-label="Category"
                value={poolDomainId}
                onChange={e => setPoolDomainId(e.target.value)}
                className="rounded-md border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white py-1.5 px-2 text-sm"
              >
                <option value="">All categories</option>
                {poolDomains.map(d => (
                  <option key={d.id} value={d.id}>{d.emoji} {d.name} ({d.count})</option>
                ))}
              </select>
            ) : null}

            {view === 'pool' && (
              <button
                onClick={() => setShowBulkUpload(true)}
                className="px-2.5 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                ⬆️ Bulk Upload
              </button>
            )}

            {view === 'mine' && (
              <>
                <form onSubmit={handleSearchSubmit} className="min-w-[160px] flex-1">
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name/SKU"
                    aria-label="Search product name/SKU"
                    className="block w-full rounded-md border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white py-1.5 px-2 text-sm"
                  />
                </form>
                <select
                  aria-label="Inventory"
                  value={hasInventory}
                  onChange={e => setHasInventory(e.target.value as any)}
                  className="rounded-md border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white py-1.5 px-2 text-sm"
                >
                  <option value="all">Any inventory</option>
                  <option value="true">Has inventory</option>
                  <option value="false">Not linked yet</option>
                </select>
                <select
                  aria-label="Stock status"
                  value={stockStatus}
                  onChange={e => setStockStatus(e.target.value as any)}
                  className="rounded-md border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white py-1.5 px-2 text-sm"
                >
                  <option value="all">Any stock</option>
                  <option value="in">In stock</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                </select>
                <input
                  list="gallery-tag-options"
                  type="text"
                  value={tag}
                  onChange={e => setTag(e.target.value)}
                  placeholder="Any tag"
                  aria-label="Tag"
                  className="rounded-md border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-white py-1.5 px-2 text-sm w-28"
                />
                <datalist id="gallery-tag-options">
                  {availableTags.map(t => <option key={t} value={t} />)}
                </datalist>
              </>
            )}

            <span className="ml-auto text-xs text-secondary whitespace-nowrap">
              {currentCount} image{currentCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {view === 'pool' ? (
          <>
            {poolLoading && poolImages.length === 0 ? (
              <p className="text-center text-secondary py-16">Loading…</p>
            ) : poolImages.length === 0 ? (
              <p className="text-center text-secondary py-16">No reference images available yet for this business type.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {poolImages.map(img => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedPoolImage(img)}
                      className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                {poolImages.length < poolTotal && (
                  <div className="text-center mt-6">
                    <button
                      onClick={() => fetchPool(poolOffset, true)}
                      disabled={poolLoading}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      {poolLoading ? 'Loading…' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
        <>

        {selectedBusinessId && (
          <ImageGalleryInsights businessId={selectedBusinessId} onSelectImage={setSelectedImageId} />
        )}

        {loading && images.length === 0 ? (
          <p className="text-center text-secondary py-16">Loading…</p>
        ) : images.length === 0 ? (
          <p className="text-center text-secondary py-16">No images match these filters yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map(img => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageId(img.id)}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow text-left"
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {img.linkedItemCount > 0 && (
                    <span className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {img.linkedItemCount}
                    </span>
                  )}
                  {img.stockStatuses.length > 0 && (
                    <span className={`absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full ${STOCK_BADGE[img.stockStatuses[0]].color}`}>
                      {STOCK_BADGE[img.stockStatuses[0]].label}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {images.length < total && (
              <div className="text-center mt-6">
                <button
                  onClick={() => fetchImages(offset, true)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
        </>
        )}
        </>
        )}
      </div>

      {showBulkUpload && selectedBusinessId && (
        <ReferencePoolBulkUploadModal
          businessId={selectedBusinessId}
          domains={allPoolDomains}
          defaultDomainId={poolDomainId}
          onClose={handleBulkUploadClosed}
        />
      )}

      {selectedPoolImage && selectedBusinessId && (
        <ReferencePoolAttachModal
          businessId={selectedBusinessId}
          imageId={selectedPoolImage.id}
          url={selectedPoolImage.url}
          onClose={handlePoolAttachClosed}
        />
      )}

      {selectedImageId && selectedBusinessId && (
        <ImageGalleryDetailModal
          businessId={selectedBusinessId}
          businessType={businesses.find(b => b.id === selectedBusinessId)?.type ?? 'clothing'}
          imageId={selectedImageId}
          onClose={handleImageClosed}
        />
      )}
    </div>
  )
}
