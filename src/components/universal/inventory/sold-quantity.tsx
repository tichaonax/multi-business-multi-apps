'use client'

// MBM-344 follow-up (the owner, 2026-11-26, screenshot 175605): under the
// stock in the inventory list, how many sold — month to date by default.
// Clicking it opens the standard date range popup (MBM-345); only that row's
// figure changes (no table reload), with a small coloured key naming the
// range. Data: GET /api/inventory/{businessId}/sold.
import { useRef, useState } from 'react'
import { DateRangePopup, type DateRange, type RangeSelection } from '@/components/ui/date-range-picker'
import { presetRange } from '@/lib/date-range-presets'

/** Whole local days: the start day's midnight to the midnight after the end day */
function wholeDays(r: DateRange): { start: string; end: string } {
  const s = new Date(r.start.getFullYear(), r.start.getMonth(), r.start.getDate())
  const e = new Date(r.end.getFullYear(), r.end.getMonth(), r.end.getDate() + 1)
  return { start: s.toISOString(), end: e.toISOString() }
}

/** The month to date, in the browser's own days */
export function monthToDate(): { start: string; end: string } {
  return wholeDays(presetRange('mtd'))
}

export async function fetchSold(businessId: string, ids: string[], start: string, end: string): Promise<Record<string, number>> {
  const q = new URLSearchParams({ ids: ids.join(','), start, end })
  const r = await fetch(`/api/inventory/${businessId}/sold?${q}`, { credentials: 'include' })
  const j = await r.json().catch(() => null)
  if (!r.ok || !j?.success) throw new Error(j?.error || 'Could not load quantities sold')
  return j.data || {}
}

export function SoldQuantity({ businessId, itemId, unit, mtd }: {
  businessId: string
  itemId: string
  unit: string
  /** Month to date, from the page's one request (undefined while loading) */
  mtd: number | undefined
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState<{ qty: number; range: DateRange; selection: RangeSelection; label: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apply = async (range: DateRange | null, change: { selection: RangeSelection; label: string }) => {
    if (!range) return
    // Month to date is the default: back to it
    if (change.selection.kind === 'preset' && change.selection.key === 'mtd') { setCustom(null); setOpen(false); return }
    setBusy(true); setError(null)
    try {
      const { start, end } = wholeDays(range)
      const data = await fetchSold(businessId, [itemId], start, end)
      setCustom({ qty: data[itemId] ?? 0, range, selection: change.selection, label: change.label })
      setOpen(false)
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const qty = custom ? custom.qty : mtd
  // Its own clicks stay here: a phone card opens the item when tapped
  return (
    <span onClick={e => e.stopPropagation()}>
      <button ref={btnRef} type="button" onClick={() => { setError(null); setOpen(true) }} title="Quantity sold — click to choose the dates"
        className="mt-0.5 flex flex-col items-start text-left leading-tight hover:underline decoration-dotted">
        <span className="text-xs text-gray-700 dark:text-gray-300">
          {qty === undefined ? '…' : `${qty} sold`}
        </span>
        <span className={`text-[10px] ${custom ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {custom ? custom.label : 'month to date'}
        </span>
      </button>
      <DateRangePopup anchor={btnRef.current} open={open} onClose={() => setOpen(false)} title="Sold between"
        value={custom ? custom.range : presetRange('mtd')}
        selection={custom ? custom.selection : { kind: 'preset', key: 'mtd' }}
        onApply={apply} busy={busy} error={error}
        footer={<>{unit} sold, returns taken off</>} />
    </span>
  )
}
