'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatCurrency, formatDateTime } from '@/lib/date-format'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

const defaultDateRange = (): DateRange => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return { start, end }
}

interface PriceChangeReport {
  id: string
  date: string
  productName: string | null
  oldPrice: number | null
  newPrice: number | null
  changedByName: string | null
  changedByEmail: string | null
  sourceTable: string | null
  viaPOSQuickEdit: boolean
}

export default function PriceChangesReportPage() {
  const [reports, setReports] = useState<PriceChangeReport[]>([])
  const [loading, setLoading] = useState(true)
  const [allTime, setAllTime] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReports, setTotalReports] = useState(0)

  const { currentBusiness, currentBusinessId, isAuthenticated } = useBusinessPermissionsContext()

  const businessType = currentBusiness?.businessType || 'grocery'
  const typesWithOwnPosPage = ['restaurant', 'grocery', 'clothing', 'hardware']
  const posLink = typesWithOwnPosPage.includes(businessType) ? `/${businessType}/pos` : '/universal/pos'
  const limit = 20

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const loadReports = async () => {
      if (!currentBusinessId) return
      try {
        setLoading(true)
        const offset = (currentPage - 1) * limit
        let url = `/api/reports/price-changes?businessId=${currentBusinessId}&limit=${limit}&offset=${offset}`
        if (!allTime) {
          url += `&startDate=${getLocalDateString(dateRange.start)}&endDate=${getLocalDateString(dateRange.end)}`
        }
        if (searchDebounced) {
          url += `&search=${encodeURIComponent(searchDebounced)}`
        }

        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setReports(data.reports)
          setTotalPages(data.pagination.totalPages)
          setTotalReports(data.pagination.total)
        }
      } catch (error) {
        console.error('Failed to load price change report:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [currentBusinessId, allTime, dateRange, searchDebounced, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [allTime, dateRange, searchDebounced])

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
            href={`/${businessType}/reports`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
          >
            📊 All Reports
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">💲 Price Change Report</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentBusiness?.businessName || 'Business'} — audit trail of every product price change
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Changes</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalReports}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Search:</label>
            <input
              type="text"
              placeholder="Search by product or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              <p className="text-gray-600 dark:text-gray-400">Loading price changes...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Price Changes Found</h2>
              <p className="text-gray-600 dark:text-gray-400">
                No product prices have been changed in this period.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Original Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        New Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Changed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {reports.map((r) => {
                      const increased = (r.newPrice ?? 0) > (r.oldPrice ?? 0)
                      return (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {formatDateTime(new Date(r.date))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {r.productName || '—'}
                            </div>
                            {r.viaPOSQuickEdit && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">via POS Quick-Edit</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-through">
                              {r.oldPrice != null ? formatCurrency(r.oldPrice) : '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className={`text-sm font-semibold ${increased ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {r.newPrice != null ? formatCurrency(r.newPrice) : '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-gray-100">{r.changedByName || '—'}</div>
                            {r.changedByEmail && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{r.changedByEmail}</div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
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
