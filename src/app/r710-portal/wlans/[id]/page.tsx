'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface WLANDetail {
  id: string
  wlanId: string
  ssid: string
  guestServiceId: string
  title: string
  validDays: number
  enableFriendlyKey: boolean
  enableZeroIt: boolean
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

export default function WLANDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  if (!resolvedParams) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <ContentLayout>
            <div className="flex items-center justify-center min-h-screen">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </ContentLayout>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <WLANDetailContent id={resolvedParams.id} />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function WLANDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const [wlan, setWlan] = useState<WLANDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    ssid: '',
    title: '',
    validDays: 1,
    enableFriendlyKey: false,
    enableZeroIt: true,
    isActive: true,
    logoType: 'none'
  })

  useEffect(() => {
    loadWLAN()
  }, [id])

  const loadWLAN = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/r710/wlans/${id}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load WLAN')
      }

      const data = await response.json()
      setWlan(data.wlan)
      setFormData({
        ssid: data.wlan.ssid,
        title: data.wlan.title,
        validDays: data.wlan.validDays,
        enableFriendlyKey: data.wlan.enableFriendlyKey,
        enableZeroIt: data.wlan.enableZeroIt,
        isActive: data.wlan.isActive,
        logoType: data.wlan.logoType
      })
    } catch (error) {
      console.error('Failed to load WLAN:', error)
      setError('Failed to load WLAN details')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/r710/wlans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update WLAN' }))
        throw new Error(errorData.error || 'Failed to update WLAN')
      }

      const result = await response.json()
      setWlan(result.wlan)
      setEditMode(false)

      // Refresh the data
      await loadWLAN()
    } catch (error: any) {
      console.error('Failed to save WLAN:', error)
      setError(error.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (wlan) {
      setFormData({
        ssid: wlan.ssid,
        title: wlan.title,
        validDays: wlan.validDays,
        enableFriendlyKey: wlan.enableFriendlyKey,
        enableZeroIt: wlan.enableZeroIt,
        isActive: wlan.isActive,
        logoType: wlan.logoType
      })
    }
    setEditMode(false)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!wlan) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          WLAN Not Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          The WLAN you are looking for does not exist.
        </p>
        <Link
          href="/r710-portal/wlans"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Back to WLANs
        </Link>
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
              <Link href="/r710-portal/wlans" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {wlan.ssid}
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {wlan.businesses.name} • {wlan.businesses.type}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Settings
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - WLAN Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              WLAN Settings
            </h2>

            <div className="space-y-4">
              {/* SSID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  WiFi Network Name (SSID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ssid}
                  onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="e.g., Guest WiFi"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This is the WiFi name customers will see when connecting
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Welcome Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="e.g., Welcome to our WiFi!"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Displayed on the login portal
                </p>
              </div>

              {/* Valid Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Token Validity (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.validDays}
                  onChange={(e) => setFormData({ ...formData, validDays: parseInt(e.target.value) || 1 })}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  How many days tokens remain valid
                </p>
              </div>

              {/* Logo Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo Type
                </label>
                <select
                  value={formData.logoType}
                  onChange={(e) => setFormData({ ...formData, logoType: e.target.value })}
                  disabled={!editMode}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="none">None</option>
                  <option value="default">Default</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Enable Friendly Key */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={formData.enableFriendlyKey}
                    onChange={(e) => setFormData({ ...formData, enableFriendlyKey: e.target.checked })}
                    disabled={!editMode}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Friendly Key
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Use easy-to-remember passwords instead of random strings
                  </p>
                </div>
              </div>

              {/* Enable Zero-IT Onboarding */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={formData.enableZeroIt}
                    onChange={(e) => setFormData({ ...formData, enableZeroIt: e.target.checked })}
                    disabled={!editMode}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Zero-IT Device Registration
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Required for clients to connect to the guest WiFi network
                  </p>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    disabled={!editMode}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enable or disable this WLAN
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Token Packages */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Token Packages
              </h2>
              <Link
                href={`/r710-portal/token-configs?wlanId=${wlan.id}`}
                className="text-sm text-primary hover:underline"
              >
                Manage Packages
              </Link>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This WLAN has <strong>{wlan.tokenPackages}</strong> token package{wlan.tokenPackages !== 1 ? 's' : ''} configured.
            </p>
          </div>
        </div>

        {/* Right Column - Device Info */}
        <div className="space-y-6">
          {/* Device Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              R710 Device
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  IP Address
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {wlan.device_registry.ipAddress}
                </p>
              </div>

              {wlan.device_registry.description && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Description
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {wlan.device_registry.description}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Status
                </p>
                {wlan.device_registry.connectionStatus === 'CONNECTED' ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    ● Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    ● Disconnected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              System Information
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  WLAN ID
                </p>
                <p className="text-xs font-mono text-gray-900 dark:text-white break-all">
                  {wlan.wlanId}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Guest Service ID
                </p>
                <p className="text-xs font-mono text-gray-900 dark:text-white break-all">
                  {wlan.guestServiceId}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Created
                </p>
                <p className="text-xs text-gray-900 dark:text-white">
                  {new Date(wlan.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Last Updated
                </p>
                <p className="text-xs text-gray-900 dark:text-white">
                  {new Date(wlan.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
