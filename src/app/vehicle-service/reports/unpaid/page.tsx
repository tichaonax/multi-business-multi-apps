'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatCurrency, formatDateFull } from '@/lib/date-format'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

interface UnpaidJob {
  jobId: string
  orderId: string
  orderNumber: string
  billedAt: string
  totalAmount: number
  paymentStatus: string
  daysOutstanding: number
  customerName: string | null
  customerPhone: string | null
  vehicle: string | null
  vehiclePlate: string | null
}

const defaultDateRange = (): DateRange => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 90)
  return { start, end }
}

export default function VehicleServiceUnpaidJobsReport() {
  const { currentBusinessId } = useBusinessPermissionsContext()

  const [jobs, setJobs] = useState<UnpaidJob[]>([])
  const [summary, setSummary] = useState<{ count: number; totalOutstanding: number }>({ count: 0, totalOutstanding: 0 })
  const [loading, setLoading] = useState(true)
  const [allTime, setAllTime] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadJobs = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      setLoading(true)
      let url = `/api/vehicle-service/reports/unpaid?businessId=${currentBusinessId}`
      if (!allTime) {
        url += `&startDate=${getLocalDateString(dateRange.start)}&endDate=${getLocalDateString(dateRange.end)}`
      }
      if (searchDebounced) url += `&search=${encodeURIComponent(searchDebounced)}`

      const response = await fetch(url)
      if (response.ok) {
        const json = await response.json()
        setJobs(json.data.jobs)
        setSummary(json.data.summary)
      }
    } catch (error) {
      console.error('Failed to load unpaid jobs:', error)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, allTime, dateRange, searchDebounced])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="mb-6">
        <Link
          href="/vehicle-service/reports"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block"
        >
          ← Back to Reports
        </Link>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Billed but Unpaid Jobs</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Jobs that have been invoiced but payment hasn't been collected yet — these are not
            counted as sales/cash on the EOD report until they're actually paid.
          </p>
        </div>

        <DateRangeSelector
          value={dateRange}
          onChange={setDateRange}
          showAllTime
          allTime={allTime}
          onAllTimeChange={setAllTime}
        />

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, vehicle, plate, or order number..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="text-sm text-amber-700 dark:text-amber-400">Outstanding Jobs</div>
            <div className="text-2xl font-bold text-amber-800 dark:text-amber-300">{summary.count}</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="text-sm text-amber-700 dark:text-amber-400">Total Outstanding</div>
            <div className="text-2xl font-bold text-amber-800 dark:text-amber-300">{formatCurrency(summary.totalOutstanding)}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : jobs.length === 0 ? (
            <p className="px-6 py-10 text-sm text-gray-500 dark:text-gray-400 text-center">
              No unpaid billed jobs in this range — everything's collected. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Billed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vehicle</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Days Outstanding</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {jobs.map(job => (
                    <tr key={job.jobId}>
                      <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">{job.orderNumber}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDateFull(new Date(job.billedAt))}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-white">
                        {job.customerName || '—'}
                        {job.customerPhone && <div className="text-xs text-gray-400">{job.customerPhone}</div>}
                      </td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                        {job.vehicle || '—'}
                        {job.vehiclePlate && <div className="text-xs text-gray-400">{job.vehiclePlate}</div>}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(job.totalAmount)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`font-medium ${job.daysOutstanding >= 7 ? 'text-red-600 dark:text-red-400' : job.daysOutstanding >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {job.daysOutstanding}d
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {/* The jobs page has no per-job deep-link param — only a
                            free-text `search` that matches customer/vehicle
                            fields (not order number), so that's what narrows
                            the list here, not a direct jump to this exact job. */}
                        <Link
                          href={`/vehicle-service/jobs?search=${encodeURIComponent(job.customerName || job.vehiclePlate || job.vehicle || '')}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
                        >
                          Find in Jobs →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
