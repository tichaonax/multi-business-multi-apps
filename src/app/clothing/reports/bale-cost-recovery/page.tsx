'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

const STATUS_CONFIG = {
  recovered: { label: 'Recovered', badge: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300', icon: '✅' },
  partial:   { label: 'Partial',   badge: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300', icon: '🔶' },
  none:      { label: 'No Sales',  badge: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300',   icon: '❌' },
}

export default function BaleCostRecoveryPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchReport = async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/bale-cost-recovery?businessId=${currentBusinessId}`)
      const data = await res.json()
      if (data.success) setReport(data.data)
    } catch (e) {
      console.error('Error fetching cost recovery report:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [currentBusinessId])

  const businessType = currentBusiness?.businessType || 'clothing'

  const filteredBales = report?.bales?.filter((b: any) =>
    statusFilter === 'all' ? true : b.status === statusFilter
  ) ?? []

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="mb-6">
        <Link
          href={`/${businessType}/reports`}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block"
        >
          &larr; Back to Reports
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bale Cost Recovery Report</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track how much of each bale&apos;s purchase cost has been recovered through sales.
              Only bales registered with a <strong>Bale Cost</strong> appear here.
            </p>
          </div>
          <button onClick={fetchReport} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          </div>
        ) : !report || report.bales.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-4">💰</div>
            <p className="text-lg font-medium mb-2">No cost data yet</p>
            <p className="text-sm">Register a bale and fill in the <strong>Bale Cost ($)</strong> field to start tracking cost recovery.</p>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">${report.summary.totalCost.toFixed(2)}</div>
                <div className="text-sm text-red-600 dark:text-red-400">Total Bale Cost ({report.summary.totalBales} bales)</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">${report.summary.totalRevenue.toFixed(2)}</div>
                <div className="text-sm text-green-600 dark:text-green-400">Total Revenue</div>
              </div>
              <div className={`border rounded-lg p-4 ${report.summary.totalProfit >= 0 ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
                <div className={`text-2xl font-bold ${report.summary.totalProfit >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-orange-700 dark:text-orange-300'}`}>
                  {report.summary.totalProfit >= 0 ? '+' : ''}${report.summary.totalProfit.toFixed(2)}
                </div>
                <div className={`text-sm ${report.summary.totalProfit >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>Net Profit / Loss</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{report.summary.overallRecoveryPct}%</div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Overall Cost Recovery</div>
              </div>
            </div>

            {/* Status counts */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {(['all', 'recovered', 'partial', 'none'] as const).map((s) => {
                const count = s === 'all'
                  ? report.bales.length
                  : s === 'recovered' ? report.summary.fullyRecovered
                  : s === 'partial' ? report.summary.partiallyRecovered
                  : report.summary.notStarted
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      statusFilter === s
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                    }`}
                  >
                    {s === 'all' ? 'All' : STATUS_CONFIG[s].icon + ' ' + STATUS_CONFIG[s].label}
                    <span className="ml-1.5 text-xs opacity-75">({count})</span>
                  </button>
                )
              })}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-3 py-3 text-left">Batch #</th>
                      <th className="px-3 py-3 text-left">Category</th>
                      <th className="px-3 py-3 text-right">Stock</th>
                      <th className="px-3 py-3 text-right">Cost Paid</th>
                      <th className="px-3 py-3 text-right">Revenue</th>
                      <th className="px-3 py-3 text-right">Profit / Loss</th>
                      <th className="px-3 py-3 text-right">Recovery</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3 text-left">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredBales.map((bale: any) => {
                      const cfg = STATUS_CONFIG[bale.status as keyof typeof STATUS_CONFIG]
                      return (
                        <tr key={bale.id} className={!bale.isActive ? 'opacity-50' : ''}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900 dark:text-gray-100">{bale.batchNumber}</div>
                            <div className="text-xs text-gray-400">{bale.sku}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{bale.category}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={bale.remainingCount === 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}>
                              {bale.remainingCount}
                            </span>
                            <span className="text-gray-400">/{bale.itemCount}</span>
                          </td>
                          <td className="px-3 py-2 text-right text-red-600 font-medium">${bale.costPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-green-600">${bale.revenue.toFixed(2)}</td>
                          <td className={`px-3 py-2 text-right font-semibold ${bale.profit >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                            {bale.profit >= 0 ? '+' : ''}${bale.profit.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${bale.recoveryPct >= 100 ? 'bg-green-500' : bale.recoveryPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(100, bale.recoveryPct)}%` }}
                                />
                              </div>
                              <span className="text-xs w-9 text-right">{bale.recoveryPct}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${cfg.badge}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs max-w-xs">
                            {bale.recommendation}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
