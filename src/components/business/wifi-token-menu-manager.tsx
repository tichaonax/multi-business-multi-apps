'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/format-currency'
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
}

interface BusinessTokenMenuItem {
  id: string
  businessId: string
  tokenConfigId: string
  businessPrice: number
  isActive: boolean
  displayOrder: number
  tokenConfig: TokenConfig
}

interface WifiTokenMenuManagerProps {
  businessId: string
  businessType: 'restaurant' | 'grocery'
}

export function WifiTokenMenuManager({ businessId, businessType }: WifiTokenMenuManagerProps) {
  const confirm = useConfirm()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [tokenConfigs, setTokenConfigs] = useState<TokenConfig[]>([])
  const [businessMenuItems, setBusinessMenuItems] = useState<BusinessTokenMenuItem[]>([])
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [businessId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)

      const [configsRes, menuItemsRes] = await Promise.all([
        fetch('/api/wifi-portal/token-configs'),
        fetch(`/api/business/${businessId}/wifi-tokens`)
      ])

      if (configsRes.ok) {
        const configsData = await configsRes.json()
        setTokenConfigs(configsData.tokenConfigs.filter((c: TokenConfig) => c.isActive))
      }

      if (menuItemsRes.ok) {
        const menuData = await menuItemsRes.json()
        setBusinessMenuItems(menuData.menuItems || [])
      } else if (menuItemsRes.status !== 404) {
        throw new Error('Failed to fetch menu items')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setErrorMessage('Failed to load WiFi token configurations')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours}h ${mins}m`
  }

  const isInMenu = (tokenConfigId: string): boolean => {
    return businessMenuItems.some(item => item.tokenConfigId === tokenConfigId)
  }

  const getMenuItem = (tokenConfigId: string): BusinessTokenMenuItem | undefined => {
    return businessMenuItems.find(item => item.tokenConfigId === tokenConfigId)
  }

  const handleAddToMenu = async (tokenConfig: TokenConfig) => {
    const customPrice = editingPrices[tokenConfig.id] || tokenConfig.basePrice.toString()
    const price = parseFloat(customPrice)

    if (isNaN(price) || price <= 0) {
      setErrorMessage('Please enter a valid price')
      return
    }

    try {
      setSaving(tokenConfig.id)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/business/${businessId}/wifi-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenConfigId: tokenConfig.id,
          businessPrice: price,
          isActive: true,
          displayOrder: 0,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`${tokenConfig.name} added to ${businessType} menu!`)
        fetchData()
        delete editingPrices[tokenConfig.id]
      } else {
        setErrorMessage(data.error || 'Failed to add token to menu')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to add token to menu')
    } finally {
      setSaving(null)
    }
  }

  const handleUpdatePrice = async (menuItem: BusinessTokenMenuItem) => {
    const customPrice = editingPrices[menuItem.tokenConfigId] || menuItem.businessPrice.toString()
    const price = parseFloat(customPrice)

    if (isNaN(price) || price <= 0) {
      setErrorMessage('Please enter a valid price')
      return
    }

    try {
      setSaving(menuItem.tokenConfigId)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/business/${businessId}/wifi-tokens/${menuItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessPrice: price,
          isActive: menuItem.isActive,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Price updated successfully!')
        fetchData()
        delete editingPrices[menuItem.tokenConfigId]
      } else {
        setErrorMessage(data.error || 'Failed to update price')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update price')
    } finally {
      setSaving(null)
    }
  }

  const handleRemoveFromMenu = async (menuItem: BusinessTokenMenuItem) => {
    const confirmed = await confirm({
      title: 'Remove from Menu',
      description: `Remove "${menuItem.tokenConfig.name}" from your ${businessType} menu?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setSaving(menuItem.tokenConfigId)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/business/${businessId}/wifi-tokens/${menuItem.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Token removed from menu!')
        fetchData()
      } else {
        setErrorMessage(data.error || 'Failed to remove token from menu')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to remove token from menu')
    } finally {
      setSaving(null)
    }
  }

  const handleToggleActive = async (menuItem: BusinessTokenMenuItem) => {
    try {
      setSaving(menuItem.tokenConfigId)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/business/${businessId}/wifi-tokens/${menuItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessPrice: menuItem.businessPrice,
          isActive: !menuItem.isActive,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Token ${!menuItem.isActive ? 'enabled' : 'disabled'} in menu!`)
        fetchData()
      } else {
        setErrorMessage(data.error || 'Failed to update token status')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update token status')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Status Messages */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">ℹ️ About WiFi Token Menu</h3>
        <p className="text-sm text-blue-800">
          Add WiFi access tokens to your {businessType} menu with custom pricing.
          Tokens added here will appear in your POS system and can be sold to customers.
        </p>
      </div>

      {/* Token Configurations List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Available WiFi Packages</h2>

        {tokenConfigs.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-8 text-center">
            <p className="text-gray-600">No WiFi packages configured yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Please configure token packages in WiFi Portal → Token Configurations.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tokenConfigs.map((config) => {
              const menuItem = getMenuItem(config.id)
              const inMenu = isInMenu(config.id)
              const customPrice = editingPrices[config.id] || (menuItem?.businessPrice.toString() || config.basePrice.toString())

              return (
                <div
                  key={config.id}
                  className={`border-2 rounded-lg p-6 ${
                    inMenu ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{config.name}</h3>
                        {inMenu && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-medium">
                            In Menu
                          </span>
                        )}
                        {inMenu && !menuItem?.isActive && (
                          <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                      {config.description && (
                        <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">⏱️ Duration:</span>
                        <span className="font-medium">{formatDuration(config.durationMinutes)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">📥 Download:</span>
                        <span className="font-medium">{config.bandwidthDownMb} MB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">📤 Upload:</span>
                        <span className="font-medium">{config.bandwidthUpMb} MB</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Base Price (Reference)
                        </label>
                        <div className="text-lg font-medium text-gray-500">
                          {formatCurrency(config.basePrice)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Your {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Price *
                        </label>
                        <input
                          type="number"
                          value={customPrice}
                          onChange={(e) => setEditingPrices({ ...editingPrices, [config.id]: e.target.value })}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your price"
                        />
                        {menuItem && parseFloat(customPrice) !== menuItem.businessPrice && (
                          <p className="text-xs text-orange-600 mt-1">
                            Price changed - click Update to save
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    {!inMenu ? (
                      <button
                        onClick={() => handleAddToMenu(config)}
                        disabled={saving === config.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving === config.id ? 'Adding...' : '+ Add to Menu'}
                      </button>
                    ) : (
                      <>
                        {menuItem && parseFloat(customPrice) !== menuItem.businessPrice && (
                          <button
                            onClick={() => handleUpdatePrice(menuItem)}
                            disabled={saving === config.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {saving === config.id ? 'Updating...' : 'Update Price'}
                          </button>
                        )}

                        {menuItem && (
                          <>
                            <button
                              onClick={() => handleToggleActive(menuItem)}
                              disabled={saving === config.id}
                              className={`px-4 py-2 rounded-lg disabled:opacity-50 ${
                                menuItem.isActive
                                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {menuItem.isActive ? 'Disable' : 'Enable'}
                            </button>

                            <button
                              onClick={() => handleRemoveFromMenu(menuItem)}
                              disabled={saving === config.id}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              {saving === config.id ? 'Removing...' : 'Remove from Menu'}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
