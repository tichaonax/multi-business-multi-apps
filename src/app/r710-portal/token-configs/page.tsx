'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { isSystemAdmin } from '@/lib/permission-utils'
import Link from 'next/link'

interface TokenConfig {
  id: string
  name: string
  description: string | null
  durationValue: number
  durationUnit: string
  deviceLimit: number
  basePrice: number
  autoGenerateThreshold: number
  autoGenerateQuantity: number
  displayOrder: number
  isActive: boolean
  inventory?: {
    available: number
    sold: number
    active: number
    total: number
  }
}

export default function TokenConfigsPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <TokenConfigsContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function TokenConfigsContent() {
  const { data: session } = useSession()
  const { currentBusiness } = useBusinessPermissionsContext()
  const user = session?.user as any
  const [configs, setConfigs] = useState<TokenConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTokenConfigs()
  }, [currentBusiness?.businessId])

  const loadTokenConfigs = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (currentBusiness?.businessId) {
        params.append('businessId', currentBusiness.businessId)
      }

      const response = await fetch(`/api/r710/token-configs?${params.toString()}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs || [])
      }
    } catch (error) {
      console.error('Failed to load token configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (value: number, unit: string) => {
    // unit format is like "hour_Hours", "day_Days", "week_Weeks"
    const unitDisplay = unit.split('_')[1] || unit
    return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <Link href="/r710-portal" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Token Packages
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              WiFi access token configurations and pricing
            </p>
          </div>

          {isSystemAdmin(user) && (
            <Link
              href="/r710-portal/token-configs/create"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Package
            </Link>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading token packages...</p>
        </div>
      )}

      {/* Token Configs Grid */}
      {!loading && configs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <div
              key={config.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Package Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{config.name}</h3>
                    {config.description && (
                      <p className="text-blue-100 text-sm">{config.description}</p>
                    )}
                  </div>
                  {!config.isActive && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mt-4">
                  <div className="text-3xl font-bold">{formatCurrency(config.basePrice)}</div>
                  <div className="text-blue-100 text-sm">per access code</div>
                </div>
              </div>

              {/* Package Details */}
              <div className="p-6 space-y-4">
                {/* Duration */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">Duration</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDuration(config.durationValue, config.durationUnit)}
                  </span>
                </div>

                {/* Device Limit */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">Device Limit</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {config.deviceLimit} {config.deviceLimit === 1 ? 'device' : 'devices'}
                  </span>
                </div>

                {/* Inventory (if available) */}
                {config.inventory && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Inventory</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {config.inventory.total} total
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          {config.inventory.available}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Available</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-blue-600 dark:text-blue-400">
                          {config.inventory.active}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-600 dark:text-gray-400">
                          {config.inventory.sold}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Sold</div>
                      </div>
                    </div>

                    {/* Low Stock Warning */}
                    {config.inventory.available < 5 && (
                      <div className="mt-3 flex items-center text-xs text-yellow-700 dark:text-yellow-400">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Low stock - auto-generation enabled
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 space-y-2">
                  {currentBusiness?.businessId && (
                    <Link
                      href={`/r710-portal/tokens?configId=${config.id}`}
                      className="block w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      View Inventory
                    </Link>
                  )}
                  {isSystemAdmin(user) && (
                    <Link
                      href={`/r710-portal/token-configs/${config.id}`}
                      className="block w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Package
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && configs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Token Packages
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create token packages to offer WiFi access to customers.
          </p>
          {isSystemAdmin(user) && (
            <Link
              href="/r710-portal/token-configs/create"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Package
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
