'use client'

// MBM-344: items sold on a business day — item, selling price, quantity sold,
// total, remaining stock, and "Restock needed" (the reorder report's rule).
// Data: /api/universal/daily-sales?includeItems=1 — the same orders as the
// EOD report's summary, so the figures always agree.
// - `collapsible`: the EOD report's section, closed until opened (it loads
//   then); a closed section is left out of the printout.
// - Otherwise the table shows straight away (the report page).
import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/date-format'

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
}

export function DailyItemSales({ businessId, date, collapsible = false }: {
  businessId: string
  /** YYYY-MM-DD; none: today, as the EOD report */
  date?: string
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(!collapsible)
  const [rows, setRows] = useState<ItemSalesRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restockOnly, setRestockOnly] = useState(false)

  useEffect(() => { setRows(null) }, [businessId, date])

  useEffect(() => {
    if (!open || rows || !businessId) return
    let live = true
    setLoading(true)
    setError(null)
    const q = new URLSearchParams({ businessId, includeItems: '1', ...(date ? { date } : {}) })
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
  }, [open, rows, businessId, date])

  const shown = (rows || []).filter(r => !restockOnly || r.restockNeeded)
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
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 print:hidden">
            <input type="checkbox" checked={restockOnly} onChange={e => setRestockOnly(e.target.checked)} />
            Restock needed only
          </label>
        )}
      </div>

      {open && (
        <div className="mt-4">
          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {rows && rows.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No items sold on this day.</p>}
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
                </thead>
                <tbody>
                  {shown.map(r => (
                    <tr key={r.key} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-1.5 pr-3 text-gray-900 dark:text-gray-100">
                        {r.name}
                        {r.sku && <span className="block text-xs text-gray-500 dark:text-gray-400">{r.sku}</span>}
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
                <tfoot>
                  <tr className="font-bold text-gray-900 dark:text-gray-100">
                    <td className="py-2 pr-3">Total</td>
                    <td />
                    <td className="py-2 px-3 text-right">{totalQty}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(totalSales)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
