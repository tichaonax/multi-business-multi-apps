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
import { useRouter, useParams } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useAlert as useToastAlert } from '@/hooks/use-alert'

interface TestResult {
  success: boolean
  message: string
  firmwareVersion?: string
  model?: string
  online?: boolean
  authenticated?: boolean
}

interface BusinessIntegration {
  id: string | null
  name: string
  type: string
  integrationId: string
  isActive: boolean
  isOrphaned?: boolean
}

interface DeviceData {
  id: string
  ipAddress: string
  adminUsername: string
  description: string | null
  isActive: boolean
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  lastHealthCheck: Date | null
  lastConnectedAt: Date | null
  lastError: string | null
  firmwareVersion: string | null
  model: string
  businesses: BusinessIntegration[]
  usage: {
    businessCount: number
    wlanCount: number
  }
}

export default function EditR710DevicePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <EditR710DeviceContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function EditR710DeviceContent() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const confirm = useConfirm()
  const { showSuccess, showError } = useToastAlert()
  const user = session?.user as any
  const deviceId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<DeviceData | null>(null)
  const [formData, setFormData] = useState({
    ipAddress: '',
    adminUsername: 'admin',
    adminPassword: '',
    description: '',
    isActive: true
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [removingIntegration, setRemovingIntegration] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Load device data
  useEffect(() => {
    if (deviceId) {
      loadDevice()
    }
  }, [deviceId])

  const loadDevice = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/r710/devices/${deviceId}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setDevice(data.device)
        setFormData({
          ipAddress: data.device.ipAddress,
          adminUsername: data.device.adminUsername,
          adminPassword: '', // Leave password empty - only fill if changing
          description: data.device.description || '',
          isActive: data.device.isActive
        })
      } else {
        showError('Failed to load device details', '❌ Load Failed')
        router.push('/r710-portal/devices')
      }
    } catch (error) {
      console.error('Failed to load device:', error)
      showError('Unable to load device. Please try again.', '❌ Load Failed')
      router.push('/r710-portal/devices')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: '' }))

    // Clear test result when form changes
    if (testResult) {
      setTestResult(null)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.ipAddress) {
      newErrors.ipAddress = 'IP address is required'
    } else {
      // Basic IP address validation
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
      if (!ipRegex.test(formData.ipAddress)) {
        newErrors.ipAddress = 'Please enter a valid IP address'
      }
    }

    if (!formData.adminUsername) {
      newErrors.adminUsername = 'Admin username is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const testConnection = async () => {
    if (!validateForm()) {
      return
    }

    // If password is empty, we can't test new credentials
    if (!formData.adminPassword) {
      showError('Please enter the device password to test the connection.', 'Password Required')
      return
    }

    try {
      setTesting(true)
      setTestResult(null)

      const response = await fetch('/api/admin/r710/devices/test-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ipAddress: formData.ipAddress,
          adminUsername: formData.adminUsername,
          adminPassword: formData.adminPassword
        })
      })

      const data = await response.json()

      if (response.ok && data.online && data.authenticated) {
        setTestResult({
          success: true,
          message: 'Connection successful! Device is online and authenticated.',
          firmwareVersion: data.firmwareVersion,
          model: data.model,
          online: data.online,
          authenticated: data.authenticated
        })
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection test failed',
          online: data.online,
          authenticated: data.authenticated
        })
      }
    } catch (error) {
      console.error('Test connection error:', error)
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please check the credentials and try again.'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)

      // Build update payload - only include changed fields
      const updatePayload: any = {
        adminUsername: formData.adminUsername,
        description: formData.description || null,
        isActive: formData.isActive
      }

      // Include IP address if changed
      if (formData.ipAddress !== device?.ipAddress) {
        updatePayload.ipAddress = formData.ipAddress
      }

      // Only include password if it was changed
      if (formData.adminPassword) {
        updatePayload.adminPassword = formData.adminPassword
      }

      const response = await fetch(`/api/admin/r710/devices/${deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updatePayload)
      })

      const data = await response.json()

      if (response.ok) {
        showSuccess(
          data.message || 'Device updated successfully',
          '✅ Update Successful'
        )
        router.push('/r710-portal/devices')
      } else {
        showError(
          data.message || data.error || 'Failed to update device',
          '❌ Update Failed'
        )
      }
    } catch (error) {
      console.error('Update error:', error)
      showError('Failed to update device. Please try again.', '❌ Update Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    console.log('[Delete] handleDelete called, device:', device?.id, 'businessCount:', device?.usage.businessCount)

    // Check if there are linked items
    if (device && (device.usage.businessCount > 0)) {
      console.log('[Delete] Blocked - has business integrations')
      showError(
        'Please remove all business integrations before deleting this device.',
        'Cannot Delete'
      )
      return
    }

    const hasOrphanedWlans = device && device.usage.wlanCount > 0 && device.usage.businessCount === 0
    console.log('[Delete] hasOrphanedWlans:', hasOrphanedWlans)

    const confirmed = await confirm({
      title: 'Delete Device?',
      description: hasOrphanedWlans
        ? `This device has ${device.usage.wlanCount} orphaned WLAN(s) that will also be deleted. Are you sure you want to delete this R710 device (${device?.ipAddress})?`
        : `Are you sure you want to delete this R710 device (${device?.ipAddress})? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    console.log('[Delete] Confirmation result:', confirmed)
    if (!confirmed) return

    try {
      setDeleting(true)
      console.log('[Delete] Starting deletion process...')

      // If there are orphaned WLANs, delete them first
      if (hasOrphanedWlans && device) {
        console.log('[Delete] Cleaning up orphaned WLANs first...')
        const wlanDeleteResponse = await fetch(`/api/admin/r710/devices/${deviceId}/cleanup-wlans`, {
          method: 'POST',
          credentials: 'include'
        })

        if (!wlanDeleteResponse.ok) {
          // Try direct deletion anyway
          console.warn('[Delete] WLAN cleanup failed, proceeding with device deletion')
        }
      }

      console.log('[Delete] Calling DELETE API for device:', deviceId)
      const response = await fetch(`/api/admin/r710/devices/${deviceId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      console.log('[Delete] API response:', response.status, data)

      if (response.ok) {
        showSuccess('Device deleted successfully', 'Deleted')
        router.push('/r710-portal/devices')
      } else {
        showError(
          data.message || data.error || 'Failed to delete device',
          'Delete Failed'
        )
      }
    } catch (error) {
      console.error('[Delete] Error:', error)
      showError('Failed to delete device. Please try again.', 'Delete Failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleRemoveIntegration = async (business: BusinessIntegration) => {
    const confirmed = await confirm({
      title: business.isOrphaned ? 'Remove Orphaned Integration?' : 'Remove Integration?',
      description: business.isOrphaned
        ? `This integration belongs to a deleted business. Remove it to allow device deletion.`
        : `Are you sure you want to remove the R710 integration for "${business.name}"? This will delete the WLAN from the device and remove all associated records.`,
      confirmText: 'Remove',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      setRemovingIntegration(business.integrationId)

      let response: Response

      if (business.isOrphaned) {
        // Use cleanup endpoint for orphaned integrations
        response = await fetch(`/api/admin/r710/devices/${deviceId}/cleanup-wlans?integrationId=${business.integrationId}`, {
          method: 'DELETE',
          credentials: 'include'
        })
      } else {
        // Use normal integration endpoint for valid businesses
        response = await fetch(`/api/r710/integration?businessId=${business.id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
      }

      const data = await response.json()

      if (response.ok) {
        showSuccess(`Integration removed for ${business.name}`, '✅ Removed')
        // Reload device data to update the list
        await loadDevice()
      } else {
        showError(
          data.message || data.error || 'Failed to remove integration',
          '❌ Remove Failed'
        )
      }
    } catch (error) {
      console.error('Remove integration error:', error)
      showError('Failed to remove integration. Please try again.', '❌ Remove Failed')
    } finally {
      setRemovingIntegration(null)
    }
  }

  // Show loading while session or device is loading
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading device...</p>
        </div>
      </div>
    )
  }

  // Check if user is admin (after session is loaded)
  if (!isSystemAdmin(user)) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            Admin Access Required
          </h3>
          <p className="text-yellow-800 dark:text-yellow-300">
            Only system administrators can edit R710 devices.
          </p>
        </div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
            Device Not Found
          </h3>
          <p className="text-red-800 dark:text-red-300">
            The requested R710 device could not be found.
          </p>
        </div>
      </div>
    )
  }

  // Helper to get status badge
  const getStatusBadge = () => {
    if (device.connectionStatus === 'CONNECTED') {
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Link href="/r710-portal/devices" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit R710 Device
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">
          Update credentials and configuration for {device.ipAddress}
        </p>
      </div>

      {/* Device Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
            <div className="mt-1">
              {getStatusBadge()}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Model</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
              {device.model} {device.firmwareVersion && `v${device.firmwareVersion}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Businesses</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
              {device.usage.businessCount} {device.usage.businessCount === 1 ? 'business' : 'businesses'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">WLANs</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
              {device.usage.wlanCount} {device.usage.wlanCount === 1 ? 'WLAN' : 'WLANs'}
            </p>
          </div>
        </div>
        {device.lastError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-xs text-red-600 dark:text-red-400">
              <strong>Last Error:</strong> {device.lastError}
            </p>
          </div>
        )}
      </div>

      {/* Linked Businesses Card */}
      {device.businesses && device.businesses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Linked Businesses</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Remove a business integration to unlink it from this device. This will delete the WLAN from the device.
          </p>
          <div className="space-y-3">
            {device.businesses.map((business) => (
              <div
                key={business.integrationId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  business.isOrphaned
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      business.isOrphaned
                        ? 'bg-yellow-100 dark:bg-yellow-900/30'
                        : 'bg-primary/10'
                    }`}>
                      {business.isOrphaned ? (
                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      business.isOrphaned
                        ? 'text-yellow-800 dark:text-yellow-200'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {business.name}
                      {business.isOrphaned && (
                        <span className="ml-2 text-xs font-normal text-yellow-600 dark:text-yellow-400">(Orphaned)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{business.type}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIntegration(business)}
                  disabled={removingIntegration === business.integrationId}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {removingIntegration === business.integrationId ? (
                    <>
                      <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Removing...
                    </>
                  ) : (
                    'Remove'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* IP Address */}
          <div>
            <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              IP Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ipAddress"
              name="ipAddress"
              value={formData.ipAddress}
              onChange={handleChange}
              placeholder="192.168.1.1"
              className={`w-full px-3 py-2 border ${errors.ipAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
            />
            {errors.ipAddress && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.ipAddress}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Update if the device IP address has changed
            </p>
          </div>

          {/* Admin Username */}
          <div>
            <label htmlFor="adminUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="adminUsername"
              name="adminUsername"
              value={formData.adminUsername}
              onChange={handleChange}
              placeholder="admin"
              className={`w-full px-3 py-2 border ${errors.adminUsername ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
            />
            {errors.adminUsername && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.adminUsername}</p>
            )}
          </div>

          {/* Admin Password */}
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Password <span className="text-gray-400">(Optional - leave empty to keep current)</span>
            </label>
            <input
              type="password"
              id="adminPassword"
              name="adminPassword"
              value={formData.adminPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-3 py-2 border ${errors.adminPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
            />
            {errors.adminPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.adminPassword}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Only enter password if you need to update it
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Main building R710 - Floor 2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Is Active */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Device is active
            </label>
          </div>

          {/* Test Connection Button */}
          {formData.adminPassword && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={testConnection}
                disabled={testing}
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Test New Credentials
                  </>
                )}
              </button>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
              <div className="flex items-start">
                {testResult.success ? (
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${testResult.success ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </h4>
                  <p className={`text-sm mt-1 ${testResult.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    {testResult.message}
                  </p>
                  {testResult.success && testResult.firmwareVersion && (
                    <div className="mt-2 text-xs text-green-700 dark:text-green-400">
                      <p><strong>Model:</strong> {testResult.model || 'R710'}</p>
                      <p><strong>Firmware:</strong> {testResult.firmwareVersion}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || device.usage.businessCount > 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={device.usage.businessCount > 0 ? 'Remove all business integrations first' : ''}
            >
              {deleting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete Device'
              )}
            </button>
            <div className="flex items-center space-x-3">
              <Link
                href="/r710-portal/devices"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Device'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
