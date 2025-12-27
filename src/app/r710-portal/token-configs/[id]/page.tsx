'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { isSystemAdmin } from '@/lib/permission-utils'
import { useConfirm, useAlert } from '@/components/ui/confirm-modal'
import Link from 'next/link'

export default function EditTokenConfigPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <EditTokenConfigContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function EditTokenConfigContent() {
  const router = useRouter()
  const params = useParams()
  const configId = params.id as string
  const { data: session } = useSession()
  const user = session?.user as any
  const confirm = useConfirm()
  const alert = useAlert()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Redirect if not admin
  if (!isSystemAdmin(user)) {
    router.push('/r710-portal/token-configs')
    return null
  }

  useEffect(() => {
    loadTokenConfig()
  }, [configId])

  const loadTokenConfig = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/r710/token-configs/${configId}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        await alert({
          title: 'Load Failed',
          description: 'Failed to load token configuration'
        })
        router.push('/r710-portal/token-configs')
        return
      }

      const data = await response.json()
      const config = data.config

      setFormData({
        name: config.name || '',
        description: config.description || '',
        durationValue: config.durationValue || 1,
        durationUnit: config.durationUnit || 'hour_Hours',
        deviceLimit: config.deviceLimit || 1,
        basePrice: config.basePrice || 0,
        autoGenerateThreshold: config.autoGenerateThreshold || 5,
        autoGenerateQuantity: config.autoGenerateQuantity || 20,
        displayOrder: config.displayOrder || 0,
        isActive: config.isActive !== false
      })
    } catch (error) {
      console.error('Error loading token config:', error)
      await alert({
        title: 'Error',
        description: 'Failed to load token configuration'
      })
      router.push('/r710-portal/token-configs')
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

    try {
      setSaving(true)

      const response = await fetch(`/api/r710/token-configs/${configId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update package' }))
        await alert({
          title: 'Update Failed',
          description: errorData.error || 'Failed to update package'
        })
        return
      }

      await alert({
        title: 'Success',
        description: 'Token package updated successfully!'
      })
      router.push('/r710-portal/token-configs')
    } catch (error) {
      console.error('Error updating token config:', error)
      await alert({
        title: 'Error',
        description: 'Failed to update token package. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Token Package?',
      description: 'This action cannot be undone. All existing tokens for this package will remain, but no new tokens can be generated with this configuration.',
      confirmText: 'Delete Package',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      setDeleting(true)

      const response = await fetch(`/api/r710/token-configs/${configId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete package' }))
        await alert({
          title: 'Delete Failed',
          description: errorData.error || 'Cannot delete package with existing tokens'
        })
        return
      }

      await alert({
        title: 'Success',
        description: 'Token package deleted successfully!'
      })
      router.push('/r710-portal/token-configs')
    } catch (error) {
      console.error('Error deleting token config:', error)
      await alert({
        title: 'Error',
        description: 'Failed to delete token package. Please try again.'
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading token package...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/r710-portal/token-configs" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Token Package
            </h1>
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting...' : 'Delete Package'}
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Update R710 WiFi token package configuration
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
