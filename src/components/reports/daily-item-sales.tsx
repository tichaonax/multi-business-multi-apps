'use client'

// MBM-344: items sold on a business day — item, selling price, quantity sold,
// total, remaining stock, and "Restock needed" (the reorder report's rule).
// Data: /api/universal/daily-sales?includeItems=1 — the same orders as the
// EOD report's summary, so the figures always agree.
// - `collapsible`: the EOD report's section, closed until opened (it loads
//   then); a closed section is left out of the printout.
// - Otherwise the table shows straight away (the report page).
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/date-format'
import { Pagination } from '@/components/ui/pagination'

interface ItemSalesRow {
  key: string
  name: string
  sku: string | null
  unitPrice: number
  quantity: number
  total: number
  remainingStock: number | null
  reorderLevel: number | null
  restockNeeded: boolean
  imageUrl?: string | null
  inventoryId?: string | null
  date?: string // MBM-362: the day sold (rows per item per day over a range)
  itemKey?: string
}

// MBM-362: Group by over a range — Day (default) / Week / Month / none
const ITEM_GROUP_BY = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: '', label: 'No grouping' },
]
const ITEM_GROUP_STORAGE = 'itemSales.groupBy'
const utcOf = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
const fmtDay = (ymd: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' }).format(utcOf(ymd))
const shortDay = (ymd?: string) => (ymd ? fmtDay(ymd, { weekday: 'short', day: 'numeric', month: 'short' }) : '—')
function itemGroupOf(ymd: string, by: string): { key: string; label: string } {
  if (by === 'month') return { key: ymd.slice(0, 7), label: fmtDay(ymd.slice(0, 7) + '-01', { month: 'long', year: 'numeric' }) }
  if (by === 'week') {
    const d = utcOf(ymd)
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)) // weeks start on Monday
    const key = d.toISOString().slice(0, 10)
    return { key, label: `Week of ${fmtDay(key, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}` }
  }
  return { key: ymd, label: fmtDay(ymd, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }
}

// MBM-345: a row opens the item's View Details on that business's inventory page
const INVENTORY_PAGES = ['clothing', 'grocery', 'hardware', 'restaurant']
// MBM-355: what to restore when coming back from an item's View Details
const RETURN_KEY = 'mbm:item-sales-return'

