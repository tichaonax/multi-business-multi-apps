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

        // Fetch real customer data from API
        const response = await fetch(`/api/customers?businessId=${businessId}&limit=1000`)

        if (!response.ok) {
          throw new Error('Failed to fetch customers')
        }

        const data = await response.json()
        const customers = data.customers || []

        // Calculate stats from real data
        const totalCustomers = customers.length

        // New customers this month
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
        const newCustomersThisMonth = customers.filter((c: any) =>
          new Date(c.createdAt) >= oneMonthAgo
        ).length

        // Calculate revenue and order stats
        let totalRevenue = 0
        let totalOrders = 0
        const segmentCounts = { price: 0, quality: 0, style: 0, conspicuous: 0 }

        customers.forEach((customer: any) => {
          const divisionAccount = customer.divisionAccounts?.[0]
          if (divisionAccount) {
            totalRevenue += Number(divisionAccount.totalSpent || 0)
            totalOrders += customer._count?.divisionAccounts || 0

            const segment = divisionAccount.preferences?.segment || 'price'
            if (segment in segmentCounts) {
              segmentCounts[segment as keyof typeof segmentCounts]++
            }
          }
        })

        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

        // Top spending customers
        const sortedBySpending = [...customers]
          .sort((a: any, b: any) => {
            const aSpent = a.divisionAccounts?.[0]?.totalSpent || 0
            const bSpent = b.divisionAccounts?.[0]?.totalSpent || 0
            return Number(bSpent) - Number(aSpent)
          })
          .slice(0, 3)
          .map((c: any) => ({
            id: c.id,
            name: c.fullName,
            email: c.primaryEmail || '',
            totalSpent: Number(c.divisionAccounts?.[0]?.totalSpent || 0),
            orderCount: c._count?.divisionAccounts || 0,
            lastOrderDate: c.divisionAccounts?.[0]?.lastPurchaseDate || c.createdAt
          }))

        // Calculate retention (simplified - based on recent activity)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const sixtyDaysAgo = new Date()
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const activeIn30Days = customers.filter((c: any) => {
          const lastPurchase = c.divisionAccounts?.[0]?.lastPurchaseDate
          return lastPurchase && new Date(lastPurchase) >= thirtyDaysAgo
        }).length

        const activeIn60Days = customers.filter((c: any) => {
          const lastPurchase = c.divisionAccounts?.[0]?.lastPurchaseDate
          return lastPurchase && new Date(lastPurchase) >= sixtyDaysAgo
        }).length

        const activeIn90Days = customers.filter((c: any) => {
          const lastPurchase = c.divisionAccounts?.[0]?.lastPurchaseDate
          return lastPurchase && new Date(lastPurchase) >= ninetyDaysAgo
        }).length

        const calculatedStats: CustomerStats = {
          totalCustomers,
          newCustomersThisMonth,
          totalRevenue,
          averageOrderValue,
          repeatCustomerRate: totalCustomers > 0 ? (activeIn30Days / totalCustomers) * 100 : 0,
          segmentBreakdown: segmentCounts,
          topSpendingCustomers: sortedBySpending,
          customerRetention: {
            thirtyDays: totalCustomers > 0 ? (activeIn30Days / totalCustomers) * 100 : 0,
            sixtyDays: totalCustomers > 0 ? (activeIn60Days / totalCustomers) * 100 : 0,
            ninetyDays: totalCustomers > 0 ? (activeIn90Days / totalCustomers) * 100 : 0
          }
        }

        setStats(calculatedStats)

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
          <div key={card.title} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">{card.title}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-secondary mt-1">{card.subtitle}</p>
              </div>
              <div className="text-3xl opacity-20">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Segmentation */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Customer Segments</h3>
          <div className="space-y-3">
            {Object.entries(stats.segmentBreakdown).map(([segment, count]) => (
              <div key={segment} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${segmentColors[segment as keyof typeof segmentColors]}`}>
                    {segmentLabels[segment as keyof typeof segmentLabels]}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">{count}</div>
                  <div className="text-xs text-secondary">
                    {((count / stats.totalCustomers) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Top Customers</h3>
          <div className="space-y-3">
            {stats.topSpendingCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">{customer.name}</p>
                    <p className="text-xs text-secondary">{customer.orderCount} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">{formatCurrency(customer.totalSpent)}</div>
                  <div className="text-xs text-secondary">
                    {formatDate(new Date(customer.lastOrderDate))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retention Rates */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Customer Retention</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary">30 Days</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${stats.customerRetention.thirtyDays}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-primary">{stats.customerRetention.thirtyDays}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary">60 Days</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${stats.customerRetention.sixtyDays}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-primary">{stats.customerRetention.sixtyDays}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary">90 Days</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${stats.customerRetention.ninetyDays}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-primary">{stats.customerRetention.ninetyDays}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}