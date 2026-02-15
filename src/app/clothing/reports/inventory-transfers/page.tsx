'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function InventoryTransferReportPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [expandedTransfer, setExpandedTransfer] = useState<string | null>(null)

  const fetchReport = async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        businessId: currentBusinessId,
        startDate,
        endDate
      })
      const response = await fetch(`/api/reports/inventory-transfers?${params}`)
      const data = await response.json()
      if (data.success) setReport(data.data)
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [currentBusinessId])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="mb-6">
        <Link href="/clothing/reports" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block">
          ← Back to Reports
        </Link>
      </div>

      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Inventory Transfer Report</h1>

        {/* Date Range Filter */}
        <div className="flex items-end gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <button onClick={fetchReport} className="btn-primary bg-amber-600 hover:bg-amber-700 px-4 py-2 text-white rounded-md">
            Generate
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
          </div>
        ) : !report ? (
          <p className="text-gray-500 text-center py-12">No data available</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{report.summary.totalTransfers}</div>
                <div className="text-sm text-amber-600 dark:text-amber-400">Total Transfers</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{report.summary.totalItemsTransferred}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Items Transferred</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">${report.summary.totalSourceValue.toFixed(2)}</div>
                <div className="text-sm text-red-600 dark:text-red-400">Source Value</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">${report.summary.totalTargetValue.toFixed(2)}</div>
                <div className="text-sm text-green-600 dark:text-green-400">Target Value</div>
              </div>
            </div>

            {/* Transfers List */}
            {report.transfers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No transfers found in this date range.</p>
            ) : (
              <div className="space-y-3">
                {report.transfers.map((t: any) => (
                  <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedTransfer(expandedTransfer === t.id ? null : t.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {t.from} → {t.to}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(t.date).toLocaleDateString()} | {t.employee} | {t.itemCount} items
                        </div>
                        {t.notes && <div className="text-xs text-gray-400 mt-1">{t.notes}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${t.targetValue.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {expandedTransfer === t.id ? '▲' : '▼'}
                        </div>
                      </div>
                    </button>

                    {expandedTransfer === t.id && (
                      <table className="w-full text-sm border-t border-gray-200 dark:border-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="px-4 py-2 text-left">Item</th>
                            <th className="px-4 py-2 text-left">Bale / Batch</th>
                            <th className="px-4 py-2 text-right">Qty</th>
                            <th className="px-4 py-2 text-right">Source Price</th>
                            <th className="px-4 py-2 text-right">Target Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {t.items.map((item: any, j: number) => (
                            <tr key={j}>
                              <td className="px-4 py-2">
                                {item.productName}
                                {item.barcode && <span className="text-xs text-gray-400 ml-2">{item.barcode}</span>}
                              </td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                {item.baleBatchNumber ? (
                                  <span>
                                    <span className="font-medium">{item.baleBatchNumber}</span>
                                    {item.baleCategory && <span className="text-xs text-gray-400 ml-1">({item.baleCategory})</span>}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">{item.quantity}</td>
                              <td className="px-4 py-2 text-right">${item.sourcePrice.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right">${item.targetPrice.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
