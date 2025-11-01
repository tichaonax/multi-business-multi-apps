'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface CustomerSegment {
  id: string
  name: string
  type: 'price' | 'quality' | 'style' | 'conspicuous'
  description: string
  criteria: {
    minSpent?: number
    maxSpent?: number
    avgOrderValue?: number
    brandPreference?: string[]
    priceRange?: 'budget' | 'mid' | 'premium' | 'luxury'
    stylePreference?: string[]
  }
  customerCount: number
  totalRevenue: number
  avgOrderValue: number
  topBrands: string[]
  characteristics: string[]
  marketingStrategy: string[]
}

interface ClothingCustomerSegmentationProps {
  businessId: string
  onSegmentSelect: (segmentId: string) => void
  onViewSegment: (segmentType: string) => void
}

export function ClothingCustomerSegmentation({
  businessId,
  onSegmentSelect,
  onViewSegment
}: ClothingCustomerSegmentationProps) {
  const { formatCurrency } = useBusinessContext()
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null)

  useEffect(() => {
    fetchSegments()
  }, [businessId])

  const fetchSegments = async () => {
    try {
      setLoading(true)
      setError(null)

      // Sample clothing customer segmentation data
      const sampleSegments: CustomerSegment[] = [
        {
          id: 'price-conscious',
          name: 'Price-Conscious Shoppers',
          type: 'price',
          description: 'Customers who prioritize affordability and value for money',
          criteria: {
            maxSpent: 500,
            avgOrderValue: 35,
            priceRange: 'budget',
            brandPreference: ['H&M', 'Target', 'Walmart Fashion']
          },
          customerCount: 342,
          totalRevenue: 11098.00, // Real calculation would come from customer order data
          avgOrderValue: 32.45,
          topBrands: ['H&M', 'Target', 'Generic', 'Walmart Fashion'],
          characteristics: [
            'Shops during sales events',
            'Compares prices across stores',
            'Prefers basic, functional clothing',
            'Price is the primary decision factor'
          ],
          marketingStrategy: [
            'Emphasize discounts and promotions',
            'Highlight value propositions',
            'Focus on basic wardrobe essentials',
            'Use price comparison messaging'
          ]
        },
        {
          id: 'quality-focused',
          name: 'Quality-Focused Buyers',
          type: 'quality',
          description: 'Customers who prioritize durability, materials, and craftsmanship',
          criteria: {
            minSpent: 800,
            avgOrderValue: 85,
            priceRange: 'mid',
            brandPreference: ['Levi\'s', 'LL Bean', 'Patagonia']
          },
          customerCount: 298,
          totalRevenue: 89640.00,
          avgOrderValue: 87.25,
          topBrands: ['Levi\'s', 'LL Bean', 'Patagonia', 'Carhartt'],
          characteristics: [
            'Researches materials and construction',
            'Reads reviews before purchasing',
            'Prefers established, reliable brands',
            'Willing to pay more for durability'
          ],
          marketingStrategy: [
            'Highlight material quality and construction',
            'Share customer testimonials',
            'Emphasize warranty and durability',
            'Focus on long-term value'
          ]
        },
        {
          id: 'style-conscious',
          name: 'Style-Conscious Trendsetters',
          type: 'style',
          description: 'Customers who follow fashion trends and express personal style',
          criteria: {
            minSpent: 600,
            avgOrderValue: 75,
            priceRange: 'mid',
            stylePreference: ['trendy', 'fashionable', 'unique'],
            brandPreference: ['Zara', 'ASOS', 'Urban Outfitters']
          },
          customerCount: 367,
          totalRevenue: 102890.00,
          avgOrderValue: 76.80,
          topBrands: ['Zara', 'ASOS', 'Urban Outfitters', 'Forever 21'],
          characteristics: [
            'Follows fashion influencers',
            'Shops frequently for new styles',
            'Values unique and trendy pieces',
            'Active on social media'
          ],
          marketingStrategy: [
            'Showcase latest fashion trends',
            'Partner with fashion influencers',
            'Highlight unique and limited items',
            'Use social media marketing'
          ]
        },
        {
          id: 'conspicuous-consumers',
          name: 'Brand & Status Conscious',
          type: 'conspicuous',
          description: 'Customers who buy premium brands for status and social signaling',
          criteria: {
            minSpent: 2000,
            avgOrderValue: 250,
            priceRange: 'luxury',
            brandPreference: ['Gucci', 'Prada', 'Louis Vuitton', 'Armani']
          },
          customerCount: 240,
          totalRevenue: 156000.00,
          avgOrderValue: 245.50,
          topBrands: ['Gucci', 'Prada', 'Louis Vuitton', 'Armani'],
          characteristics: [
            'Values brand prestige and recognition',
            'Willing to pay premium prices',
            'Influenced by social status',
            'Prefers luxury shopping experience'
          ],
          marketingStrategy: [
            'Emphasize brand prestige and exclusivity',
            'Provide premium customer service',
            'Create VIP shopping experiences',
            'Focus on status and luxury positioning'
          ]
        }
      ]

      setSegments(sampleSegments)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch customer segments:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSegmentColor = (type: string) => {
    const colors = {
      price: 'bg-red-50 border-red-200 text-red-800',
      quality: 'bg-blue-50 border-blue-200 text-blue-800',
      style: 'bg-purple-50 border-purple-200 text-purple-800',
      conspicuous: 'bg-green-50 border-green-200 text-green-800'
    }
    return colors[type as keyof typeof colors] || colors.price
  }

  const getSegmentIcon = (type: string) => {
    const icons = {
      price: '💰',
      quality: '⭐',
      style: '👗',
      conspicuous: '💎'
    }
    return icons[type as keyof typeof icons] || '👥'
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load customer segments: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Segments Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={`p-6 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getSegmentColor(segment.type)}`}
            onClick={() => setSelectedSegment(selectedSegment?.id === segment.id ? null : segment)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getSegmentIcon(segment.type)}</span>
                <div>
                  <h3 className="font-semibold text-lg">{segment.name}</h3>
                  <p className="text-sm opacity-80">{segment.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{segment.customerCount}</div>
                <div className="text-sm opacity-80">customers</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm opacity-80">Revenue</div>
                <div className="font-semibold">{formatCurrency(segment.totalRevenue)}</div>
              </div>
              <div>
                <div className="text-sm opacity-80">Avg Order</div>
                <div className="font-semibold">{formatCurrency(segment.avgOrderValue)}</div>
              </div>
              <div>
                <div className="text-sm opacity-80">Share</div>
                <div className="font-semibold">
                  {((segment.customerCount / segments.reduce((sum, s) => sum + s.customerCount, 0)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {segment.topBrands.slice(0, 3).map((brand) => (
                <span key={brand} className="px-2 py-1 bg-white/70 rounded text-xs font-medium">
                  {brand}
                </span>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewSegment(segment.type)
                }}
                className="text-sm font-medium hover:underline"
              >
                View Customers →
              </button>
              <span className="text-sm opacity-80">
                {selectedSegment?.id === segment.id ? 'Click to collapse' : 'Click to expand'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed View */}
      {selectedSegment && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getSegmentIcon(selectedSegment.type)}</span>
              <h2 className="text-xl font-semibold">{selectedSegment.name} - Detailed Analysis</h2>
            </div>
            <button
              onClick={() => setSelectedSegment(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Characteristics */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Customer Characteristics</h3>
              <ul className="space-y-2">
                {selectedSegment.characteristics.map((characteristic, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-700">{characteristic}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Marketing Strategy */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Recommended Marketing Strategy</h3>
              <ul className="space-y-2">
                {selectedSegment.marketingStrategy.map((strategy, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">→</span>
                    <span className="text-gray-700">{strategy}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Criteria Details */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-3">Segmentation Criteria</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedSegment.criteria.minSpent && (
                <div>
                  <div className="text-sm text-gray-600">Min Spent</div>
                  <div className="font-medium">{formatCurrency(selectedSegment.criteria.minSpent)}</div>
                </div>
              )}
              {selectedSegment.criteria.maxSpent && (
                <div>
                  <div className="text-sm text-gray-600">Max Spent</div>
                  <div className="font-medium">{formatCurrency(selectedSegment.criteria.maxSpent)}</div>
                </div>
              )}
              {selectedSegment.criteria.priceRange && (
                <div>
                  <div className="text-sm text-gray-600">Price Range</div>
                  <div className="font-medium capitalize">{selectedSegment.criteria.priceRange}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-600">Avg Order Value</div>
                <div className="font-medium">{formatCurrency(selectedSegment.avgOrderValue)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📊 Segment Analysis</h3>
          <p className="text-sm text-blue-700 mb-3">
            Analyze customer behavior patterns and preferences for targeted marketing.
          </p>
          <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Run Analysis →
          </button>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">🎯 Create Campaign</h3>
          <p className="text-sm text-green-700 mb-3">
            Launch targeted marketing campaigns for specific customer segments.
          </p>
          <button className="text-sm font-medium text-green-600 hover:text-green-700">
            Create Campaign →
          </button>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-2">🔄 Auto-Segment</h3>
          <p className="text-sm text-purple-700 mb-3">
            Automatically segment new customers based on their behavior patterns.
          </p>
          <button className="text-sm font-medium text-purple-600 hover:text-purple-700">
            Configure Rules →
          </button>
        </div>
      </div>
    </div>
  )
}