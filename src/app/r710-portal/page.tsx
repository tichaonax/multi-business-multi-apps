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

interface R710Stats {
  totalDevices: number
  connectedDevices: number
  totalBusinesses: number
  totalWlans: number
  tokenInventory: {
    total: number
    available: number
    sold: number
    active: number
    expired: number
  }
  recentSales: {
    totalSales: number
    totalRevenue: number
    last24Hours: {
      sales: number
      revenue: number
    }
  }
  recentFailures: {
    total: number
    critical: number
    warnings: number
  }
}

export default function R710PortalPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <R710PortalContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function R710PortalContent() {
  const { data: session } = useSession()
  const { currentBusiness, currentBusinessId } = useBusinessPermissionsContext()
  const user = session?.user as any
  const [stats, setStats] = useState<R710Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasIntegration, setHasIntegration] = useState(false)
  const [deviceOnline, setDeviceOnline] = useState(false)
  const [checkingIntegration, setCheckingIntegration] = useState(true)

  // Helper: Check if device is truly online (not stale)
  const isDeviceTrulyOnline = (integration: any): boolean => {
    if (!integration || !integration.device) return false
    if (integration.device.connectionStatus !== 'CONNECTED') return false
    if (!integration.device.lastHealthCheck) return false

    // Consider stale if health check older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    const lastCheck = new Date(integration.device.lastHealthCheck).getTime()
    return lastCheck >= oneHourAgo
  }

  // Check if current business has R710 integration
  useEffect(() => {
    const checkIntegration = async () => {
      if (!currentBusinessId) {
        setCheckingIntegration(false)
        return
      }

      try {
        const response = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`)
        if (response.ok) {
          const data = await response.json()
          setHasIntegration(data.hasIntegration || false)
          setDeviceOnline(isDeviceTrulyOnline(data.integration))
        }
      } catch (error) {
        console.error('Failed to check R710 integration:', error)
      } finally {
        setCheckingIntegration(false)
      }
    }

    checkIntegration()
  }, [currentBusinessId])

  useEffect(() => {
    loadStats()
  }, [currentBusiness?.businessId])

  const loadStats = async () => {
    try {
      setLoading(true)

      // Load overall statistics
      // This would be a new API endpoint: /api/r710/stats
      const response = await fetch('/api/r710/stats', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to load R710 stats:', error)
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              R710 WiFi Portal
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ruckus R710 Wireless Access Point Management
            </p>
          </div>

          {isSystemAdmin(user) && (
            <Link
              href="/r710-portal/devices"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Register Device
            </Link>
          )}
        </div>
      </div>

      {/* Integration Status Alert */}
      {!checkingIntegration && currentBusinessId && !hasIntegration && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Integration Setup Required
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                The current business is not integrated with R710. Please complete the integration setup to access token management and sales features.
              </p>
              <Link
                href="/r710-portal/setup"
                className="inline-flex items-center mt-3 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <span className="mr-2">⚙️</span>
                Start Integration Setup
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/r710-portal/setup"
              className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-sm font-medium text-gray-900 dark:text-white transition-colors"
            >
              <span className="mr-2">⚙️</span>
              Integration Setup
            </Link>

            {isSystemAdmin(user) && (
              <Link
                href="/r710-portal/devices"
                className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-sm font-medium text-gray-900 dark:text-white transition-colors"
              >
                <span className="mr-2">🖥️</span>
                Device Registry
              </Link>
            )}

            <Link
              href="/r710-portal/wlans"
              className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-md text-sm font-medium text-green-900 dark:text-green-100 transition-colors"
            >
              <span className="mr-2">📡</span>
              WLAN Networks
            </Link>

            {(isSystemAdmin(user) || hasIntegration) && (
              <Link
                href="/admin/connected-clients"
                className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-md text-sm font-medium text-blue-900 dark:text-blue-100 transition-colors"
              >
                <span className="mr-2">📡</span>
                Connected Clients
              </Link>
            )}

            <button
              disabled={(!hasIntegration || !deviceOnline) && !!currentBusinessId}
              onClick={() => (!hasIntegration || !deviceOnline) && currentBusinessId ? null : window.location.href = '/r710-portal/token-configs'}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                (!hasIntegration || !deviceOnline) && currentBusinessId
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white cursor-pointer'
              }`}
              title={!deviceOnline && hasIntegration ? 'Device offline or credentials invalid - click "Test" on device' : ''}
            >
              <span className="mr-2">🎫</span>
              Token Packages
            </button>

            <button
              disabled={(!hasIntegration || !deviceOnline) && !!currentBusinessId}
              onClick={() => (!hasIntegration || !deviceOnline) && currentBusinessId ? null : window.location.href = '/r710-portal/tokens'}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                (!hasIntegration || !deviceOnline) && currentBusinessId
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white cursor-pointer'
              }`}
              title={!deviceOnline && hasIntegration ? 'Device offline or credentials invalid - click "Test" on device' : ''}
            >
              <span className="mr-2">📦</span>
              Token Inventory
            </button>

            <button
              disabled={(!hasIntegration || !deviceOnline) && !!currentBusinessId}
              onClick={() => (!hasIntegration || !deviceOnline) && currentBusinessId ? null : window.location.href = '/r710-portal/sales'}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                (!hasIntegration || !deviceOnline) && currentBusinessId
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white cursor-pointer'
              }`}
              title={!deviceOnline && hasIntegration ? 'Device offline or credentials invalid - click "Test" on device' : ''}
            >
              <span className="mr-2">💵</span>
              Sales History
            </button>

            <button
              disabled={(!hasIntegration || !deviceOnline) && !!currentBusinessId}
              onClick={() => (!hasIntegration || !deviceOnline) && currentBusinessId ? null : window.location.href = '/r710-portal/acl'}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                (!hasIntegration || !deviceOnline) && currentBusinessId
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white cursor-pointer'
              }`}
              title={!deviceOnline && hasIntegration ? 'Device offline or credentials invalid - click "Test" on device' : ''}
            >
              <span className="mr-2">🛡️</span>
              MAC Access Control
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading R710 Portal...</p>
        </div>
      )}

      {/* Stats Overview */}
      {!loading && stats && (
        <>
          {/* Quick Stats Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 ${(!hasIntegration || !deviceOnline) && currentBusinessId ? 'opacity-50' : ''}`}>
            {/* Devices */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">R710 Devices</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.connectedDevices}/{stats.totalDevices}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Connected</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* WLANs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active WLANs</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.totalWlans}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {stats.totalBusinesses} {stats.totalBusinesses === 1 ? 'business' : 'businesses'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Token Inventory */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Token Inventory</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.tokenInventory.available}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Available / {stats.tokenInventory.total} Total
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {formatCurrency(stats.recentSales.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {stats.recentSales.totalSales} sales
                  </p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/r710-portal/setup"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Integration Setup</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Connect your business</p>
                </div>
              </Link>

              {isSystemAdmin(user) && (
                <Link
                  href="/r710-portal/devices"
                  className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Manage Devices</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">R710 device registry</p>
                  </div>
                </Link>
              )}

              {(isSystemAdmin(user) || hasIntegration) && (
                <Link
                  href="/admin/connected-clients"
                  className="flex items-center p-4 border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Connected Clients</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">View active WiFi connections</p>
                  </div>
                </Link>
              )}

              <div
                className={`flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors ${
                  !hasIntegration && currentBusinessId
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                }`}
                onClick={() => !hasIntegration && currentBusinessId ? null : window.location.href = '/r710-portal/token-configs'}
              >
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Token Packages</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configure pricing & duration</p>
                </div>
              </div>

              <div
                className={`flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors ${
                  !hasIntegration && currentBusinessId
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                }`}
                onClick={() => !hasIntegration && currentBusinessId ? null : window.location.href = '/r710-portal/sales'}
              >
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Sales History</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Revenue & analytics</p>
                </div>
              </div>

              <div
                className={`flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors ${
                  !hasIntegration && currentBusinessId
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                }`}
                onClick={() => !hasIntegration && currentBusinessId ? null : window.location.href = '/r710-portal/acl'}
              >
                <svg className="w-8 h-8 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">MAC Access Control</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manage device whitelist/blacklist</p>
                </div>
              </div>
            </div>
          </div>

          {/* Failures Alert (if any) */}
          {stats.recentFailures.total > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
                    Sync Issues Detected
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {stats.recentFailures.critical > 0 && (
                      <span className="font-medium">{stats.recentFailures.critical} critical errors </span>
                    )}
                    {stats.recentFailures.warnings > 0 && (
                      <span>{stats.recentFailures.warnings} warnings </span>
                    )}
                    in the last 24 hours. Check device connectivity and review logs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !stats && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No R710 Devices Registered
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Get started by registering your first Ruckus R710 device.
          </p>
          {isSystemAdmin(user) && (
            <Link
              href="/r710-portal/devices"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Register Device
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
