'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { getPresetDateRange, DATE_PRESET_LABELS, type DatePreset } from '@/lib/date-presets'

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function VehiclePartsReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId } = useBusinessPermissionsContext()

  const [tab, setTab] = useState<'stock' | 'sales'>('stock')
  const [stockData, setStockData] = useState<any>(null)
  const [salesData, setSalesData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('month')
  const [dateFrom, setDateFrom] = useState(() => getPresetDateRange('month').from)
  const [dateTo, setDateTo] = useState(() => getPresetDateRange('month').to)

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const fetchStock = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vehicle-service/parts/reports/stock?businessId=${currentBusinessId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load stock report')
      setStockData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  const fetchSales = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId, dateFrom, dateTo })
      const res = await fetch(`/api/vehicle-service/parts/reports/sales?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load sales report')
      setSalesData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, dateFrom, dateTo])

  useEffect(() => { if (tab === 'stock') fetchStock() }, [tab, fetchStock])
  useEffect(() => { if (tab === 'sales') fetchSales() }, [tab, fetchSales])

  const applyPreset = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const range = getPresetDateRange(preset)
    setDateFrom(range.from)
    setDateTo(range.to)
    setDatePreset(preset)
  }

  const exportStockCsv = () => {
    if (!stockData) return
    const csv = toCsv(
      ['Name', 'SKU', 'Category', 'Location', 'Stock', 'Reorder Level', 'Status'],
      stockData.parts.map((p: any) => [p.name, p.sku || '', p.category || '', p.location || '', p.stockQuantity, p.reorderLevel, p.status])
    )
    downloadCsv('vehicle-parts-stock-report.csv', csv)
  }

  const exportSalesCsv = () => {
    if (!salesData) return
    const csv = toCsv(
      ['Part', 'Qty Sold Direct', 'Qty Used in Service', 'Cost', 'Revenue', 'Gross Profit'],
      salesData.parts.map((p: any) => [p.name, p.quantitySold, p.quantityUsed, p.cost.toFixed(2), p.revenue.toFixed(2), (p.revenue - p.cost).toFixed(2)])
    )
    downloadCsv('vehicle-parts-sales-profit-report.csv', csv)
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Parts Reports" subtitle="Stock levels and sales/profit for vehicle parts inventory">
      <div className="max-w-6xl mx-auto print:max-w-full">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link href="/vehicle-service/parts" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Back to Parts Inventory</Link>
          <div className="flex gap-2">
            <button onClick={tab === 'stock' ? exportStockCsv : exportSalesCsv} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              📊 CSV Export
            </button>
            <button onClick={() => window.print()} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 print:hidden">
          {(['stock', 'sales'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${tab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
            >
              {t === 'stock' ? '📦 Stock Report' : '💰 Sales & Profit'}
            </button>
          ))}
        </div>

        {tab === 'sales' && (
          <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
            {(['today', 'yesterday', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${datePreset === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
              >
                {DATE_PRESET_LABELS[p]}
              </button>
            ))}
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setDatePreset('custom') }} className="text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setDatePreset('custom') }} className="text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
        )}

        {error && <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">{error}</div>}
        {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}

        {!loading && tab === 'stock' && stockData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                ['Total Parts', stockData.summary.totalParts],
                ['In Stock', stockData.summary.inStock],
                ['Low Stock', stockData.summary.lowStock],
                ['Out of Stock', stockData.summary.outOfStock],
                ['Damaged/Lost (30d)', stockData.summary.writeOffsLast30Days],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-3 text-center">
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{val as number}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            {/* Mobile card list (responsive-reports template — see
                src/app/inventory/reports/pricing-exceptions/page.tsx) */}
            <div className="sm:hidden bg-white dark:bg-gray-800 shadow-md rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
              {stockData.parts.length === 0 ? (
                <div className="px-3 py-6 text-center text-gray-400 text-sm">No parts found.</div>
              ) : (
                stockData.parts.map((p: any) => (
                  <div key={p.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-gray-900 dark:text-white">{p.stockQuantity}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{p.sku || '—'}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1 text-sm">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Category</p>
                        <p className="text-gray-500 dark:text-gray-400">{p.category || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Location</p>
                        <p className="text-gray-500 dark:text-gray-400">{p.location || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Reorder Level</p>
                        <p className="text-gray-500 dark:text-gray-400">{p.reorderLevel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Status</p>
                        <p className="text-gray-500 dark:text-gray-400">{p.status.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden sm:block bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {['Name', 'SKU', 'Category', 'Location', 'Stock', 'Reorder', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {stockData.parts.map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{p.name}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 font-mono">{p.sku || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{p.category || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{p.location || '—'}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{p.stockQuantity}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{p.reorderLevel}</td>
                      <td className="px-3 py-2">{p.status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && tab === 'sales' && salesData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Sold Direct', salesData.summary.directQuantity],
                ['Used in Service', salesData.summary.serviceQuantity],
                ['Revenue', formatCurrency(salesData.summary.totalRevenue)],
                ['Gross Profit', formatCurrency(salesData.summary.grossProfit)],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-3 text-center">
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{val}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            {/* Mobile card list (responsive-reports template) */}
            <div className="sm:hidden bg-white dark:bg-gray-800 shadow-md rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
              {salesData.parts.length === 0 ? (
                <div className="px-3 py-6 text-center text-gray-400 text-sm">No parts sold or used in this period.</div>
              ) : (
                salesData.parts.map((p: any, i: number) => (
                  <div key={i} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                      <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(p.revenue - p.cost)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1 text-sm">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Sold Direct</p>
                        <p className="text-gray-500 dark:text-gray-400">{p.quantitySold}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Used in Service</p>
                        <p className="text-gray-500 dark:text-gray-400">{p.quantityUsed}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Cost</p>
                        <p className="text-gray-500 dark:text-gray-400">{formatCurrency(p.cost)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Revenue</p>
                        <p className="text-gray-900 dark:text-white">{formatCurrency(p.revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden sm:block bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {['Part', 'Sold Direct', 'Used in Service', 'Cost', 'Revenue', 'Profit'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {salesData.parts.map((p: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{p.name}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{p.quantitySold}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{p.quantityUsed}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{formatCurrency(p.cost)}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{formatCurrency(p.revenue)}</td>
                      <td className="px-3 py-2 font-medium text-green-600 dark:text-green-400">{formatCurrency(p.revenue - p.cost)}</td>
                    </tr>
                  ))}
                  {salesData.parts.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No parts sold or used in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
