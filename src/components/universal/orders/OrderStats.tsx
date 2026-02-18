import React from 'react'
import { OrderStats as OrderStatsType } from './types'
import { formatCurrency } from './utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface OrderStatsProps {
  stats: OrderStatsType | null
  loading: boolean
  businessType: string
}

export function OrderStats({ stats, loading, businessType }: OrderStatsProps) {
  const { hasPermission, isSystemAdmin } = useBusinessPermissionsContext()

  // Check if user has permission to view financial data
  const canViewFinancialData = isSystemAdmin || hasPermission('canAccessFinancialData')

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 sm:p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const baseMetrics = [
    {
      label: 'Total Orders',
      value: stats.totalOrders.toString(),
      icon: '📋',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders.toString(),
      icon: '⏳',
      color: 'text-orange-600 dark:text-orange-400'
    }
  ]

  const financialMetrics = canViewFinancialData ? [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: '💰',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Completed Revenue',
      value: formatCurrency(stats.completedRevenue),
      icon: '✅',
      color: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Pending Revenue',
      value: formatCurrency(stats.pendingRevenue),
      icon: '⏳',
      color: 'text-orange-600 dark:text-orange-400'
    }
  ] : []

  const allMetrics = [...baseMetrics, ...financialMetrics]

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${allMetrics.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 sm:gap-6 mb-6`}>
      {allMetrics.map((metric, index) => (
        <div key={index} className="card p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl">{metric.icon}</span>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-secondary">{metric.label}</p>
              <p className={`text-2xl font-bold ${metric.color}`}>
                {metric.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}