'use client'

import { useState, useEffect, useCallback } from 'react'

type Preset = 'today' | 'yesterday' | '7days' | '30days' | 'custom'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function daysAgoStr(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function yesterdayStr() {
  return daysAgoStr(1)
}

interface DayEntry {
  date: string
  qtySold: number
  revenue: number
}

interface ReportItem {
  id: string
  name: string
  batchNumber: string
  sku: string
  category: string | null
  itemCount: number
  remainingCount: number
  unitPrice: number
  isActive: boolean
  totalSold: number
  totalRevenue: number
  days: DayEntry[]
}

interface ApiResponse {
  success: boolean
  period: { from: string; to: string }
  items: ReportItem[]
  summary: { totalProducts: number; totalUnitsSold: number; totalRevenue: number }
}

interface Props {
  isOpen: boolean
  onClose: () => void
  businessId: string
  businessName?: string
  itemId?: string
  itemName?: string
}

export function CustomBulkReportModal({ isOpen, onClose, businessId, businessName, itemId, itemName }: Props) {
  const [preset, setPreset] = useState<Preset>('7days')
  const [customFrom, setCustomFrom] = useState(daysAgoStr(7))
  const [customTo, setCustomTo] = useState(todayStr())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handlePrint = () => {
    if (!data) return
    const { from, to } = getRange()
    const title = itemName ? `${itemName} — Activity Report` : 'Custom Bulk — Activity Report'
    const subtitle = [businessName, `${from} → ${to}`].filter(Boolean).join(' · ')

    const rows = data.items.map(item => {
      const dayRows = item.days.map(d => `
        <tr style="background:#f5f3ff">
          <td style="padding:2px 16px;color:#555">${d.date}</td>
          <td></td><td></td><td></td>
          <td style="text-align:right;padding:2px 6px;color:#1d4ed8;font-weight:600">${d.qtySold}</td>
          <td style="text-align:right;padding:2px 6px;color:#15803d;font-weight:600">$${d.revenue.toFixed(2)}</td>
          <td></td>
        </tr>`).join('')
      return `
        <tr>
          <td style="padding:4px 6px;font-weight:600">${item.name}${!item.isActive ? ' <span style="color:#dc2626;font-size:9px">(Inactive)</span>' : ''}</td>
          <td style="padding:4px 6px;font-family:monospace;color:#555">${item.batchNumber}</td>
          <td style="padding:4px 6px;color:#555">${item.category ?? '—'}</td>
          <td style="padding:4px 6px;text-align:right">${item.itemCount}</td>
          <td style="padding:4px 6px;text-align:right;font-weight:600">${item.totalSold || 0}</td>
          <td style="padding:4px 6px;text-align:right;color:#15803d">${item.totalRevenue > 0 ? '$' + item.totalRevenue.toFixed(2) : '—'}</td>
          <td style="padding:4px 6px;text-align:right;font-weight:700;color:${item.remainingCount <= 0 ? '#dc2626' : item.remainingCount < 5 ? '#d97706' : '#111'}">${item.remainingCount}</td>
        </tr>
        ${item.days.length > 0 ? dayRows : ''}`
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
  .summary{display:flex;gap:24px;padding:6px 0;margin-bottom:8px;border-bottom:1px solid #e5e7eb;font-size:11px}
  table{width:100%;border-collapse:collapse}
  th{background:#f3f4f6;font-weight:600;padding:4px 6px;text-align:left;border:1px solid #d1d5db;font-size:10px}
  td{border:1px solid #e5e7eb;font-size:10px}
  @media print{.toolbar{display:none!important}}
</style></head><body>
  <div class="toolbar">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <div><h1>${title}</h1><p class="sub">${subtitle}</p></div>
  </div>
  <div class="summary">
    <span><strong>${data.summary.totalProducts}</strong> products</span>
    <span><strong>${data.summary.totalUnitsSold}</strong> units sold</span>
    <span>Revenue: <strong style="color:#15803d">$${data.summary.totalRevenue.toFixed(2)}</strong></span>
  </div>
  <table>
    <thead><tr>
      <th>Product</th><th>Batch</th><th>Category</th>
      <th style="text-align:right">Original Qty</th><th style="text-align:right">Sold (period)</th>
      <th style="text-align:right">Revenue</th><th style="text-align:right">Remaining</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`

    const w = window.open('', '_blank', 'width=1000,height=700')
    if (!w) return
    w.document.write(html)
    w.document.close()
  }

  const getRange = useCallback((): { from: string; to: string } => {
    switch (preset) {
      case 'today': return { from: todayStr(), to: todayStr() }
      case 'yesterday': return { from: yesterdayStr(), to: yesterdayStr() }
      case '7days': return { from: daysAgoStr(6), to: todayStr() }
      case '30days': return { from: daysAgoStr(29), to: todayStr() }
      case 'custom': return { from: customFrom, to: customTo }
    }
  }, [preset, customFrom, customTo])

  const fetchData = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    try {
      const { from, to } = getRange()
      const params = new URLSearchParams({ from, to })
      if (itemId) params.set('itemId', itemId)
      const res = await fetch(`/api/inventory/${businessId}/custom-bulk-report?${params}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to load report')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [businessId, getRange])

  useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, preset, customFrom, customTo, itemId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const { from, to } = getRange()
  const fmt = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0 print:hidden">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {itemName ? `📈 ${itemName}` : '📦 Custom Bulk — Activity Report'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {itemName ? `${businessName} — Activity Report` : businessName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!data || loading}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
              🖨 Print / Save PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
          </div>
        </div>

        {/* Date presets */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0 flex-wrap print:hidden">
          {(['today', 'yesterday', '7days', '30days', 'custom'] as Preset[]).map(p => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${preset === p ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === '7days' ? '7 Days' : p === '30days' ? '30 Days' : 'Custom'}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <span className="text-xs text-gray-400">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <button onClick={fetchData} className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg">Go</button>
            </div>
          )}
        </div>

        {/* Summary strip */}
        {data && (
          <div className="flex gap-4 px-5 py-2 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-700 shrink-0 text-xs flex-wrap">
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-bold text-gray-900 dark:text-white">{data.summary.totalProducts}</span> products
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-bold text-gray-900 dark:text-white">{data.summary.totalUnitsSold}</span> units sold
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              Revenue: <span className="font-bold text-green-700 dark:text-green-400">{fmt(data.summary.totalRevenue)}</span>
            </span>
            <span className="text-gray-500 dark:text-gray-500">Period: {from} → {to}</span>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-400 border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="p-5 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {!loading && !error && data && data.items.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm">No custom bulk products found.</p>
            </div>
          )}

          {!loading && !error && data && data.items.length > 0 && (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Product</th>
                  <th className="px-3 py-2 text-left font-medium">Batch</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Original Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Sold (period)</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  <th className="px-3 py-2 text-right font-medium">Remaining</th>
                  <th className="px-3 py-2 text-center font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.items.map(item => (
                  <>
                    <tr
                      key={item.id}
                      className={`${!item.isActive ? 'opacity-60' : ''} hover:bg-gray-50 dark:hover:bg-gray-700/30`}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {!item.isActive && <span className="text-xs text-red-500">Inactive</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">{item.batchNumber}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.category ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{item.itemCount}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                        {item.totalSold > 0 ? item.totalSold : <span className="text-gray-300 dark:text-gray-600">0</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-green-700 dark:text-green-400">
                        {item.totalRevenue > 0 ? fmt(item.totalRevenue) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${item.remainingCount <= 0 ? 'text-red-600 dark:text-red-400' : item.remainingCount < 5 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
                        {item.remainingCount}
                      </td>
                      <td className="px-3 py-2 text-center print:hidden">
                        {item.days.length > 0 && (
                          <button
                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
                            {expandedId === item.id ? '▲ Hide' : '▼ Days'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Day breakdown */}
                    {expandedId === item.id && item.days.length > 0 && (
                      <tr key={`${item.id}-days`} className="bg-indigo-50/40 dark:bg-indigo-900/10">
                        <td colSpan={8} className="px-8 py-2">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 dark:text-gray-400 border-b border-indigo-200 dark:border-indigo-800">
                                <th className="py-1 text-left font-medium">Date</th>
                                <th className="py-1 text-right font-medium">Units Sold</th>
                                <th className="py-1 text-right font-medium">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-100 dark:divide-indigo-900">
                              {item.days.map(d => (
                                <tr key={d.date}>
                                  <td className="py-1 text-gray-700 dark:text-gray-300">{d.date}</td>
                                  <td className="py-1 text-right text-gray-900 dark:text-white font-medium">{d.qtySold}</td>
                                  <td className="py-1 text-right text-green-700 dark:text-green-400">{fmt(d.revenue)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
