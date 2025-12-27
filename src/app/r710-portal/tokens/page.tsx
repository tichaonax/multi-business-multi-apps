'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { isSystemAdmin } from '@/lib/permission-utils'
import { useAlert } from '@/components/ui/confirm-modal'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface WiFiToken {
  id: string
  username: string
  password: string
  status: 'AVAILABLE' | 'SOLD' | 'ACTIVE' | 'EXPIRED' | 'INVALIDATED'
  expiresAt: Date | null
  activatedAt: Date | null
  createdAt: Date
  tokenConfig: {
    id: string
    name: string
    durationValue: number
    durationUnit: string
    deviceLimit: number
    basePrice: number
  }
  wlan: {
    id: string
    ssid: string
    device_registry: {
      ipAddress: string
    }
  } | null
}

interface TokenStats {
  total: number
  available: number
  sold: number
  active: number
  expired: number
  invalidated: number
}

export default function R710TokensPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <R710TokensContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function R710TokensContent() {
  const { data: session } = useSession()
  const { currentBusiness } = useBusinessPermissionsContext()
  const user = session?.user as any
  const searchParams = useSearchParams()
  const alert = useAlert()

  const [tokens, setTokens] = useState<WiFiToken[]>([])
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [configFilter, setConfigFilter] = useState<string>(searchParams.get('configId') || 'all')
  const [searchQuery, setSearchQuery] = useState('')

  // Available configs for filter
  const [tokenConfigs, setTokenConfigs] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadTokens()
    loadFilterOptions()
  }, [currentBusiness?.businessId, statusFilter, configFilter])

  const loadTokens = async () => {
    try {
      setLoading(true)

      if (!currentBusiness?.businessId) {
        setTokens([])
        setStats(null)
        return
      }

      const params = new URLSearchParams()
      params.append('businessId', currentBusiness.businessId)

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (configFilter && configFilter !== 'all') {
        params.append('configId', configFilter)
      }

      const response = await fetch(`/api/r710/tokens?${params.toString()}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setTokens(data.tokens || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFilterOptions = async () => {
    try {
      if (!currentBusiness?.businessId) return

      // Load token configs
      const configsResponse = await fetch(
        `/api/r710/token-configs?businessId=${currentBusiness.businessId}`,
        { credentials: 'include' }
      )
      if (configsResponse.ok) {
        const configsData = await configsResponse.json()
        setTokenConfigs(configsData.configs || [])
      }
    } catch (error) {
      console.error('Failed to load filter options:', error)
    }
  }

  const handleSync = async () => {
    if (!currentBusiness?.businessId) return

    try {
      setSyncing(true)

      const response = await fetch(`/api/r710/tokens/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: currentBusiness.businessId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Sync failed' }))
        await alert({
          title: 'Sync Failed',
          description: errorData.error || 'Unknown error'
        })
        return
      }

      const data = await response.json()
      await alert({
        title: 'Sync Complete',
        description: `Checked ${data.stats?.tokensChecked || 0} tokens, updated ${data.stats?.tokensUpdated || 0} tokens.`
      })

      // Refresh token list
      await loadTokens()
    } catch (error) {
      console.error('Error syncing tokens:', error)
      await alert({
        title: 'Sync Error',
        description: 'Failed to sync with R710 device. The device may be unreachable.'
      })
    } finally {
      setSyncing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      AVAILABLE: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          ● Available
        </span>
      ),
      SOLD: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          ● Sold
        </span>
      ),
      ACTIVE: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          ● Active
        </span>
      ),
      EXPIRED: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
          ● Expired
        </span>
      ),
      INVALIDATED: (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          ● Invalidated
        </span>
      )
    }
    return badges[status as keyof typeof badges] || null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDateTime = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (value: number, unit: string) => {
    // unit format is like "hour_Hours", "day_Days", "week_Weeks"
    const unitDisplay = unit.split('_')[1] || unit
    return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
  }

  // Filter and sort tokens
  const filteredTokens = tokens
    .filter(token => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        token.username.toLowerCase().includes(query) ||
        token.password.toLowerCase().includes(query) ||
        token.tokenConfig.name.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      // Custom status priority: Available/Active first, then Sold, then Expired/Invalidated
      const statusPriority: Record<string, number> = {
        'AVAILABLE': 1,
        'ACTIVE': 2,
        'SOLD': 3,
        'EXPIRED': 4,
        'INVALIDATED': 5
      }

      const priorityA = statusPriority[a.status] || 999
      const priorityB = statusPriority[b.status] || 999

      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }

      // Within same status, sort by date (most recent first)
      if (a.status === 'SOLD' && b.status === 'SOLD') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

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
                WiFi Token Inventory
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage WiFi access tokens for {currentBusiness?.businessName || 'your business'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`w-5 h-5 mr-2 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? 'Syncing...' : 'Sync with R710'}
            </button>

            <Link
              href="/r710-portal/tokens/generate"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Generate Tokens
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Tokens</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.available}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Available</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sold}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Sold</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.active}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.expired}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Expired</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.invalidated}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Invalidated</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Username, password, package..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="INVALIDATED">Invalidated</option>
            </select>
          </div>

          {/* Package Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Package
            </label>
            <select
              value={configFilter}
              onChange={(e) => setConfigFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Packages</option>
              {tokenConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading tokens...</p>
        </div>
      )}

      {/* Tokens Table */}
      {!loading && filteredTokens.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Credentials
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    WLAN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Timing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTokens.map((token) => (
                  <tr key={token.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                            {token.username}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {token.password}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {token.tokenConfig.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDuration(token.tokenConfig.durationValue, token.tokenConfig.durationUnit)} • <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(token.tokenConfig.basePrice)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {token.wlan ? (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {token.wlan.ssid}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {token.wlan.device_registry.ipAddress}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Not assigned
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(token.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        {token.soldAt && (
                          <div>Sold: {formatDateTime(token.soldAt)}</div>
                        )}
                        {token.activatedAt && (
                          <div>Activated: {formatDateTime(token.activatedAt)}</div>
                        )}
                        {token.expiresAt && (
                          <div>Expires: {formatDateTime(token.expiresAt)}</div>
                        )}
                        {!token.soldAt && !token.activatedAt && (
                          <div>Created: {formatDateTime(token.createdAt)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {token.salePrice ? formatCurrency(token.salePrice) : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/r710-portal/tokens/${token.id}`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTokens.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery || statusFilter !== 'all' || configFilter !== 'all'
              ? 'No Tokens Found'
              : 'No Tokens Generated'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || statusFilter !== 'all' || configFilter !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'Generate WiFi access tokens to get started.'}
          </p>
          {!searchQuery && statusFilter === 'all' && configFilter === 'all' && (
            <Link
              href="/r710-portal/tokens/generate"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Generate Tokens
            </Link>
          )}
        </div>
      )}

      {/* Low Stock Warning */}
      {stats && stats.available < 5 && stats.available > 0 && (
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                Low Token Inventory
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                Only {stats.available} token{stats.available !== 1 ? 's' : ''} available. Auto-generation will create more tokens when inventory drops below 5.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
