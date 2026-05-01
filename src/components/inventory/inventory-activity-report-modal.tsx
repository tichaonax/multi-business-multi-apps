'use client'

import { useState, useEffect, useCallback } from 'react'

interface DayRow {
  date: string
  openingStock: number
  qtyAdded: number
  qtySold: number
  totalSales: number
  qtyAdjusted: number
  qtyLost: number
  closingStock: number
  currentActualStock: number | null
  variance: number | null
}

interface ActivityItem {
  itemId: string
  itemName: string
  sku: string | null
  category: string | null
  currentStock: number
  system: 'BARCODE'
  days: DayRow[]
}

interface Summary {
  totalItems: number
  itemsWithVariance: number
  totalVarianceUnits: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface ApiResponse {
  success: boolean
  period: { from: string; to: string }
  items: ActivityItem[]
  summary: Summary
  pagination: Pagination
}

type Preset = 'today' | 'yesterday' | '7days' | '30days' | 'custom'

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function todayStr() { return toDateStr(new Date()) }
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toDateStr(d)
}
function daysAgoStr(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n + 1)
  return toDateStr(d)
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  isOpen: boolean
  onClose: () => void
  businessId: string
  businessName?: string
  itemId?: string        // when set, report is filtered to this one item
  itemName?: string      // displayed in header when itemId is set
}

