'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddOnRow {
  productId: string
  productName: string
  quantity: number
  sortOrder: number
  unitPrice: number
}

interface DailySpecialItem {
  id: string
  productId: string
  specialPrice: number
  includeWifi: boolean
  bulletPoints: string[]
  imageId: string | null
  product: { id: string; name: string; menuNumber: string | null; basePrice: number; product_images?: Array<{ imageUrl: string }> }
  add_ons: Array<{ id: string; productId: string; quantity: number; sortOrder: number; product: { id: string; name: string; basePrice: number } }>
}

interface ScheduleSlot {
  id: string
  dayOfWeek: number
  specialId: string
  daily_special: { id: string; specialPrice: number; product: { name: string; basePrice: number } }
}

interface TodaysSpecial {
  specialId: string
  productId: string
  productName: string
  menuNumber: string | null
  basePrice: number
  specialPrice: number
  bulletPoints: string[]
  addOns: Array<{ addOnId: string; productId: string; productName: string; quantity: number; unitPrice: number }>
}

interface Product {
  id: string
  name: string
  menuNumber: string | null
  basePrice: number
  primaryImageId: string | null
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── Searchable product select ────────────────────────────────────────────────

interface SearchableSelectProps {
  value: string
  onChange: (productId: string) => void
  options: Product[]
  placeholder?: string
  excludeId?: string
  disabled?: boolean
}

function SearchableSelect({ value, onChange, options, placeholder = 'Search…', excludeId, disabled }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(p => p.id === value)

  const filtered = options
    .filter(p => p.id !== excludeId)
    .filter(p =>
      query.trim() === '' ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.menuNumber ?? '').toLowerCase().includes(query.toLowerCase())
    )

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(p: Product) {
    onChange(p.id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen(o => !o)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className="w-full flex items-center justify-between gap-2 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 text-left disabled:opacity-50"
      >
        <span className={selected ? 'text-primary' : 'text-gray-400'}>
          {selected
            ? `${selected.menuNumber ? `[${selected.menuNumber}] ` : ''}${selected.name} — $${selected.basePrice.toFixed(2)}`
            : placeholder}
        </span>
        <span className="text-gray-400 flex-shrink-0">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 outline-none focus:border-blue-500"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-secondary text-center py-4">No items match</div>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${p.id === value ? 'bg-amber-50 dark:bg-amber-900/20 font-medium' : ''}`}
                >
                  {p.menuNumber && (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex-shrink-0">
                      {p.menuNumber}
                    </span>
                  )}
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-secondary text-xs flex-shrink-0">${p.basePrice.toFixed(2)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DailySpecialPage() {
  const { currentBusinessId, hasPermission } = useBusinessPermissionsContext()
  const toast = useToastContext()

  const canManage = hasPermission('canManageDailySpecial')
  const canOverride = hasPermission('canOverrideDailySpecial')

  const [tab, setTab] = useState<'today' | 'schedule' | 'library'>('today')
  const [todaysSpecial, setTodaysSpecial] = useState<TodaysSpecial | null>(null)
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([])
  const [library, setLibrary] = useState<DailySpecialItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Library form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formProductId, setFormProductId] = useState('')
  const [formSpecialPrice, setFormSpecialPrice] = useState('')
  const [formBullets, setFormBullets] = useState<string[]>([''])
  const [formAddOns, setFormAddOns] = useState<AddOnRow[]>([])
  const [formCustomImageId, setFormCustomImageId] = useState<string | null>(null) // null = use product image
  const [formImageUploading, setFormImageUploading] = useState(false)
  const [formSaving, setFormSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const [todayRes, libRes, schedRes, prodRes] = await Promise.all([
        fetch(`/api/restaurant/daily-special/today?businessId=${currentBusinessId}`),
        canManage ? fetch(`/api/restaurant/daily-special?businessId=${currentBusinessId}`) : Promise.resolve(null),
        canManage ? fetch(`/api/restaurant/daily-special/schedule?businessId=${currentBusinessId}`) : Promise.resolve(null),
        canManage ? fetch(`/api/universal/products?businessId=${currentBusinessId}&limit=500&includeImages=true`) : Promise.resolve(null),
      ])
      if (todayRes.ok) setTodaysSpecial(await todayRes.json())
      if (libRes?.ok) setLibrary(await libRes.json())
      if (schedRes?.ok) setSchedule(await schedRes.json())
      if (prodRes?.ok) {
        const d = await prodRes.json()
        if (d.success) setProducts(d.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          menuNumber: p.menuNumber ?? null,
          basePrice: Number(p.basePrice),
          primaryImageId: p.product_images?.[0]?.imageUrl ?? null,
        })))
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [currentBusinessId, canManage])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Tab: Today ──────────────────────────────────────────────────────────────

  async function disableToday() {
    if (!currentBusinessId) return
    const res = await fetch('/api/restaurant/daily-special/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: currentBusinessId, isDisabled: true }),
    })
    if (res.ok) { toast.push('Today\'s special disabled', { type: 'success' }); fetchAll() }
    else toast.push('Failed to disable', { type: 'error' })
  }

  async function revertToday() {
    if (!currentBusinessId) return
    const res = await fetch(`/api/restaurant/daily-special/override?businessId=${currentBusinessId}`, { method: 'DELETE' })
    if (res.ok) { toast.push('Reverted to scheduled special', { type: 'success' }); fetchAll() }
    else toast.push('Failed to revert', { type: 'error' })
  }

  async function swapToday(specialId: string) {
    if (!currentBusinessId) return
    const res = await fetch('/api/restaurant/daily-special/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: currentBusinessId, isDisabled: false, overrideSpecialId: specialId }),
    })
    if (res.ok) { toast.push('Today\'s special swapped', { type: 'success' }); fetchAll() }
    else toast.push('Failed to swap', { type: 'error' })
  }

  // ── Tab: Schedule ────────────────────────────────────────────────────────────

  async function assignDay(dayOfWeek: number, specialId: string | null) {
    if (!currentBusinessId) return
    const res = await fetch('/api/restaurant/daily-special/schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: currentBusinessId, dayOfWeek, specialId }),
    })
    if (res.ok) { fetchAll() }
    else toast.push('Failed to update schedule', { type: 'error' })
  }

  // ── Tab: Library ─────────────────────────────────────────────────────────────

  function startNew() {
    setEditingId('new')
    setFormProductId('')
    setFormSpecialPrice('')
    setFormBullets([''])
    setFormAddOns([])
    setFormCustomImageId(null)
  }

  function startEdit(item: DailySpecialItem) {
    setEditingId(item.id)
    setFormProductId(item.productId)
    setFormSpecialPrice(String(item.specialPrice))
    setFormBullets(Array.isArray(item.bulletPoints) && item.bulletPoints.length > 0 ? item.bulletPoints : [''])
    setFormAddOns(item.add_ons.map((a) => ({
      productId: a.productId,
      productName: a.product.name,
      quantity: a.quantity,
      sortOrder: a.sortOrder,
      unitPrice: Number(a.product.basePrice),
    })))
    setFormCustomImageId(item.imageId ?? null)
  }

  function cancelEdit() { setEditingId(null) }

  async function saveSpecial() {
    if (!currentBusinessId || !formProductId || !formSpecialPrice) {
      toast.push('Menu item and special price are required', { type: 'error' })
      return
    }
    setFormSaving(true)
    const bullets = formBullets.filter(b => b.trim())
    if (!bullets.some(b => b.toLowerCase().includes('wifi'))) bullets.push('Free WiFi included 🌐')
    const body = {
      businessId: currentBusinessId,
      productId: formProductId,
      specialPrice: parseFloat(formSpecialPrice),
      bulletPoints: bullets,
      imageId: formCustomImageId ?? null,
      addOns: formAddOns.map((a, i) => ({ productId: a.productId, quantity: a.quantity, sortOrder: i })),
    }
    const isNew = editingId === 'new'
    const res = await fetch(
      isNew ? '/api/restaurant/daily-special' : `/api/restaurant/daily-special/${editingId}`,
      { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    setFormSaving(false)
    if (res.ok) {
      toast.push(isNew ? 'Special created' : 'Special updated', { type: 'success' })
      setEditingId(null)
      fetchAll()
    } else toast.push('Failed to save', { type: 'error' })
  }

  async function deleteSpecial(id: string) {
    if (!confirm('Remove this special from the library?')) return
    const res = await fetch(`/api/restaurant/daily-special/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.push('Special removed', { type: 'success' }); fetchAll() }
    else toast.push('Failed to remove', { type: 'error' })
  }

