'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { isSystemAdmin } from '@/lib/permission-utils'
import Link from 'next/link'
import { useAlert } from '@/hooks/use-alert'

interface R710Device {
  id: string
  ipAddress: string
  description: string | null
  model: string
  firmwareVersion: string | null
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  lastHealthCheck: Date | null
  lastConnectedAt: Date | null
  lastError: string | null
  isActive: boolean
  businessCount: number
  createdAt: Date
}

export default function R710DevicesPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <R710DevicesContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function R710DevicesContent() {
  const { data: session } = useSession()
  const user = session?.user as any
  const { showSuccess, showError } = useAlert()
  const [devices, setDevices] = useState<R710Device[]>([])
  const [loading, setLoading] = useState(true)
  const [testingDevice, setTestingDevice] = useState<string | null>(null)

  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/r710/devices', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setDevices(data.devices || [])
      }
    } catch (error) {
      console.error('Failed to load R710 devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const testDeviceConnectivity = async (deviceId: string) => {
    try {
      setTestingDevice(deviceId)
      const response = await fetch(`/api/admin/r710/devices/${deviceId}/test`, {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      // Refresh devices list to show updated status
      await loadDevices()

      if (response.ok && data.success) {
        showSuccess(
          `IP: ${data.device.ipAddress}\nStatus: Connected & Authenticated\nFirmware: ${data.device.firmwareVersion || 'Unknown'}\nModel: ${data.device.model || 'R710'}`,
          '✅ Device Test Successful'
        )
      } else {
        // Test failed - show user-friendly error
        const errorMsg = data.result?.error || data.error || 'Unknown error'
        const lastError = data.device?.lastError || ''

        showError(
          `IP: ${data.device?.ipAddress || 'Unknown'}\nError: ${errorMsg}\n` +
          (lastError ? `Details: ${lastError}\n\n` : '\n') +
          `💡 Next Steps:\n` +
          `1. Verify the R710 device is powered on and reachable\n` +
          `2. Check if credentials are correct\n` +
          `3. If password was changed, click "Edit" to update it`,
          '❌ Integration Test Failed'
        )
      }
    } catch (error) {
      console.error('Failed to test device:', error)
      await loadDevices()
      showError(
        'Unable to communicate with the server. Please check your network connection and try again.',
        '❌ Integration Test Failed'
      )
    } finally {
      setTestingDevice(null)
    }
  }

  // Check if health check is stale (older than 1 hour)
  const isHealthCheckStale = (device: R710Device): boolean => {
    if (!device.lastHealthCheck) return true
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    return new Date(device.lastHealthCheck).getTime() < oneHourAgo
  }

  const getStatusBadge = (device: R710Device) => {
    const isStale = isHealthCheckStale(device)

    if (device.connectionStatus === 'CONNECTED' && isStale) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          ⚠ Connected (Stale)
        </span>
      )
    } else if (device.connectionStatus === 'CONNECTED') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          ● Connected
        </span>
      )
    } else if (device.connectionStatus === 'ERROR') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          ● Error
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
          ● Disconnected
        </span>
      )
    }
  }

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Never'

    const now = new Date()
    const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // Check if user is admin
  if (!isSystemAdmin(user)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            Admin Access Required
          </h3>
          <p className="text-yellow-800 dark:text-yellow-300">
            Only system administrators can manage R710 devices.
          </p>
        </div>
      </div>
    )
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
                R710 Device Registry
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage Ruckus R710 wireless access points
            </p>
          </div>

          <Link
            href="/r710-portal/devices/register"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Register Device
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading devices...</p>
        </div>
      )}

      {/* Devices List */}
      {!loading && devices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Health Check
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Businesses
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {device.ipAddress}
                        </div>
                        {device.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {device.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {device.model} {device.firmwareVersion && `• v${device.firmwareVersion}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {getStatusBadge(device)}
                      {device.lastError && (
                        <div className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate" title={device.lastError}>
                          {device.lastError}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatTimeAgo(device.lastHealthCheck)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                      {device.businessCount} {device.businessCount === 1 ? 'business' : 'businesses'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => testDeviceConnectivity(device.id)}
                      disabled={testingDevice === device.id}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingDevice === device.id ? (
                        <>
                          <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Testing...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Test
                        </>
                      )}
                    </button>
                    <Link
                      href={`/r710-portal/devices/${device.id}`}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && devices.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Devices Registered
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Register your first Ruckus R710 device to get started.
          </p>
          <Link
            href="/r710-portal/devices/register"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Register Device
          </Link>
        </div>
      )}
    </div>
  )
}
