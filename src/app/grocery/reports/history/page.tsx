'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { formatCurrency, formatDateFull, formatDateTime } from '@/lib/date-format'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

const defaultDateRange = (): DateRange => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { start, end }
}

export default function ReportsHistory() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<string>('ALL')
  const [allTime, setAllTime] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [managerSearch, setManagerSearch] = useState<string>('')
  const [managerSearchDebounced, setManagerSearchDebounced] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReports, setTotalReports] = useState(0)
  const [amendmentModalReport, setAmendmentModalReport] = useState<any>(null)

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
  } = useBusinessPermissionsContext()

  const businessType = currentBusiness?.businessType || 'grocery'
  const posLink = `/${businessType}/pos`
  const limit = 20

  // Debounce manager search
  useEffect(() => {
    const timer = setTimeout(() => setManagerSearchDebounced(managerSearch), 300)
    return () => clearTimeout(timer)
  }, [managerSearch])

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
        if (!allTime) {
          url += `&startDate=${getLocalDateString(dateRange.start)}&endDate=${getLocalDateString(dateRange.end)}`
        }
        if (managerSearchDebounced) {
          url += `&managerName=${encodeURIComponent(managerSearchDebounced)}`
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
  }, [currentBusinessId, reportType, allTime, dateRange, managerSearchDebounced, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [reportType, allTime, dateRange, managerSearchDebounced])

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
    <>
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
            href="/grocery/reports/end-of-day"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
          >
            📅 Today's Report
          </Link>
          <Link
            href="/grocery/reports/end-of-week"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap"
          >
            📊 This Week's Report
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">📚 Saved Reports</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentBusiness?.businessName || 'Grocery Store'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reports</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalReports}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
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
            <input
              type="text"
              placeholder="Search by manager..."
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="max-w-6xl mx-auto">
        <DateRangeSelector
          value={dateRange}
          onChange={(range) => { setAllTime(false); setDateRange(range) }}
          showAllTime={true}
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />
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
                href="/grocery/reports/end-of-day"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Today's Report →
              </Link>
            </div>
          ) : (
            <>
              <div>
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Report / Date
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Total Sales
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Cash Counted
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Flag
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        &nbsp;
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reports.map((report) => (
                      <tr
                        key={report.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl shrink-0">
                              {report.reportType === 'END_OF_DAY' ? '📅' : '📊'}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {report.reportType === 'END_OF_DAY' ? 'End of Day' : 'End of Week'}
                              </div>
                              <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                {formatDateFull(new Date(report.reportDate))}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                Signed {formatDateTime(new Date(report.signedAt))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{report.managerName}</div>
                        </td>
                        <td className="px-3 py-4 text-right">
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(report.totalSales)}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-right">
                          {report.cashCounted != null ? (
                            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              {formatCurrency(report.cashCounted)}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 dark:text-gray-500">—</div>
                          )}
                        </td>
                        <td className="px-3 py-4 text-center">
                          {report.cashCountedModifiedAt ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAmendmentModalReport(report) }}
                              title="Cash counted was amended — click for details"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-600 transition-colors"
                            >
                              ✏️ Amended
                            </button>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-center">
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
                        <td className="px-3 py-4 text-center">
                          <Link
                            href={`/grocery/reports/saved/${report.id}`}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View →
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

    {/* Amendment detail modal */}
    {amendmentModalReport && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAmendmentModalReport(null)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">✏️ Cash Counted Amendment</h2>
            <button onClick={() => setAmendmentModalReport(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Report date</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatDateFull(new Date(amendmentModalReport.reportDate))}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Date modified</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(new Date(amendmentModalReport.cashCountedModifiedAt))}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Original amount</span>
              <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(Number(amendmentModalReport.originalCashCounted))}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">New amount</span>
              <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(Number(amendmentModalReport.cashCounted))}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Modified by</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{amendmentModalReport.cashCountedModifiedByName}</span>
            </div>
            <div className="py-2">
              <p className="text-gray-500 dark:text-gray-400 mb-1">Reason</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{amendmentModalReport.cashCountedModifiedReason}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => setAmendmentModalReport(null)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
