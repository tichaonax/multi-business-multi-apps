'use client'

import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDateFull } from '@/lib/date-format'

interface HistoricalReport {
  date: string
  totalSales: number
  totalOrders: number
  receiptsIssued: number
}

export default function ReportHistory() {
  const [reports, setReports] = useState<HistoricalReport[]>([])
  const [loading, setLoading] = useState(true)
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const router = useRouter()

  // Determine POS link based on business type
  const businessType = currentBusiness?.businessType || 'grocery'
  const posLink = `/${businessType}/pos`

  useEffect(() => {
    loadHistoricalReports()
  }, [currentBusinessId])

  const loadHistoricalReports = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)

      // Get the last 30 days of receipt sequences
      const response = await fetch(`/api/restaurant/reports/history?businessId=${currentBusinessId}&days=30`)

      if (response.ok) {
        const data = await response.json()
        setReports(data.reports || [])
      }
    } catch (error) {
      console.error('Failed to load historical reports:', error)
    } finally {
      setLoading(false)
    }
  }


  const viewReport = (date: string) => {
    router.push(`/${businessType}/reports/view?date=${date}&businessId=${currentBusinessId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-3">
            <Link
              href={posLink}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to POS
            </Link>
            <Link
              href={`/${businessType}/reports/end-of-day`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Today's Report
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Report History</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">View past end-of-day reports</p>

          {/* Reports List */}
          {reports.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 text-lg">No historical reports found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Reports will appear here after business days are completed</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => (
                <div
                  key={report.date}
                  onClick={() => viewReport(report.date)}
                  className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatDateFull(report.date)}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Business Day: {report.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(report.totalSales)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {report.totalOrders} orders • {report.receiptsIssued} receipts
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                      View Full Report →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  )
}