  function addBullet() { setFormBullets(prev => [...prev, '']) }
  function removeBullet(i: number) { setFormBullets(prev => prev.filter((_, idx) => idx !== i)) }
  function updateBullet(i: number, val: string) { setFormBullets(prev => prev.map((b, idx) => idx === i ? val : b)) }

  function addAddOn() {
    setFormAddOns(prev => [...prev, { productId: '', productName: '', quantity: 1, sortOrder: prev.length, unitPrice: 0 }])
  }
  function removeAddOn(i: number) { setFormAddOns(prev => prev.filter((_, idx) => idx !== i)) }
  function updateAddOn(i: number, productId: string) {
    const prod = products.find(p => p.id === productId)
    if (!prod) return
    setFormAddOns(prev => prev.map((a, idx) => idx === i
      ? { ...a, productId: prod.id, productName: prod.name, unitPrice: prod.basePrice }
      : a))
  }
  function updateAddOnQty(i: number, qty: number) {
    setFormAddOns(prev => prev.map((a, idx) => idx === i ? { ...a, quantity: Math.max(1, qty) } : a))
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">⭐ Today&apos;s Special</h1>
        <p className="text-secondary text-sm mb-6">Manage and configure the daily special for the restaurant POS and customer display.</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {(['today', ...(canManage ? ['schedule', 'library'] : [])] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              {t === 'today' ? 'Today' : t === 'schedule' ? 'Weekly Schedule' : 'Library'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-secondary text-center py-12">Loading…</div>
        ) : (
          <>
            {/* ── TAB: TODAY ── */}
            {tab === 'today' && (
              <div className="space-y-4">
                {todaysSpecial ? (
                  <div className="card p-5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {todaysSpecial.menuNumber && (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white font-black text-sm">
                              {todaysSpecial.menuNumber}
                            </span>
                          )}
                          <span className="font-bold text-lg">{todaysSpecial.productName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm mb-2">
                          <span className="text-amber-600 dark:text-amber-400 font-bold text-xl">${Number(todaysSpecial.specialPrice).toFixed(2)}</span>
                          <span className="text-secondary line-through">${Number(todaysSpecial.basePrice).toFixed(2)}</span>
                          <span className="text-green-600 dark:text-green-400 text-xs">save ${(Number(todaysSpecial.basePrice) - Number(todaysSpecial.specialPrice)).toFixed(2)}</span>
                        </div>
                        {todaysSpecial.addOns.length > 0 && (
                          <div className="text-xs text-secondary">
                            Includes free: {todaysSpecial.addOns.map(a => a.productName).join(', ')}
                          </div>
                        )}
                        <div className="text-xs text-secondary mt-1">Runs until midnight</div>
                      </div>
                    </div>

                    {canOverride && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                        <button onClick={disableToday} className="btn btn-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 px-3 py-1.5 rounded text-sm">
                          Disable for today
                        </button>
                        <button onClick={revertToday} className="btn btn-sm bg-gray-100 dark:bg-gray-700 text-secondary hover:bg-gray-200 px-3 py-1.5 rounded text-sm">
                          Revert to scheduled
                        </button>
                        {canManage && library.length > 0 && (
                          <select
                            onChange={e => { if (e.target.value) swapToday(e.target.value) }}
                            defaultValue=""
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
                          >
                            <option value="" disabled>Switch to different special…</option>
                            {library.filter(s => s.id !== todaysSpecial.specialId).map(s => (
                              <option key={s.id} value={s.id}>{s.product.name} — ${Number(s.specialPrice).toFixed(2)}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="card p-5 rounded-xl text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <div className="font-medium text-secondary">No special scheduled for today</div>
                    {canOverride && canManage && library.length > 0 && (
                      <div className="mt-4">
                        <select
                          onChange={e => { if (e.target.value) swapToday(e.target.value) }}
                          defaultValue=""
                          className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800"
                        >
                          <option value="" disabled>Pick a special for today…</option>
                          {library.map(s => (
                            <option key={s.id} value={s.id}>{s.product.name} — ${Number(s.specialPrice).toFixed(2)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: SCHEDULE ── */}
            {tab === 'schedule' && canManage && (
              <div className="space-y-2">
                {DAY_NAMES.map((day, dow) => {
                  const slot = schedule.find(s => s.dayOfWeek === dow)
                  return (
                    <div key={dow} className="card flex items-center gap-4 p-3 rounded-lg">
                      <div className="w-24 font-medium text-sm flex-shrink-0">{day}</div>
                      <select
                        value={slot?.specialId ?? ''}
                        onChange={e => assignDay(dow, e.target.value || null)}
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
                      >
                        <option value="">— No special —</option>
                        {library.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.product.menuNumber ? `[${s.product.menuNumber}] ` : ''}{s.product.name} — ${Number(s.specialPrice).toFixed(2)} (was ${Number(s.product.basePrice).toFixed(2)})
                          </option>
                        ))}
                      </select>
                      {slot && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0">
                          save ${(Number(slot.daily_special.product.basePrice) - Number(slot.daily_special.specialPrice)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── TAB: LIBRARY ── */}
            {tab === 'library' && canManage && (
              <div className="space-y-4">
                {editingId ? (
                  /* ── FORM ── */
                  <div className="card p-5 rounded-xl space-y-4">
                    <h2 className="font-bold text-base">{editingId === 'new' ? 'New Special' : 'Edit Special'}</h2>

                    {/* Menu Item */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Menu Item *</label>
                      <SearchableSelect
                        value={formProductId}
                        onChange={setFormProductId}
                        options={products}
                        placeholder="Select a menu item…"
                      />
                    </div>

                    {/* Special Price */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Special Price *</label>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                          <span className="px-2 bg-gray-100 dark:bg-gray-700 text-secondary text-sm">$</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={formSpecialPrice}
                            onChange={e => setFormSpecialPrice(e.target.value)}
                            className="px-2 py-2 text-sm bg-white dark:bg-gray-800 w-24"
                            placeholder="0.00"
                          />
                        </div>
                        {formProductId && formSpecialPrice && (() => {
                          const prod = products.find(p => p.id === formProductId)
                          const saving = prod ? prod.basePrice - parseFloat(formSpecialPrice) : 0
                          return prod ? (
                            <span className="text-xs text-secondary">
                              Regular: ${prod.basePrice.toFixed(2)} → Special: ${parseFloat(formSpecialPrice || '0').toFixed(2)}
                              {saving > 0.005 && <span className="text-green-600 dark:text-green-400 ml-1">(save ${saving.toFixed(2)})</span>}
                            </span>
                          ) : null
                        })()}
                      </div>
                    </div>

                    {/* Image */}
                    {(() => {
                      const prod = products.find(p => p.id === formProductId)
                      // productImageUrl = direct file path e.g. /uploads/images/...
                      // formCustomImageId = UUID served via /api/images/[id]
                      const productImageUrl = prod?.primaryImageId ?? null
                      const displaySrc = formCustomImageId
                        ? `/api/images/${formCustomImageId}`
                        : productImageUrl
                      return (
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Display Image</label>
                          <div className="flex items-start gap-4">
                            {/* Preview */}
                            <div className="w-28 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border border-gray-200 dark:border-gray-600">
                              {displaySrc ? (
                                <img
                                  src={displaySrc}
                                  alt="preview"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">🍽️</div>
                              )}
                            </div>
                            <div className="flex-1 space-y-1.5">
                              {formCustomImageId ? (
                                <>
                                  <div className="text-xs text-secondary">Using custom uploaded image</div>
                                  <button
                                    type="button"
                                    onClick={() => setFormCustomImageId(null)}
                                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline block"
                                  >
                                    ↩ Use menu product image instead
                                  </button>
                                </>
                              ) : (
                                <div className="text-xs text-secondary">
                                  {productImageUrl ? 'Using menu product image (default)' : 'No product image found'}
                                </div>
                              )}
                              <label className={`cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 ${formImageUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {formImageUploading ? 'Uploading…' : formCustomImageId ? '🔄 Replace custom image' : '📷 Upload custom image (optional)'}
                                <input
                                  type="file" accept="image/*" className="hidden"
                                  onChange={async e => {
                                    const file = e.target.files?.[0]
                                    if (!file || !currentBusinessId) return
                                    setFormImageUploading(true)
                                    const fd = new FormData()
                                    fd.append('files', file)
                                    fd.append('businessId', currentBusinessId)
                                    const res = await fetch('/api/universal/images', { method: 'POST', body: fd })
                                    if (res.ok) {
                                      const data = await res.json()
                                      const id = data.data?.[0]?.filename
                                      if (id) setFormCustomImageId(id)
                                    } else {
                                      toast.push('Image upload failed', { type: 'error' })
                                    }
                                    setFormImageUploading(false)
                                    e.target.value = ''
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Additional Items (Free) */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Additional Items (Free)</label>
                      {formAddOns.length === 0 && (
                        <p className="text-xs text-secondary mb-2">No add-ons configured. Add free items (e.g. a free drink) here.</p>
                      )}
                      {formAddOns.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <SearchableSelect
                              value={a.productId}
                              onChange={id => updateAddOn(i, id)}
                              options={products}
                              placeholder="Select item…"
                              excludeId={formProductId}
                            />
                          </div>
                          <input
                            type="number" min="1" value={a.quantity}
                            onChange={e => updateAddOnQty(i, parseInt(e.target.value) || 1)}
                            className="w-14 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800"
                          />
                          {a.unitPrice > 0 && <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0">credit ${a.unitPrice.toFixed(2)}</span>}
                          <button onClick={() => removeAddOn(i)} className="text-red-500 hover:text-red-700 text-sm flex-shrink-0">×</button>
                        </div>
                      ))}
                      <button onClick={addAddOn} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Add item</button>
                    </div>

                    {/* Free WiFi (always included) */}
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <span className="text-blue-600 dark:text-blue-400">📶</span>
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Free WiFi included</span>
                      <span className="text-xs text-blue-500 dark:text-blue-400 ml-1">— always added to all specials</span>
                    </div>

                    {/* Display Bullets */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Display Bullets (customer display)</label>
                      {formBullets.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1">
                          <span className="text-secondary text-sm">•</span>
                          <input
                            type="text"
                            value={b}
                            onChange={e => updateBullet(i, e.target.value)}
                            placeholder="e.g. Grilled Chicken"
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
                          />
                          {formBullets.length > 1 && (
                            <button onClick={() => removeBullet(i)} className="text-red-500 hover:text-red-700 text-sm">×</button>
                          )}
                        </div>
                      ))}
                      <button onClick={addBullet} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 block">+ Add</button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={saveSpecial}
                        disabled={formSaving}
                        className="btn btn-primary px-5 py-2 text-sm rounded-lg"
                      >
                        {formSaving ? 'Saving…' : 'Save Special'}
                      </button>
                      <button onClick={cancelEdit} className="btn px-4 py-2 text-sm rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* ── LIBRARY LIST ── */
                  <>
                    <button onClick={startNew} className="btn btn-primary px-4 py-2 text-sm rounded-lg">
                      + New Special
                    </button>
                    {library.length === 0 && (
                      <div className="text-center text-secondary py-8">No specials in library. Create one to get started.</div>
                    )}
                    {library.map(item => (
                      <div key={item.id} className="card p-4 rounded-xl flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {item.product.menuNumber && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs">
                                {item.product.menuNumber}
                              </span>
                            )}
                            <span className="font-semibold text-sm">{item.product.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">${Number(item.specialPrice).toFixed(2)}</span>
                            <span className="text-secondary line-through text-xs">${Number(item.product.basePrice).toFixed(2)}</span>
                          </div>
                          {item.add_ons.length > 0 && (
                            <div className="text-xs text-secondary mt-0.5">
                              + free: {item.add_ons.map(a => a.product.name).join(', ')}
                            </div>
                          )}
                          {item.bulletPoints.length > 0 && (
                            <div className="text-xs text-secondary mt-0.5">
                              {(item.bulletPoints as string[]).slice(0, 3).join(' · ')}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => startEdit(item)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                          <button onClick={() => deleteSpecial(item.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </BusinessTypeRoute>
  )
}
