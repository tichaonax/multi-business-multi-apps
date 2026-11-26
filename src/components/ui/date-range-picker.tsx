'use client'

// MBM-345: the standard date range popup — used everywhere a date range is
// picked (the reports' DateRangeSelector, list filter bars, order filters,
// the inventory list's sold figure, …). A page may limit the options.
//
//   <DateRangePicker value={range} onChange={(range, sel) => …} />
//     a button showing the range in use ("📅 Month to date") that opens it
//   <DateRangePopup anchor={el} … />
//     the popup alone, for a page with its own trigger
//
// Presets and their exact dates: src/lib/date-range-presets.ts. Clicking a
// preset or a month applies it at once; a specific date and From / To apply
// with Show. On a phone it opens full width at the bottom of the screen.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ALL_PRESET_KEYS, MONTH_NAMES, PRESETS, describeRange, fromYmd, matchPreset, monthRange, presetRange, toYmd,
  type DateRange, type PresetKey,
} from '@/lib/date-range-presets'

export type { DateRange, PresetKey }

/** What was picked: a preset, a month, one day, From / To, or all time */
export type RangeSelection =
  | { kind: 'preset'; key: PresetKey }
  | { kind: 'month'; year: number; month: number }
  | { kind: 'day' }
  | { kind: 'custom' }
  | { kind: 'all' }

export interface RangeChange {
  selection: RangeSelection
  /** "Month to date", "March 2026", "Nov 1 – Nov 15", "All time" */
  label: string
}

export interface DateRangeOptions {
  /** The presets offered (all by default) */
  presets?: PresetKey[]
  /** Offer "All time" (the range is then null) */
  allowAllTime?: boolean
  /** Offer a month + year */
  allowMonth?: boolean
  /** Offer one specific day */
  allowSpecificDate?: boolean
  /** Offer From / To */
  allowCustom?: boolean
  /** Latest day that can be picked (default today); null: no limit */
  maxDate?: Date | null
  /** Years offered for a month (default this year and the 4 before) */
  years?: number[]
}

export function labelFor(range: DateRange | null, selection: RangeSelection | null, presets: PresetKey[] = ALL_PRESET_KEYS): string {
  if (!range || selection?.kind === 'all') return 'All time'
  if (selection?.kind === 'month') return describeRange(range, { month: selection })
  if (selection?.kind === 'preset') return describeRange(range, { presetKey: selection.key })
  if (selection?.kind === 'day' || selection?.kind === 'custom') return describeRange(range)
  return describeRange(range, { presetKey: matchPreset(range, presets) })
}

const GROUPS = ['Days', 'Weeks', 'Months', 'Years'] as const
const chip = (on: boolean) =>
  `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${on
    ? 'bg-blue-600 text-white'
    : 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100'}`
const input = 'block w-full mt-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-1 text-sm text-gray-900 dark:text-gray-100'

