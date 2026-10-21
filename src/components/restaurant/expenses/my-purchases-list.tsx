'use client'

/**
 * MBM-322 — salesperson's view of recorded purchases (tab in the Record
 * Expense modal): where each item is in the payment process, with the
 * payee's phone so they can answer the vendor.
 * MBM-327: grouped into collapsible sections — per person who recorded them
 * when showing everyone's (admins start there), per purchase day when
 * showing only your own.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

interface Line {
  id: string
  description: string
  amount: number
  paidAmount: number
  outstanding: number
  status: 'UNPAID' | 'IN_REQUEST' | 'APPROVED' | 'PAID' | 'VOID'
  paidAt: string | null
  comboRequest: { status: string; submittedAt: string | null; approvedAt: string | null; requestedBy: string | null } | null
}
interface Txn {
  id: string
  reference: string
  purchasedAt: string
  payee: { name: string; phone: string | null } | null
  notes: string | null
  createdBy: { id: string; name: string; profilePhotoUrl: string | null } | null
  lines: Line[]
}

type Filter = 'open' | 'paid' | 'all'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'all', label: 'All' },
]

const money = (n: number) => `$${n.toFixed(2)}`
const day = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

/** Plain-words status for one item. */
function lineStatus(l: Line): { text: string; cls: string } {
  const by = l.comboRequest?.requestedBy ? ` by ${l.comboRequest.requestedBy}` : ''
  switch (l.status) {
    case 'PAID':
      return { text: `Paid${l.paidAt ? ` on ${day(l.paidAt)}` : ''}`, cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' }
    case 'APPROVED':
      return { text: `Approved — awaiting payment${by ? ` (requested${by})` : ''}`, cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' }
    case 'IN_REQUEST':
      return l.comboRequest?.submittedAt && l.comboRequest.status !== 'DRAFT'
        ? { text: `Payment requested${by} on ${day(l.comboRequest.submittedAt)}`, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' }
        : { text: `Payment request being prepared${by}`, cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' }
    default:
      return l.paidAmount > 0
        ? { text: `Part-paid — ${money(l.outstanding)} not yet requested`, cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' }
        : { text: 'Not yet requested', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' }
  }
}


function PurchaseCard({ t }: { t: Txn }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {t.payee?.name ?? <span className="italic font-normal text-gray-500">No payee yet</span>}
          </div>
          {t.payee?.phone && (
            <a href={`tel:${t.payee.phone.replace(/\s+/g, '')}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">📞 {t.payee.phone}</a>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right font-mono">{t.reference}</div>
      </div>
      {t.lines.map(l => {
        const st = lineStatus(l)
        return (
          <div key={l.id} className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm text-gray-900 dark:text-white">{l.description}</div>
              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs ${st.cls}`}>{st.text}</span>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold text-gray-900 dark:text-white">{money(l.amount)}</div>
              {l.paidAmount > 0 && l.status !== 'PAID' && (
                <div className="text-xs text-gray-500 dark:text-gray-400">paid {money(l.paidAmount)} · owed {money(l.outstanding)}</div>
              )}
            </div>
          </div>
        )
      })}
      {t.notes && <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">📝 {t.notes}</div>}
    </div>
  )
}

interface DayGroup { key: string; label: string; txns: Txn[]; owed: number; total: number }
interface PersonGroup { key: string; label: string; photoUrl: string | null; days: DayGroup[]; count: number; owed: number; total: number }

// Person headers take colours in turn so neighbours never match. No red —
// red already means "owed" here.
const PERSON_COLORS = [
  { avatar: 'bg-emerald-500', name: 'text-emerald-700 dark:text-emerald-400', border: 'border-l-emerald-500' },
  { avatar: 'bg-sky-500',     name: 'text-sky-700 dark:text-sky-400',         border: 'border-l-sky-500' },
  { avatar: 'bg-violet-500',  name: 'text-violet-700 dark:text-violet-400',   border: 'border-l-violet-500' },
  { avatar: 'bg-amber-500',   name: 'text-amber-700 dark:text-amber-400',     border: 'border-l-amber-500' },
  { avatar: 'bg-pink-500',    name: 'text-pink-700 dark:text-pink-400',       border: 'border-l-pink-500' },
  { avatar: 'bg-teal-600',    name: 'text-teal-700 dark:text-teal-400',       border: 'border-l-teal-500' },
]
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'

/** One group per purchase day, newest first (txns arrive newest first). */
function groupByDay(txns: Txn[], prefix: string): DayGroup[] {
  const map = new Map<string, DayGroup>()
  for (const t of txns) {
    const label = day(t.purchasedAt)
    const g = map.get(label) ?? { key: `${prefix}d:${label}`, label, txns: [], owed: 0, total: 0 }
    g.txns.push(t)
    for (const l of t.lines) { g.owed += l.outstanding; g.total += l.amount }
    map.set(label, g)
  }
  return [...map.values()]
}

/** Everyone's view: one group per person who recorded, each split by day. */
function groupByPerson(txns: Txn[]): PersonGroup[] {
  const map = new Map<string, Txn[]>()
  for (const t of txns) {
    const id = t.createdBy?.id ?? 'unknown'
    map.set(id, [...(map.get(id) ?? []), t])
  }
  return [...map.entries()].map(([id, list]) => {
    const key = `p:${id}:`
    const days = groupByDay(list, key)
    return {
      key, label: list[0].createdBy?.name ?? 'Unknown', photoUrl: list[0].createdBy?.profilePhotoUrl ?? null, days, count: list.length,
      owed: days.reduce((s, d) => s + d.owed, 0), total: days.reduce((s, d) => s + d.total, 0),
    }
  }).sort((a, b) => a.label.localeCompare(b.label))
}

/** First day of the month `back` months before this one (local time). */
const monthStart = (back: number) => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - back, 1) }
const monthName = (d: Date) => d.toLocaleDateString([], { month: 'long', year: 'numeric' })

export function MyPurchasesList({ businessId }: { businessId: string }) {
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
  const [filter, setFilter] = useState<Filter>('open')
  const [mineOnly, setMineOnly] = useState(true)
  const [txns, setTxns] = useState<Txn[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())
  // Paid/All load one month at a time; Pending always shows everything still owed
  const [monthsBack, setMonthsBack] = useState(0)
  const [showRange, setShowRange] = useState(false)
  const [range, setRange] = useState({ from: '', to: '' })
  const mineTouched = useRef(false)
  const windowed = filter !== 'open'
  const rangeActive = showRange && !!range.from && !!range.to

  // Admins record few purchases themselves — start them on everyone's
  useEffect(() => {
    if (isAdmin && !mineTouched.current) setMineOnly(false)
  }, [isAdmin])

  useEffect(() => {
    // Ignore a slower response for a filter the user has already moved off
    let current = true
    setTxns(null)
    setError(null)
    const qs = new URLSearchParams({ businessId, status: filter, ...(mineOnly ? { mine: '1' } : {}) })
    if (windowed) {
      if (rangeActive) {
        qs.set('start', new Date(`${range.from}T00:00:00`).toISOString())
        qs.set('end', new Date(`${range.to}T23:59:59.999`).toISOString())
      } else {
        qs.set('start', monthStart(monthsBack).toISOString())
      }
    }
    fetch(`/api/restaurant/expenses?${qs}`)
      .then(async r => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error || 'Failed to load')
        if (current) setTxns(j.data || [])
      })
      .catch(e => { if (current) { setError(e.message); setTxns([]) } })
    return () => { current = false }
  }, [businessId, filter, mineOnly, windowed, rangeActive, range.from, range.to, monthsBack])

  const owed = (txns ?? []).reduce((s, t) => s + t.lines.reduce((x, l) => x + l.outstanding, 0), 0)
  const people = useMemo(() => (mineOnly ? [] : groupByPerson(txns ?? [])), [txns, mineOnly])
  const days = useMemo(() => (mineOnly ? groupByDay(txns ?? [], '') : []), [txns, mineOnly])
  const allKeys = mineOnly ? days.map(d => d.key) : people.flatMap(p => [p.key, ...p.days.map(d => d.key)])
  const toggle = (key: string) => setOpenKeys(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })
  const changeFilter = (f: Filter) => { setFilter(f); setMonthsBack(0) }

  const amountBadge = (g: { owed: number; total: number }) => g.owed > 0
    ? <span className="font-semibold text-rose-600 dark:text-rose-400">{money(g.owed)} owed</span>
    : <span className="font-semibold text-green-700 dark:text-green-400">{money(g.total)}{filter === 'paid' ? ' paid' : ''}</span>

  const renderDay = (d: DayGroup) => {
    const isOpen = openKeys.has(d.key)
    return (
      <div key={d.key} className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <button type="button" onClick={() => toggle(d.key)}
          className="w-full px-3 py-1.5 flex items-center justify-between gap-2 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {isOpen ? '▾' : '▸'} 📅 {d.label}
            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">{d.txns.length} purchase{d.txns.length === 1 ? '' : 's'}</span>
          </span>
          <span className="text-sm">{amountBadge(d)}</span>
        </button>
        {isOpen && <div className="p-2 space-y-2">{d.txns.map(t => <PurchaseCard key={t.id} t={t} />)}</div>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          {FILTERS.map(f => (
            <button key={f.key} type="button" onClick={() => changeFilter(f.key)}
              className={`px-3 py-1.5 text-sm ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={mineOnly} onChange={e => { mineTouched.current = true; setMineOnly(e.target.checked) }} />
          Recorded by me only
        </label>
      </div>

      {windowed && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          {rangeActive
            ? <span>Showing {day(`${range.from}T00:00:00`)} – {day(`${range.to}T00:00:00`)}</span>
            : <span>Showing since {monthName(monthStart(monthsBack))}</span>}
          <button type="button" onClick={() => setShowRange(v => !v)} className="text-blue-600 dark:text-blue-400 hover:underline">
            {showRange ? 'Clear date range' : '📅 Pick a date range'}
          </button>
          {showRange && (
            <span className="flex items-center gap-1">
              <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))}
                className="px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              to
              <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))}
                className="px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </span>
          )}
        </div>
      )}

      {txns === null ? (
        <p className="text-center text-sm text-gray-500 py-8">Loading…</p>
      ) : error ? (
        <p className="text-center text-sm text-red-600 py-8">{error}</p>
      ) : (
        <>
          {txns.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
              {filter === 'open' ? 'Nothing waiting for payment. 🎉' : 'No purchases in this period.'}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                {filter !== 'paid' && owed > 0
                  ? <p className="text-sm text-gray-600 dark:text-gray-300">Still owed: <span className="font-bold text-rose-600 dark:text-rose-400">{money(owed)}</span></p>
                  : <span />}
                <div className="text-xs space-x-3">
                  <button type="button" onClick={() => setOpenKeys(new Set(allKeys))} className="text-blue-600 dark:text-blue-400 hover:underline">Expand all</button>
                  <button type="button" onClick={() => setOpenKeys(new Set())} className="text-blue-600 dark:text-blue-400 hover:underline">Collapse all</button>
                </div>
              </div>
              {mineOnly ? days.map(renderDay) : people.map((p, i) => {
                const isOpen = openKeys.has(p.key)
                const c = PERSON_COLORS[i % PERSON_COLORS.length]
                return (
                  <div key={p.key} className={`border border-gray-300 dark:border-gray-600 border-l-4 ${c.border} rounded-lg`}>
                    <button type="button" onClick={() => toggle(p.key)}
                      className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-r-lg">
                      <span className="flex items-center gap-2 text-sm font-semibold min-w-0">
                        <span className="text-gray-500 dark:text-gray-400">{isOpen ? '▾' : '▸'}</span>
                        <span className={`w-8 h-8 rounded-full shrink-0 relative flex items-center justify-center text-xs font-bold text-white ${c.avatar}`}>
                          {initials(p.label)}
                          {p.photoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.photoUrl} alt={p.label} className="absolute inset-0 w-full h-full object-cover rounded-full"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                          )}
                        </span>
                        <span className={c.name}>{p.label}</span>
                        <span className="font-normal text-gray-500 dark:text-gray-400">{p.count} purchase{p.count === 1 ? '' : 's'}</span>
                      </span>
                      <span className="text-sm">{amountBadge(p)}</span>
                    </button>
                    {isOpen && <div className="p-2 space-y-2">{p.days.map(renderDay)}</div>}
                  </div>
                )
              })}
            </>
          )}
          {windowed && !rangeActive && (
            <button type="button" onClick={() => setMonthsBack(m => m + 1)}
              className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              ⬇ Load {monthName(monthStart(monthsBack + 1))} too
            </button>
          )}
        </>
      )}
    </div>
  )
}
