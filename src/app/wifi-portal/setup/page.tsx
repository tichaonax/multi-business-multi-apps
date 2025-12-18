'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { hasPermission } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { useConfirm } from '@/components/ui/confirm-modal'

interface PortalIntegration {
  id: string
  businessId: string
  businessName: string
  businessType: string
  portalIpAddress: string
  portalPort: number
  isActive: boolean
  showTokensInPOS: boolean
  createdAt: string
  updatedAt: string
  apiKeyPreview: string
}

export default function WiFiPortalSetupPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()
  const confirm = useConfirm()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [integration, setIntegration] = useState<PortalIntegration | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [apiKey, setApiKey] = useState('')
  const [portalIpAddress, setPortalIpAddress] = useState('')
  const [portalPort, setPortalPort] = useState('80')
  const [showTokensInPOS, setShowTokensInPOS] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const canSetup = session?.user ? hasPermission(session.user, 'canSetupPortalIntegration') : false

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    // Check business type
    if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
      setErrorMessage('WiFi portal integration is only available for restaurant and grocery businesses')
      setLoading(false)
      return
    }

    if (!canSetup) {
      router.push('/dashboard')
      return
    }

    fetchIntegration()
  }, [currentBusinessId, businessLoading])

  const fetchIntegration = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/wifi-portal/integration?businessId=${currentBusinessId}`)

      if (response.ok) {
        const data = await response.json()
        setIntegration(data.integration)

        // Populate form with existing data
        setPortalIpAddress(data.integration.portalIpAddress)
        setPortalPort(data.integration.portalPort.toString())
        setShowTokensInPOS(data.integration.showTokensInPOS)
        setIsActive(data.integration.isActive)
      } else if (response.status === 404) {
        // No integration exists yet - this is normal for first-time setup
        setIntegration(null)
      } else if (response.status === 403) {
        // User doesn't have access to this business
        setErrorMessage('You do not have permission to manage WiFi portal for this business. Please contact an administrator.')
        setIntegration(null)
      } else {
        // Other error (500, etc.)
        setErrorMessage('Unable to load integration settings. Please try again.')
        setIntegration(null)
      }
    } catch (error) {
      setErrorMessage('Unable to connect to server. Please check your connection and try again.')
      setIntegration(null)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    if (!portalIpAddress || !portalPort || !apiKey) {
      setErrorMessage('Please fill in all fields before testing connection')
      return
    }

    try {
      setTestingConnection(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      // We'll test by trying to create the integration
      // The API will validate the connection
      const response = await fetch(`/api/wifi-portal/integration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          apiKey,
          portalIpAddress,
          portalPort: parseInt(portalPort, 10),
          showTokensInPOS: false, // Don't enable POS yet when just testing
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Connection successful! Portal is online.')
        setIntegration(data.integration)
      } else {
        setErrorMessage(data.error || data.details || 'Connection test failed')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to test connection')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentBusinessId) return
    if (!apiKey || !portalIpAddress || !portalPort) {
      setErrorMessage('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const url = integration
        ? `/api/wifi-portal/integration/${integration.id}`
        : `/api/wifi-portal/integration`

      const method = integration ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(integration ? {} : { businessId: currentBusinessId }),
          apiKey,
          portalIpAddress,
          portalPort: parseInt(portalPort, 10),
          showTokensInPOS,
          isActive,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(integration ? 'Portal integration updated successfully!' : 'Portal integration created successfully!')
        setIntegration(data.integration)
        setApiKey('') // Clear API key for security
      } else {
        setErrorMessage(data.error || data.details || 'Failed to save portal integration')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save portal integration')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!integration || !currentBusinessId) return

    const confirmed = await confirm({
      title: 'Delete Portal Integration',
      description: 'Are you sure you want to delete this portal integration? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setSaving(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/wifi-portal/integration/${integration.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Portal integration deleted successfully')
        setIntegration(null)
        setApiKey('')
        setPortalIpAddress('')
        setPortalPort('80')
        setShowTokensInPOS(false)
        setIsActive(true)
      } else {
        setErrorMessage(data.error || data.details || 'Failed to delete portal integration')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to delete portal integration')
    } finally {
      setSaving(false)
    }
  }

  if (businessLoading || loading) {
    return (
      <ContentLayout title="WiFi Portal Setup">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
    return (
      <ContentLayout title="WiFi Portal Setup">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            WiFi portal integration is only available for restaurant and grocery businesses.
          </p>
        </div>
      </ContentLayout>
    )
  }

  if (!canSetup) {
    return (
      <ContentLayout title="WiFi Portal Setup">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            You do not have permission to setup WiFi portal integration.
          </p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="WiFi Portal Setup"
      subtitle="Configure integration with your ESP32 WiFi portal server"
    >
      <div className="max-w-2xl">
        {/* Status Messages */}
        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* First-Time Setup Info */}
        {!integration && !errorMessage && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">📡 First-Time Setup</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>Welcome! You're about to connect your business to an ESP32 WiFi portal.</p>
              <p className="font-medium">What you'll need:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Your ESP32 portal's API key</li>
                <li>The portal's IP address on your network</li>
                <li>The portal's port number (usually 80)</li>
              </ul>
              <p className="mt-2">
                After setup, you'll be able to create WiFi token packages and sell them through your POS system.
              </p>
            </div>
          </div>
        )}

        {/* Integration Status */}
        {integration && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Current Integration Status</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>Business: {integration.businessName} ({integration.businessType})</p>
              <p>Portal Address: {integration.portalIpAddress}:{integration.portalPort}</p>
              <p>Status: {integration.isActive ? '✅ Active' : '⚠️ Inactive'}</p>
              <p>POS Integration: {integration.showTokensInPOS ? '✅ Enabled' : '❌ Disabled'}</p>
              <p>API Key: {integration.apiKeyPreview}</p>
            </div>
          </div>
        )}

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {integration ? 'Update Portal Integration' : 'Setup Portal Integration'}
          </h2>

          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Key *
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={integration ? 'Leave blank to keep current key' : 'Enter portal API key'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={!integration}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The API key provided by your ESP32 portal administrator
            </p>
          </div>

          {/* Portal IP Address */}
          <div>
            <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Portal IP Address *
            </label>
            <input
              type="text"
              id="ipAddress"
              value={portalIpAddress}
              onChange={(e) => setPortalIpAddress(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The IP address of your ESP32 portal server on your local network
            </p>
          </div>

          {/* Portal Port */}
          <div>
            <label htmlFor="port" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Portal Port *
            </label>
            <input
              type="number"
              id="port"
              value={portalPort}
              onChange={(e) => setPortalPort(e.target.value)}
              placeholder="80"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min="1"
              max="65535"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The port number your ESP32 portal server is listening on (default: 80)
            </p>
          </div>

          {/* Show Tokens in POS */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="showTokensInPOS"
              checked={showTokensInPOS}
              onChange={(e) => setShowTokensInPOS(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="showTokensInPOS" className="ml-2">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Show WiFi tokens in POS
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enable this to display WiFi tokens as menu items in your {currentBusiness?.businessType} POS system
              </span>
            </label>
          </div>

          {/* Is Active */}
          {integration && (
            <div className="flex items-start">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Integration Active
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Disable to temporarily stop using WiFi portal without deleting the configuration
                </span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={testConnection}
              disabled={testingConnection || !apiKey || !portalIpAddress || !portalPort}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : integration ? 'Update Integration' : 'Create Integration'}
            </button>

            {integration && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Integration
              </button>
            )}
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Next Steps</h3>
          <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
            <li>Fill in your ESP32 portal server details above</li>
            <li>Click "Test Connection" to verify connectivity</li>
            <li>Click "Create Integration" to save the configuration</li>
            <li>A WiFi Token Revenue expense account will be created automatically</li>
            <li>Navigate to Token Configurations to create WiFi packages</li>
            <li>Configure your business-specific token menu and pricing</li>
          </ol>
        </div>
      </div>
    </ContentLayout>
  )
}
