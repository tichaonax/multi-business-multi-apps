'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface SeasonalCollection {
  id: string
  name: string
  season: 'Spring' | 'Summer' | 'Fall' | 'Winter'
  year: number
  description?: string
  startDate: string
  endDate: string
  productCount: number
  totalValue: number
  status: 'ACTIVE' | 'ARCHIVED' | 'UPCOMING'
}

interface ClothingSeasonalManagerProps {
  businessId: string
}

export function ClothingSeasonalManager({ businessId }: ClothingSeasonalManagerProps) {
  const { formatCurrency, formatDate } = useBusinessContext()
  const [collections, setCollections] = useState<SeasonalCollection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sample seasonal collections
    const sampleCollections: SeasonalCollection[] = [
      {
        id: 'col1',
        name: 'Spring 2024 Collection',
        season: 'Spring',
        year: 2024,
        description: 'Fresh spring styles with vibrant colors',
        startDate: '2024-03-01',
        endDate: '2024-05-31',
        productCount: 45,
        totalValue: 12500.00,
        status: 'ACTIVE'
      },
      {
        id: 'col2',
        name: 'Summer 2024 Collection',
        season: 'Summer',
        year: 2024,
        description: 'Light and airy summer essentials',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        productCount: 38,
        totalValue: 15600.00,
        status: 'UPCOMING'
      }
    ]

    setCollections(sampleCollections)
    setLoading(false)
  }, [businessId])

  const getSeasonColor = (season: string) => {
    const colors = {
      Spring: 'bg-green-100 text-green-800',
      Summer: 'bg-yellow-100 text-yellow-800',
      Fall: 'bg-orange-100 text-orange-800',
      Winter: 'bg-blue-100 text-blue-800'
    }
    return colors[season as keyof typeof colors] || colors.Spring
  }

  const getStatusColor = (status: string) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      UPCOMING: 'bg-blue-100 text-blue-800',
      ARCHIVED: 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || colors.ACTIVE
  }

  if (loading) {
    return <div className="animate-pulse">Loading seasonal collections...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Seasonal Collections</h2>
          <p className="text-sm text-gray-600 mt-1">Organize products by seasons and collections</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
          Create Collection
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {collections.map((collection) => (
          <div key={collection.id} className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{collection.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{collection.description}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeasonColor(collection.season)}`}>
                  {collection.season}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(collection.status)}`}>
                  {collection.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">{collection.productCount}</div>
                <div className="text-sm text-gray-600">Products</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(collection.totalValue)}</div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              <div>Start: {formatDate(new Date(collection.startDate))}</div>
              <div>End: {formatDate(new Date(collection.endDate))}</div>
            </div>

            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                Manage Products
              </button>
              <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}