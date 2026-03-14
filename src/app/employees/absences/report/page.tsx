'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AbsenceRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  date: string
  businessId: string
  businessName: string
  notes: string | null
}

type Tab = 'summary' | 'calendar' | 'trend'

const TREND_PRESETS = [
  { label: 'Last 3M', months: 3 },
  { label: 'Last 6M', months: 6 },
  { label: 'Last 12M', months: 12 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function firstDayOfMonth(year: number, month: number) {
  // 0=Sun … 6=Sat → shift so Mon=0
  const d = new Date(year, month - 1, 1).getDay()
  return (d + 6) % 7
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

// Distinct business colors — dot bg + text label
const BIZ_PALETTE = [
  { dot: 'bg-blue-500',   text: 'text-blue-700 dark:text-blue-300'   },
  { dot: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-300' },
  { dot: 'bg-teal-500',   text: 'text-teal-700 dark:text-teal-300'   },
  { dot: 'bg-pink-500',   text: 'text-pink-700 dark:text-pink-300'   },
  { dot: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
  { dot: 'bg-amber-500',  text: 'text-amber-700 dark:text-amber-300'  },
  { dot: 'bg-cyan-500',   text: 'text-cyan-700 dark:text-cyan-300'   },
  { dot: 'bg-rose-500',   text: 'text-rose-700 dark:text-rose-300'   },
]

/** Build a stable businessId → palette index map from an ordered list of biz ids */
function buildBizColorMap(bizIds: string[]): Map<string, number> {
  const map = new Map<string, number>()
  bizIds.forEach((id, i) => map.set(id, i % BIZ_PALETTE.length))
  return map
}

/** Smart abbreviation: skip shared leading words, take first letters of remaining, max 5 chars */
function bizAbbr(name: string, allNames: string[]): string {
  const words = name.split(' ')
  if (words.length === 1) return name.slice(0, 5).toUpperCase()
  // Find words that are unique to this name (not the same position in all names)
  const firstWords = allNames.map(n => n.split(' ')[0])
  const allSameFirst = firstWords.every(w => w === firstWords[0])
  const relevant = allSameFirst && words.length > 1 ? words.slice(1) : words
  const abbr = relevant.map(w => w[0]).join('').toUpperCase()
  return abbr.slice(0, 5)
}

const HEAT = (n: number) => {
  if (n === 0) return 'bg-transparent text-secondary'
  if (n === 1) return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
  if (n <= 3) return 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200'
  return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
}

const DOT = (n: number) => {
  if (n === 0) return ''
  if (n === 1) return 'bg-yellow-400'
  if (n <= 3) return 'bg-orange-400'
  return 'bg-red-500'
}

// ─── Searchable business dropdown ─────────────────────────────────────────────

function BizDropdown({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selected = options.find(o => o.value === value)?.label ?? 'Select…'

  return (
    <div ref={ref} className="relative w-56">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md bg-background text-primary text-sm focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate">{selected}</span>
        <svg className="w-4 h-4 shrink-0 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-border rounded-md shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <li className="px-3 py-2 text-sm text-secondary">No results</li>
              : filtered.map(o => (
                <li
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 ${value === o.value ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-primary'}`}
                >
                  {o.label}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AbsenceReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { businesses, currentBusinessId } = useBusinessPermissionsContext()

  useEffect(() => {
    if (status !== 'loading' && !session) router.push('/auth/signin')
  }, [session, status, router])

  const subBusinesses = useMemo(() => businesses.filter(b => !b.isUmbrellaBusiness), [businesses])
  const bizOptions = useMemo(() => [
    { value: 'all', label: 'All Businesses' },
    ...subBusinesses.map(b => ({ value: b.businessId, label: b.businessName })),
  ], [subBusinesses])

  // ── Shared state ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('summary')
  const [selectedBiz, setSelectedBiz] = useState('all')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)   // 1-12

  // Trend range
  const [trendPreset, setTrendPreset] = useState(6)
  const [trendCustomFrom, setTrendCustomFrom] = useState('')
  const [trendCustomTo, setTrendCustomTo] = useState('')
  const [trendCustom, setTrendCustom] = useState(false)

  // Data
  const [records, setRecords] = useState<AbsenceRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Initialise biz to current
  useEffect(() => {
    if (currentBusinessId && selectedBiz === 'all' && subBusinesses.length === 1) {
      setSelectedBiz(currentBusinessId)
    }
  }, [currentBusinessId, subBusinesses.length])

  // ── Date ranges ─────────────────────────────────────────────────────────────
  const monthFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const monthTo   = `${year}-${String(month).padStart(2, '0')}-${daysInMonth(year, month)}`

  const trendRange = useMemo(() => {
    if (trendCustom && trendCustomFrom && trendCustomTo) {
      return { from: trendCustomFrom, to: trendCustomTo }
    }
    const to = new Date()
    const from = new Date(to)
    from.setMonth(from.getMonth() - trendPreset)
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    }
  }, [trendPreset, trendCustom, trendCustomFrom, trendCustomTo])

  const fetchRange = useCallback(async (from: string, to: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (selectedBiz && selectedBiz !== 'all') params.set('businessId', selectedBiz)
      const res = await fetch(`/api/employees/absences/report?${params}`, { credentials: 'include' })
      const json = await res.json()
      setRecords(res.ok ? json.absences : [])
    } catch { setRecords([]) }
    finally { setLoading(false) }
  }, [selectedBiz])

  // Fetch whenever tab/filters change
  useEffect(() => {
    if (tab === 'trend') {
      fetchRange(trendRange.from, trendRange.to)
    } else {
      fetchRange(monthFrom, monthTo)
    }
  }, [tab, fetchRange, monthFrom, monthTo, trendRange])

  // ── Navigate month ───────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const next = new Date(year, month, 1)
    if (next <= now) {
      if (month === 12) { setMonth(1); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    }
  }

  // ── CSV export ───────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = [['Date', 'Employee', 'Employee #', 'Business', 'Notes']]
    records.forEach(r => rows.push([r.date, r.employeeName, r.employeeNumber, r.businessName, r.notes ?? '']))
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `absences-${monthFrom}-${monthTo}.csv`
    a.click()
  }

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
    </div>
  )

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Monthly summary: employee → dates[]
  const summaryMap = useMemo(() => {
    const map = new Map<string, { name: string; number: string; bizName: string; bizId: string; dates: string[] }>()
    records.forEach(r => {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, { name: r.employeeName, number: r.employeeNumber, bizName: r.businessName, bizId: r.businessId, dates: [] })
      }
      map.get(r.employeeId)!.dates.push(r.date)
    })
    return [...map.entries()]
      .map(([id, v]) => ({ employeeId: id, ...v, count: v.dates.length }))
      .sort((a, b) => b.count - a.count)
  }, [records])

  // Calendar: date → records[]
  const calMap = useMemo(() => {
    const map = new Map<string, AbsenceRecord[]>()
    records.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, [])
      map.get(r.date)!.push(r)
    })
    return map
  }, [records])

  // Trend: employee → month → count
  const trendMonths = useMemo(() => {
    const from = new Date(trendRange.from)
    const to = new Date(trendRange.to)
    const months: string[] = []
    const cur = new Date(from.getFullYear(), from.getMonth(), 1)
    while (cur <= to) {
      months.push(isoMonth(cur.getFullYear(), cur.getMonth() + 1))
      cur.setMonth(cur.getMonth() + 1)
    }
    return months
  }, [trendRange])

  const trendData = useMemo(() => {
    // group by employee then month
    const empMap = new Map<string, { name: string; number: string; bizName: string; byMonth: Map<string, number> }>()
    records.forEach(r => {
      if (!empMap.has(r.employeeId)) {
        empMap.set(r.employeeId, { name: r.employeeName, number: r.employeeNumber, bizName: r.businessName, byMonth: new Map() })
      }
      const mon = r.date.slice(0, 7)
      const e = empMap.get(r.employeeId)!
      e.byMonth.set(mon, (e.byMonth.get(mon) ?? 0) + 1)
    })
    return [...empMap.values()].sort((a, b) => {
      const ta = [...a.byMonth.values()].reduce((s, v) => s + v, 0)
      const tb = [...b.byMonth.values()].reduce((s, v) => s + v, 0)
      return tb - ta
    })
  }, [records])

  const isAllMode = selectedBiz === 'all'

  // Build color + abbreviation maps for businesses in current data
  const bizMeta = useMemo(() => {
    const ids = [...new Set(records.map(r => r.businessId))]
    const names = ids.map(id => records.find(r => r.businessId === id)?.businessName ?? id)
    const colorMap = buildBizColorMap(ids)
    const abbrMap = new Map<string, string>()
    ids.forEach((id, i) => abbrMap.set(id, bizAbbr(names[i], names)))
    const legend = ids.map((id, i) => ({ id, name: names[i], abbr: abbrMap.get(id)!, ...BIZ_PALETTE[colorMap.get(id)!] }))
    return { colorMap, abbrMap, legend }
  }, [records])

  // Group by business for summary when All mode
  const bizGroups = useMemo(() => {
    if (!isAllMode) return null
    const map = new Map<string, typeof summaryMap>()
    summaryMap.forEach(e => {
      if (!map.has(e.bizId)) map.set(e.bizId, [])
      map.get(e.bizId)!.push(e)
    })
    return [...map.entries()].map(([bizId, emps]) => ({
      bizId,
      bizName: emps[0]?.bizName ?? bizId,
      emps,
    }))
  }, [isAllMode, summaryMap])

  // ── Render helpers ────────────────────────────────────────────────────────────

  function SummaryTable({ rows, showBiz }: { rows: typeof summaryMap; showBiz: boolean }) {
    const totalDays = daysInMonth(year, month)
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 font-semibold text-secondary text-xs uppercase">Employee</th>
            {showBiz && <th className="pb-2 font-semibold text-secondary text-xs uppercase">Business</th>}
            <th className="pb-2 font-semibold text-secondary text-xs uppercase text-right">Days Absent</th>
            <th className="pb-2 font-semibold text-secondary text-xs uppercase text-right">Rate</th>
            <th className="pb-2 font-semibold text-secondary text-xs uppercase">Dates</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(e => (
            <tr key={e.employeeId} className="hover:bg-muted/30">
              <td className="py-2.5 pr-3">
                <p className="font-medium text-primary">{e.name}</p>
                <p className="text-xs text-secondary font-mono">#{e.number}</p>
              </td>
              {showBiz && <td className="py-2.5 pr-3 text-secondary text-xs">{e.bizName}</td>}
              <td className="py-2.5 text-right">
                <span className={`font-bold ${e.count >= 4 ? 'text-red-600' : e.count >= 2 ? 'text-orange-500' : 'text-primary'}`}>
                  {e.count}
                </span>
              </td>
              <td className="py-2.5 text-right text-secondary text-xs pr-3">
                {((e.count / totalDays) * 100).toFixed(1)}%
              </td>
              <td className="py-2.5">
                <div className="flex flex-wrap gap-1">
                  {e.dates.map(d => (
                    <span key={d} className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-mono">
                      {d.slice(8)}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="py-10 text-center text-secondary">No absences recorded</td></tr>
          )}
        </tbody>
      </table>
    )
  }

  // ── Page layout ───────────────────────────────────────────────────────────────

  return (
    <ContentLayout title="Absence Reports">
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-5">

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-border">
          <Link href="/employees/absences" className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors">Tracker</Link>
          <span className="px-4 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px">Reports</span>
        </div>

        {/* Page title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">Absence Reports</h1>
            <p className="text-sm text-secondary mt-0.5">Analyse employee attendance patterns</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-medium text-primary hover:bg-muted/40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-xl">
          {subBusinesses.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-secondary whitespace-nowrap">Business:</span>
              <BizDropdown options={bizOptions} value={selectedBiz} onChange={setSelectedBiz} />
            </div>
          )}

          {tab !== 'trend' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-secondary whitespace-nowrap">Month:</span>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="p-1.5 rounded hover:bg-muted/50 text-secondary">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-primary min-w-[140px] text-center">{monthLabel(year, month)}</span>
                <button
                  onClick={nextMonth}
                  disabled={new Date(year, month, 1) > now}
                  className="p-1.5 rounded hover:bg-muted/50 text-secondary disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-secondary whitespace-nowrap">Period:</span>
              <div className="flex gap-1">
                {TREND_PRESETS.map(p => (
                  <button
                    key={p.months}
                    onClick={() => { setTrendPreset(p.months); setTrendCustom(false) }}
                    className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${!trendCustom && trendPreset === p.months ? 'bg-blue-600 text-white' : 'border border-border text-secondary hover:bg-muted/40'}`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setTrendCustom(c => !c)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${trendCustom ? 'bg-blue-600 text-white' : 'border border-border text-secondary hover:bg-muted/40'}`}
                >
                  Custom
                </button>
              </div>
              {trendCustom && (
                <div className="flex items-center gap-2">
                  <input type="date" value={trendCustomFrom} onChange={e => setTrendCustomFrom(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-border rounded bg-background text-primary focus:ring-2 focus:ring-blue-500" />
                  <span className="text-secondary text-xs">to</span>
                  <input type="date" value={trendCustomTo} onChange={e => setTrendCustomTo(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-border rounded bg-background text-primary focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 ml-auto" />
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {([
            { key: 'summary', label: '📋 Monthly Summary' },
            { key: 'calendar', label: '📅 Calendar' },
            { key: 'trend',   label: '📈 Trend' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-secondary hover:text-primary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SUMMARY TAB ─────────────────────────────────────────────────────── */}
        {tab === 'summary' && (
          <div className="space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Absences', value: records.length, color: 'text-red-600' },
                { label: 'Employees Absent', value: summaryMap.length, color: 'text-orange-500' },
                { label: 'Most Absent', value: summaryMap[0]?.name?.split(' ')[0] ?? '—', color: 'text-primary' },
                { label: 'Peak Days', value: summaryMap[0] ? `${summaryMap[0].count}d` : '—', color: 'text-primary' },
              ].map(k => (
                <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-secondary">{k.label}</p>
                  <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            {isAllMode && bizGroups ? (
              <div className="space-y-4">
                {bizGroups.map(g => (
                  <div key={g.bizId} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-muted/40 border-b border-border">
                      <span className="text-sm font-semibold text-primary">{g.bizName}</span>
                      <span className="ml-2 text-xs text-secondary">{g.emps.length} employee{g.emps.length !== 1 ? 's' : ''} affected</span>
                    </div>
                    <div className="p-5 overflow-x-auto">
                      <SummaryTable rows={g.emps} showBiz={true} />
                    </div>
                  </div>
                ))}
                {bizGroups.length === 0 && !loading && (
                  <div className="bg-card border border-border rounded-xl p-10 text-center text-secondary">No absences recorded for {monthLabel(year, month)}</div>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-5 overflow-x-auto">
                <SummaryTable rows={summaryMap} showBiz={false} />
              </div>
            )}
          </div>
        )}

        {/* ── CALENDAR TAB ────────────────────────────────────────────────────── */}
        {tab === 'calendar' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-secondary py-2 border-r last:border-r-0 border-border">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {/* Leading blank cells */}
              {Array.from({ length: firstDayOfMonth(year, month) }).map((_, i) => (
                <div key={`blank-${i}`} className="border-r border-b border-border min-h-[90px] bg-muted/20" />
              ))}
              {/* Day cells */}
              {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
                const day = i + 1
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const absent = calMap.get(dateStr) ?? []
                const isToday = dateStr === now.toISOString().split('T')[0]
                return (
                  <div
                    key={day}
                    className={`border-r last:border-r-0 border-b border-border min-h-[90px] p-1.5 ${absent.length > 0 ? 'bg-red-50 dark:bg-red-950/20' : ''} ${(day + firstDayOfMonth(year, month) - 1) % 7 === 6 ? 'border-r-0' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-secondary'}`}>
                        {day}
                      </span>
                      {absent.length > 0 && (
                        <span className={`text-[10px] font-bold px-1 rounded ${absent.length >= 4 ? 'bg-red-500 text-white' : absent.length >= 2 ? 'bg-orange-400 text-white' : 'bg-yellow-400 text-gray-900'}`}>
                          {absent.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {absent.slice(0, 3).map(a => {
                        const palette = isAllMode ? BIZ_PALETTE[bizMeta.colorMap.get(a.businessId) ?? 0] : null
                        const abbr = isAllMode ? bizMeta.abbrMap.get(a.businessId) : null
                        return (
                          <div key={a.id} className="flex items-center gap-0.5 min-w-0">
                            {palette && <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${palette.dot}`} />}
                            <span className="text-[10px] leading-tight text-red-700 dark:text-red-300 truncate font-medium">
                              {a.employeeName.split(' ')[0]}
                            </span>
                            {abbr && (
                              <span className={`shrink-0 text-[9px] font-semibold ${palette?.text}`}>{abbr}</span>
                            )}
                          </div>
                        )
                      })}
                      {absent.length > 3 && (
                        <div className="text-[10px] text-secondary">+{absent.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-2 px-4 py-3 border-t border-border bg-muted/20">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs text-secondary font-medium">Absence count:</span>
                {[{ label: '1', cls: 'bg-yellow-400' }, { label: '2–3', cls: 'bg-orange-400' }, { label: '4+', cls: 'bg-red-500' }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-sm ${l.cls}`} />
                    <span className="text-xs text-secondary">{l.label}</span>
                  </div>
                ))}
              </div>
              {isAllMode && bizMeta.legend.length > 0 && (
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-secondary font-medium">Business:</span>
                  {bizMeta.legend.map(b => (
                    <div key={b.id} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.dot}`} />
                      <span className={`text-xs font-semibold ${b.text}`}>{b.abbr}</span>
                      <span className="text-xs text-secondary">{b.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TREND TAB ───────────────────────────────────────────────────────── */}
        {tab === 'trend' && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total Absences', value: records.length },
                { label: 'Employees Affected', value: trendData.length },
                { label: 'Avg / Employee', value: trendData.length ? (records.length / trendData.length).toFixed(1) : '0' },
              ].map(k => (
                <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-secondary">{k.label}</p>
                  <p className="text-xl font-bold text-primary mt-1">{k.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl overflow-x-auto">
              {trendData.length === 0 ? (
                <div className="py-10 text-center text-secondary">No absences in this period</div>
              ) : (
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase sticky left-0 bg-card min-w-[160px]">Employee</th>
                      {isAllMode && <th className="text-left px-3 py-3 text-xs font-semibold text-secondary uppercase min-w-[120px]">Business</th>}
                      {trendMonths.map(m => (
                        <th key={m} className="text-center px-3 py-3 text-xs font-semibold text-secondary uppercase min-w-[70px]">
                          {new Date(m + '-01').toLocaleString('default', { month: 'short' })}
                          <span className="block font-normal text-[10px]">{m.slice(0, 4)}</span>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 text-xs font-semibold text-secondary uppercase min-w-[60px]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {trendData.map(emp => {
                      const total = [...emp.byMonth.values()].reduce((s, v) => s + v, 0)
                      return (
                        <tr key={emp.name + emp.number} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 sticky left-0 bg-card">
                            <p className="font-medium text-primary">{emp.name}</p>
                            <p className="text-xs text-secondary font-mono">#{emp.number}</p>
                          </td>
                          {isAllMode && <td className="px-3 py-2.5 text-xs text-secondary">{emp.bizName}</td>}
                          {trendMonths.map(m => {
                            const n = emp.byMonth.get(m) ?? 0
                            return (
                              <td key={m} className="px-3 py-2.5 text-center">
                                {n > 0 ? (
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${HEAT(n)}`}>
                                    {n}
                                  </span>
                                ) : (
                                  <span className="text-border">–</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-7 rounded font-bold text-sm ${HEAT(total)}`}>
                              {total}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Heat legend */}
            <div className="flex items-center gap-4 text-xs text-secondary">
              <span className="font-medium">Heat scale:</span>
              {[{n:0,l:'0'},{n:1,l:'1'},{n:2,l:'2–3'},{n:4,l:'4+'}].map(({n,l}) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className={`w-6 h-5 rounded text-[10px] font-bold flex items-center justify-center ${HEAT(n)}`}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </ContentLayout>
  )
}