export function DateRangePopup({
  anchor, open, onClose, title = 'Date range', value, selection, onApply, busy, error, footer,
  presets = ALL_PRESET_KEYS, allowAllTime = false, allowMonth = true, allowSpecificDate = true, allowCustom = true,
  maxDate, years,
}: DateRangeOptions & {
  /** The element it opens under */
  anchor: HTMLElement | null
  open: boolean
  onClose: () => void
  title?: string
  value: DateRange | null
  selection?: RangeSelection | null
  /** Picked: apply it (the caller closes, or keeps it open while loading) */
  onApply: (range: DateRange | null, change: RangeChange) => void
  busy?: boolean
  error?: string | null
  /** A line under the buttons */
  footer?: ReactNode
}) {
  const max = maxDate === undefined ? toYmd(new Date()) : maxDate ? toYmd(maxDate) : undefined
  const thisYear = new Date().getFullYear()
  const yearList = years ?? [0, 1, 2, 3, 4].map(n => thisYear - n)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [oneDay, setOneDay] = useState('')
  const [mode, setMode] = useState<'custom' | 'day'>('custom')
  const [mYear, setMYear] = useState(thisYear)
  const [localError, setLocalError] = useState<string | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number; phone: boolean }>({ top: 0, left: 0, phone: false })
  const boxRef = useRef<HTMLDivElement>(null)

  // Fresh fields each time it opens, from the range in use
  useEffect(() => {
    if (!open) return
    const s = value ? toYmd(value.start) : toYmd(new Date()), e = value ? toYmd(value.end) : s
    setFrom(s); setTo(e); setOneDay(e)
    setMode(selection?.kind === 'day' ? 'day' : 'custom')
    setMYear(selection?.kind === 'month' ? selection.year : thisYear)
    setLocalError(null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Under the anchor, kept on screen; full width at the bottom on a phone
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const phone = window.innerWidth < 640
      const r = anchor?.getBoundingClientRect()
      const w = boxRef.current?.offsetWidth ?? 336, h = boxRef.current?.offsetHeight ?? 420
      let top = r ? r.bottom + 4 : 80
      if (top + h > window.innerHeight - 8) top = Math.max(8, (r ? r.top : window.innerHeight) - h - 4)
      const left = Math.max(8, Math.min(r ? r.left : 8, window.innerWidth - w - 8))
      setPos({ top, left, phone })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, anchor])

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const activeKey = selection?.kind === 'preset' ? selection.key : selection ? null : value ? matchPreset(value, presets) : null
  const pick = (key: PresetKey) => onApply(presetRange(key), { selection: { kind: 'preset', key }, label: PRESETS.find(p => p.key === key)!.label })
  const pickMonth = (m: number) => onApply(monthRange(mYear, m), { selection: { kind: 'month', year: mYear, month: m }, label: `${MONTH_NAMES[m]} ${mYear}` })
  const show = () => {
    if (mode === 'day') {
      if (!oneDay) { setLocalError('Pick a day'); return }
      const d = fromYmd(oneDay)
      onApply({ start: d, end: new Date(d) }, { selection: { kind: 'day' }, label: describeRange({ start: d, end: d }) })
      return
    }
    if (!from || !to || from > to) { setLocalError('Pick a start date on or before the end date'); return }
    const r = { start: fromYmd(from), end: fromYmd(to) }
    onApply(r, { selection: { kind: 'custom' }, label: describeRange(r) })
  }
  const shown = PRESETS.filter(p => presets.includes(p.key))
  const err = localError || error

  return createPortal(
    <span onClick={e => e.stopPropagation()}>
      <div className="fixed inset-0 z-[100010] bg-black/20 sm:bg-transparent" onClick={onClose} />
      <div ref={boxRef} role="dialog" aria-label={title}
        className={`fixed z-[100011] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-3 text-sm
          ${pos.phone ? 'inset-x-0 bottom-0 rounded-t-xl max-h-[85vh] overflow-y-auto' : 'w-[21rem] rounded-lg'}`}
        style={pos.phone ? undefined : { top: pos.top, left: pos.left }}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <button type="button" onClick={onClose} aria-label="Close" className="px-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">✕</button>
        </div>

        {allowAllTime && (
          <div className="mb-2">
            <button type="button" disabled={busy} className={chip(selection?.kind === 'all' || (!value && !selection))}
              onClick={() => onApply(null, { selection: { kind: 'all' }, label: 'All time' })}>All time</button>
          </div>
        )}
        {GROUPS.map(g => {
          const list = shown.filter(p => p.group === g)
          if (!list.length) return null
          return (
            <div key={g} className="mb-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{g}</div>
              <div className="flex flex-wrap gap-1">
                {list.map(p => (
                  <button key={p.key} type="button" disabled={busy} className={chip(activeKey === p.key)} onClick={() => pick(p.key)}>{p.label}</button>
                ))}
              </div>
            </div>
          )
        })}

        {allowMonth && (
          <div className="mb-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">A month</span>
              <select value={mYear} onChange={e => setMYear(Number(e.target.value))}
                className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1 py-0.5 text-xs text-gray-900 dark:text-gray-100">
                {yearList.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {MONTH_NAMES.map((m, i) => {
                const future = mYear > thisYear || (mYear === thisYear && i > new Date().getMonth())
                const on = selection?.kind === 'month' && selection.year === mYear && selection.month === i
                return (
                  <button key={m} type="button" disabled={busy || (future && maxDate !== null)} onClick={() => pickMonth(i)}
                    className={`${chip(on)} px-0 disabled:opacity-30`}>{m.slice(0, 3)}</button>
                )
              })}
            </div>
          </div>
        )}

        {(allowCustom || allowSpecificDate) && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            {allowCustom && allowSpecificDate && (
              <div className="flex gap-1 mb-1.5">
                <button type="button" className={chip(mode === 'custom')} onClick={() => { setMode('custom'); setLocalError(null) }}>From – To</button>
                <button type="button" className={chip(mode === 'day')} onClick={() => { setMode('day'); setLocalError(null) }}>One day</button>
              </div>
            )}
            {(mode === 'day' && allowSpecificDate) || !allowCustom ? (
              <label className="block text-xs text-gray-600 dark:text-gray-400">Day
                <input type="date" value={oneDay} max={max} onChange={e => { setOneDay(e.target.value); setMode('day') }} className={input} />
              </label>
            ) : (
              <div className="flex items-end gap-2">
                <label className="flex-1 text-xs text-gray-600 dark:text-gray-400">From
                  <input type="date" value={from} max={to || max} onChange={e => setFrom(e.target.value)} className={input} />
                </label>
                <label className="flex-1 text-xs text-gray-600 dark:text-gray-400">To
                  <input type="date" value={to} min={from} max={max} onChange={e => setTo(e.target.value)} className={input} />
                </label>
              </div>
            )}
          </div>
        )}

        {err && <div className="mt-2 text-xs text-red-600 dark:text-red-400">{err}</div>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Close</button>
          {(allowCustom || allowSpecificDate) && (
            <button type="button" disabled={busy} onClick={show}
              className="px-3 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">{busy ? 'Loading…' : 'Show'}</button>
          )}
        </div>
        {footer && <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{footer}</div>}
      </div>
    </span>,
    document.body,
  )
}

/** A button showing the range in use, opening the standard popup */
export function DateRangePicker({
  value, onChange, selection: selectionProp, title, className, label: labelPrefix, disabled, ...options
}: DateRangeOptions & {
  /** null: all time */
  value: DateRange | null
  onChange: (range: DateRange | null, change: RangeChange) => void
  /** What was picked, if the page keeps it (else worked out from the range) */
  selection?: RangeSelection | null
  title?: string
  className?: string
  /** Text before the range on the button, e.g. "Date" */
  label?: string
  disabled?: boolean
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<{ selection: RangeSelection; range: DateRange | null } | null>(null)
  // The page's own selection wins; else the last pick, while the range is still that pick's
  const same = (a: DateRange | null, b: DateRange | null) => (!a && !b) || (!!a && !!b && toYmd(a.start) === toYmd(b.start) && toYmd(a.end) === toYmd(b.end))
  const selection = selectionProp !== undefined ? selectionProp : picked && same(picked.range, value) ? picked.selection : null
  const text = labelFor(value, selection, options.presets)

  return (
    <>
      <button ref={btnRef} type="button" disabled={disabled} onClick={() => setOpen(true)}
        className={className ?? 'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 hover:border-blue-400 disabled:opacity-50'}
        title="Choose the dates">
        <span aria-hidden>📅</span>
        {labelPrefix && <span className="text-gray-500 dark:text-gray-400">{labelPrefix}:</span>}
        <span className="font-medium text-blue-700 dark:text-blue-300">{text}</span>
        <span className="text-gray-400 text-xs" aria-hidden>▾</span>
      </button>
      <DateRangePopup {...options} anchor={btnRef.current} open={open} onClose={() => setOpen(false)} title={title}
        value={value} selection={selection}
        onApply={(range, change) => { setPicked({ selection: change.selection, range }); setOpen(false); onChange(range, change) }} />
    </>
  )
}

/**
 * The picker for pages that keep From / To as YYYY-MM-DD strings ('' = not
 * set). All time (if allowed) gives '' and ''.
 */
export function YmdRangePicker({ from, to, onChange, ...rest }: DateRangeOptions & {
  from: string
  to: string
  onChange: (from: string, to: string, change: RangeChange) => void
  selection?: RangeSelection | null
  title?: string
  className?: string
  label?: string
  disabled?: boolean
}) {
  const value = from && to ? { start: fromYmd(from), end: fromYmd(to) } : from ? { start: fromYmd(from), end: new Date() } : null
  return (
    <DateRangePicker {...rest} value={value}
      onChange={(range, change) => range ? onChange(toYmd(range.start), toYmd(range.end), change) : onChange('', '', change)} />
  )
}