export function DailyItemSales({ businessId, date, start, end, collapsible = false }: {
  businessId: string
  /** YYYY-MM-DD; none: today, as the EOD report */
  date?: string
  /** MBM-345: a range of days instead (YYYY-MM-DD, both inclusive) */
  start?: string
  end?: string
  collapsible?: boolean
}) {
  const isRange = !!start && !!end && start !== end
  const [open, setOpen] = useState(!collapsible)
  const [rows, setRows] = useState<ItemSalesRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restockOnly, setRestockOnly] = useState(false)
  // MBM-345: search, total on top, 25 rows a page (the printout has every row)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  // MBM-362: grouping over a range, remembered on this device
  const [groupBy, setGroupBy] = useState('day')
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  useEffect(() => {
    try { const v = localStorage.getItem(ITEM_GROUP_STORAGE); if (v !== null && ITEM_GROUP_BY.some(o => o.value === v)) setGroupBy(v) } catch { /* default: Day */ }
  }, [])
  const changeGroupBy = (v: string) => {
    try { localStorage.setItem(ITEM_GROUP_STORAGE, v) } catch { /* not remembered */ }
    setGroupBy(v); setOpenGroup(null); setPage(1)
  }
  const toggleGroup = (k: string) => { setOpenGroup(g => (g === k ? null : k)); setPage(1) }
  const router = useRouter()
  const pathname = usePathname() || ''
  const businessPath = pathname.split('/')[1]
  const viewHref = (r: ItemSalesRow) =>
    r.inventoryId && INVENTORY_PAGES.includes(businessPath)
      ? `/${businessPath}/inventory?viewItem=${encodeURIComponent(r.inventoryId)}&returnTo=${encodeURIComponent(pathname + (typeof window !== 'undefined' ? window.location.search : '') + '#item-sales')}`
      : null

  useEffect(() => { setRows(null) }, [businessId, date, start, end])

  useEffect(() => {
    if (!open || rows || !businessId) return
    let live = true
    setLoading(true)
    setError(null)
    const day = start && end && start === end ? start : date
    // The daily sales API's own range (whole days in the business's time zone)
    const q = new URLSearchParams({ businessId, includeItems: '1', ...(isRange ? { startDate: start!, endDate: end!, byDay: '1' } : day ? { date: day } : {}) })
    fetch(`/api/universal/daily-sales?${q}`)
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!live) return
        if (!ok) throw new Error(j?.error || 'Could not load the items sold')
        setRows(j?.data?.itemSales || [])
      })
      .catch(e => { if (live) setError(e.message) })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [open, rows, businessId, date, start, end, isRange])

  // MBM-362: over a range the API gives a row per item per day. Grouped, the
  // rows stay per day; "No grouping" adds each item up over the whole range
  // (its Date = the last day it sold).
  const grouped = isRange && !!groupBy
  const baseRows = useMemo(() => {
    if (!rows || !isRange || groupBy) return rows || []
    const byItem = new Map<string, ItemSalesRow>()
    for (const r of rows) {
      const k = r.itemKey || r.key
      const a = byItem.get(k)
      if (!a) { byItem.set(k, { ...r, key: k }); continue }
      a.quantity += r.quantity
      a.total = Math.round((a.total + r.total) * 100) / 100
      a.unitPrice = a.quantity ? Math.round((a.total / a.quantity) * 100) / 100 : 0
      if ((r.date || '') > (a.date || '')) a.date = r.date
    }
    return [...byItem.values()].sort((x, y) => y.total - x.total)
  }, [rows, isRange, groupBy])
  const q = search.trim().toLowerCase()
  const shown = baseRows.filter(r =>
    (!restockOnly || r.restockNeeded) &&
    (!q || r.name.toLowerCase().includes(q) || (r.sku || '').toLowerCase().includes(q)))
  const groups = useMemo(() => {
    if (!grouped) return []
    const m = new Map<string, { key: string; label: string; rows: ItemSalesRow[]; qty: number; total: number }>()
    for (const r of shown) {
      const g = itemGroupOf(r.date || '', groupBy)
      const row = m.get(g.key) || { ...g, rows: [], qty: 0, total: 0 }
      row.rows.push(r); row.qty += r.quantity; row.total += r.total
      m.set(g.key, row)
    }
    return [...m.values()]
      .map(g => ({ ...g, total: Math.round(g.total * 100) / 100, rows: g.rows.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.total - a.total) }))
      .sort((a, b) => b.key.localeCompare(a.key))
  }, [shown, grouped, groupBy])
  // the rows paged on screen: the open group's, or all of them
  const pageRows = grouped ? (groups.find(g => g.key === openGroup)?.rows || []) : shown
  const PAGE_SIZE = 25
  const totalPages = Math.max(1, Math.ceil(pageRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const onPage = (i: number) => i >= (currentPage - 1) * PAGE_SIZE && i < currentPage * PAGE_SIZE
  const totalQty = shown.reduce((s, r) => s + r.quantity, 0)
  const totalSales = shown.reduce((s, r) => s + r.total, 0)
  const restockCount = new Set((rows || []).filter(r => r.restockNeeded).map(r => r.itemKey || r.key)).size
  const itemCount = new Set(shown.map(r => r.itemKey || r.key)).size

  // The app header's real height: the farm camera row (MBM-331) makes it
  // taller than h-14 / h-16, and it can be switched on or off at any time
  const [stickTop, setStickTop] = useState<number | null>(null)
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => setStickTop(Math.round(header.getBoundingClientRect().height))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  const hasRows = open && !!rows && rows.length > 0
  // MBM-355: coming back from an item's View Details (#item-sales on the way
  // back) reopens this section with the same search, filter and page, and
  // scrolls to the row that was opened, also inside the EOD report
  const openRow = (r: ItemSalesRow) => {
    const h = viewHref(r)
    if (!h) return
    try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ businessId, search, restockOnly, page: currentPage, key: r.key, openGroup })) } catch { /* no storage: still goes back, section closed */ }
    router.push(h)
  }
  const [restoreKey, setRestoreKey] = useState<string | null>(null)
  useEffect(() => {
    if (!businessId || window.location.hash !== '#item-sales') return
    let key = ''
    try {
      const s = JSON.parse(sessionStorage.getItem(RETURN_KEY) || 'null')
      sessionStorage.removeItem(RETURN_KEY)
      if (s && s.businessId === businessId) {
        setSearch(s.search || ''); setRestockOnly(!!s.restockOnly); setPage(Number(s.page) || 1); key = s.key || ''
        setOpenGroup(s.openGroup || null) // MBM-362
      }
    } catch { /* nothing remembered: just reopen */ }
    setOpen(true)
    setRestoreKey(key)
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }, [businessId])
  useEffect(() => {
    if (restoreKey === null || !rows) return
    const t = setTimeout(() => {
      const row = [...document.querySelectorAll<HTMLElement>('[data-isr]')].find(e => e.dataset.isr === restoreKey && e.offsetParent !== null)
      ;(row || sectionRef.current)?.scrollIntoView({ block: row ? 'center' : 'start' })
      setRestoreKey(null)
    }, 50)
    return () => clearTimeout(t)
  }, [restoreKey, rows])
  const sectionRef = useRef<HTMLElement>(null)

  const cols = isRange ? 7 : 6
  // a table row: on screen when `visible`, always in the printout
  const renderRow = (r: ItemSalesRow, visible: boolean) => (
    <tr key={r.key} data-isr={r.key}
      className={`border-b border-gray-100 dark:border-gray-700 ${visible ? '' : 'hidden print:table-row'} ${viewHref(r) ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700/50' : ''}`}
      title={viewHref(r) ? 'View details' : undefined}
      onClick={() => openRow(r)}>
      {isRange && <td className="py-1.5 pr-3 whitespace-nowrap text-gray-600 dark:text-gray-300">{shortDay(r.date)}</td>}
      <td className="py-1.5 pr-3 text-gray-900 dark:text-gray-100">
        {/* MBM-345: thumbnail where the item has an image */}
        <div className="flex items-center gap-2">
          {r.imageUrl
            ? <img src={r.imageUrl} alt="" loading="lazy" className="w-10 h-10 rounded object-cover shrink-0 border border-gray-200 dark:border-gray-600" />
            : <span className="w-10 h-10 shrink-0 print:hidden" aria-hidden />}
          <div className="min-w-0">
            {r.name}
            {r.sku && <span className="block text-xs text-gray-500 dark:text-gray-400">{r.sku}</span>}
          </div>
        </div>
      </td>
      <td className="py-1.5 px-3 text-right">{formatCurrency(r.unitPrice)}</td>
      <td className="py-1.5 px-3 text-right">{r.quantity}</td>
      <td className="py-1.5 px-3 text-right font-medium">{formatCurrency(r.total)}</td>
      <td className={`py-1.5 px-3 text-right ${r.remainingStock !== null && r.remainingStock < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
        {r.remainingStock ?? '—'}
      </td>
      <td className="py-1.5 pl-3">
        {r.remainingStock === null ? <span className="text-gray-400">—</span>
          : r.restockNeeded
            ? <span className="font-semibold text-red-600 dark:text-red-400" title={`At or below the reorder level (${r.reorderLevel})`}>⚠ Yes</span>
            : <span className="text-gray-500 dark:text-gray-400">No</span>}
      </td>
    </tr>
  )
  const renderCard = (r: ItemSalesRow) => (
    <li key={r.key} data-isr={r.key} onClick={() => openRow(r)}
      className={`py-2 flex items-start gap-3 ${viewHref(r) ? 'cursor-pointer active:bg-blue-50 dark:active:bg-gray-700/50' : ''}`}>
      {r.imageUrl && <img src={r.imageUrl} alt="" loading="lazy" className="w-10 h-10 rounded object-cover shrink-0 border border-gray-200 dark:border-gray-600" />}
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="text-gray-900 dark:text-gray-100 break-words min-w-0">{r.name}</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatCurrency(r.total)}</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {isRange && <>{shortDay(r.date)} · </>}{r.quantity} × {formatCurrency(r.unitPrice)}{r.sku ? ` · ${r.sku}` : ''}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Stock: <span className={r.remainingStock !== null && r.remainingStock < 0 ? 'text-red-600 dark:text-red-400' : ''}>{r.remainingStock ?? '—'}</span>
          {r.restockNeeded && <span className="ml-2 font-semibold text-red-600 dark:text-red-400" title={`At or below the reorder level (${r.reorderLevel})`}>⚠ Restock</span>}
        </div>
      </div>
    </li>
  )

  return (
    <section ref={sectionRef} className={`card p-4 sm:p-6 mb-6 ${open ? '' : 'print:hidden'}`}>
      {/* MBM-353: while open, the heading, the total sold and the search stay
          pinned under the app header (h-14 / sm:h-16) until the section has
          scrolled past. Closed, nothing is pinned. Solid background: rows
          scroll underneath it. */}
      <div style={hasRows && stickTop !== null ? { top: stickTop } : undefined} className={hasRows
        ? 'sticky top-14 sm:top-16 z-30 -mx-4 -mt-4 px-4 pt-4 pb-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 rounded-t-xl bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-gray-700 print:static print:border-0'
        : ''}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {collapsible ? (
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100 text-left">
            <span className="print:hidden">{open ? '▾' : '▸'}</span> 🧾 Items Sold
            {rows && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({new Set(rows.map(r => r.itemKey || r.key)).size} items{restockCount ? `, ${restockCount} to restock` : ''})</span>}
          </button>
        ) : (
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">🧾 Items Sold</h3>
        )}
        {hasRows && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto print:hidden">
            {isRange && (
              <select value={groupBy} onChange={e => changeGroupBy(e.target.value)} title="Group the items sold"
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                {ITEM_GROUP_BY.map(o => <option key={o.value} value={o.value}>{o.value ? `Group: ${o.label}` : o.label}</option>)}
              </select>
            )}
            <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search item or SKU…"
              className="w-full sm:w-56 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400" />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={restockOnly} onChange={e => { setRestockOnly(e.target.checked); setPage(1) }} />
              Restock needed only
            </label>
          </div>
        )}
      </div>
      {/* Total of the rows shown (search / restock filter), always in view */}
      {hasRows && (
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 print:hidden">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {itemCount} item{itemCount === 1 ? '' : 's'} · {totalQty} sold{grouped ? ` · ${groups.length} ${ITEM_GROUP_BY.find(o => o.value === groupBy)?.label.toLowerCase()}${groups.length === 1 ? '' : 's'}` : ''}
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Total sold <span className="text-green-700 dark:text-green-400">{formatCurrency(totalSales)}</span>
          </span>
        </div>
      )}
      </div>

      {open && (
        <div className="mt-4">
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {rows && rows.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No items sold {isRange ? 'in this period' : 'on this day'}.</p>}
          {rows && rows.length > 0 && (<>
            {/* MBM-353: phones get a list, not a table wider than the screen */}
            <ul className="sm:hidden print:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {shown.length === 0 && <li className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No items match.</li>}
              {grouped
                ? groups.map(g => (
                  <Fragment key={g.key}>
                    <li onClick={() => toggleGroup(g.key)} className={`py-2 px-1 flex items-center justify-between gap-2 cursor-pointer ${openGroup === g.key ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{openGroup === g.key ? '▾' : '▸'} {g.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{g.qty} sold · <strong className="text-green-700 dark:text-green-400">{formatCurrency(g.total)}</strong></span>
                    </li>
                    {openGroup === g.key && g.rows.map((r, i) => onPage(i) && renderCard(r))}
                  </Fragment>
                ))
                : shown.map((r, i) => onPage(i) && renderCard(r))}
            </ul>
            <div className="hidden sm:block print:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-600 text-left text-gray-600 dark:text-gray-300">
                    {isRange && <th className="py-2 pr-3">{grouped ? 'Date' : 'Last sold'}</th>}
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 px-3 text-right">Selling price</th>
                    <th className="py-2 px-3 text-right">Qty sold</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Remaining stock</th>
                    <th className="py-2 pl-3">Restock needed</th>
                  </tr>
                  {/* Total of the rows shown (search / restock filter), on top */}
                  <tr className="border-b border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/40">
                    <td className="py-2 pr-3" colSpan={isRange ? 2 : 1}>Total <span className="font-normal text-gray-500 dark:text-gray-400">({itemCount} item{itemCount === 1 ? '' : 's'})</span></td>
                    <td />
                    <td className="py-2 px-3 text-right">{totalQty}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(totalSales)}</td>
                    <td colSpan={2} />
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 && (
                    <tr><td colSpan={cols} className="py-4 text-center text-gray-500 dark:text-gray-400">No items match.</td></tr>
                  )}
                  {grouped
                    ? groups.map(g => (
                      <Fragment key={g.key}>
                        <tr onClick={() => toggleGroup(g.key)} title={openGroup === g.key ? 'Close' : 'Show the items'}
                          className={`border-b border-gray-200 dark:border-gray-700 cursor-pointer print:bg-gray-100 ${openGroup === g.key ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}`}>
                          <td colSpan={3} className="py-2 pr-3 font-semibold text-gray-900 dark:text-gray-100">
                            <span className="print:hidden text-gray-400 mr-1">{openGroup === g.key ? '▾' : '▸'}</span>{g.label}
                            <span className="ml-2 font-normal text-xs text-gray-500 dark:text-gray-400">{new Set(g.rows.map(r => r.itemKey || r.key)).size} items</span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">{g.qty}</td>
                          <td className="py-2 px-3 text-right font-bold text-green-700 dark:text-green-400">{formatCurrency(g.total)}</td>
                          <td colSpan={2} />
                        </tr>
                        {g.rows.map((r, i) => renderRow(r, openGroup === g.key && onPage(i)))}
                      </Fragment>
                    ))
                    : shown.map((r, i) => renderRow(r, onPage(i)))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="print:hidden">
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={pageRows.length}
                  pageSize={PAGE_SIZE} onPageChange={setPage} />
              </div>
            )}
          </>)}
        </div>
      )}
    </section>
  )
}
