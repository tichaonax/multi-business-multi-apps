'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useSession } from 'next-auth/react'
import { SessionUser } from '@/lib/permission-utils'
import { useToastContext } from '@/components/ui/toast'

interface Promotion {
  id: string
  itemType: 'product' | 'category'
  itemId: string
  sourceTable: string
  itemName: string
  currentPrice: number
  discountType: 'FIXED_PRICE' | 'PERCENT_OFF'
  discountValue: number
  startAt: string
  endAt: string
  isPaused: boolean
  status: 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED'
  createdByName: string
}

interface Candidate {
  itemType: 'product' | 'category'
  itemId: string
  sourceTable: string
  name: string
  category: string | null
  price: number
  imageUrl: string | null
}

interface Props {
  businessType: 'grocery' | 'clothing'
  /** Deep-link from the inventory item modal's "Put on Sale" button — when
   * given, the create-promotion form opens automatically with this item
   * pre-selected instead of the user having to search for it again. */
  initialItemId?: string | null
  initialItemName?: string | null
}

const STATUS_STYLE: Record<Promotion['status'], string> = {
  SCHEDULED: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  ACTIVE: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  PAUSED: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  ENDED: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

export function PromotionsPanel({ businessType, initialItemId, initialItemName }: Props) {
  const { data: session } = useSession()
  const { currentBusinessId, hasPermission } = useBusinessPermissionsContext()
  const toast = useToastContext()

  const sessionUser = session?.user as SessionUser
  const isAdmin = sessionUser?.role === 'admin'
  const canManage = isAdmin || hasPermission('canManagePromotions')

  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // New-promotion form state
  const [search, setSearch] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [discountType, setDiscountType] = useState<'FIXED_PRICE' | 'PERCENT_OFF'>('PERCENT_OFF')
  const [discountValue, setDiscountValue] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/business/${currentBusinessId}/promotions`)
      if (!res.ok) return
      const data = await res.json()
      setPromotions(data.promotions ?? [])
    } catch {
      toast.error('Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  useEffect(() => { load() }, [load])

  // Auto-open the create form, pre-filled with the item that was passed in,
  // when arriving here via the inventory item modal's "Put on Sale" link.
  // A ref (not state) so this only fires once even after the effect re-runs.
  const appliedInitialItemRef = useRef<string | null>(null)
  useEffect(() => {
    if (!initialItemId || appliedInitialItemRef.current === initialItemId) return
    appliedInitialItemRef.current = initialItemId
    openForm()
    setSearch(initialItemName ?? '')
  }, [initialItemId, initialItemName])

  useEffect(() => {
    if (!currentBusinessId || !showForm) return
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/business/${currentBusinessId}/promotions/search?businessType=${businessType}&q=${encodeURIComponent(search)}`)
        if (res.ok) {
          const data = await res.json()
          const loadedCandidates: Candidate[] = data.candidates ?? []
          setCandidates(loadedCandidates)
          // Auto-select the item this form was opened for, once its
          // candidate row has loaded.
          if (initialItemId && !selected) {
            const match = loadedCandidates.find(c => c.itemId === initialItemId)
            if (match) setSelected(match)
          }
        }
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [currentBusinessId, businessType, search, showForm, initialItemId, selected])

  function openForm() {
    setShowForm(true)
    setSelected(null)
    setSearch('')
    setDiscountType('PERCENT_OFF')
    setDiscountValue('')
    const now = new Date()
    const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    setStartAt(toLocalInputValue(now.toISOString()))
    setEndAt(toLocalInputValue(inAWeek.toISOString()))
  }

  function selectCandidate(c: Candidate) {
    setSelected(c)
    if (c.itemType === 'category') setDiscountType('PERCENT_OFF')
  }

  async function savePromotion() {
    if (!currentBusinessId || !selected || !discountValue) {
      toast.error('Pick an item and enter a discount')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/business/${currentBusinessId}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: selected.itemType,
          itemId: selected.itemId,
          sourceTable: selected.sourceTable,
          discountType,
          discountValue: Number(discountValue),
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create promotion')
        return
      }
      toast.push('Promotion created')
      setShowForm(false)
      load()
    } catch {
      toast.error('Failed to create promotion')
    } finally {
      setSaving(false)
    }
  }

  async function pause(id: string) {
    if (!currentBusinessId) return
    const res = await fetch(`/api/business/${currentBusinessId}/promotions/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pause' }),
    })
    if (res.ok) { toast.push('Promotion paused'); load() } else toast.error('Failed to pause')
  }

  async function resume(id: string) {
    if (!currentBusinessId) return
    const res = await fetch(`/api/business/${currentBusinessId}/promotions/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resume' }),
    })
    const data = await res.json()
    if (res.ok) { toast.push('Promotion resumed'); load() } else toast.error(data.error ?? 'Failed to resume')
  }

  async function cancelScheduled(id: string) {
    if (!currentBusinessId) return
    if (!confirm('Cancel this scheduled promotion?')) return
    const res = await fetch(`/api/business/${currentBusinessId}/promotions/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) { toast.push('Promotion cancelled'); load() } else toast.error(data.error ?? 'Failed to cancel')
  }

  const noun = businessType === 'clothing' ? 'products & bale categories' : 'products'

  if (!canManage) {
    return <div className="card p-8 text-center text-secondary">You don&apos;t have permission to manage promotions.</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
        Schedule temporary discounted pricing on {noun}. The discount applies automatically for the window you set,
        and reverts to the normal price on its own once the window ends — no need to remember to undo it.
      </div>

      {!showForm ? (
        <button
          onClick={openForm}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
        >
          + New Promotion
        </button>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary">New Promotion</h3>
            <button onClick={() => setShowForm(false)} className="text-sm text-secondary hover:underline">Cancel</button>
          </div>

          {!selected ? (
            <div>
              <input
                type="text"
                autoFocus
                placeholder={`Search ${noun}…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-lg">
                {searching ? (
                  <div className="p-4 text-center text-sm text-secondary">Searching…</div>
                ) : candidates.length === 0 ? (
                  <div className="p-4 text-center text-sm text-secondary">No matches</div>
                ) : candidates.map(c => (
                  <button
                    key={`${c.itemType}-${c.itemId}`}
                    onClick={() => selectCandidate(c)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800" />
                      ) : (
                        <span className="w-10 h-10 rounded flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-[8px] text-secondary flex-shrink-0">No image</span>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-primary truncate">{c.name}</div>
                        <div className="text-xs text-secondary">
                          {c.itemType === 'category' ? 'Bale category' : (c.category ?? 'Uncategorized')}
                        </div>
                      </div>
                    </div>
                    {c.itemType === 'product' && <div className="text-sm text-secondary flex-shrink-0">{fmt(c.price)}</div>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  {selected.imageUrl ? (
                    <img src={selected.imageUrl} alt="" className="w-24 h-24 rounded-lg object-contain flex-shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                  ) : selected.itemType === 'product' ? (
                    <span className="w-24 h-24 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-[10px] text-secondary flex-shrink-0">No image</span>
                  ) : null}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-primary truncate">{selected.name}</div>
                    {selected.itemType === 'product' && <div className="text-xs text-secondary">Current price: {fmt(selected.price)}</div>}
                    {selected.itemType === 'category' && <div className="text-xs text-secondary">Bale category — applies % off every bale in it</div>}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0">Change</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-secondary block mb-1">Discount type</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as 'FIXED_PRICE' | 'PERCENT_OFF')}
                    disabled={selected.itemType === 'category'}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                  >
                    <option value="PERCENT_OFF">Percent off</option>
                    {selected.itemType === 'product' && <option value="FIXED_PRICE">New fixed price</option>}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">
                    {discountType === 'FIXED_PRICE' ? 'New price ($)' : 'Percent off (%)'}
                  </label>
                  <input
                    type="number" min={discountType === 'FIXED_PRICE' ? 0.01 : 1} max={discountType === 'FIXED_PRICE' ? undefined : 99} step={discountType === 'FIXED_PRICE' ? 0.01 : 1}
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-secondary block mb-1">Starts</label>
                  <input
                    type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">Ends</label>
                  <input
                    type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <button
                onClick={savePromotion}
                disabled={saving}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Create Promotion'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
        ) : promotions.length === 0 ? (
          <div className="py-8 text-center text-sm text-secondary">No promotions yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {promotions.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-primary truncate">{p.itemName}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    {p.discountType === 'FIXED_PRICE' ? (
                      <>
                        <span className="text-base font-extrabold text-pink-600 dark:text-pink-400">{fmt(p.discountValue)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 line-through">{fmt(p.currentPrice)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-extrabold text-pink-600 dark:text-pink-400">{fmt(p.currentPrice * (1 - p.discountValue / 100))}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 line-through">{fmt(p.currentPrice)}</span>
                        <span className="text-[10px] font-semibold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/40 px-1 py-0.5 rounded">{p.discountValue}% OFF</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-secondary mt-0.5">
                    {new Date(p.startAt).toLocaleString()} → {new Date(p.endAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex-shrink-0 flex gap-2">
                  {p.status === 'SCHEDULED' && (
                    <button onClick={() => cancelScheduled(p.id)} className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200">Cancel</button>
                  )}
                  {p.status === 'ACTIVE' && (
                    <button onClick={() => pause(p.id)} className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200">Pause / End</button>
                  )}
                  {p.status === 'PAUSED' && (
                    <button onClick={() => resume(p.id)} className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200">Resume</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
