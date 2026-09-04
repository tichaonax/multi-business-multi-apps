'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { SessionUser } from '@/lib/permission-utils'
import { useToastContext } from '@/components/ui/toast'

interface MenuItem {
  id: string
  name: string
  category: string
  menuNumber: string | null
  type: 'menu_item' | 'ayli_combo'
  imageUrl: string | null
  hasValidPricing: boolean
  pricingIssue: string | null
}

function NumberCircle({ num, size = 'md' }: { num: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[9px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  return (
    <span className={`inline-flex items-center justify-center ${sizeClass} rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-black leading-none flex-shrink-0`}>
      {num.toUpperCase()}
    </span>
  )
}

export default function MenuNumbersPage() {
  const { data: session } = useSession()
  const { currentBusinessId, hasPermission } = useBusinessPermissionsContext()
  const toast = useToastContext()

  const sessionUser = session?.user as SessionUser
  const isAdmin = sessionUser?.role === 'admin'
  const canManage = isAdmin || hasPermission('canManageMenu')

  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageFileRef = useRef<HTMLInputElement>(null)

  // Only the very first load shows the "Loading items…" placeholder. Assign/Remove/
  // Free patch the affected item in place (see patchItem below) instead of calling
  // load() again — but guard this anyway in case something else ever triggers a
  // refetch, since toggling `loading` mid-session would swap the whole scrollable
  // list out for the placeholder and back, remounting it and resetting scroll.
  const hasLoadedOnce = useRef(false)

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    if (!hasLoadedOnce.current) setLoading(true)
    try {
      const [productsRes, combosRes] = await Promise.all([
        fetch(`/api/universal/products?businessId=${currentBusinessId}&businessType=restaurant&isActive=true&limit=500&includeImages=true`),
        fetch(`/api/restaurant/ayc-combos?businessId=${currentBusinessId}`)
      ])
      const productsData = await productsRes.json()
      const combosData = await combosRes.json()

      const productItems: MenuItem[] = (productsData.products ?? productsData.data ?? productsData ?? [])
        .map((p: any) => {
          const hasValidPricing = Number(p.basePrice ?? 0) > 0
          return {
            id: p.id,
            name: p.name,
            category: p.category?.name ?? 'Uncategorized',
            menuNumber: p.menuNumber ?? null,
            type: 'menu_item' as const,
            imageUrl: p.images?.[0]?.imageUrl ?? null,
            hasValidPricing,
            pricingIssue: hasValidPricing ? null : 'This item has no price set (or $0.00) — set a price in Menu Management before assigning a number.',
          }
        })

      const comboItems: MenuItem[] = (Array.isArray(combosData) ? combosData : [])
        .map((c: any) => {
          const sizes = c.sizes ?? []
          const poolItems = c.items ?? []
          const hasValidSizePricing = sizes.length > 0 && sizes.every((s: any) => Number(s.basePrice) > 0)
          const hasValidPoolPricing = poolItems.length > 0 && poolItems.every((it: any) =>
            Number(it.pricePerKgSmall) > 0 && Number(it.pricePerKgMedium) > 0 && Number(it.pricePerKgLarge) > 0
          )
          const hasValidPricing = hasValidSizePricing && hasValidPoolPricing
          return {
            id: c.id,
            name: c.name,
            category: 'AYLI Combo',
            menuNumber: c.menuNumber ?? null,
            type: 'ayli_combo' as const,
            imageUrl: c.adImageId ? `/api/images/${c.adImageId}` : null,
            hasValidPricing,
            pricingIssue: hasValidPricing ? null : 'This combo has unpriced sizes or pool items (showing $0.00/kg) — set up pricing in AYLI Pricing before assigning a number.',
          }
        })

      const all = [...productItems, ...comboItems]
      all.sort((a, b) => {
        const aNum = a.menuNumber ? parseInt(a.menuNumber) : Infinity
        const bNum = b.menuNumber ? parseInt(b.menuNumber) : Infinity
        if (aNum !== bNum) return aNum - bNum
        if (a.menuNumber && b.menuNumber) return a.menuNumber.localeCompare(b.menuNumber)
        if (a.menuNumber) return -1
        if (b.menuNumber) return 1
        return a.name.localeCompare(b.name)
      })
      setItems(all)
    } catch {
      toast.error('Failed to load menu items')
    } finally {
      setLoading(false)
      hasLoadedOnce.current = true
    }
  }, [currentBusinessId])

  useEffect(() => { load() }, [load])

  const selectItem = (item: MenuItem) => {
    setSelected(item)
    setInput(item.menuNumber ?? '')
    setError('')
  }

  // Updates one item's fields in the already-loaded list without refetching or
  // re-sorting — the list is sorted by menuNumber, so re-sorting after every
  // assign would jump the item to a completely different spot in the list and
  // disorient the user right after they scrolled to find it. A plain in-place
  // patch keeps every other row exactly where it was.
  const patchItem = (itemType: MenuItem['type'], id: string, patch: Partial<MenuItem>) => {
    setItems(prev => prev.map(i => (i.id === id && i.type === itemType) ? { ...i, ...patch } : i))
  }

  // Assigns/replaces the item's primary image directly from this screen. Menu
  // items use the product's own primary-image slot (same one Menu Management
  // edits); AYLI combos have no such field on the combo record itself, so this
  // uses the advertising-image slot instead (DisplayProductConfig) — the same
  // mechanism the Display Settings page already uses for combo photos.
  const uploadPrimaryImage = async (file: File) => {
    if (!selected || !currentBusinessId) return
    setUploadingImage(true)
    try {
      let newImageUrl: string
      if (selected.type === 'menu_item') {
        const form = new FormData()
        form.append('files', file)
        const uploadRes = await fetch(`/api/universal/products/${selected.id}/images`, { method: 'POST', body: form })
        if (!uploadRes.ok) throw new Error('Upload failed')
        const { data } = await uploadRes.json()
        const candidates = (data?.images ?? []).filter((im: any) => im.altText === file.name)
        const newImg = candidates.sort((a: any, b: any) => b.sortOrder - a.sortOrder)[0]
        if (!newImg) throw new Error('Upload succeeded but the new image could not be found')
        const primaryRes = await fetch(`/api/universal/products/${selected.id}/images/${newImg.id}/primary`, { method: 'POST' })
        if (!primaryRes.ok) throw new Error('Failed to set as primary image')
        newImageUrl = newImg.imageUrl
      } else {
        const form = new FormData()
        form.append('files', file)
        const uploadRes = await fetch('/api/universal/images', { method: 'POST', body: form })
        if (!uploadRes.ok) throw new Error('Upload failed')
        const { data } = await uploadRes.json()
        const newImageId: string = data[0].filename
        const configRes = await fetch(`/api/business/${currentBusinessId}/display-smart-ads/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType: 'ayli_combo', itemId: selected.id, advertisingImageId: newImageId }),
        })
        if (!configRes.ok) throw new Error('Failed to save')
        newImageUrl = `/api/images/${newImageId}`
      }
      patchItem(selected.type, selected.id, { imageUrl: newImageUrl })
      setSelected(prev => prev ? { ...prev, imageUrl: newImageUrl } : prev)
      toast.push('Primary image updated')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update image')
    } finally {
      setUploadingImage(false)
    }
  }

  const assign = async (valueOverride?: string) => {
    if (!selected || !currentBusinessId) return
    const trimmed = (valueOverride ?? input).trim().toLowerCase()
    if (trimmed && !/^[1-9][0-9]*[a-z]?$/.test(trimmed)) {
      setError('Invalid format — use a positive number with an optional letter suffix, e.g. 4 or 4a')
      return
    }
    setSaving(true)
    setError('')
    try {
      const endpoint = selected.type === 'ayli_combo'
        ? `/api/restaurant/ayc-combos/${selected.id}`
        : `/api/universal/products/${selected.id}`
      const body = selected.type === 'ayli_combo'
        ? { menuNumber: trimmed || null }
        : { menuNumber: trimmed || null }
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save')
        return
      }
      toast.push(trimmed ? `Number ${trimmed} assigned to "${selected.name}"` : `Number removed from "${selected.name}"`)
      patchItem(selected.type, selected.id, { menuNumber: trimmed || null })
      // Update selected state with new number
      setSelected(prev => prev ? { ...prev, menuNumber: trimmed || null } : null)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setInput('')
    await assign('')
  }

  // "Assign" with a blank input suggests the next available number instead of
  // requiring the user to type it — assign() itself still treats blank as "remove".
  const handleAssignClick = () => {
    if (!selected) return
    const value = input.trim() || nextAvailable
    // Removing a number is always allowed; only block assigning one to an
    // item whose pricing isn't set up, since that item would then show
    // $0.00 on the customer-facing rotating display.
    if (value && !selected.hasValidPricing) {
      setError(selected.pricingIssue ?? 'This item is missing pricing — set that up first before assigning a number.')
      return
    }
    // Instant client-side duplicate check — the server enforces this too
    // (source of truth), but catching it here avoids a round trip.
    if (value) {
      const conflict = items.find(i => i.menuNumber === value && !(i.id === selected.id && i.type === selected.type))
      if (conflict) {
        setError(`Menu number ${value} is already assigned to "${conflict.name}". Free it first, or choose a different number.`)
        return
      }
    }
    setInput(value)
    assign(value)
  }

  // Quick-release for a number stuck on an item whose pricing isn't set up —
  // works directly from the list, without needing to open the edit panel.
  const freeNumber = async (item: MenuItem) => {
    if (!item.menuNumber) return
    const num = item.menuNumber
    try {
      const endpoint = item.type === 'ayli_combo'
        ? `/api/restaurant/ayc-combos/${item.id}`
        : `/api/universal/products/${item.id}`
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuNumber: null })
      })
      if (!res.ok) {
        toast.error('Failed to free number')
        return
      }
      toast.push(`Number ${num} freed from "${item.name}"`)
      patchItem(item.type, item.id, { menuNumber: null })
      setSelected(prev => (prev && prev.id === item.id && prev.type === item.type) ? { ...prev, menuNumber: null } : prev)
    } catch {
      toast.error('Failed to free number')
    }
  }

  const numbered = items.filter(i => i.menuNumber)

  // Find the lowest positive integer not yet assigned (ignores suffix variants)
  const nextAvailable = useMemo(() => {
    const used = new Set(
      numbered.map(i => parseInt(i.menuNumber!)).filter(n => !isNaN(n))
    )
    let n = 1
    while (used.has(n)) n++
    return String(n)
  }, [numbered])

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.menuNumber && i.menuNumber.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="Menu Numbers"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', href: '/restaurant' },
          { label: 'Menu Numbers', isActive: true }
        ]}
      >
        {/* Status banner */}
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
          numbered.length === 0
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
            : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
        }`}>
          {numbered.length === 0 ? (
            <>ℹ️ No menu numbers assigned yet. The customer display is showing all items. Assign at least one number to begin filtering.</>
          ) : (
            <>{numbered.length} item{numbered.length !== 1 ? 's' : ''} numbered — customer display is showing numbered items only.</>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: item list */}
          <div className="card overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or number…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-secondary">No items found</div>
              ) : filtered.map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectItem(item)}
                  onKeyDown={e => { if (e.key === 'Enter') selectItem(item) }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                    selected?.id === item.id && selected?.type === item.type ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {item.menuNumber
                      ? <NumberCircle num={item.menuNumber} size="sm" />
                      : <span className="text-xs text-gray-400">–</span>
                    }
                  </div>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary truncate">{item.name}</div>
                    <div className="text-xs text-secondary">{item.category}</div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    {!item.hasValidPricing && (
                      <span title={item.pricingIssue ?? 'Pricing not set up'} className="text-amber-500 text-xs">⚠️</span>
                    )}
                    {!item.hasValidPricing && item.menuNumber && canManage && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); freeNumber(item) }}
                        title={`Free number ${item.menuNumber} for reuse`}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Free
                      </button>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      item.type === 'ayli_combo'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {item.type === 'ayli_combo' ? 'AYLI' : 'Item'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: edit panel + assigned numbers reference */}
          <div className="flex flex-col gap-4">
            {/* Edit panel */}
            {selected ? (
              <div className="card p-6 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                    <div className="w-28 h-28 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {selected.imageUrl ? (
                        <img
                          src={selected.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <span className="text-gray-400 text-[11px] text-center px-2">No image</span>
                      )}
                    </div>
                    {canManage && (
                      <>
                        <input
                          ref={imageFileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) uploadPrimaryImage(file)
                            e.target.value = ''
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => imageFileRef.current?.click()}
                          disabled={uploadingImage}
                          className="w-28 text-[11px] px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {uploadingImage ? 'Uploading…' : selected.imageUrl ? 'Replace Image' : 'Upload Image'}
                        </button>
                      </>
                    )}
                  </div>
                  {selected.menuNumber && <NumberCircle num={selected.menuNumber} size="lg" />}
                  <div>
                    <h2 className="text-lg font-semibold text-primary">{selected.name}</h2>
                    <p className="text-sm text-secondary">{selected.category}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block ${
                      selected.type === 'ayli_combo'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {selected.type === 'ayli_combo' ? 'AYLI Combo' : 'Menu Item'}
                    </span>
                  </div>
                </div>

                {!selected.hasValidPricing && (
                  <div className="px-4 py-3 rounded-lg text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                    ⚠️ {selected.pricingIssue}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Menu Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4 or 4a"
                    value={input}
                    onChange={e => { setInput(e.target.value); setError('') }}
                    disabled={!canManage || saving}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    onKeyDown={e => { if (e.key === 'Enter') handleAssignClick() }}
                  />
                  {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-secondary">Next available:</span>
                    <button
                      type="button"
                      onClick={() => { setInput(nextAvailable); setError('') }}
                      className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      title="Click to use this number"
                    >
                      {nextAvailable}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-secondary">Positive integer with optional letter suffix (e.g. 4, 4a, 4b). Must be unique across all menu items and AYLI combos.</p>
                </div>

                {canManage && (
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={handleAssignClick}
                      disabled={saving}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Assign'}
                    </button>
                    <button
                      onClick={() => { setInput(selected.menuNumber ?? ''); setError('') }}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      title="Reset the input to the current saved value"
                    >
                      Reset
                    </button>
                    {selected.menuNumber && (
                      <button
                        onClick={remove}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-8 flex flex-col items-center justify-center text-center gap-3 text-secondary min-h-[200px]">
                <span className="text-4xl">🔢</span>
                <p className="text-sm">Select an item from the list to assign or remove its menu number.</p>
              </div>
            )}

            {/* Assigned numbers reference — always visible */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">Assigned Numbers</h3>
                <span className="text-xs text-secondary">{numbered.length} total</span>
              </div>
              {numbered.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-secondary">No numbers assigned yet</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                  {numbered.map(item => (
                    <div
                      key={`ref-${item.type}-${item.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectItem(item)}
                      onKeyDown={e => { if (e.key === 'Enter') selectItem(item) }}
                      className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                        selected?.id === item.id && selected?.type === item.type ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <NumberCircle num={item.menuNumber!} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-primary truncate">{item.name}</div>
                        <div className="text-xs text-secondary">{item.category}</div>
                      </div>
                      {!item.hasValidPricing && (
                        <span title={item.pricingIssue ?? 'Pricing not set up'} className="text-amber-500 text-xs flex-shrink-0">⚠️</span>
                      )}
                      {!item.hasValidPricing && canManage && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); freeNumber(item) }}
                          title={`Free number ${item.menuNumber} for reuse`}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                        >
                          Free
                        </button>
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        item.type === 'ayli_combo'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {item.type === 'ayli_combo' ? 'AYLI' : 'Item'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
