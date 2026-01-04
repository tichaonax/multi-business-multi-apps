'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { isSystemAdmin } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert } from '@/components/ui/confirm-modal'
import Link from 'next/link'

export default function CreateTokenConfigPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <CreateTokenConfigContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function CreateTokenConfigContent() {
  const router = useRouter()
  const { data: session } = useSession()
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const alert = useAlert()
  const user = session?.user as any

  // Redirect if not admin
  if (!isSystemAdmin(user)) {
    router.push('/r710-portal/token-configs')
    return null
  }

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationValue: 1,
    durationUnit: 'hour_Hours',
    deviceLimit: 1,
    basePrice: 5.00,
    autoGenerateThreshold: 5,
    autoGenerateQuantity: 20,
    displayOrder: 0,
    isActive: true
  })

  const [wlanId, setWlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (currentBusinessId) {
      loadIntegration()
    }
  }, [currentBusinessId])

  const loadIntegration = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/r710/integration?businessId=${currentBusinessId}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.hasIntegration && data.integration.wlans && data.integration.wlans.length > 0) {
          setWlanId(data.integration.wlans[0].id)
        } else {
          await alert({
            title: 'Integration Not Found',
            description: 'No R710 integration found. Please set up integration first.'
          })
          router.push('/r710-portal/setup')
        }
      } else {
        await alert({
          title: 'Load Failed',
          description: 'Failed to load R710 integration'
        })
        router.push('/r710-portal/setup')
      }
    } catch (error) {
      console.error('Error loading integration:', error)
      await alert({
        title: 'Error',
        description: 'Failed to load R710 integration'
      })
      router.push('/r710-portal/setup')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Package name is required'
    }

    if (formData.durationValue <= 0) {
      newErrors.durationValue = 'Duration must be greater than 0'
    }

    if (formData.basePrice < 0) {
      newErrors.basePrice = 'Price cannot be negative'
    }

    if (formData.deviceLimit <= 0) {
      newErrors.deviceLimit = 'Device limit must be at least 1'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    if (!currentBusinessId || !wlanId) {
      await alert({
        title: 'Missing Information',
        description: 'Missing business or WLAN information'
      })
      return
    }

    try {
      setSaving(true)

      const response = await fetch('/api/r710/token-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentBusinessId,
          wlanId: wlanId,
          ...formData
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create package' }))
        await alert({
          title: 'Creation Failed',
          description: errorData.error || 'Failed to create package'
        })
        return
      }

      await alert({
        title: 'Success',
        description: 'Token package created successfully!'
      })
      router.push('/r710-portal/token-configs')
    } catch (error) {
      console.error('Error creating token config:', error)
      await alert({
        title: 'Error',
        description: 'Failed to create token package. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Link href="/r710-portal/token-configs" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Token Package
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Define a new R710 WiFi token package for {currentBusiness?.name}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Package Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Package Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., 1 Hour WiFi, 1 Day Access"
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe this package..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="durationValue"
                value={formData.durationValue}
                onChange={handleChange}
                min="1"
                className={`w-full px-3 py-2 border ${errors.durationValue ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
              />
              {errors.durationValue && <p className="mt-1 text-sm text-red-500">{errors.durationValue}</p>}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Whole numbers only (e.g., 1, 2, 24)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration Unit <span className="text-red-500">*</span>
              </label>
              <select
                name="durationUnit"
                value={formData.durationUnit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              >
                <option value="hour_Hours">Hours</option>
                <option value="day_Days">Days</option>
                <option value="week_Weeks">Weeks</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Time unit for access duration
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base Price (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border ${errors.basePrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
              />
              {errors.basePrice && <p className="mt-1 text-sm text-red-500">{errors.basePrice}</p>}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter $0.00 for free tokens
              </p>
            </div>

            {/* Device Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Device Limit <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="deviceLimit"
                value={formData.deviceLimit}
                onChange={handleChange}
                min="1"
                className={`w-full px-3 py-2 border ${errors.deviceLimit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white`}
              />
              {errors.deviceLimit && <p className="mt-1 text-sm text-red-500">{errors.deviceLimit}</p>}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Max concurrent devices per token
              </p>
            </div>
          </div>

          {/* Auto-Generation Settings */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Auto-Generation Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Auto-Generate Threshold
                </label>
                <input
                  type="number"
                  name="autoGenerateThreshold"
                  value={formData.autoGenerateThreshold}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Generate tokens when available count drops below this
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Auto-Generate Quantity
                </label>
                <input
                  type="number"
                  name="autoGenerateQuantity"
                  value={formData.autoGenerateQuantity}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  How many tokens to generate at once
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Order
              </label>
              <input
                type="number"
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Lower numbers appear first (0 = first)
              </p>
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <label className="flex items-center space-x-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Active (available for use)
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/r710-portal/token-configs"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
