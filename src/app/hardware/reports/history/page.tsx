'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { formatCurrency, formatDateFull, formatDateTime } from '@/lib/date-format'

export default function ReportsHistory() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReports, setTotalReports] = useState(0)

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
  } = useBusinessPermissionsContext()

  const businessType = currentBusiness?.businessType || 'hardware'
  const posLink = `/${businessType}/pos`
  const limit = 20

  // Load reports
  useEffect(() => {
    const loadReports = async () => {
      if (!currentBusinessId) return

      try {
        setLoading(true)
        const offset = (currentPage - 1) * limit

        let url = `/api/reports/saved?businessId=${currentBusinessId}&limit=${limit}&offset=${offset}`
        if (reportType !== 'ALL') {
          url += `&reportType=${reportType}`
        }

        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setReports(data.reports)
          setTotalPages(data.pagination.totalPages)
          setTotalReports(data.pagination.total)
        }
      } catch (error) {
        console.error('Failed to load reports:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [currentBusinessId, reportType, currentPage])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [reportType])

  if (!isAuthenticated || !currentBusinessId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-gray-600 dark:text-gray-400">Please select a business to view reports.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      {/* Navigation */}
      <div className="no-print mb-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href={posLink}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm whitespace-nowrap"
          >
            ← Back to POS
          </Link>
          <Link
            href="/hardware/reports/end-of-day"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
          >
            📅 Today's Report
          </Link>
          <Link
            href="/hardware/reports/end-of-week"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap"
          >
            📊 This Week's Report
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">📚 Saved Reports</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentBusiness?.businessName || 'Hardware Store'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reports</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalReports}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter by Type:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Reports</option>
              <option value="END_OF_DAY">End of Day</option>
              <option value="END_OF_WEEK">End of Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Reports Found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {reportType === 'ALL'
                  ? 'No reports have been saved yet.'
                  : `No ${reportType.toLowerCase().replace('_', ' ')} reports found.`}
              </p>
              <Link
                href="/hardware/reports/end-of-day"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Today's Report →
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Report Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Total Sales
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reports.map((report) => (
                      <tr
                        key={report.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-2xl mr-2">
                              {report.reportType === 'END_OF_DAY' ? '📅' : '📊'}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {report.reportType === 'END_OF_DAY' ? 'End of Day' : 'End of Week'}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDateTime(new Date(report.signedAt))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {formatDateFull(new Date(report.reportDate))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{report.managerName}</div>
                          {report.user && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{report.user.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(report.totalSales)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{report.totalOrders}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {report.isLocked ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                              🔒 Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                              Unlocked
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Link
                            href={`/hardware/reports/saved/${report.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Report →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing page <span className="font-semibold">{currentPage}</span> of{' '}
                      <span className="font-semibold">{totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}