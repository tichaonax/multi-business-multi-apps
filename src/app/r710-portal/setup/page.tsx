'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { useConfirm, useAlert } from '@/components/ui/confirm-modal'
import { MainLayout } from '@/components/layout/main-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'

interface R710Device {
  id: string
  ipAddress: string
  description: string
  firmwareVersion: string
  connectionStatus: string
  lastHealthCheck: string
}

interface R710Wlan {
  id: string
  wlanId: string
  ssid: string
  guestServiceId: string
  logoType: string
  title: string
  validDays: number
  enableFriendlyKey: boolean
  isActive: boolean
  createdAt: string
}

interface R710Integration {
  id: string
  businessId: string
  deviceRegistryId: string
  isActive: boolean
  device: {
    ipAddress: string
    description: string
    connectionStatus: string
  }
  wlans: R710Wlan[]
}

export default function R710SetupPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <R710SetupContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function R710SetupContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()
  const confirm = useConfirm()
  const alert = useAlert()

  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [integration, setIntegration] = useState<R710Integration | null>(null)
  const [availableDevices, setAvailableDevices] = useState<R710Device[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // WLAN configuration fields (for creation)
  const [logoType, setLogoType] = useState('none')
  const [title, setTitle] = useState('Welcome to Guest WiFi !')
  const [validDays, setValidDays] = useState(1)
  const [enableFriendlyKey, setEnableFriendlyKey] = useState(false)

  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [editLogoType, setEditLogoType] = useState('none')
  const [editTitle, setEditTitle] = useState('Welcome to Guest WiFi !')
  const [editValidDays, setEditValidDays] = useState(1)
  const [editEnableFriendlyKey, setEditEnableFriendlyKey] = useState(false)
  const [updating, setUpdating] = useState(false)

  const canSetup = session?.user ? (isSystemAdmin(session.user) || hasPermission(session.user, 'canSetupPortalIntegration')) : false

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    if (!canSetup) {
      router.push('/dashboard')
      return
    }

    loadData()
  }, [currentBusinessId, businessLoading])

  const loadData = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)
      setErrorMessage(null)

      // Check if integration already exists
      console.log('[R710 Setup] Checking integration for business:', currentBusinessId)
      const integrationResponse = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`, {
        credentials: 'include'
      })

      console.log('[R710 Setup] Integration response status:', integrationResponse.status)

      let hasIntegration = false
      if (integrationResponse.ok) {
        const integrationData = await integrationResponse.json()
        console.log('[R710 Setup] Integration data:', integrationData)

        if (integrationData.hasIntegration) {
          console.log('[R710 Setup] Integration found:', integrationData.integration)
          setIntegration(integrationData.integration)
          hasIntegration = true
        } else {
          console.log('[R710 Setup] No integration found')
          setIntegration(null)
        }
      } else {
        console.error('[R710 Setup] Failed to fetch integration:', await integrationResponse.text())
        setIntegration(null)
      }

      // Load available devices (if no integration exists)
      // CRITICAL: Only devices that pass real-time connectivity test are shown
      if (!hasIntegration) {
        console.log('[R710 Setup] Loading devices with real-time connectivity test...')

        const devicesResponse = await fetch(`/api/r710/devices/available?testRealTime=true`, {
          credentials: 'include'
        })

        if (devicesResponse.ok) {
          const devicesData = await devicesResponse.json()
          console.log('[R710 Setup] Real-time test results:', devicesData)
          setAvailableDevices(devicesData.devices || [])

          if (!devicesData.devices || devicesData.devices.length === 0) {
            console.warn('[R710 Setup] No devices passed connectivity test')
          }
        } else {
          console.error('[R710 Setup] Failed to load devices:', await devicesResponse.text())
          setAvailableDevices([])
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setErrorMessage('Failed to load integration data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateIntegration = async () => {
    if (!selectedDeviceId) {
      await alert({
        title: 'Device Required',
        description: 'Please select an R710 device to integrate with.'
      })
      return
    }

    const selectedDevice = availableDevices.find(d => d.id === selectedDeviceId)
    if (!selectedDevice) return

    // Generate SSID preview (same logic as backend)
    const wlanName = `${currentBusiness?.businessName || 'Business'} Guest WiFi`

    const confirmed = await confirm({
      title: 'Create R710 Integration',
      description: `Create R710 WiFi integration for this business using device ${selectedDevice.ipAddress}?\n\nWLAN Name (SSID): ${wlanName}\n\nThis will:\n• Create a dedicated WLAN for your business\n• Enable WiFi token sales in your POS`,
      confirmText: 'Create Integration',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      setCreating(true)
      setErrorMessage(null)

      const response = await fetch('/api/r710/integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentBusinessId,
          deviceRegistryId: selectedDeviceId,
          logoType: logoType,
          title: title,
          validDays: validDays,
          enableFriendlyKey: enableFriendlyKey
        })
      })

      const data = await response.json()

      if (response.ok) {
        await alert({
          title: 'Integration Created!',
          description: `R710 WiFi integration created successfully!\n\nSSID: ${data.wlan?.ssid || 'Guest WiFi'}\n\nYou can now configure WiFi token packages in the R710 Portal.`
        })
        await loadData()
      } else {
        setErrorMessage(data.error || 'Failed to create integration')
      }
    } catch (error) {
      console.error('Error creating integration:', error)
      setErrorMessage('Failed to create integration. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleEditWlanConfig = () => {
    if (integration && integration.wlans && integration.wlans.length > 0) {
      const wlan = integration.wlans[0]
      setEditLogoType(wlan.logoType)
      setEditTitle(wlan.title)
      setEditValidDays(wlan.validDays)
      setEditEnableFriendlyKey(wlan.enableFriendlyKey)
      setEditMode(true)
    }
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setErrorMessage(null)
  }

  const handleUpdateWlanConfig = async () => {
    try {
      setUpdating(true)
      setErrorMessage(null)

      const response = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          logoType: editLogoType,
          title: editTitle,
          validDays: editValidDays,
          enableFriendlyKey: editEnableFriendlyKey
        })
      })

      if (response.ok) {
        await alert({
          title: 'Configuration Updated',
          description: 'WLAN configuration has been updated successfully.'
        })
        setEditMode(false)
        await loadData()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Failed to update configuration')
      }
    } catch (error) {
      console.error('Error updating configuration:', error)
      setErrorMessage('Failed to update configuration. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleSyncWlan = async () => {
    try {
      setUpdating(true)
      setErrorMessage(null)

      const response = await fetch('/api/r710/integration/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentBusinessId
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.changed) {
          await alert({
            title: 'WLAN Configuration Synced',
            description: `WLAN configuration has been synced from the R710 device.\n\nPrevious SSID: ${data.previousSsid}\nCurrent SSID: ${data.currentSsid}\n\nReceipts will now show the correct network name.`
          })
        } else {
          await alert({
            title: 'WLAN Already Up to Date',
            description: 'The WLAN configuration is already synchronized with the R710 device.'
          })
        }
        await loadData()
      } else {
        setErrorMessage(data.error || 'Failed to sync WLAN configuration')
      }
    } catch (error) {
      console.error('Error syncing WLAN:', error)
      setErrorMessage('Failed to sync WLAN configuration. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveIntegration = async () => {
    const confirmed = await confirm({
      title: 'Remove R710 Integration',
      description: 'Are you sure you want to remove this R710 WiFi integration?\n\nThis will:\n• Delete the WLAN from the R710 device\n• Remove all token configurations\n• Invalidate all existing tokens\n\nThis action cannot be undone.',
      confirmText: 'Remove Integration',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      setCreating(true)
      setErrorMessage(null)

      const response = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        await alert({
          title: 'Integration Removed',
          description: 'R710 WiFi integration has been removed successfully.'
        })
        await loadData()
      } else {
        const data = await response.json()
        setErrorMessage(data.error || 'Failed to remove integration')
      }
    } catch (error) {
      console.error('Error removing integration:', error)
      setErrorMessage('Failed to remove integration. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-secondary">Loading R710 integration settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📶 R710 WiFi Integration Setup
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure R710 wireless access point integration for {currentBusiness?.businessName}
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
        </div>
      )}

      {/* Existing Integration */}
      {integration && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Integration</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              integration.isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {integration.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start">
              <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Device:</span>
              <span className="text-gray-900 dark:text-white">{integration.device.ipAddress}</span>
            </div>
            {integration.wlans && integration.wlans.length > 0 && (
              <>
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 dark:text-gray-300 w-32">SSID:</span>
                  <span className="text-gray-900 dark:text-white font-mono">{integration.wlans[0].ssid}</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Logo Type:</span>
                  <span className="text-gray-900 dark:text-white">{editMode ? (
                    <select
                      value={editLogoType}
                      onChange={(e) => setEditLogoType(e.target.value)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                    >
                      <option value="none">None</option>
                      <option value="default">Default</option>
                    </select>
                  ) : integration.wlans[0].logoType}</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Welcome Title:</span>
                  <span className="text-gray-900 dark:text-white">{editMode ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white w-80"
                    />
                  ) : integration.wlans[0].title}</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Valid Days:</span>
                  <span className="text-gray-900 dark:text-white">{editMode ? (
                    <input
                      type="number"
                      value={editValidDays}
                      onChange={(e) => setEditValidDays(parseInt(e.target.value) || 1)}
                      min="1"
                      max="365"
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white w-24"
                    />
                  ) : integration.wlans[0].validDays} days</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Friendly Key:</span>
                  <span className="text-gray-900 dark:text-white">{editMode ? (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editEnableFriendlyKey}
                        onChange={(e) => setEditEnableFriendlyKey(e.target.checked)}
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm">Enabled</span>
                    </label>
                  ) : (integration.wlans[0].enableFriendlyKey ? 'Enabled' : 'Disabled')}</span>
                </div>
              </>
            )}
            <div className="flex items-start">
              <span className="font-medium text-gray-700 dark:text-gray-300 w-32">Status:</span>
              <span className={`font-medium ${
                integration.device.connectionStatus === 'CONNECTED'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {integration.device.connectionStatus}
              </span>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            {editMode ? (
              <>
                <button
                  onClick={handleUpdateWlanConfig}
                  disabled={updating}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={updating}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditWlanConfig}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit Configuration
                </button>
                <button
                  onClick={handleSyncWlan}
                  disabled={updating}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Syncing...' : '🔄 Sync from Device'}
                </button>
                <button
                  onClick={() => router.push('/r710-portal/token-configs')}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                >
                  Manage Token Packages
                </button>
                <button
                  onClick={handleRemoveIntegration}
                  disabled={creating}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Removing...' : 'Remove Integration'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Integration */}
      {!integration && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create Integration</h2>

          {availableDevices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No R710 devices are currently available for integration.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Please ask an administrator to register R710 devices first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select R710 Device
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Choose a device...</option>
                  {availableDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.ipAddress} - {device.description || 'No description'} ({device.connectionStatus})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select an R710 device to integrate with this business
                </p>
              </div>

              {/* WLAN Name Preview */}
              {selectedDeviceId && currentBusiness && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    📶 WLAN Name (SSID) Preview
                  </h3>
                  <p className="text-lg font-mono font-bold text-blue-900 dark:text-blue-100">
                    {currentBusiness.businessName} Guest WiFi
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    This will be the network name visible to guests
                  </p>
                </div>
              )}

              {/* WLAN Configuration */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Guest Portal Configuration
                </h3>

                <div className="space-y-4">
                  {/* Logo Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Logo Type
                    </label>
                    <select
                      value={logoType}
                      onChange={(e) => setLogoType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    >
                      <option value="none">None</option>
                      <option value="default">Default</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Logo display on guest portal page
                    </p>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Welcome Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Welcome to Guest WiFi !"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Message shown on guest portal login page
                    </p>
                  </div>

                  {/* Valid Days */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Token Validity Period (days)
                    </label>
                    <input
                      type="number"
                      value={validDays}
                      onChange={(e) => setValidDays(parseInt(e.target.value) || 1)}
                      min="1"
                      max="365"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Expire new guest passes if not used within this many days
                    </p>
                  </div>

                  {/* Enable Friendly Key */}
                  <div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableFriendlyKey}
                        onChange={(e) => setEnableFriendlyKey(e.target.checked)}
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Enable Friendly Key
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Generate human-readable access keys for tokens
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateIntegration}
                disabled={!selectedDeviceId || creating}
                className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating Integration...' : 'Create Integration'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
          📖 About R710 Integration
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Each business gets its own dedicated WLAN on the R710 device</li>
          <li>• SSID and VLAN ID are automatically generated</li>
          <li>• Token packages can be customized per business</li>
          <li>• Tokens appear in your POS under "📶 R710 WiFi" tab</li>
          <li>• Direct token sales are tracked separately from POS sales</li>
        </ul>
      </div>
    </div>
  )
}
