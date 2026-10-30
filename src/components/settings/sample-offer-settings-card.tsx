'use client'

// MBM-329 — free sample settings: minimum purchase to give a sample (default $4.00),
// how long the return offer stays valid (default 7 days), and the preset list of items
// that can be promised free next visit, capped by a maximum free item price (default $2.00)
import { useEffect, useMemo, useState } from 'react'

interface MenuItemOption { id: string; name: string; price: number }

interface Saved { days: string; minPurchase: string; maxFree: string; ids: string }

const inputCls = 'px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'

export function SampleOfferSettingsCard({ businessId }: { businessId: string }) {
  const [days, setDays] = useState('')
  const [minPurchase, setMinPurchase] = useState('')
  const [maxFree, setMaxFree] = useState('')
  const [freeIds, setFreeIds] = useState<string[]>([])
  const [saved, setSaved] = useState<Saved | null>(null)
  const [menu, setMenu] = useState<MenuItemOption[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const applyLoaded = (d: any) => {
    const loaded: Saved = {
      days: String(d.validityDays),
      minPurchase: Number(d.minPurchase).toFixed(2),
      maxFree: Number(d.maxFreeItemPrice).toFixed(2),
      ids: [...(d.freeItemProductIds || [])].sort().join(','),
    }
    setDays(loaded.days); setMinPurchase(loaded.minPurchase); setMaxFree(loaded.maxFree)
    setFreeIds(d.freeItemProductIds || []); setSaved(loaded)
  }

  useEffect(() => {
    fetch(`/api/restaurant/sample-offers/settings?businessId=${businessId}`)
      .then(r => r.json())
      .then(d => { if (d.success) applyLoaded(d) })
      .catch(() => {})
    fetch(`/api/universal/products?businessId=${businessId}&businessType=restaurant&isActive=true&limit=500`)
      .then(r => r.json())
      .then(d => {
        const list = ((d.data || []) as any[])
          .filter(p => !p.isCombo && Number(p.basePrice) > 0)
          .map(p => ({ id: p.id, name: p.name, price: Number(p.basePrice) }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setMenu(list)
      })
      .catch(() => {})
  }, [businessId])

  const maxFreeNum = Number(maxFree)
  // Saved free items sit at the top so it's easy to see what's set up. Sorted by the
  // saved list (not live ticks) so items don't jump around while editing.
  const savedIds = saved?.ids
  const visibleMenu = useMemo(() => {
    const term = search.trim().toLowerCase()
    const savedSet = new Set(savedIds ? savedIds.split(',') : [])
    return menu
      .filter(m => !term || m.name.toLowerCase().includes(term))
      .sort((a, b) => Number(savedSet.has(b.id)) - Number(savedSet.has(a.id)) || a.name.localeCompare(b.name))
  }, [menu, search, savedIds])
  const toggle = (id: string) => setFreeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const offeredCount = menu.filter(m => freeIds.includes(m.id) && m.price <= maxFreeNum + 0.0001).length

  const unchanged = !!saved && saved.days === days && saved.minPurchase === Number(minPurchase).toFixed(2)
    && saved.maxFree === Number(maxFree).toFixed(2) && saved.ids === [...freeIds].sort().join(',')

  const save = async () => {
    setBusy(true); setMessage(null)
    try {
      const res = await fetch('/api/restaurant/sample-offers/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId, validityDays: Number(days), minPurchase: Number(minPurchase),
          maxFreeItemPrice: Number(maxFree), freeItemProductIds: freeIds,
        }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) { setMessage({ ok: false, text: d.error || 'Could not save' }); return }
      applyLoaded(d)
      setMessage({ ok: true, text: 'Saved. Applies to samples given from now on.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 max-w-xl rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">🎁 Free sample offers</h2>
      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Minimum purchase to give a sample</label>
          <p className="text-xs text-gray-600 dark:text-gray-400">The &quot;Give Free Sample&quot; button is enabled once the order total reaches this amount.</p>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">$</span>
            <input type="number" min={0} step="0.01" value={minPurchase} onChange={e => setMinPurchase(e.target.value)} className={`w-28 ${inputCls}`} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Sample receipt (coupon) expiry</label>
          <p className="text-xs text-gray-600 dark:text-gray-400">Days a customer has to come back and redeem the sample receipt. Existing offers keep the expiry printed on their receipt.</p>
          <div className="mt-1 flex items-center gap-2">
            <input type="number" min={1} max={365} value={days} onChange={e => setDays(e.target.value)} className={`w-24 ${inputCls}`} />
            <span className="text-sm text-gray-700 dark:text-gray-300">days</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Maximum free item price</label>
          <p className="text-xs text-gray-600 dark:text-gray-400">Items on the free list priced above this are not offered as free items.</p>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">$</span>
            <input type="number" min={0} step="0.01" value={maxFree} onChange={e => setMaxFree(e.target.value)} className={`w-28 ${inputCls}`} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Free items for the next visit</label>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Only ticked items can be promised free on a sample receipt. {offeredCount} item{offeredCount === 1 ? '' : 's'} currently offered.
          </p>
          <input placeholder="Search menu items…" value={search} onChange={e => setSearch(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
          <div className="mt-1 max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {visibleMenu.length === 0 && <div className="p-2 text-sm text-gray-500">No menu items found.</div>}
            {visibleMenu.map(m => {
              const tooExpensive = m.price > maxFreeNum + 0.0001
              return (
                <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input type="checkbox" checked={freeIds.includes(m.id)} onChange={() => toggle(m.id)} />
                  <span className={`flex-1 ${tooExpensive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {m.name}
                    {tooExpensive && freeIds.includes(m.id) && <span className="ml-2 text-xs text-amber-600">above max — not offered</span>}
                  </span>
                  <span className={tooExpensive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}>${m.price.toFixed(2)}</span>
                </label>
              )
            })}
          </div>
        </div>
        <button
          type="button" onClick={save}
          disabled={busy || !days || minPurchase === '' || maxFree === '' || unchanged}
          className="px-3 py-1.5 text-sm rounded-md bg-teal-600 text-white disabled:opacity-50"
        >{busy ? 'Saving…' : 'Save'}</button>
      </div>
      {message && <p className={`mt-2 text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>}
    </div>
  )
}
