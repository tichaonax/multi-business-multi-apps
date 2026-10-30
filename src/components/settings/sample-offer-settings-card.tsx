'use client'

// MBM-329 — free sample settings: minimum purchase to give a sample (default $4.00)
// and how long the return offer stays valid (default 7 days)
import { useEffect, useState } from 'react'

export function SampleOfferSettingsCard({ businessId }: { businessId: string }) {
  const [days, setDays] = useState('')
  const [minPurchase, setMinPurchase] = useState('')
  const [saved, setSaved] = useState<{ days: string; minPurchase: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch(`/api/restaurant/sample-offers/settings?businessId=${businessId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const loaded = { days: String(d.validityDays), minPurchase: Number(d.minPurchase).toFixed(2) }
        setDays(loaded.days); setMinPurchase(loaded.minPurchase); setSaved(loaded)
      })
      .catch(() => {})
  }, [businessId])

  const save = async () => {
    setBusy(true); setMessage(null)
    try {
      const res = await fetch('/api/restaurant/sample-offers/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, validityDays: Number(days), minPurchase: Number(minPurchase) }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) { setMessage({ ok: false, text: d.error || 'Could not save' }); return }
      const now = { days: String(d.validityDays), minPurchase: Number(d.minPurchase).toFixed(2) }
      setDays(now.days); setMinPurchase(now.minPurchase); setSaved(now)
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
            <input
              type="number" min={0} step="0.01" value={minPurchase}
              onChange={e => setMinPurchase(e.target.value)}
              className="w-28 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Sample receipt (coupon) expiry</label>
          <p className="text-xs text-gray-600 dark:text-gray-400">Days a customer has to come back and redeem the sample receipt. Existing offers keep the expiry printed on their receipt.</p>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number" min={1} max={365} value={days}
              onChange={e => setDays(e.target.value)}
              className="w-24 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">days</span>
          </div>
        </div>
        <button
          type="button" onClick={save}
          disabled={busy || !days || minPurchase === '' || (saved?.days === days && saved?.minPurchase === Number(minPurchase).toFixed(2))}
          className="px-3 py-1.5 text-sm rounded-md bg-teal-600 text-white disabled:opacity-50"
        >{busy ? 'Saving…' : 'Save'}</button>
      </div>
      {message && <p className={`mt-2 text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>}
    </div>
  )
}
