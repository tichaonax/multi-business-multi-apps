'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/utils'

interface BusinessRevenueBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
}

interface RevenueStats {
  totalRevenue: number
  completedRevenue: number
  pendingRevenue: number
}

export function BusinessRevenueBreakdownModal({ isOpen, onClose }: BusinessRevenueBreakdownModalProps) {
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      loadRevenueStats()
    }
  }, [isOpen])

  const loadRevenueStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats({
          totalRevenue: data.totalRevenue || 0,
          completedRevenue: data.completedRevenue || 0,
          pendingRevenue: data.pendingRevenue || 0
        })
      } else {
        setError('Failed to load revenue data')
      }
    } catch (err) {
      setError('Network error while loading revenue data')
      console.error('Revenue stats loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const navigateToDetailedBreakdown = () => {
    onClose() // Close current modal
    router.push('/dashboard?showRevenueBreakdown=true')
  }

  const title = stats
    ? `Business Revenue Breakdown - ${formatCurrency(stats.totalRevenue)}(${formatCurrency(stats.completedRevenue)} completed,${formatCurrency(stats.pendingRevenue)} pending)`
    : 'Business Revenue Breakdown'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-6">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading revenue data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-600 dark:text-red-400 mr-2">❌</span>
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {stats && !loading && !error && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="text-3xl">💰</div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Completed Revenue</p>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">{formatCurrency(stats.completedRevenue)}</p>
                  </div>
                  <div className="text-3xl">✅</div>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Pending Revenue</p>
                    <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{formatCurrency(stats.pendingRevenue)}</p>
                  </div>
                  <div className="text-3xl">⏳</div>
                </div>
              </div>
            </div>

            {/* Revenue Breakdown Chart */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Revenue Breakdown</h3>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      className="bg-green-500"
                      style={{
                        width: stats.totalRevenue > 0 ? `${(stats.completedRevenue / stats.totalRevenue) * 100}%` : '0%'
                      }}
                    ></div>
                    <div
                      className="bg-orange-500"
                      style={{
                        width: stats.totalRevenue > 0 ? `${(stats.pendingRevenue / stats.totalRevenue) * 100}%` : '0%'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex justify-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Completed: {formatCurrency(stats.completedRevenue)}
                      {stats.totalRevenue > 0 && (
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          ({((stats.completedRevenue / stats.totalRevenue) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Pending: {formatCurrency(stats.pendingRevenue)}
                      {stats.totalRevenue > 0 && (
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          ({((stats.pendingRevenue / stats.totalRevenue) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Detailed Breakdown Button */}
            <div className="flex justify-center">
              <button
                onClick={navigateToDetailedBreakdown}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <span>📊</span>
                <span>View Detailed Breakdown</span>
              </button>
            </div>

            {/* Additional Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="mb-2">
                <strong>Note:</strong> Revenue includes completed and pending orders from all your businesses,
                plus project income and personal income sources.
              </p>
              <p>
                Completed revenue represents orders that have been marked as completed.
                Pending revenue represents orders that are still in progress or awaiting completion.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}