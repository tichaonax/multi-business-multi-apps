'use client'

// MBM-344: items sold on a business day — item, selling price, quantity sold,
// total, remaining stock, and "Restock needed" (the reorder report's rule).
// Data: /api/universal/daily-sales?includeItems=1 — the same orders as the
// EOD report's summary, so the figures always agree.
// - `collapsible`: the EOD report's section, closed until opened (it loads
//   then); a closed section is left out of the printout.
// - Otherwise the table shows straight away (the report page).
import { useEffect, useState } from 'react'
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
}

// MBM-345: a row opens the item's View Details on that business's inventory page
const INVENTORY_PAGES = ['clothing', 'grocery', 'hardware', 'restaurant']

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
  const router = useRouter()
  const pathname = usePathname() || ''
  const businessPath = pathname.split('/')[1]
  const viewHref = (r: ItemSalesRow) =>
    r.inventoryId && INVENTORY_PAGES.includes(businessPath)
      ? `/${businessPath}/inventory?viewItem=${encodeURIComponent(r.inventoryId)}&returnTo=${encodeURIComponent(pathname + (typeof window !== 'undefined' ? window.location.search : ''))}`
      : null

  useEffect(() => { setRows(null) }, [businessId, date, start, end])

  useEffect(() => {
    if (!open || rows || !businessId) return
    let live = true
    setLoading(true)
    setError(null)
    const day = start && end && start === end ? start : date
    // The daily sales API's own range (whole days in the business's time zone)
    const q = new URLSearchParams({ businessId, includeItems: '1', ...(isRange ? { startDate: start!, endDate: end! } : day ? { date: day } : {}) })
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

  const q = search.trim().toLowerCase()
  const shown = (rows || []).filter(r =>
    (!restockOnly || r.restockNeeded) &&
    (!q || r.name.toLowerCase().includes(q) || (r.sku || '').toLowerCase().includes(q)))
  const PAGE_SIZE = 25
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const onPage = (i: number) => i >= (currentPage - 1) * PAGE_SIZE && i < currentPage * PAGE_SIZE
  const totalQty = shown.reduce((s, r) => s + r.quantity, 0)
  const totalSales = shown.reduce((s, r) => s + r.total, 0)
  const restockCount = (rows || []).filter(r => r.restockNeeded).length

  return (
    <section className={`card p-4 sm:p-6 mb-6 ${open ? '' : 'print:hidden'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {collapsible ? (
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
            className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100 text-left">
            <span className="print:hidden">{open ? '▾' : '▸'}</span> 🧾 Items Sold
            {rows && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({rows.length} items{restockCount ? `, ${restockCount} to restock` : ''})</span>}
          </button>
        ) : (
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">🧾 Items Sold</h3>
        )}
        {open && rows && rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search item or SKU…"
              className="w-56 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400" />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={restockOnly} onChange={e => { setRestockOnly(e.target.checked); setPage(1) }} />
              Restock needed only
            </label>
          </div>
        )}
      </div>

      {open && (
        <div className="mt-4">
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {rows && rows.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No items sold {isRange ? 'in this period' : 'on this day'}.</p>}
          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-600 text-left text-gray-600 dark:text-gray-300">
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 px-3 text-right">Selling price</th>
                    <th className="py-2 px-3 text-right">Qty sold</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 px-3 text-right">Remaining stock</th>
                    <th className="py-2 pl-3">Restock needed</th>
                  </tr>
                  {/* Total of the rows shown (search / restock filter), on top */}
                  <tr className="border-b border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700/40">
                    <td className="py-2 pr-3">Total <span className="font-normal text-gray-500 dark:text-gray-400">({shown.length} item{shown.length === 1 ? '' : 's'})</span></td>
                    <td />
                    <td className="py-2 px-3 text-right">{totalQty}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(totalSales)}</td>
                    <td colSpan={2} />
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-400">No items match.</td></tr>
                  )}
                  {shown.map((r, i) => (
                    <tr key={r.key}
                      className={`border-b border-gray-100 dark:border-gray-700 ${onPage(i) ? '' : 'hidden print:table-row'} ${viewHref(r) ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700/50' : ''}`}
                      title={viewHref(r) ? 'View details' : undefined}
                      onClick={() => { const h = viewHref(r); if (h) router.push(h) }}>
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
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="print:hidden">
                  <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={shown.length}
                    pageSize={PAGE_SIZE} onPageChange={setPage} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
