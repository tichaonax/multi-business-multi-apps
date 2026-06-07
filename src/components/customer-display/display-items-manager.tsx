'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface DisplayItem {
  id: string
  itemType: string
  name: string
  price: number
  emoji: string | null
  imageId: string | null       // product's own image (read-only here)
  adImageId: string | null     // advertising-only image stored in DisplayProductConfig
  advertisingNote: string | null
  isFeatured: boolean
  isHidden: boolean
  isDailySpecial?: boolean
  priorityBoost: number
  salesScore: number
  category: string | null
}

interface EditState {
  advertisingNote: string
  adImageId: string | null
  isFeatured: boolean
  isHidden: boolean
  isDailySpecial: boolean
  priorityBoost: number
}

interface Props {
  businessId: string
  businessType: 'restaurant' | 'grocery' | 'clothing'
}

const PAGE_SIZE = 20

export function DisplayItemsManager({ businessId, businessType }: Props) {
  const [items, setItems] = useState<DisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/business/${businessId}/display-smart-ads?businessType=${businessType}&all=true`
      )
      if (!res.ok) return
      const data = await res.json()
      const all: DisplayItem[] = [
        ...(data.dailySpecial ? [data.dailySpecial] : []),
        ...(data.items ?? []),
      ]
      setItems(all)
    } finally {
      setLoading(false)
    }
  }, [businessId, businessType])

  useEffect(() => { fetchItems() }, [fetchItems])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function openEdit(item: DisplayItem) {
    setExpandedId(item.id)
    setEditState({
      advertisingNote: item.advertisingNote ?? '',
      adImageId: item.adImageId,
      isFeatured: item.isFeatured,
      isHidden: item.isHidden,
      isDailySpecial: item.isDailySpecial ?? false,
      priorityBoost: item.priorityBoost,
    })
  }

  function closeEdit() {
    setExpandedId(null)
    setEditState(null)
  }

  async function saveConfig(item: DisplayItem) {
    if (!editState) return
    setSaving(true)
    try {
      const res = await fetch(
        `/api/business/${businessId}/display-smart-ads/config`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: item.itemType,
            itemId: item.id,
            advertisingNote: editState.advertisingNote || null,
            advertisingImageId: editState.adImageId,
            isFeatured: editState.isFeatured,
            isHidden: editState.isHidden,
            isDailySpecial: editState.isDailySpecial,
            priorityBoost: editState.priorityBoost,
          }),
        }
      )
      if (!res.ok) throw new Error()
      // Optimistic update
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        advertisingNote: editState.advertisingNote || null,
        adImageId: editState.adImageId,
        isFeatured: editState.isFeatured,
        isHidden: editState.isHidden,
        isDailySpecial: editState.isDailySpecial,
        priorityBoost: editState.priorityBoost,
      } : i))
      closeEdit()
      showToast('Saved')
    } catch {
      showToast('Save failed — try again')
    } finally {
      setSaving(false)
    }
  }

  async function uploadAdImage(item: DisplayItem, file: File) {
    setUploadingFor(item.id)
    try {
      const form = new FormData()
      form.append('files', file)
      const uploadRes = await fetch('/api/universal/images', { method: 'POST', body: form })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const { data } = await uploadRes.json()
      const adImageId: string = data[0].filename

      // Save to DisplayProductConfig so it doesn't touch the product's own image
      const configRes = await fetch(
        `/api/business/${businessId}/display-smart-ads/config`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: item.itemType,
            itemId: item.id,
            advertisingImageId: adImageId,
          }),
        }
      )
      if (!configRes.ok) throw new Error('Save failed')

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, adImageId } : i))
      setEditState(s => s ? { ...s, adImageId } : s)
      showToast('Advertising image uploaded')
    } catch (e: any) {
      showToast(e.message ?? 'Upload failed')
    } finally {
      setUploadingFor(null)
    }
  }

  async function removeAdImage(item: DisplayItem) {
    await fetch(`/api/business/${businessId}/display-smart-ads/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType: item.itemType, itemId: item.id, advertisingImageId: null }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, adImageId: null } : i))
    setEditState(s => s ? { ...s, adImageId: null } : s)
    showToast('Advertising image removed')
  }

  const filtered = search.trim()
    ? items.filter(i => i.name.toLowerCase().includes(search.trim().toLowerCase()))
    : items

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  function handleSearch(val: string) {
    setSearch(val)
    setPage(0)
    setExpandedId(null)
    setEditState(null)
  }

  return (
    <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden" style={{ height: '70vh' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* Sticky search bar */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="relative">
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading items…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No items found</div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {pageItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 overflow-hidden">
              {/* Row */}
              <div className="flex items-center gap-3 p-3">
                {/* Thumbnails — product image + advertising image side by side */}
                <div className="flex gap-1 flex-shrink-0">
                  {/* Product image / emoji */}
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {item.imageId ? (
                      <img src={`/api/images/${item.imageId}`} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{item.emoji ?? '📦'}</span>
                    )}
                  </div>
                  {/* Advertising image — only shown when set */}
                  {item.adImageId && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-blue-500/60 relative">
                      <img src={`/api/images/${item.adImageId}`} alt="Ad" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[8px] font-bold px-0.5 leading-tight">AD</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{item.name}</span>
                    {item.category && (
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.isFeatured && <span className="text-xs text-amber-500 font-medium">★ Featured</span>}
                    {item.isHidden && <span className="text-xs text-red-400 font-medium">Hidden</span>}
                    {item.isDailySpecial && <span className="text-xs text-orange-400 font-medium">⭐ Daily Special</span>}
                    {item.advertisingNote && (
                      <span className="text-xs text-indigo-400 italic truncate max-w-[200px]">
                        "{item.advertisingNote}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => expandedId === item.id ? closeEdit() : openEdit(item)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                >
                  {expandedId === item.id ? 'Close' : 'Edit'}
                </button>
              </div>

              {/* Expanded edit panel */}
              {expandedId === item.id && editState && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 space-y-4">

                  {/* Images — two columns: product image (read-only) + advertising image (editable) */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Product image — read-only */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Product Image
                      </label>
                      <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                        {item.imageId ? (
                          <img src={`/api/images/${item.imageId}`} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{item.emoji ?? '📦'}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Managed via inventory</p>
                    </div>

                    {/* Advertising image — stored in display config */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Advertising Image
                      </label>
                      <div className="flex items-start gap-2">
                        <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
                          {editState.adImageId ? (
                            <img src={`/api/images/${editState.adImageId}`} alt="Ad" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-xs text-center px-1">None</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) uploadAdImage(item, file)
                              e.target.value = ''
                            }}
                          />
                          <button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploadingFor === item.id}
                            className="text-xs px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {uploadingFor === item.id ? 'Uploading…' : editState.adImageId ? 'Replace' : 'Upload'}
                          </button>
                          {editState.adImageId && (
                            <button
                              onClick={() => removeAdImage(item)}
                              className="block text-xs text-red-500 hover:text-red-600"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Shown on customer display only</p>
                    </div>
                  </div>

                  {/* Advertising note */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Advertising Note
                    </label>
                    <div className="relative">
                      <textarea
                        rows={2}
                        maxLength={80}
                        placeholder='e.g. "BOGO — Buy One Get One Free" or "20% OFF TODAY"'
                        value={editState.advertisingNote}
                        onChange={e => setEditState(s => s ? { ...s, advertisingNote: e.target.value } : s)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute bottom-2 right-2 text-xs text-gray-400">
                        {editState.advertisingNote.length}/80
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Contains "BOGO" → 🔥 amber · "%" → 🏷️ green · "special" → ⭐ gold · other → 💬 blue
                    </p>
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-2 gap-3">
                    <Toggle
                      label="Featured"
                      hint="Sorted to the top of the rotation"
                      value={editState.isFeatured}
                      onChange={v => setEditState(s => s ? { ...s, isFeatured: v } : s)}
                    />
                    <Toggle
                      label="Hidden"
                      hint="Hidden from the customer display"
                      value={editState.isHidden}
                      onChange={v => setEditState(s => s ? { ...s, isHidden: v } : s)}
                    />
                    {businessType === 'restaurant' && (
                      <Toggle
                        label="Daily Special"
                        hint="Shown as today's special (only one allowed)"
                        value={editState.isDailySpecial}
                        onChange={v => setEditState(s => s ? { ...s, isDailySpecial: v } : s)}
                      />
                    )}
                  </div>

                  {/* Priority boost */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Priority Boost (0–10)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={editState.priorityBoost}
                      onChange={e => setEditState(s => s ? { ...s, priorityBoost: Math.min(10, Math.max(0, Number(e.target.value))) } : s)}
                      className="w-24 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Each point adds 10 to the display score</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => saveConfig(item)}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={closeEdit}
                      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Sticky pagination footer */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setPage(p => Math.max(0, p - 1)); setExpandedId(null) }}
              disabled={safePage === 0}
              className="px-3 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); setExpandedId(null) }}
              disabled={safePage >= totalPages - 1}
              className="px-3 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Toggle({
  label, hint, value, onChange,
}: {
  label: string; hint: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" className="sr-only" checked={value} onChange={e => onChange(e.target.checked)} />
        <div className={`w-9 h-5 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
      </div>
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
        <div className="text-xs text-gray-400">{hint}</div>
      </div>
    </label>
  )
}
