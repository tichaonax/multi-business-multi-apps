'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function CouponUsageReportPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetchReport = async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        businessId: currentBusinessId,
        startDate,
        endDate
      })
      const response = await fetch(`/api/reports/coupon-usage?${params}`)
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Coupon Usage Report</h1>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => { const t = new Date().toISOString().split('T')[0]; setStartDate(t); setEndDate(t) }}
              className="px-3 py-2 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); const y = d.toISOString().split('T')[0]; setStartDate(y); setEndDate(y) }}
              className="px-3 py-2 text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              Yesterday
            </button>
          </div>
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
          <button onClick={fetchReport} className="btn-primary bg-teal-600 hover:bg-teal-700 px-4 py-2 text-white rounded-md">
            Generate
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          </div>
        ) : !report ? (
          <p className="text-gray-500 text-center py-12">No data available</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{report.summary.totalRedemptions}</div>
                <div className="text-sm text-teal-600 dark:text-teal-400">Total Redemptions</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">${report.summary.totalDiscountGiven.toFixed(2)}</div>
                <div className="text-sm text-green-600 dark:text-green-400">Total Discount Given</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{report.summary.uniqueCouponsUsed}</div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Unique Coupons Used</div>
              </div>
            </div>

            {/* By Coupon Table */}
            {report.byCoupon.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
                <h3 className="text-lg font-semibold p-4 border-b border-gray-200 dark:border-gray-700">Usage by Coupon</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left">Code</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">Times Used</th>
                      <th className="px-4 py-3 text-right">Total Discount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {report.byCoupon.map((c: any) => (
                      <tr key={c.code}>
                        <td className="px-4 py-3 font-medium">{c.code}</td>
                        <td className="px-4 py-3 text-gray-500">{c.description || '-'}</td>
                        <td className="px-4 py-3 text-right">{c.timesUsed}</td>
                        <td className="px-4 py-3 text-right text-green-600">${c.totalDiscount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Detail Table */}
            {report.details.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <h3 className="text-lg font-semibold p-4 border-b border-gray-200 dark:border-gray-700">Redemption Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Coupon</th>
                        <th className="px-4 py-3 text-left">Order #</th>
                        <th className="px-4 py-3 text-right">Discount</th>
                        <th className="px-4 py-3 text-right">Order Total</th>
                        <th className="px-4 py-3 text-left">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {report.details.map((d: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-3">{new Date(d.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium">{d.couponCode}</td>
                          <td className="px-4 py-3">{d.orderNumber}</td>
                          <td className="px-4 py-3 text-right text-green-600">-${d.appliedAmount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">${d.orderTotal.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-500">{d.approvedBy || '-'}</td>
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
