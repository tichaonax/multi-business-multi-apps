'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatUptime, getHealthStatusColor, getHealthStatusIcon, type PortalHealthStatus } from '@/lib/wifi-portal/health-check'

export default function WiFiPortalLandingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusiness, loading: businessLoading, currentBusinessId } = useBusinessPermissionsContext()

  const currentUser = session?.user

  // Health monitoring state
  const [healthStatus, setHealthStatus] = useState<PortalHealthStatus | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Database statistics state
  const [dbStats, setDbStats] = useState<any>(null)
  const [dbStatsLoading, setDbStatsLoading] = useState(false)

  // Check if user can access WiFi Portal
  const canSetup = currentUser ? (isSystemAdmin(currentUser) || hasPermission(currentUser, 'canSetupPortalIntegration')) : false
  const canConfigureTokens = currentUser ? (isSystemAdmin(currentUser) || hasPermission(currentUser, 'canConfigureWifiTokens')) : false
  const canSellTokens = currentUser ? (isSystemAdmin(currentUser) || hasPermission(currentUser, 'canSellWifiTokens')) : false
  const canViewReports = currentUser ? (isSystemAdmin(currentUser) || hasPermission(currentUser, 'canViewWifiReports')) : false

  // Fetch database statistics
  const fetchDbStats = async () => {
    if (!currentBusinessId) return

    setDbStatsLoading(true)
    try {
      const response = await fetch(`/api/wifi-portal/stats?businessId=${currentBusinessId}`)
      const data = await response.json()

      if (data.success && data.stats) {
        // Include business info for display
        setDbStats({
          ...data.stats.summary,
          businessName: data.stats.business?.name || currentBusiness?.name || ''
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch database stats:', error)
    } finally {
      setDbStatsLoading(false)
    }
  }

  // Health check function
  const checkHealth = async () => {
    if (!currentBusinessId) return

    setHealthLoading(true)
    try {
      const response = await fetch(`/api/wifi-portal/integration/health?businessId=${currentBusinessId}`)
      const data = await response.json()

      setHealthStatus({
        success: data.success || false,
        status: data.health?.status || 'unknown',
        uptime_seconds: data.health?.uptime_seconds,
        time_synced: data.health?.time_synced,
        last_time_sync: data.health?.last_time_sync,
        current_time: data.health?.current_time,
        active_tokens: data.health?.active_tokens,
        max_tokens: data.health?.max_tokens,
        free_heap_bytes: data.health?.free_heap_bytes,
        error: data.error,
      })
    } catch (error: any) {
      setHealthStatus({
        success: false,
        status: 'unknown',
        error: 'Failed to check portal health',
      })
    } finally {
      setHealthLoading(false)
    }
  }

  // Set up health monitoring (poll every 20 seconds when page has focus)
  useEffect(() => {
    if (!currentBusinessId) return

    // Initial health check and stats fetch
    checkHealth()
    fetchDbStats()

    // Set up polling interval (health check every 20s, stats every 30s)
    const startPolling = () => {
      healthCheckIntervalRef.current = setInterval(() => {
        checkHealth()
        fetchDbStats()
      }, 20000) // 20 seconds
    }

    const stopPolling = () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
        healthCheckIntervalRef.current = null
      }
    }

    // Handle page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        checkHealth() // Check immediately when page regains focus
        fetchDbStats()
        startPolling()
      }
    }

    // Start polling if page is visible
    if (!document.hidden) {
      startPolling()
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentBusinessId])

  // Check if portal integration exists AND device is truly online (healthy)
  // Device must be healthy (not just "not unknown") to be considered accessible
  const hasPortalIntegration = healthStatus && healthStatus.success && healthStatus.status === 'healthy'

  useEffect(() => {
    // If we have health status and no integration exists, redirect to setup
    if (healthStatus && !hasPortalIntegration && canSetup && !businessLoading && (currentBusiness?.businessType === 'restaurant' || currentBusiness?.businessType === 'grocery')) {
      router.push('/wifi-portal/setup')
    }
  }, [healthStatus, hasPortalIntegration, canSetup, router, businessLoading, currentBusiness?.businessType])

  if (businessLoading) {
    return (
      <ContentLayout title="WiFi Portal">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
    return (
      <ContentLayout title="WiFi Portal">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">⚠️ Not Available</h3>
          <p className="text-yellow-800 dark:text-yellow-300">
            WiFi portal integration is only available for restaurant and grocery businesses.
          </p>
        </div>
      </ContentLayout>
    )
  }

  const menuItems = [
    {
      title: 'Portal Setup',
      description: 'Configure ESP32 portal integration and connection settings',
      icon: '⚙️',
      href: '/wifi-portal/setup',
      color: 'blue',
      show: canSetup,
      alwaysShowWhenNoIntegration: true,
    },
    {
      title: 'Device Registry',
      description: 'Manage ESP32 WiFi portal devices',
      icon: '🖥️',
      href: '/wifi-portal/devices',
      color: 'blue',
      show: isSystemAdmin(currentUser),
      alwaysShowWhenNoIntegration: false,
    },
    {
      title: 'Connected Clients',
      description: 'View devices currently connected to WiFi networks',
      icon: '📡',
      href: '/admin/connected-clients',
      color: 'blue',
      show: isSystemAdmin(currentUser) || hasPermission(currentUser, 'canManageWifiPortal'),
      alwaysShowWhenNoIntegration: false,
    },
    {
      title: 'Token Configurations',
      description: 'Create and manage global WiFi token packages',
      icon: '🎫',
      href: '/wifi-portal/token-configs',
      color: 'purple',
      show: canConfigureTokens,
      alwaysShowWhenNoIntegration: false,
    },
    {
      title: 'Direct Sales',
      description: 'Sell WiFi tokens directly to customers',
      icon: '💰',
      href: '/wifi-portal/sales',
      color: 'green',
      show: canSellTokens,
      alwaysShowWhenNoIntegration: false,
    },
    {
      title: 'Token Ledger',
      description: 'View all generated tokens and their status',
      icon: '📋',
      href: '/wifi-portal/tokens',
      color: 'orange',
      show: canSellTokens,
      alwaysShowWhenNoIntegration: false,
    },
    {
      title: 'Reports & Analytics',
      description: 'View sales reports and usage statistics',
      icon: '📊',
      href: '/wifi-portal/reports',
      color: 'indigo',
      show: canViewReports,
      alwaysShowWhenNoIntegration: false,
    },
  ]

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-900 dark:text-blue-100',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-900 dark:text-purple-100',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-900 dark:text-green-100',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-900 dark:text-orange-100',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100',
  }

  const visibleItems = menuItems.filter(item => {
    // If no portal integration exists, only show items marked for that case
    if (!hasPortalIntegration) {
      return item.alwaysShowWhenNoIntegration && item.show
    }
    // Otherwise, show items based on permissions
    return item.show
  })

  return (
    <ContentLayout
      title="WiFi Portal Management"
      description="Manage your WiFi access token system and ESP32 portal integration"
    >
      <div className="max-w-4xl">
        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📡 WiFi Portal System</h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Sell WiFi access tokens to your customers through your POS system. Tokens are generated and managed through your ESP32 portal server.
          </p>
        </div>

        {/* Portal Health Status */}
        {healthStatus && (
          <div className={`mb-6 border-2 rounded-lg p-4 ${
            healthStatus.status === 'healthy'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : healthStatus.status === 'unhealthy'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-medium ${
                healthStatus.status === 'healthy'
                  ? 'text-green-900 dark:text-green-100'
                  : healthStatus.status === 'unhealthy'
                  ? 'text-red-900 dark:text-red-100'
                  : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                {getHealthStatusIcon(healthStatus.status)} WiFi Portal Status & Statistics
              </h3>
              {healthLoading && (
                <div className="text-xs text-gray-500 dark:text-gray-400">Checking...</div>
              )}
            </div>

            {healthStatus.success && healthStatus.status === 'healthy' ? (
              <>
                {/* ESP32 Device Health */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">
                    🖥️ ESP32 Device Health
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Device Uptime</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {healthStatus.uptime_seconds ? formatUptime(healthStatus.uptime_seconds) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Business Active</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {dbStats ? `${dbStats.activeTokens || 0} / ${healthStatus.max_tokens || 100}` : 'Loading...'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Time Synced</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {healthStatus.time_synced ? '✓ Yes' : '✗ No'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Free Memory</div>
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        {healthStatus.free_heap_bytes ? `${Math.round(healthStatus.free_heap_bytes / 1024)} KB` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Statistics - Current Business Only */}
                {dbStats && (
                  <div className="border-t border-green-200 dark:border-green-800 pt-4">
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">
                      📊 Business Statistics - {dbStats.businessName || currentBusiness?.name || 'Loading...'}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Tokens</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          {dbStats.totalTokensCreated || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Unused/Available</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          {dbStats.unusedTokens || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Sold Tokens</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          {dbStats.totalSales || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Active/In Use</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          {dbStats.activeTokens || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expired</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          {dbStats.expiredTokens || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Revenue</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          ${Number(dbStats.totalRevenue || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Sale</div>
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          ${Number(dbStats.averageSaleAmount || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`text-sm ${
                healthStatus.status === 'unhealthy'
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {healthStatus.error || 'Portal status unknown. Please check your integration setup.'}
              </div>
            )}
          </div>
        )}

        {visibleItems.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <p className="text-yellow-800 dark:text-yellow-300">
              You don't have permission to access WiFi Portal features. Please contact an administrator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleItems.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`block border-2 rounded-lg p-6 transition-all ${colorClasses[item.color as keyof typeof colorClasses]}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-4xl">{item.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm opacity-80">{item.description}</p>
                    </div>
                    <div className="text-2xl opacity-50">→</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Business Menu Quick Link */}
        {hasPortalIntegration && (canConfigureTokens || isSystemAdmin(currentUser)) && (
          <div className="mt-6 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">💡 Quick Tip</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              After setting up the portal, configure which WiFi tokens appear in your {currentBusiness?.businessType} POS:
            </p>
            <Link
              href={`/${currentBusiness?.businessType}/wifi-tokens`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="mr-2">📶</span>
              <span>Manage {currentBusiness?.businessType === 'restaurant' ? 'Restaurant' : 'Grocery'} WiFi Menu</span>
            </Link>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
