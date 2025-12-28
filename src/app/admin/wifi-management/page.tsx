'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import Link from 'next/link'

interface WiFiStats {
  esp32: {
    hasIntegration: boolean
    totalDevices: number
    activeTokens: number
    totalRevenue: number
  }
  r710: {
    hasIntegration: boolean
    totalDevices: number
    connectedDevices: number
    activeTokens: number
    totalRevenue: number
  }
  connectedClients: {
    total: number
    online: number
    esp32: number
    r710: number
  }
}

export default function WiFiManagementPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <WiFiManagementContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function WiFiManagementContent() {
  const { data: session } = useSession()
  const { currentBusiness, currentBusinessId } = useBusinessPermissionsContext()
  const user = session?.user as any

  const [stats, setStats] = useState<WiFiStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Check permissions
  const canSetup = isSystemAdmin(user) || hasPermission(user, 'canSetupPortalIntegration')
  const canManageDevices = isSystemAdmin(user) || hasPermission(user, 'canManageWifiPortal')
  const canConfigureTokens = isSystemAdmin(user) || hasPermission(user, 'canConfigureWifiTokens')
  const canSellTokens = isSystemAdmin(user) || hasPermission(user, 'canSellWifiTokens')
  const canViewReports = isSystemAdmin(user) || hasPermission(user, 'canViewWifiReports')

  useEffect(() => {
    if (currentBusinessId) {
      loadStats()
    }
  }, [currentBusinessId])

  const loadStats = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)
      // Load statistics from both systems
      const [esp32Response, r710Response, clientsResponse] = await Promise.all([
        fetch(`/api/wifi-portal/stats?businessId=${currentBusinessId}`).catch(() => null),
        fetch('/api/r710/stats').catch(() => null),
        canManageDevices
          ? fetch('/api/admin/connected-clients?system=BOTH&status=all&limit=1').catch(() => null)
          : Promise.resolve(null),
      ])

      const esp32Data = esp32Response?.ok ? await esp32Response.json() : null
      const r710Data = r710Response?.ok ? await r710Response.json() : null
      const clientsData = clientsResponse?.ok ? await clientsResponse.json() : null

      setStats({
        esp32: {
          hasIntegration: esp32Data?.success || false,
          totalDevices: esp32Data?.stats?.totalDevices || 0,
          activeTokens: esp32Data?.stats?.summary?.activeTokens || 0,
          totalRevenue: Number(esp32Data?.stats?.summary?.totalRevenue || 0),
        },
        r710: {
          hasIntegration: r710Data?.totalDevices > 0 || false,
          totalDevices: r710Data?.totalDevices || 0,
          connectedDevices: r710Data?.connectedDevices || 0,
          activeTokens: r710Data?.tokenInventory?.active || 0,
          totalRevenue: Number(r710Data?.recentSales?.totalRevenue || 0),
        },
        connectedClients: {
          total: clientsData?.data?.pagination?.total || 0,
          online: clientsData?.data?.statistics?.online || 0,
          esp32: clientsData?.data?.statistics?.esp32 || 0,
          r710: clientsData?.data?.statistics?.r710 || 0,
        },
      })
    } catch (error) {
      console.error('Failed to load WiFi stats:', error)
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
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          WiFi Management Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Unified management for ESP32 and R710 WiFi systems
        </p>
      </div>

      {/* Overall Statistics */}
      {!loading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Connected Clients - Highlighted */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Connected Clients</h3>
              <span className="text-2xl">📡</span>
            </div>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {stats.connectedClients.online}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {stats.connectedClients.total} total tracked
            </p>
          </div>

          {/* ESP32 Devices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">ESP32 Portal</h3>
              <span className="text-2xl">📡</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.esp32.activeTokens}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {formatCurrency(stats.esp32.totalRevenue)} revenue
            </p>
          </div>

          {/* R710 Devices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">R710 Access Points</h3>
              <span className="text-2xl">📶</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.r710.connectedDevices}/{stats.r710.totalDevices}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {stats.r710.activeTokens} active tokens
            </p>
          </div>

          {/* Total Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(stats.esp32.totalRevenue + stats.r710.totalRevenue)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Combined WiFi sales
            </p>
          </div>
        </div>
      )}

      {/* System Management Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* ESP32 Portal System */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">📡</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  ESP32 WiFi Portal
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Captive portal token system
                </p>
              </div>
            </div>
            {stats?.esp32.hasIntegration && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                ✓ Active
              </span>
            )}
          </div>

          <div className="space-y-2">
            {canSetup && (
              <Link
                href="/wifi-portal/setup"
                className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span>⚙️</span>
                    <span className="font-medium text-gray-900 dark:text-white">Portal Setup</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            )}

            {canManageDevices && (
              <Link
                href="/wifi-portal/devices"
                className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span>🖥️</span>
                    <span className="font-medium text-gray-900 dark:text-white">Device Registry</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            )}

            {canConfigureTokens && (
              <>
                <Link
                  href="/wifi-portal/token-configs"
                  className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span>🎫</span>
                      <span className="font-medium text-gray-900 dark:text-white">Token Packages</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </Link>

                <Link
                  href="/wifi-portal/tokens"
                  className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span>📋</span>
                      <span className="font-medium text-gray-900 dark:text-white">Token Ledger</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </Link>
              </>
            )}

            {canSellTokens && (
              <Link
                href="/wifi-portal/sales"
                className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span>💰</span>
                    <span className="font-medium text-gray-900 dark:text-white">Direct Sales</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            )}

            {canViewReports && (
              <Link
                href="/wifi-portal/reports"
                className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span>📊</span>
                    <span className="font-medium text-gray-900 dark:text-white">Reports & Analytics</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* R710 System */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">📶</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Ruckus R710 Access Points
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enterprise WiFi guest access
                </p>
              </div>
            </div>
            {stats?.r710.hasIntegration && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                ✓ Active
              </span>
            )}
          </div>

          <div className="space-y-2">
            {canSetup && (
              <Link
                href="/r710-portal/setup"
                className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span>⚙️</span>
                    <span className="font-medium text-gray-900 dark:text-white">Integration Setup</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            )}

            {isSystemAdmin(user) && (
              <Link
                href="/r710-portal/devices"
                className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span>🖥️</span>
                    <span className="font-medium text-gray-900 dark:text-white">Device Registry</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            )}

            <Link
              href="/r710-portal/wlans"
              className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span>📡</span>
                  <span className="font-medium text-gray-900 dark:text-white">WLAN Networks</span>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>

            {canConfigureTokens && (
              <>
                <Link
                  href="/r710-portal/token-configs"
                  className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span>🎫</span>
                      <span className="font-medium text-gray-900 dark:text-white">Token Packages</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </Link>

                <Link
                  href="/r710-portal/tokens"
                  className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span>📦</span>
                      <span className="font-medium text-gray-900 dark:text-white">Token Inventory</span>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </Link>
              </>
            )}

            {canSellTokens && (
              <Link
                href="/r710-portal/sales"
                className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span>💵</span>
                    <span className="font-medium text-gray-900 dark:text-white">Sales History</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            )}

            {(stats?.r710.hasIntegration || isSystemAdmin(user)) && (
              <Link
                href="/r710-portal/acl"
                className="block px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span>🛡️</span>
                    <span className="font-medium text-gray-900 dark:text-white">MAC Access Control</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Connected Clients - Prominent CTA */}
      {canManageDevices && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 text-white rounded-full p-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  View Connected Clients
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Monitor all devices currently connected to your WiFi networks across ESP32 and R710 systems
                </p>
              </div>
            </div>
            <Link
              href="/admin/connected-clients"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              <span>View Clients</span>
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
