'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface CustomerAnalytics {
  customerAcquisition: {
    thisMonth: number
    lastMonth: number
    thisYear: number
    channels: Array<{
      name: string
      count: number
      cost?: number
    }>
  }
  customerRetention: {
    oneMonth: number
    threeMonths: number
    sixMonths: number
    oneYear: number
  }
  purchaseBehavior: {
    avgTimeBetweenOrders: number
    seasonalTrends: Array<{
      season: string
      revenue: number
      orders: number
    }>
    categoryPreferences: Array<{
      category: string
      popularity: number
      revenue: number
    }>
  }
  segmentAnalysis: Array<{
    segment: string
    customerCount: number
    revenue: number
    avgOrderValue: number
    retentionRate: number
    growthRate: number
  }>
  riskAnalysis: {
    churnRisk: Array<{
      customerId: string
      name: string
      email: string
      riskScore: number
      lastOrderDays: number
      totalSpent: number
    }>
    reactivationOpportunity: Array<{
      customerId: string
      name: string
      email: string
      lastOrderDays: number
      avgOrderValue: number
      segment: string
    }>
  }
}

interface ClothingCustomerAnalyticsProps {
  businessId: string
}

export function ClothingCustomerAnalytics({ businessId }: ClothingCustomerAnalyticsProps) {
  const { formatCurrency } = useBusinessContext()
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'overview' | 'segments' | 'risk'>('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [businessId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Sample comprehensive customer analytics data
      const sampleAnalytics: CustomerAnalytics = {
        customerAcquisition: {
          thisMonth: 87,
          lastMonth: 72,
          thisYear: 892,
          channels: [
            { name: 'Social Media', count: 234, cost: 1200 },
            { name: 'Email Marketing', count: 189, cost: 400 },
            { name: 'Referrals', count: 156, cost: 0 },
            { name: 'Google Ads', count: 134, cost: 2100 },
            { name: 'Organic Search', count: 98, cost: 0 },
            { name: 'Direct', count: 81, cost: 0 }
          ]
        },
        customerRetention: {
          oneMonth: 85.2,
          threeMonths: 72.8,
          sixMonths: 64.5,
          oneYear: 52.3
        },
        purchaseBehavior: {
          avgTimeBetweenOrders: 45,
          seasonalTrends: [
            { season: 'Spring', revenue: 45600, orders: 312 },
            { season: 'Summer', revenue: 52400, orders: 398 },
            { season: 'Fall', revenue: 67800, orders: 445 },
            { season: 'Winter', revenue: 58900, orders: 367 }
          ],
          categoryPreferences: [
            { category: 'Tops', popularity: 89, revenue: 67800 },
            { category: 'Dresses', popularity: 78, revenue: 45600 },
            { category: 'Pants', popularity: 67, revenue: 38900 },
            { category: 'Shoes', popularity: 56, revenue: 34500 },
            { category: 'Accessories', popularity: 45, revenue: 23400 }
          ]
        },
        segmentAnalysis: [
          {
            segment: 'Style-Conscious',
            customerCount: 367,
            revenue: 102890,
            avgOrderValue: 76.80,
            retentionRate: 68.5,
            growthRate: 12.3
          },
          {
            segment: 'Price-Conscious',
            customerCount: 342,
            revenue: 11098, // Real calculation: customerCount * avgOrderValue
            avgOrderValue: 32.45,
            retentionRate: 45.2,
            growthRate: 8.7
          },
          {
            segment: 'Quality-Focused',
            customerCount: 298,
            revenue: 89640,
            avgOrderValue: 87.25,
            retentionRate: 78.9,
            growthRate: 15.6
          },
          {
            segment: 'Brand-Conscious',
            customerCount: 240,
            revenue: 156000,
            avgOrderValue: 245.50,
            retentionRate: 82.1,
            growthRate: 22.4
          }
        ],
        riskAnalysis: {
          churnRisk: [
            {
              customerId: 'cust_risk_1',
              name: 'Amanda Wilson',
              email: 'amanda.w@email.com',
              riskScore: 85,
              lastOrderDays: 120,
              totalSpent: 450.00
            },
            {
              customerId: 'cust_risk_2',
              name: 'Robert Kim',
              email: 'robert.k@email.com',
              riskScore: 78,
              lastOrderDays: 95,
              totalSpent: 670.00
            },
            {
              customerId: 'cust_risk_3',
              name: 'Jennifer Lopez',
              email: 'jennifer.l@email.com',
              riskScore: 72,
              lastOrderDays: 85,
              totalSpent: 890.00
            }
          ],
          reactivationOpportunity: [
            {
              customerId: 'cust_react_1',
              name: 'Mark Thompson',
              email: 'mark.t@email.com',
              lastOrderDays: 180,
              avgOrderValue: 125.00,
              segment: 'quality'
            },
            {
              customerId: 'cust_react_2',
              name: 'Lisa Chang',
              email: 'lisa.c@email.com',
              lastOrderDays: 210,
              avgOrderValue: 85.00,
              segment: 'style'
            }
          ]
        }
      }

      setAnalytics(sampleAnalytics)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch customer analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSegmentColor = (segment: string) => {
    const colors = {
      'Style-Conscious': 'bg-purple-100 text-purple-800',
      'Price-Conscious': 'bg-red-100 text-red-800',
      'Quality-Focused': 'bg-blue-100 text-blue-800',
      'Brand-Conscious': 'bg-green-100 text-green-800'
    }
    return colors[segment as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-yellow-600'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load customer analytics: {error}</p>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex gap-4">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'segments', label: 'Segment Analysis', icon: '🎯' },
          { id: 'risk', label: 'Risk Analysis', icon: '⚠️' }
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setSelectedView(view.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedView === view.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{view.icon}</span>
            {view.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Customer Acquisition */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Acquisition</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-2xl font-bold text-green-600">{analytics.customerAcquisition.thisMonth}</div>
                  <div className="text-sm text-gray-600">This Month</div>
                  <div className="text-xs text-green-600">
                    +{analytics.customerAcquisition.thisMonth - analytics.customerAcquisition.lastMonth} from last month
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{analytics.customerAcquisition.thisYear}</div>
                  <div className="text-sm text-gray-600">This Year</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Top Channels</h4>
                {analytics.customerAcquisition.channels.slice(0, 4).map((channel) => (
                  <div key={channel.name} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{channel.name}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">{channel.count}</div>
                      {channel.cost && channel.cost > 0 && (
                        <div className="text-xs text-gray-500">{formatCurrency(channel.cost / channel.count)} CPA</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retention Rates */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Retention</h3>
              <div className="space-y-4">
                {[
                  { period: '1 Month', rate: analytics.customerRetention.oneMonth },
                  { period: '3 Months', rate: analytics.customerRetention.threeMonths },
                  { period: '6 Months', rate: analytics.customerRetention.sixMonths },
                  { period: '1 Year', rate: analytics.customerRetention.oneYear }
                ].map((retention) => (
                  <div key={retention.period} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{retention.period}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${retention.rate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{retention.rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Purchase Behavior */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seasonal Trends</h3>
              <div className="space-y-3">
                {analytics.purchaseBehavior.seasonalTrends.map((trend) => (
                  <div key={trend.season} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{trend.season}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(trend.revenue)}</div>
                      <div className="text-xs text-gray-500">{trend.orders} orders</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Preferences</h3>
              <div className="space-y-3">
                {analytics.purchaseBehavior.categoryPreferences.map((category) => (
                  <div key={category.category} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{category.category}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-purple-600 h-1 rounded-full"
                          style={{ width: `${category.popularity}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(category.revenue)}</div>
                      <div className="text-xs text-gray-500">{category.popularity}% popular</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Segment Analysis */}
      {selectedView === 'segments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analytics.segmentAnalysis.map((segment) => (
              <div key={segment.segment} className="bg-white p-6 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{segment.segment}</h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSegmentColor(segment.segment)}`}>
                    {segment.customerCount} customers
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(segment.revenue)}</div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(segment.avgOrderValue)}</div>
                    <div className="text-sm text-gray-600">Avg Order Value</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{segment.retentionRate}%</div>
                    <div className="text-sm text-gray-600">Retention Rate</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${segment.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {segment.growthRate > 0 ? '+' : ''}{segment.growthRate}%
                    </div>
                    <div className="text-sm text-gray-600">Growth Rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Analysis */}
      {selectedView === 'risk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Churn Risk */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">High Churn Risk Customers</h3>
              <div className="space-y-3">
                {analytics.riskAnalysis.churnRisk.map((customer) => (
                  <div key={customer.customerId} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-600">{customer.email}</div>
                      <div className="text-xs text-gray-500">
                        {customer.lastOrderDays} days since last order • {formatCurrency(customer.totalSpent)} total
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getRiskColor(customer.riskScore)}`}>
                        {customer.riskScore}
                      </div>
                      <div className="text-xs text-gray-500">Risk Score</div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Create Retention Campaign
              </button>
            </div>

            {/* Reactivation Opportunities */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reactivation Opportunities</h3>
              <div className="space-y-3">
                {analytics.riskAnalysis.reactivationOpportunity.map((customer) => (
                  <div key={customer.customerId} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-600">{customer.email}</div>
                      <div className="text-xs text-gray-500">
                        {customer.lastOrderDays} days inactive • {customer.segment} segment
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(customer.avgOrderValue)}
                      </div>
                      <div className="text-xs text-gray-500">Avg Order</div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Create Win-Back Campaign
              </button>
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-4">Recommended Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">📧 Email Campaign</h4>
                <p className="text-sm text-gray-600">
                  Target {analytics.riskAnalysis.churnRisk.length} high-risk customers with personalized offers
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">🎯 Segment Focus</h4>
                <p className="text-sm text-gray-600">
                  Increase marketing spend on Brand-Conscious segment (highest growth rate)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}