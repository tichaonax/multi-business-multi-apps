'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface CustomerStats {
  totalCustomers: number
  newCustomersThisMonth: number
  totalRevenue: number
  averageOrderValue: number
  repeatCustomerRate: number
  segmentBreakdown: {
    price: number
    quality: number
    style: number
    conspicuous: number
  }
  topSpendingCustomers: Array<{
    id: string
    name: string
    email: string
    totalSpent: number
    orderCount: number
    lastOrderDate: string
  }>
  customerRetention: {
    thirtyDays: number
    sixtyDays: number
    ninetyDays: number
  }
}

interface ClothingCustomerStatsProps {
  businessId: string
}

export function ClothingCustomerStats({ businessId }: ClothingCustomerStatsProps) {
  const { formatCurrency, formatDate } = useBusinessContext()
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // This would fetch real customer stats
        // For now, using comprehensive sample data
        const sampleStats: CustomerStats = {
          totalCustomers: 1247,
          newCustomersThisMonth: 87,
          totalRevenue: 234567.89,
          averageOrderValue: 89.45,
          repeatCustomerRate: 67.3,
          segmentBreakdown: {
            price: 342,      // Price-conscious customers
            quality: 298,    // Quality-focused customers
            style: 367,      // Style-conscious customers
            conspicuous: 240 // Status/brand-conscious customers
          },
          topSpendingCustomers: [
            {
              id: 'cust1',
              name: 'Sarah Johnson',
              email: 'sarah.j@email.com',
              totalSpent: 2450.00,
              orderCount: 15,
              lastOrderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'cust2',
              name: 'Michael Chen',
              email: 'm.chen@email.com',
              totalSpent: 1890.50,
              orderCount: 12,
              lastOrderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'cust3',
              name: 'Emma Rodriguez',
              email: 'emma.r@email.com',
              totalSpent: 1675.25,
              orderCount: 18,
              lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          customerRetention: {
            thirtyDays: 85.2,
            sixtyDays: 72.8,
            ninetyDays: 64.5
          }
        }

        setStats(sampleStats)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        console.error('Failed to fetch customer stats:', err)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchStats()
    }
  }, [businessId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Failed to load customer stats: {error}</p>
      </div>
    )
  }

  if (!stats) return null

  const mainStatCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toLocaleString(),
      subtitle: `+${stats.newCustomersThisMonth} this month`,
      icon: '👥',
      color: 'text-blue-600'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      subtitle: 'Customer lifetime value',
      icon: '💰',
      color: 'text-green-600'
    },
    {
      title: 'Avg. Order Value',
      value: formatCurrency(stats.averageOrderValue),
      subtitle: 'Per transaction',
      icon: '🛍️',
      color: 'text-purple-600'
    },
    {
      title: 'Repeat Rate',
      value: `${stats.repeatCustomerRate}%`,
      subtitle: 'Customer retention',
      icon: '🔄',
      color: 'text-orange-600'
    }
  ]

  const segmentColors = {
    price: 'bg-red-100 text-red-800',
    quality: 'bg-blue-100 text-blue-800',
    style: 'bg-purple-100 text-purple-800',
    conspicuous: 'bg-green-100 text-green-800'
  }

  const segmentLabels = {
    price: 'Price-Conscious',
    quality: 'Quality-Focused',
    style: 'Style-Conscious',
    conspicuous: 'Brand/Status'
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStatCards.map((card) => (
          <div key={card.title} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              </div>
              <div className="text-3xl opacity-20">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Segmentation */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h3>
          <div className="space-y-3">
            {Object.entries(stats.segmentBreakdown).map(([segment, count]) => (
              <div key={segment} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${segmentColors[segment as keyof typeof segmentColors]}`}>
                    {segmentLabels[segment as keyof typeof segmentLabels]}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{count}</div>
                  <div className="text-xs text-gray-500">
                    {((count / stats.totalCustomers) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
          <div className="space-y-3">
            {stats.topSpendingCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                    <p className="text-xs text-gray-500">{customer.orderCount} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{formatCurrency(customer.totalSpent)}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(new Date(customer.lastOrderDate))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retention Rates */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Retention</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">30 Days</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${stats.customerRetention.thirtyDays}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.customerRetention.thirtyDays}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">60 Days</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${stats.customerRetention.sixtyDays}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.customerRetention.sixtyDays}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">90 Days</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${stats.customerRetention.ninetyDays}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats.customerRetention.ninetyDays}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}