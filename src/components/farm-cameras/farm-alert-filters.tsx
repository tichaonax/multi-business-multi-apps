'use client'

// MBM-340 — the camera alert filters, shared by the 📹 panel and History
// (alert list guide §3.6): find (camera, site or a time like "1:38" / "gate 1 pm"),
// day picker with ‹ › (no later than today), hour, site (when more than one
// has new alerts), kind chips, and "n new match · Clear the filters".
import { useEffect, useMemo, useState } from 'react'
import { alertButtonClass as btn } from './farm-alert-row'

export type Kind = 'all' | 'movement' | 'sound' | 'nopicture'

export const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const shiftDay = (day: string, by: number) => {
  const [y, m, d] = day.split('-').map(Number)
  const x = new Date(y, m - 1, d + by)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`

export function useAlertFilters() {
  const tz = useMemo(() => new Date().getTimezoneOffset(), [])
  const [q, setQ] = useState('')
  const [qSent, setQSent] = useState('')
  const [site, setSite] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState<number | null>(null)

  // Find waits for typing to pause
  useEffect(() => {
    const t = setTimeout(() => setQSent(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const params = useMemo(() => ({ q: qSent, site, kind, day, hour: hour === null ? '' : String(hour), tz: String(tz) }), [qSent, site, kind, day, hour, tz])
  const filtered = !!(qSent || site || kind !== 'all' || day || hour !== null)
  const clear = () => { setQ(''); setQSent(''); setSite(''); setKind('all'); setDay(''); setHour(null) }
  return { q, setQ, site, setSite, kind, setKind, day, setDay, hour, setHour, params, filtered, clear }
}
export type AlertFilters = ReturnType<typeof useAlertFilters>

export function AlertFilterBar({ f, sites, newCount, newMatching, timeNote }: {
  f: AlertFilters
  sites: { id: string; name: string; newCount: number }[]
  newCount: number
  newMatching?: number | null
  timeNote?: string | null
}) {
  const today = localToday()
  const chip = (k: Kind, label: string) => (
    <button key={k} onClick={() => f.setKind(k)} className={`px-3 py-1 rounded-full text-xs border ${f.kind === k ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{label}</button>
  )
  return (
    <div className="space-y-2">
      <input className="input-field w-full text-sm" placeholder="Camera, site or a time (1:38)…" value={f.q} onChange={e => f.setQ(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          className="input-field text-sm py-1 w-40"
          value={f.day}
          max={today}
          onChange={e => f.setDay(e.target.value && e.target.value > today ? today : e.target.value)}
          title="Day"
        />
        <button className={btn} title="The day before" onClick={() => f.setDay(shiftDay(f.day || today, -1))}>‹</button>
        <button className={btn} title="The day after" disabled={!f.day || f.day >= today} onClick={() => f.setDay(d => (d && d < today ? shiftDay(d, 1) : d))}>›</button>
        <select className="input-field text-sm py-1" value={f.hour === null ? '' : String(f.hour)} onChange={e => f.setHour(e.target.value === '' ? null : Number(e.target.value))}>
          <option value="">Any hour</option>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
        {(f.day || f.hour !== null) && <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline" onClick={() => { f.setDay(''); f.setHour(null) }}>Any time</button>}
        {sites.length > 1 && (
          <select className="input-field text-sm py-1" value={f.site} onChange={e => f.setSite(e.target.value)}>
            <option value="">All sites ({newCount})</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.newCount})</option>)}
          </select>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chip('all', 'All')}{chip('movement', 'Movement')}{chip('sound', 'Sound')}{chip('nopicture', 'No picture')}
      </div>
      {timeNote && <p className="text-xs text-gray-600 dark:text-gray-300">Times: {timeNote}</p>}
      {f.filtered && (
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {newMatching ?? 0} new match · <button className="text-blue-600 dark:text-blue-400 hover:underline" onClick={f.clear}>Clear the filters</button>
        </p>
      )}
    </div>
  )
}
