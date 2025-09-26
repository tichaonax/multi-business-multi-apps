'use client'

import { useState, useEffect } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider, useBusinessContext } from '@/components/universal'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

interface ProduceItem {
  id: string
  name: string
  pluCode: string
  category: 'fruit' | 'vegetable' | 'herb' | 'organic'
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'year-round'
  qualityGrade: 'Premium' | 'Grade A' | 'Grade B' | 'Discount'
  currentStock: number
  unit: 'lb' | 'each' | 'bunch' | 'bag'
  pricePerUnit: number
  supplier: string
  origin: string
  harvestDate: string
  shelfLife: number
  daysRemaining: number
  qualityScore: number
  storageConditions: {
    temperature: string
    humidity: string
    ethyleneProducer: boolean
    ethyleneSensitive: boolean
  }
  organicCertified: boolean
  localGrown: boolean
  seasonalAvailability: string[]
  wastePercentage: number
  turnoverRate: number
}

export default function GroceryProducePage() {
  const { formatCurrency } = useBusinessContext()
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'seasonal' | 'waste'>('overview')

  const sampleProduce: ProduceItem[] = [
    {
      id: 'p1',
      name: 'Organic Bananas',
      pluCode: '94011',
      category: 'organic',
      season: 'year-round',
      qualityGrade: 'Premium',
      currentStock: 45.5,
      unit: 'lb',
      pricePerUnit: 1.29,
      supplier: 'Organic Farms Co.',
      origin: 'Ecuador',
      harvestDate: '2024-09-10',
      shelfLife: 7,
      daysRemaining: 4,
      qualityScore: 9.2,
      storageConditions: {
        temperature: '58-65°F',
        humidity: '85-95%',
        ethyleneProducer: true,
        ethyleneSensitive: false
      },
      organicCertified: true,
      localGrown: false,
      seasonalAvailability: ['spring', 'summer', 'fall', 'winter'],
      wastePercentage: 8.5,
      turnoverRate: 12.3
    },
    {
      id: 'p2',
      name: 'Local Tomatoes',
      pluCode: '4664',
      category: 'vegetable',
      season: 'summer',
      qualityGrade: 'Grade A',
      currentStock: 32.8,
      unit: 'lb',
      pricePerUnit: 2.99,
      supplier: 'Sunset Valley Farm',
      origin: 'Local - 25 miles',
      harvestDate: '2024-09-12',
      shelfLife: 5,
      daysRemaining: 3,
      qualityScore: 8.8,
      storageConditions: {
        temperature: '55-60°F',
        humidity: '85-90%',
        ethyleneProducer: true,
        ethyleneSensitive: true
      },
      organicCertified: false,
      localGrown: true,
      seasonalAvailability: ['summer', 'fall'],
      wastePercentage: 12.1,
      turnoverRate: 15.7
    },
    {
      id: 'p3',
      name: 'Premium Avocados',
      pluCode: '4225',
      category: 'fruit',
      season: 'year-round',
      qualityGrade: 'Premium',
      currentStock: 156,
      unit: 'each',
      pricePerUnit: 1.99,
      supplier: 'California Avocado Co.',
      origin: 'California',
      harvestDate: '2024-09-08',
      shelfLife: 8,
      daysRemaining: 6,
      qualityScore: 9.5,
      storageConditions: {
        temperature: '45-55°F',
        humidity: '85-90%',
        ethyleneProducer: true,
        ethyleneSensitive: true
      },
      organicCertified: false,
      localGrown: false,
      seasonalAvailability: ['spring', 'summer', 'fall', 'winter'],
      wastePercentage: 6.3,
      turnoverRate: 18.9
    },
    {
      id: 'p4',
      name: 'Fresh Basil',
      pluCode: '4951',
      category: 'herb',
      season: 'summer',
      qualityGrade: 'Premium',
      currentStock: 24,
      unit: 'bunch',
      pricePerUnit: 2.49,
      supplier: 'Greenhouse Herbs Inc.',
      origin: 'Local Greenhouse',
      harvestDate: '2024-09-13',
      shelfLife: 3,
      daysRemaining: 2,
      qualityScore: 9.7,
      storageConditions: {
        temperature: '32-35°F',
        humidity: '95-98%',
        ethyleneProducer: false,
        ethyleneSensitive: true
      },
      organicCertified: true,
      localGrown: true,
      seasonalAvailability: ['spring', 'summer', 'fall'],
      wastePercentage: 18.2,
      turnoverRate: 28.5
    },
    {
      id: 'p5',
      name: 'Organic Spinach',
      pluCode: '94090',
      category: 'organic',
      season: 'spring',
      qualityGrade: 'Grade A',
      currentStock: 48,
      unit: 'bag',
      pricePerUnit: 3.99,
      supplier: 'Green Leaf Organics',
      origin: 'California',
      harvestDate: '2024-09-11',
      shelfLife: 4,
      daysRemaining: 2,
      qualityScore: 8.4,
      storageConditions: {
        temperature: '32-35°F',
        humidity: '95-98%',
        ethyleneProducer: false,
        ethyleneSensitive: true
      },
      organicCertified: true,
      localGrown: false,
      seasonalAvailability: ['spring', 'fall', 'winter'],
      wastePercentage: 15.7,
      turnoverRate: 22.1
    }
  ]

  const getQualityColor = (score: number) => {
    if (score >= 9) return 'text-green-600 bg-green-100'
    if (score >= 7.5) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getSeasonalPrice = (basePrice: number, season: string, currentSeason: string) => {
    if (season === currentSeason || season === 'year-round') return basePrice
    return basePrice * 1.25 // 25% markup for out-of-season
  }

  const tabs = [
    { id: 'overview', label: 'Produce Overview', icon: '🥬' },
    { id: 'quality', label: 'Quality Control', icon: '⭐' },
    { id: 'seasonal', label: 'Seasonal Management', icon: '🗓️' },
    { id: 'waste', label: 'Waste Tracking', icon: '🗑️' }
  ]

  return (
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="grocery">
        <ContentLayout
          title="Fresh Produce Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Grocery', href: '/grocery' },
            { label: 'Fresh Produce', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Produce</p>
                    <p className="text-2xl font-bold text-green-600">{sampleProduce.length}</p>
                  </div>
                  <div className="text-2xl">🥬</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Quality</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(sampleProduce.reduce((sum, item) => sum + item.qualityScore, 0) / sampleProduce.length).toFixed(1)}
                    </p>
                  </div>
                  <div className="text-2xl">⭐</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Local Items</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {sampleProduce.filter(item => item.localGrown).length}
                    </p>
                  </div>
                  <div className="text-2xl">🏠</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Organic Items</p>
                    <p className="text-2xl font-bold text-green-600">
                      {sampleProduce.filter(item => item.organicCertified).length}
                    </p>
                  </div>
                  <div className="text-2xl">🌱</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Turnover</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {(sampleProduce.reduce((sum, item) => sum + item.turnoverRate, 0) / sampleProduce.length).toFixed(1)}x
                    </p>
                  </div>
                  <div className="text-2xl">🔄</div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="card">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Fresh Produce Inventory</h3>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Add New Produce
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3">Item Details</th>
                            <th className="text-left p-3">PLU/Stock</th>
                            <th className="text-left p-3">Pricing</th>
                            <th className="text-left p-3">Origin</th>
                            <th className="text-left p-3">Quality</th>
                            <th className="text-left p-3">Storage</th>
                            <th className="text-left p-3">Freshness</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleProduce.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="flex gap-1 mt-1">
                                    {item.organicCertified && (
                                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                        Organic
                                      </span>
                                    )}
                                    {item.localGrown && (
                                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                        Local
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="font-mono text-green-600">{item.pluCode}</div>
                                <div className="font-medium">{item.currentStock} {item.unit}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-medium">{formatCurrency(item.pricePerUnit)}/{item.unit}</div>
                                <div className="text-xs text-gray-500">Turnover: {item.turnoverRate}x/month</div>
                              </td>
                              <td className="p-3">
                                <div className="font-medium">{item.origin}</div>
                                <div className="text-xs text-gray-500">{item.supplier}</div>
                              </td>
                              <td className="p-3">
                                <div className={`inline-block px-2 py-1 rounded text-xs ${getQualityColor(item.qualityScore)}`}>
                                  {item.qualityScore}/10
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{item.qualityGrade}</div>
                              </td>
                              <td className="p-3">
                                <div className="text-xs">
                                  <div>{item.storageConditions.temperature}</div>
                                  <div>{item.storageConditions.humidity}</div>
                                  <div className="mt-1">
                                    {item.storageConditions.ethyleneProducer && (
                                      <span className="inline-block bg-orange-100 text-orange-800 text-xs px-1 py-1 rounded mr-1">
                                        C2H4+
                                      </span>
                                    )}
                                    {item.storageConditions.ethyleneSensitive && (
                                      <span className="inline-block bg-red-100 text-red-800 text-xs px-1 py-1 rounded">
                                        C2H4-
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className={`text-sm font-medium ${
                                  item.daysRemaining <= 2 ? 'text-red-600' :
                                  item.daysRemaining <= 4 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {item.daysRemaining} days left
                                </div>
                                <div className="text-xs text-gray-500">
                                  Harvested: {item.harvestDate}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'quality' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Quality Control Dashboard</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-3">✅ Premium Quality (9.0+)</h4>
                        <div className="space-y-2">
                          {sampleProduce.filter(item => item.qualityScore >= 9).map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.name}</span>
                              <span className="font-semibold text-green-700">{item.qualityScore}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-3">⚠️ Good Quality (7.5-9.0)</h4>
                        <div className="space-y-2">
                          {sampleProduce.filter(item => item.qualityScore >= 7.5 && item.qualityScore < 9).map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.name}</span>
                              <span className="font-semibold text-yellow-700">{item.qualityScore}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                        <h4 className="font-semibold text-red-800 mb-3">🚫 Needs Attention (less than 7.5)</h4>
                        <div className="space-y-2">
                          {sampleProduce.filter(item => item.qualityScore < 7.5).map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.name}</span>
                              <span className="font-semibold text-red-700">{item.qualityScore}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3">🔬 Quality Control Tools</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button className="p-2 card border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                          Daily Inspection
                        </button>
                        <button className="p-2 card border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                          Supplier Scorecard
                        </button>
                        <button className="p-2 card border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                          Customer Feedback
                        </button>
                        <button className="p-2 card border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                          Lab Testing
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'seasonal' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Seasonal Management & Pricing</h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {['spring', 'summer', 'fall', 'winter'].map((season) => (
                        <div key={season} className="card border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 capitalize">
                            {season === 'spring' && '🌱'}
                            {season === 'summer' && '☀️'}
                            {season === 'fall' && '🍂'}
                            {season === 'winter' && '❄️'}
                            {season}
                          </h4>
                          <div className="space-y-2">
                            {sampleProduce.filter(item =>
                              item.seasonalAvailability.includes(season) || item.season === season
                            ).map((item) => (
                              <div key={item.id} className="text-sm">
                                <div className="flex justify-between">
                                  <span>{item.name}</span>
                                  <span className={item.season === season ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                                    {item.season === season ? 'Peak' : 'Available'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(getSeasonalPrice(item.pricePerUnit, item.season, season))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-amber-900 mb-3">📅 Seasonal Pricing Strategy</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-amber-800 mb-2">Peak Season</h5>
                          <ul className="text-amber-700 space-y-1">
                            <li>• Standard pricing</li>
                            <li>• Maximum availability</li>
                            <li>• Premium quality</li>
                            <li>• Local sourcing preferred</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-amber-800 mb-2">Off Season</h5>
                          <ul className="text-amber-700 space-y-1">
                            <li>• 25% price increase</li>
                            <li>• Limited availability</li>
                            <li>• Imported alternatives</li>
                            <li>• Extended storage methods</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-amber-800 mb-2">Year-Round</h5>
                          <ul className="text-amber-700 space-y-1">
                            <li>• Consistent pricing</li>
                            <li>• Reliable supply chain</li>
                            <li>• Mixed sourcing</li>
                            <li>• Customer staples</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'waste' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Produce Waste Management</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="card border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">📊 Waste by Category</h4>
                        <div className="space-y-3">
                          {sampleProduce.map((item) => (
                            <div key={item.id}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">{item.name}</span>
                                <span className={`text-sm font-semibold ${
                                  item.wastePercentage > 15 ? 'text-red-600' :
                                  item.wastePercentage > 10 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {item.wastePercentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    item.wastePercentage > 15 ? 'bg-red-500' :
                                    item.wastePercentage > 10 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(item.wastePercentage * 5, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="card border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">🎯 Waste Reduction Actions</h4>
                        <div className="space-y-3">
                          <div className="bg-red-50 border border-red-200 p-3 rounded">
                            <h5 className="font-medium text-red-800">High Waste Items (&gt;15%)</h5>
                            <ul className="text-sm text-red-700 mt-2 space-y-1">
                              {sampleProduce.filter(item => item.wastePercentage > 15).map((item) => (
                                <li key={item.id}>• {item.name} - Review ordering frequency</li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                            <h5 className="font-medium text-blue-800">💡 Reduction Strategies</h5>
                            <ul className="text-sm text-blue-700 mt-2 space-y-1">
                              <li>• Implement dynamic pricing for aging produce</li>
                              <li>• Partner with local food banks for donations</li>
                              <li>• Create value-added products (smoothies, salads)</li>
                              <li>• Improve storage and handling procedures</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3">♻️ Sustainability Initiatives</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 card rounded border">
                          <div className="text-2xl mb-2">🏢</div>
                          <div className="font-medium text-green-800">Food Bank Donations</div>
                          <div className="text-2xl font-bold text-green-600">847 lbs</div>
                          <div className="text-sm text-green-600">this month</div>
                        </div>
                        <div className="text-center p-3 card rounded border">
                          <div className="text-2xl mb-2">🌱</div>
                          <div className="font-medium text-green-800">Composting</div>
                          <div className="text-2xl font-bold text-green-600">1,234 lbs</div>
                          <div className="text-sm text-green-600">this month</div>
                        </div>
                        <div className="text-center p-3 card rounded border">
                          <div className="text-2xl mb-2">💚</div>
                          <div className="font-medium text-green-800">Waste Reduction</div>
                          <div className="text-2xl font-bold text-green-600">23%</div>
                          <div className="text-sm text-green-600">vs last year</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}