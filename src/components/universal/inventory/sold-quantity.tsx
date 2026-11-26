'use client'

// MBM-344 follow-up (the owner, 2026-11-26, screenshot 175605): under the
// stock in the inventory list, how many sold — month to date by default.
// Clicking it opens a small window to pick another range; only that row's
// figure changes (no table reload), with a small coloured key naming the
// range. Data: GET /api/inventory/{businessId}/sold.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const nextDay = (s: string) => { const d = fromYmd(s); d.setDate(d.getDate() + 1); return d }
const short = (s: string) => fromYmd(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/** The month to date, in the browser's own day (start inclusive, end exclusive) */
export function monthToDate(): { start: string; end: string } {
  const now = new Date()
  return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: nextDay(ymd(now)).toISOString() }
}

export async function fetchSold(businessId: string, ids: string[], start: string, end: string): Promise<Record<string, number>> {
  const q = new URLSearchParams({ ids: ids.join(','), start, end })
  const r = await fetch(`/api/inventory/${businessId}/sold?${q}`, { credentials: 'include' })
  const j = await r.json().catch(() => null)
  if (!r.ok || !j?.success) throw new Error(j?.error || 'Could not load quantities sold')
  return j.data || {}
}

function presets() {
  const t = new Date(), today = ymd(t)
  const monday = new Date(t); monday.setDate(t.getDate() - ((t.getDay() + 6) % 7))
  const lastStart = new Date(t.getFullYear(), t.getMonth() - 1, 1), lastEnd = new Date(t.getFullYear(), t.getMonth(), 0)
  const d30 = new Date(t); d30.setDate(t.getDate() - 29)
  return [
    { label: 'Today', from: today, to: today },
    { label: 'This week', from: ymd(monday), to: today },
    { label: 'Month to date', from: ymd(new Date(t.getFullYear(), t.getMonth(), 1)), to: today },
    { label: 'Last month', from: ymd(lastStart), to: ymd(lastEnd) },
    { label: 'Last 30 days', from: ymd(d30), to: today },
    { label: 'Year to date', from: ymd(new Date(t.getFullYear(), 0, 1)), to: today },
  ]
}

export function SoldQuantity({ businessId, itemId, unit, mtd }: {
  businessId: string
  itemId: string
  unit: string
  /** Month to date, from the page's one request (undefined while loading) */
  mtd: number | undefined
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState<{ qty: number; from: string; to: string; label: string } | null>(null)
  const [from, setFrom] = useState(() => presets()[2].from)
  const [to, setTo] = useState(() => presets()[2].to)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  const show = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 296)) })
    setError(null)
    setOpen(true)
  }

  const apply = async (f: string, t: string, label?: string) => {
    if (!f || !t || f > t) { setError('Pick a start date on or before the end date'); return }
    setBusy(true); setError(null)
    try {
      const data = await fetchSold(businessId, [itemId], fromYmd(f).toISOString(), nextDay(t).toISOString())
      const isMtd = label === 'Month to date'
      setCustom(isMtd ? null : { qty: data[itemId] ?? 0, from: f, to: t, label: label || (f === t ? short(f) : `${short(f)} – ${short(t)}`) })
      setFrom(f); setTo(t)
      setOpen(false)
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const qty = custom ? custom.qty : mtd
  // Its own clicks stay here: a phone card opens the item when tapped
  return (
    <span onClick={e => e.stopPropagation()}>
      <button ref={btnRef} type="button" onClick={show} title="Quantity sold — click to choose the dates"
        className="mt-0.5 flex flex-col items-start text-left leading-tight hover:underline decoration-dotted">
        <span className="text-xs text-gray-700 dark:text-gray-300">
          {qty === undefined ? '…' : `${qty} sold`}
        </span>
        <span className={`text-[10px] ${custom ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {custom ? custom.label : 'month to date'}
        </span>
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="fixed z-[61] w-72 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-3 text-sm"
            style={{ top: pos.top, left: pos.left }}>
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Sold between</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {presets().map(p => (
                <button key={p.label} type="button" disabled={busy} onClick={() => apply(p.from, p.to, p.label)}
                  className="px-2 py-0.5 rounded-full text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100">
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <label className="flex-1 text-xs text-gray-600 dark:text-gray-400">From
                <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)}
                  className="block w-full mt-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1 text-gray-900 dark:text-gray-100" />
              </label>
              <label className="flex-1 text-xs text-gray-600 dark:text-gray-400">To
                <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}
                  className="block w-full mt-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1 text-gray-900 dark:text-gray-100" />
              </label>
            </div>
            {error && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</div>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Close</button>
              <button type="button" disabled={busy} onClick={() => apply(from, to)}
                className="px-3 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">{busy ? 'Loading…' : 'Show'}</button>
            </div>
            <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{unit} sold, returns taken off</div>
          </div>
        </>,
        document.body,
      )}
    </span>
  )
}
