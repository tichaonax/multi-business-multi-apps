'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { hasPermission } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { useConfirm } from '@/components/ui/confirm-modal'

interface TokenConfig {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  bandwidthDownMb: number
  bandwidthUpMb: number
  basePrice: number
  isActive: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
  stats?: {
    tokensCreated: number
    businessesUsing: number
  }
}

export default function TokenConfigsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()
  const confirm = useConfirm()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tokenConfigs, setTokenConfigs] = useState<TokenConfig[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editingConfig, setEditingConfig] = useState<TokenConfig | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 60,
    bandwidthDownMb: 10,
    bandwidthUpMb: 5,
    basePrice: 50,
    isActive: true,
    displayOrder: 0,
  })

  const canConfigure = session?.user ? hasPermission(session.user, 'canConfigureWifiTokens') : false

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    // Check business type
    if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
      setErrorMessage('WiFi tokens are only available for restaurant and grocery businesses')
      setLoading(false)
      return
    }

    if (!canConfigure) {
      router.push('/dashboard')
      return
    }

    fetchTokenConfigs()
  }, [currentBusinessId, businessLoading])

  const fetchTokenConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/wifi-portal/token-configs`)

      if (response.ok) {
        const data = await response.json()
        setTokenConfigs(data.tokenConfigs || [])
      } else {
        throw new Error('Failed to fetch token configurations')
      }
    } catch (error) {
      console.error('Error fetching token configs:', error)
      setErrorMessage('Failed to load token configurations')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingConfig(null)
    setFormData({
      name: '',
      description: '',
      durationMinutes: 60,
      bandwidthDownMb: 10,
      bandwidthUpMb: 5,
      basePrice: 50,
      isActive: true,
      displayOrder: 0,
    })
    setShowEditor(true)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const handleEdit = (config: TokenConfig) => {
    setEditingConfig(config)
    setFormData({
      name: config.name,
      description: config.description || '',
      durationMinutes: config.durationMinutes,
      bandwidthDownMb: config.bandwidthDownMb,
      bandwidthUpMb: config.bandwidthUpMb,
      basePrice: config.basePrice,
      isActive: config.isActive,
      displayOrder: config.displayOrder,
    })
    setShowEditor(true)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const url = editingConfig
        ? `/api/wifi-portal/token-configs/${editingConfig.id}`
        : `/api/wifi-portal/token-configs`

      const method = editingConfig ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(editingConfig ? 'Token configuration updated!' : 'Token configuration created!')
        setShowEditor(false)
        fetchTokenConfigs()
      } else {
        setErrorMessage(data.error || 'Failed to save token configuration')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save token configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (config: TokenConfig) => {
    const confirmed = await confirm({
      title: 'Delete Token Configuration',
      description: `Are you sure you want to delete "${config.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setSaving(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/wifi-portal/token-configs/${config.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Token configuration deleted successfully')
        fetchTokenConfigs()
      } else {
        setErrorMessage(data.error || data.details || 'Failed to delete token configuration')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to delete token configuration')
    } finally {
      setSaving(false)
    }
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours}h ${mins}m`
  }

  if (businessLoading || loading) {
    return (
      <ContentLayout title="Token Configurations">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
    return (
      <ContentLayout title="Token Configurations">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            WiFi tokens are only available for restaurant and grocery businesses.
          </p>
        </div>
      </ContentLayout>
    )
  }

  if (!canConfigure) {
    return (
      <ContentLayout title="Token Configurations">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            You do not have permission to configure WiFi tokens.
          </p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Token Configurations"
      description="Manage global WiFi token packages and base pricing"
    >
      {/* Status Messages */}
      {errorMessage && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {/* Create Button */}
      {!showEditor && (
        <div className="mb-6">
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Create Token Package
          </button>
        </div>
      )}

      {/* Editor Form */}
      {showEditor && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingConfig ? 'Edit Token Configuration' : 'Create Token Configuration'}
            </h3>
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Package Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 4 Hours WiFi Access"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the package"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={formData.durationMinutes || ''}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) || 0 })}
                min="1"
                max="43200"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max: 43,200 (30 days)</p>
            </div>

            {/* Base Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Price (₱) *
              </label>
              <input
                type="number"
                value={formData.basePrice || ''}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Default admin price</p>
            </div>

            {/* Bandwidth Down */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Download (MB) *
              </label>
              <input
                type="number"
                value={formData.bandwidthDownMb || ''}
                onChange={(e) => setFormData({ ...formData, bandwidthDownMb: parseInt(e.target.value, 10) || 0 })}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            {/* Bandwidth Up */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload (MB) *
              </label>
              <input
                type="number"
                value={formData.bandwidthUpMb || ''}
                onChange={(e) => setFormData({ ...formData, bandwidthUpMb: parseInt(e.target.value, 10) || 0 })}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingConfig ? 'Update Package' : 'Create Package'}
            </button>
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Token Configs List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tokenConfigs.map((config) => (
          <div
            key={config.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{config.name}</h3>
                {!config.isActive && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Inactive</span>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">₱{config.basePrice}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">base price</div>
              </div>
            </div>

            {config.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{config.description}</p>
            )}

            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300 mb-3">
              <div>⏱️ {formatDuration(config.durationMinutes)}</div>
              <div>📥 {config.bandwidthDownMb} MB down / 📤 {config.bandwidthUpMb} MB up</div>
            </div>

            {config.stats && (
              <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2 mb-3">
                <div>Tokens created: {config.stats.tokensCreated}</div>
                <div>Businesses using: {config.stats.businessesUsing}</div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(config)}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(config)}
                disabled={saving}
                className="flex-1 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {tokenConfigs.length === 0 && !showEditor && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No token configurations yet.</p>
          <button
            onClick={handleCreate}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Create your first token package →
          </button>
        </div>
      )}
    </ContentLayout>
  )
}
