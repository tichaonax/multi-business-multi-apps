'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { isSystemAdmin } from '@/lib/permission-utils'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useAlert } from '@/hooks/use-alert'
import { WLANDiscoveryModal } from '@/components/r710/wlan-discovery-modal'
import Link from 'next/link'
import { RowActionsMenu, type RowAction } from '@/components/ui/row-actions-menu'

interface WLAN {
  id: string
  wlanId: string
  ssid: string
  guestServiceId: string | null
  title: string
  validDays: number
  enableFriendlyKey: boolean
  isActive: boolean
  logoType: string
  tokenPackages: number
  createdAt: string
  updatedAt: string
  businesses: {
    id: string
    name: string
    type: string
  }
  device_registry: {
    id: string
    ipAddress: string
    description: string | null
    connectionStatus: string
  }
}

export default function R710WLANsPage() {
  return (
    <ProtectedRoute>
        <ContentLayout>
          <R710WLANsContent />
        </ContentLayout>
    </ProtectedRoute>
  )
}

function R710WLANsContent() {
  const { data: session } = useSession()
  const { currentBusiness, activeBusinesses } = useBusinessPermissionsContext()
  const user = session?.user as any
  const confirm = useConfirm()
  const alert = useAlert()
  const [wlans, setWlans] = useState<WLAN[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all')
  const [showDiscovery, setShowDiscovery] = useState(false)

  useEffect(() => {
    loadWLANs()
  }, [selectedBusinessId])

  const loadWLANs = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (selectedBusinessId && selectedBusinessId !== 'all') {
        params.append('businessId', selectedBusinessId)
      }

      const response = await fetch(`/api/r710/wlans?${params.toString()}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setWlans(data.wlans || [])
      }
    } catch (error) {
      console.error('Failed to load WLANs:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleWLANStatus = async (wlanId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/r710/wlans/${wlanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          isActive: !currentStatus
        })
      })

      if (response.ok) {
        await loadWLANs() // Refresh list
        alert.showSuccess('WLAN status updated successfully')
      } else {
        alert.showError('Failed to update WLAN status')
      }
    } catch (error) {
      console.error('Failed to toggle WLAN status:', error)
      alert.showError('Failed to update WLAN status')
    }
  }

  const handleDeleteWLAN = async (wlanId: string, ssid: string) => {
    const confirmed = await confirm({
      title: 'Delete WLAN?',
      description: `Are you sure you want to delete the WLAN "${ssid}"? This action cannot be undone and will remove the WLAN from the R710 device. All associated tokens will be invalidated.`,
      confirmText: 'Delete WLAN',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/r710/wlans/${wlanId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete WLAN' }))
        alert.showError(errorData.error || 'Failed to delete WLAN')
        return
      }

      alert.showSuccess(`WLAN "${ssid}" deleted successfully!`)
      await loadWLANs() // Refresh list
    } catch (error) {
      console.error('Error deleting WLAN:', error)
      alert.showError('Failed to delete WLAN. The device may be unreachable.')
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          ● Active
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
          ● Inactive
        </span>
      )
    }
  }

  const getDeviceStatusBadge = (status: string) => {
    if (status === 'CONNECTED') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Device Online
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Device Offline
        </span>
      )
    }
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
                R710 WLANs
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage business WiFi networks (SSIDs)
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isSystemAdmin(user) && (
              <button
                onClick={() => setShowDiscovery(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Discover WLANs
              </button>
            )}
            <Link
              href="/r710-portal/wlans/overview"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              VLAN Overview
            </Link>
          </div>
        </div>
      </div>

      {/* Business Filter (Admin only) */}
      {isSystemAdmin(user) && activeBusinesses && activeBusinesses.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <label htmlFor="businessFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Business
          </label>
          <select
            id="businessFilter"
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Businesses</option>
            {activeBusinesses.map((business) => (
              <option key={business.businessId} value={business.businessId}>
                {business.businessName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading WLANs...</p>
        </div>
      )}

      {/* WLANs List */}
      {!loading && wlans.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  WLAN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {wlans.map((wlan) => {
                const rowActions: RowAction[] = [
                  {
                    key: 'toggle',
                    label: wlan.isActive ? 'Disable' : 'Enable',
                    icon: wlan.isActive ? '⏸️' : '▶️',
                    onClick: () => toggleWLANStatus(wlan.id, wlan.isActive),
                  },
                  {
                    key: 'edit',
                    label: 'Edit',
                    icon: '✏️',
                    onClick: () => { window.location.href = `/r710-portal/wlans/${wlan.id}` },
                  },
                ]
                if (isSystemAdmin(user)) {
                  rowActions.push({
                    key: 'delete',
                    label: 'Delete',
                    icon: '🗑️',
                    onClick: () => handleDeleteWLAN(wlan.id, wlan.ssid),
                    destructive: true,
                  })
                }
                return (
                <tr key={wlan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {wlan.ssid}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {wlan.title}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {wlan.tokenPackages} token package{wlan.tokenPackages !== 1 ? 's' : ''} • {wlan.validDays} day{wlan.validDays !== 1 ? 's' : ''} validity
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {wlan.businesses.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {wlan.businesses.type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {wlan.device_registry.ipAddress}
                    </div>
                    <div className="text-xs mt-1">
                      {getDeviceStatusBadge(wlan.device_registry.connectionStatus)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(wlan.isActive)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <RowActionsMenu actions={rowActions} />
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && wlans.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No WLANs Configured
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Businesses need to create R710 integrations to configure WLANs.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Go to Business Settings → R710 Integration to get started
          </p>
        </div>
      )}

      {/* WLAN Discovery Modal */}
      <WLANDiscoveryModal
        isOpen={showDiscovery}
        onClose={() => setShowDiscovery(false)}
        onWLANRegistered={loadWLANs}
      />
    </div>
  )
}