export function InventoryActivityReportModal({ isOpen, onClose, businessId, businessName, itemId, itemName }: Props) {
  const [preset, setPreset] = useState<Preset>('7days')
  const [customFrom, setCustomFrom] = useState(daysAgoStr(7))
  const [customTo, setCustomTo] = useState(todayStr())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [page, setPage] = useState(1)
  const [printing, setPrinting] = useState(false)
  const [hideBlank, setHideBlank] = useState(false)

  const getRange = useCallback((): { from: string; to: string } => {
    const t = todayStr()
    const y = yesterdayStr()
    if (preset === 'today') return { from: t, to: t }
    if (preset === 'yesterday') return { from: y, to: y }
    if (preset === '7days') return { from: daysAgoStr(7), to: t }
    if (preset === '30days') return { from: daysAgoStr(30), to: t }
    return { from: customFrom, to: customTo }
  }, [preset, customFrom, customTo])

  const fetchData = useCallback(async (p = 1, allItems = false) => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    const { from, to } = getRange()
    const params = new URLSearchParams({ from, to, page: String(p), limit: '50' })
    if (allItems) { params.set('all', 'true') }
    if (itemId) { params.set('itemId', itemId) }
    try {
      const res = await fetch(`/api/inventory/${businessId}/activity-report?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load report')
      setData(json)
      setPage(p)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [businessId, getRange, itemId])

  useEffect(() => {
    if (isOpen) fetchData(1)
  }, [isOpen, preset, customFrom, customTo]) // eslint-disable-line react-hooks/exhaustive-deps

  const isBlankDay = (day: DayRow) =>
    day.qtyAdded === 0 && day.qtySold === 0 && day.qtyAdjusted === 0 && day.qtyLost === 0 && (day.variance === null || day.variance === 0)

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const { from, to } = getRange()
      const params = new URLSearchParams({ from, to, page: '1', limit: '1000', all: 'true' })
      if (itemId) params.set('itemId', itemId)
      const res = await fetch(`/api/inventory/${businessId}/activity-report?${params}`)
      const json: ApiResponse = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')

      const title = itemName ? `${itemName} — Activity Report` : `Inventory Activity Report`
      const subtitle = [businessName, from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`].filter(Boolean).join(' · ')

      const rows = json.items.flatMap(item => {
        const activeDays = item.days.filter(d => !isBlankDay(d))
        return activeDays.map((day, dayIdx) => {
          const hasV = day.variance !== null && day.variance !== 0
          let skipped = 0
          if (dayIdx > 0) {
            const prev = new Date(activeDays[dayIdx - 1].date + 'T00:00:00')
            const curr = new Date(day.date + 'T00:00:00')
            skipped = Math.round((curr.getTime() - prev.getTime()) / 86400000) - 1
          }
          const gapStyle = skipped > 0 ? 'border-top:2px dashed #f59e0b;' : ''
          const gapBadge = skipped > 0 ? ` <span style="background:#fef3c7;color:#b45309;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:700">+${skipped}d</span>` : ''
          return `<tr style="${gapStyle}background:${hasV ? '#fff0f0' : ''};color:${hasV ? '#b91c1c' : ''}">
            <td>${fmtDate(day.date)}${gapBadge}</td>
            <td>${dayIdx === 0 ? item.itemName : ''}</td>
            <td>${dayIdx === 0 ? (item.sku || '') : ''}</td>
            <td class="num">${day.openingStock}</td>
            <td class="num g">${day.qtyAdded > 0 ? `+${day.qtyAdded}` : ''}</td>
            <td class="num b">${day.qtySold > 0 ? day.qtySold : ''}</td>
            <td class="num b">${day.totalSales > 0 ? fmtMoney(day.totalSales) : ''}</td>
            <td class="num y">${day.qtyAdjusted !== 0 ? (day.qtyAdjusted > 0 ? `+${day.qtyAdjusted}` : day.qtyAdjusted) : ''}</td>
            <td class="num o">${day.qtyLost > 0 ? day.qtyLost : ''}</td>
            <td class="num fw">${day.closingStock}</td>
            <td class="num fw" style="color:${hasV ? '#b91c1c' : '#16a34a'}">
              ${day.variance !== null ? (day.variance === 0 ? 'OK' : (day.variance > 0 ? '+' : '') + day.variance) : ''}
            </td>
          </tr>`
        })
      }).join('')

      const html = `<!DOCTYPE html><html><head><title>${title}</title><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:16px;color:#111}
  .toolbar{display:flex;align-items:center;gap:16px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e5e7eb}
  .print-btn{background:#1f2937;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-size:13px;cursor:pointer}
  .print-btn:hover{background:#374151}
  h1{font-size:14px;margin:0;font-weight:700}
  .sub{font-size:11px;color:#555;margin:2px 0 0}
  table{width:100%;border-collapse:collapse;margin-top:4px}
  th,td{padding:3px 6px;border:1px solid #d1d5db;font-size:10px}
  th{background:#f3f4f6;font-weight:600}
  .num{text-align:right}
  .g{color:#15803d}.b{color:#1d4ed8}.y{color:#a16207}.o{color:#c2410c}.fw{font-weight:600}
  @media print{.toolbar{display:none!important}}
</style></head><body>
  <div class="toolbar">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <div><h1>${title}</h1><p class="sub">${subtitle}${json.summary.itemsWithVariance > 0 ? ` · ${json.summary.itemsWithVariance} item(s) with discrepancies` : ''}</p></div>
  </div>
  <table>
    <thead><tr>
      <th>Date</th><th>Item</th><th>SKU</th>
      <th class="num">Opening</th><th class="num g">+Added</th><th class="num b">–Sold</th>
      <th class="num b">Sales($)</th><th class="num y">±Adj</th><th class="num o">–Lost</th>
      <th class="num">Closing</th><th class="num" style="color:#b91c1c">Variance</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`

      const w = window.open('', '_blank', 'width=1100,height=700')
      if (!w) return
      w.document.write(html)
      w.document.close()
    } catch (e: any) {
      console.error('Print error:', e)
    } finally {
      setPrinting(false)
    }
  }

  if (!isOpen) return null

  const { from, to } = getRange()

  return (
    <>
      {/* Screen modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto no-print">
        <div className="relative bg-white dark:bg-gray-900 w-full max-w-7xl mx-2 my-4 rounded-xl shadow-2xl flex flex-col max-h-[95vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {itemName ? `📈 ${itemName}` : 'Inventory Activity Report'}
              </h2>
              {itemName
                ? <p className="text-sm text-gray-500 dark:text-gray-400">{businessName} — Activity Report</p>
                : businessName && <p className="text-sm text-gray-500 dark:text-gray-400">{businessName}</p>
              }
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                disabled={loading || printing}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium disabled:opacity-50"
              >
                {printing ? 'Preparing...' : 'Print / Save PDF'}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">&times;</button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {(['today', 'yesterday', '7days', '30days', 'custom'] as Preset[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPreset(p); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    preset === p
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === '7days' ? '7 Days' : p === '30days' ? '30 Days' : 'Custom'}
                </button>
              ))}
              {preset === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date" value={customFrom}
                    onChange={e => { setCustomFrom(e.target.value); setPage(1) }}
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="date" value={customTo}
                    onChange={e => { setCustomTo(e.target.value); setPage(1) }}
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Summary strip */}
          {data && (
            <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-wrap items-center gap-6 text-sm shrink-0">
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{data.summary.totalItems}</span> items with activity
              </span>
              {data.summary.itemsWithVariance > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {data.summary.itemsWithVariance} items have stock discrepancies
                  &nbsp;({data.summary.totalVarianceUnits > 0 ? '+' : ''}{data.summary.totalVarianceUnits} units)
                </span>
              )}
              <span className="text-gray-500 dark:text-gray-500">
                {from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`}
              </span>
              <button
                onClick={() => setHideBlank(h => !h)}
                className="ml-auto px-3 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
              >
                {hideBlank ? 'Show blank days' : 'Hide blank days'}
              </button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {loading && (
              <div className="flex items-center justify-center py-16 text-gray-500">Loading...</div>
            )}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">{error}</div>
            )}
            {!loading && !error && data && data.items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-2">
                <span className="text-4xl">📦</span>
                <p className="text-lg font-medium">No activity in this period</p>
                <p className="text-sm">Try a wider date range</p>
              </div>
            )}
            {!loading && !error && data && data.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      <th className="px-3 py-2 text-left font-semibold border border-gray-200 dark:border-gray-700 min-w-[110px]">Date</th>
                      <th className="px-3 py-2 text-left font-semibold border border-gray-200 dark:border-gray-700 min-w-[160px]">Item</th>
                      <th className="px-3 py-2 text-left font-semibold border border-gray-200 dark:border-gray-700">SKU</th>
                      <th className="px-3 py-2 text-right font-semibold border border-gray-200 dark:border-gray-700">Opening</th>
                      <th className="px-3 py-2 text-right font-semibold border border-gray-200 dark:border-gray-700 text-green-700 dark:text-green-400">+ Added</th>
                      <th className="px-3 py-2 text-right font-semibold border border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-400">– Sold</th>
                      <th className="px-3 py-2 text-right font-semibold border border-gray-200 dark:border-gray-700 text-blue-700 dark:text-blue-400">Sales ($)</th>
                      <th className="px-3 py-2 text-right font-semibold border border-gray-200 dark:border-gray-700 text-yellow-700 dark:text-yellow-400">± Adj</th>
                      <th className="px-3 py-2 text-right font-semibold border border-gray-200 dark:border-gray-700 text-orange-700 dark:text-orange-400">– Lost</th>
                      <th className="px-3 py-2 text-right font-semibold border border-gray-200 dark:border-gray-700">Closing</th>
                      <th className="px-3 py-2 text-right font-semibold border border-gray-200 dark:border-gray-700 text-red-700 dark:text-red-400">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map(item => {
                      const visibleDays = hideBlank ? item.days.filter(d => !isBlankDay(d)) : item.days
                      if (visibleDays.length === 0) return null
                      return visibleDays.map((day, dayIdx) => {
                        const hasVariance = day.variance !== null && day.variance !== 0

                        // Calculate how many days were skipped before this row
                        let skippedDays = 0
                        if (hideBlank && dayIdx > 0) {
                          const prev = new Date(visibleDays[dayIdx - 1].date + 'T00:00:00')
                          const curr = new Date(day.date + 'T00:00:00')
                          skippedDays = Math.round((curr.getTime() - prev.getTime()) / 86400000) - 1
                        }

                        return (
                          <tr
                            key={`${item.itemId}-${day.date}`}
                            className={`border-b border-gray-100 dark:border-gray-800 ${
                              skippedDays > 0 ? 'border-t-2 border-t-amber-400 dark:border-t-amber-500' : ''
                            } ${
                              hasVariance
                                ? 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300'
                                : dayIdx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                            }`}
                          >
                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 whitespace-nowrap text-gray-600 dark:text-gray-400 text-xs">
                              <div className="flex items-center gap-1.5">
                                {fmtDate(day.date)}
                                {skippedDays > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 leading-none" title={`${skippedDays} day${skippedDays > 1 ? 's' : ''} without activity`}>
                                    +{skippedDays}d
                                  </span>
                                )}
                              </div>
                            </td>
                            {dayIdx === 0 ? (
                              <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-gray-100" rowSpan={visibleDays.length}>
                                <div className="font-semibold">{item.itemName}</div>
                                {item.category && <div className="text-xs text-gray-400">{item.category}</div>}
                              </td>
                            ) : null}
                            {dayIdx === 0 ? (
                              <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400" rowSpan={visibleDays.length}>
                                {item.sku || '—'}
                              </td>
                            ) : null}
                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums">{day.openingStock}</td>
                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-green-700 dark:text-green-400">
                              {day.qtyAdded > 0 ? `+${day.qtyAdded}` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-blue-700 dark:text-blue-400">
                              {day.qtySold > 0 ? day.qtySold : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-blue-700 dark:text-blue-400">
                              {day.totalSales > 0 ? fmtMoney(day.totalSales) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-yellow-700 dark:text-yellow-400">
                              {day.qtyAdjusted !== 0 ? (day.qtyAdjusted > 0 ? `+${day.qtyAdjusted}` : day.qtyAdjusted) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums text-orange-700 dark:text-orange-400">
                              {day.qtyLost > 0 ? day.qtyLost : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums font-medium">{day.closingStock}</td>
                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-right tabular-nums font-semibold">
                              {day.variance !== null ? (
                                day.variance === 0
                                  ? <span className="text-green-600 dark:text-green-400">OK</span>
                                  : <span className="text-red-600 dark:text-red-400">{day.variance > 0 ? '+' : ''}{day.variance}</span>
                              ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                          </tr>
                        )
                      })
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data && data.pagination.pages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 no-print">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {data.pagination.page} of {data.pagination.pages} &nbsp;·&nbsp; {data.pagination.total} items total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchData(page - 1)}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40"
                >Previous</button>
                <button
                  onClick={() => fetchData(page + 1)}
                  disabled={page >= data.pagination.pages || loading}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

    </>
  )
}
