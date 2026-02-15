'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function BaleInventoryReportPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/bale-inventory?businessId=${currentBusinessId}`)
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
          &larr; Back to Reports
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bale Inventory Report</h1>
          <button onClick={fetchReport} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : !report ? (
          <p className="text-gray-500 text-center py-12">No data available</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{report.summary.totalBales}</div>
                <div className="text-sm text-indigo-600 dark:text-indigo-400">Total Bales ({report.summary.activeBales} active)</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{report.summary.totalRemaining}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Items Remaining (of {report.summary.totalItems})</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{report.summary.totalSold}</div>
                <div className="text-sm text-green-600 dark:text-green-400">Items Sold (${report.summary.totalRevenue.toFixed(2)})</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{report.summary.totalBogoFree}</div>
                <div className="text-sm text-amber-600 dark:text-amber-400">BOGO Free Given | {report.summary.totalTransferred} Transferred</div>
              </div>
            </div>

            {/* Bale Details Table */}
            {report.bales.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No bales found.</p>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-3 py-3 text-left">Batch #</th>
                        <th className="px-3 py-3 text-left">Category</th>
                        <th className="px-3 py-3 text-right">Stock</th>
                        <th className="px-3 py-3 text-right">Price</th>
                        <th className="px-3 py-3 text-right">Sold</th>
                        <th className="px-3 py-3 text-right">Revenue</th>
                        <th className="px-3 py-3 text-right">BOGO Free</th>
                        <th className="px-3 py-3 text-right">Transferred</th>
                        <th className="px-3 py-3 text-right">Utilization</th>
                        <th className="px-3 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {report.bales.map((bale: any) => (
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
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">${bale.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-green-600">{bale.sold}</td>
                          <td className="px-3 py-2 text-right text-green-600">${bale.revenue.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-amber-600">{bale.bogoFreeGiven}</td>
                          <td className="px-3 py-2 text-right text-purple-600">{bale.transferred}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${bale.utilizationPct >= 80 ? 'bg-green-500' : bale.utilizationPct >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                  style={{ width: `${bale.utilizationPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-8 text-right">{bale.utilizationPct}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {bale.isActive ? (
                              <span className="inline-block px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                Active
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                                Inactive
                              </span>
                            )}
                            {bale.bogoActive && (
                              <span className="inline-block px-2 py-0.5 text-xs bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded ml-1">
                                BOGO
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
