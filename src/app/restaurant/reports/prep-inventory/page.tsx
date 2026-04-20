'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface ReportRow {
  productId: string
  name: string
  category: string
  price: number
  unitsInitialized: number
  unitsSold: number
  revenue: number
  totalCost: number
  profit: number
  margin: number
}

interface Summary {
  totalUnitsInitialized: number
  totalUnitsSold: number
  totalRevenue: number
  totalCost: number
  netProfit: number
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PrepInventoryReportPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const businessType = currentBusiness?.businessType || 'restaurant'

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(thirtyDaysAgo)
  const [endDate, setEndDate] = useState(today)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentBusinessId) return
    fetchReport()
  }, [currentBusinessId])

  async function fetchReport() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId!, startDate, endDate })
      const res = await fetch(`/api/restaurant/reports/prep-inventory?${params}`)
      const json = await res.json()
      if (json.success) {
        setRows(json.data)
        setSummary(json.summary)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Nav */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Link href={`/${businessType}/reports`} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
            ← Reports
          </Link>
          <Link href="/restaurant/inventory/initialize" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm">
            Daily Initialization
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prep Inventory Report</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Revenue vs. cost for tracked prepared items</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100" />
          </div>
          <button onClick={fetchReport} disabled={loading}
            className="px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium">
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Units Initialized', value: summary.totalUnitsInitialized.toString(), color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' },
              { label: 'Units Sold', value: summary.totalUnitsSold.toString(), color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300' },
              { label: 'Revenue', value: `$${fmt(summary.totalRevenue)}`, color: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' },
              { label: 'Total Cost', value: `$${fmt(summary.totalCost)}`, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300' },
              { label: 'Net Profit', value: `$${fmt(summary.netProfit)}`, color: summary.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300' },
            ].map(card => (
              <div key={card.label} className={`${card.color} rounded-lg p-3`}>
                <div className="text-xs font-medium opacity-75 mb-1">{card.label}</div>
                <div className="text-lg font-bold">{card.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No data for the selected date range.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">Product</th>
                  <th className="text-right px-3 py-3 text-gray-700 dark:text-gray-300 font-medium">Init</th>
                  <th className="text-right px-3 py-3 text-gray-700 dark:text-gray-300 font-medium">Sold</th>
                  <th className="text-right px-3 py-3 text-gray-700 dark:text-gray-300 font-medium">Revenue</th>
                  <th className="text-right px-3 py-3 text-gray-700 dark:text-gray-300 font-medium">Cost</th>
                  <th className="text-right px-3 py-3 text-gray-700 dark:text-gray-300 font-medium">Profit</th>
                  <th className="text-right px-3 py-3 text-gray-700 dark:text-gray-300 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map(row => (
                  <tr key={row.productId} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{row.name}</div>
                      {row.category && <div className="text-xs text-gray-500">{row.category}</div>}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{row.unitsInitialized}</td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{row.unitsSold}</td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">${fmt(row.revenue)}</td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">${fmt(row.totalCost)}</td>
                    <td className={`px-3 py-3 text-right font-medium ${row.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${fmt(row.profit)}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{row.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
