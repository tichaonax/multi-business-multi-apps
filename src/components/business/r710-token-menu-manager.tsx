'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/format-currency'
import { useAlert } from '@/components/ui/confirm-modal'

interface TokenConfig {
  id: string
  name: string
  description: string | null
  durationValue: number
  durationUnit: string
  deviceLimit: number
  basePrice: number
  isActive: boolean
  availableQuantity?: number
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

interface R710TokenMenuManagerProps {
  businessId: string
  businessType: 'restaurant' | 'grocery'
}

export function R710TokenMenuManager({ businessId, businessType }: R710TokenMenuManagerProps) {
  const alert = useAlert()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [tokenConfigs, setTokenConfigs] = useState<TokenConfig[]>([])
  const [businessMenuItems, setBusinessMenuItems] = useState<BusinessTokenMenuItem[]>([])
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchData()
  }, [businessId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch token configs with businessId
      const configsRes = await fetch(`/api/r710/token-configs?businessId=${businessId}`)
      if (!configsRes.ok) {
        throw new Error('Failed to fetch token configs')
      }

      const configsData = await configsRes.json()
      const activeConfigs = (configsData.configs || []).filter((c: TokenConfig) => c.isActive)
      setTokenConfigs(activeConfigs)

      // Fetch available quantities for each config
      await fetchAvailableQuantities(activeConfigs)

      // Fetch business menu items
      const menuRes = await fetch(`/api/business/${businessId}/r710-tokens`)
      if (menuRes.ok) {
        const menuData = await menuRes.json()
        setBusinessMenuItems(menuData.menuItems || [])
      } else if (menuRes.status !== 404) {
        console.error('Failed to fetch menu items')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      await alert({
        title: 'Error',
        description: 'Failed to load R710 token configurations'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableQuantities = async (configs: TokenConfig[]) => {
    try {
      // Fetch available tokens from database
      const tokensRes = await fetch(`/api/r710/tokens?businessId=${businessId}&status=AVAILABLE`)
      if (tokensRes.ok) {
        const tokensData = await tokensRes.json()
        const tokens = tokensData.tokens || []

        // Count tokens by config
        const quantityMap = tokens.reduce((acc: Record<string, number>, token: any) => {
          const configId = token.tokenConfig?.id
          if (configId && token.status === 'AVAILABLE') {
            acc[configId] = (acc[configId] || 0) + 1
          }
          return acc
        }, {})

        // Update configs with quantities
        setTokenConfigs(prev => prev.map(config => ({
          ...config,
          availableQuantity: quantityMap[config.id] || 0
        })))
      }
    } catch (error) {
      console.error('Error fetching available quantities:', error)
    }
  }

  const formatDuration = (value: number, unit: string) => {
    const unitDisplay = unit.split('_')[1] || unit
    return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
  }

  const handleToggleConfig = async (configId: string, currentlyActive: boolean) => {
    try {
      setSaving(configId)

      if (!currentlyActive) {
        // Adding to menu - create menu item
        const config = tokenConfigs.find(c => c.id === configId)
        if (!config) return

        const response = await fetch(`/api/business/${businessId}/r710-tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenConfigId: configId,
            businessPrice: config.basePrice,
            isActive: true,
            displayOrder: businessMenuItems.length
          })
        })

        if (!response.ok) {
          throw new Error('Failed to add token to menu')
        }

        await alert({
          title: 'Success',
          description: `${config.name} added to ${businessType} menu`
        })
      } else {
        // Removing from menu
        const menuItem = businessMenuItems.find(m => m.tokenConfigId === configId)
        if (!menuItem) return

        const response = await fetch(`/api/business/${businessId}/r710-tokens/${menuItem.id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Failed to remove token from menu')
        }

        await alert({
          title: 'Success',
          description: 'Token removed from menu'
        })
      }

      await fetchData()
    } catch (error) {
      console.error('Error toggling config:', error)
      await alert({
        title: 'Error',
        description: 'Failed to update menu'
      })
    } finally {
      setSaving(null)
    }
  }

  const handleUpdatePrice = async (menuItemId: string, configId: string) => {
    try {
      const priceString = editingPrices[configId]?.trim()

      // Check for empty or invalid input
      if (!priceString || priceString === '') {
        await alert({
          title: 'Invalid Price',
          description: 'Please enter a price'
        })
        return
      }

      const newPrice = parseFloat(priceString)
      if (isNaN(newPrice) || newPrice < 0) {
        await alert({
          title: 'Invalid Price',
          description: 'Please enter a valid price (must be 0 or greater)'
        })
        return
      }

      setSaving(configId)

      const response = await fetch(`/api/business/${businessId}/r710-tokens/${menuItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessPrice: newPrice
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update price')
      }

      await alert({
        title: 'Success',
        description: 'Price updated successfully'
      })

      // Clear editing state and refresh
      setEditingPrices(prev => {
        const newState = { ...prev }
        delete newState[configId]
        return newState
      })

      await fetchData()
    } catch (error) {
      console.error('Error updating price:', error)
      await alert({
        title: 'Error',
        description: 'Failed to update price'
      })
    } finally {
      setSaving(null)
    }
  }

  const isConfigInMenu = (configId: string) => {
    return businessMenuItems.some(m => m.tokenConfigId === configId && m.isActive)
  }

  const getMenuItemPrice = (configId: string) => {
    const menuItem = businessMenuItems.find(m => m.tokenConfigId === configId)
    return menuItem?.businessPrice
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading token configurations...</p>
        </div>
      </div>
    )
  }

  if (tokenConfigs.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-2">No Token Configurations</h3>
        <p className="text-blue-800 mb-4">
          No active R710 token configurations found. Please create token configurations in the R710 Portal first.
        </p>
        <a
          href="/r710-portal/token-configs"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
        >
          Go to Token Configurations
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Configure R710 WiFi Token Menu</h3>
        <p className="text-sm text-blue-800 dark:text-blue-400">
          Toggle tokens on/off to make them available in your {businessType} POS. You can also customize the price for each token type.
        </p>
      </div>

      {/* Token Configurations */}
      <div className="grid grid-cols-1 gap-4">
        {tokenConfigs.map(config => {
          const inMenu = isConfigInMenu(config.id)
          const menuItem = businessMenuItems.find(m => m.tokenConfigId === config.id)
          const currentPrice = getMenuItemPrice(config.id)
          const isEditing = !!editingPrices[config.id]
          const isSaving = saving === config.id

          return (
            <div
              key={config.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all ${
                inMenu
                  ? 'border-green-500 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {config.name}
                      </h3>
                      {inMenu && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          In Menu
                        </span>
                      )}
                    </div>
                    {config.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {config.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Duration:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {formatDuration(config.durationValue, config.durationUnit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Device Limit:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {config.deviceLimit} device{config.deviceLimit > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Base Price:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {formatCurrency(config.basePrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Available:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {config.availableQuantity || 0} tokens
                        </span>
                      </div>
                    </div>

                    {/* Price Configuration */}
                    {inMenu && (
                      <div className="mt-4 flex items-center space-x-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Menu Price:
                        </label>
                        {!isEditing ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(currentPrice || config.basePrice)}
                            </span>
                            <button
                              onClick={() => setEditingPrices(prev => ({
                                ...prev,
                                [config.id]: (currentPrice || config.basePrice).toString()
                              }))}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500 dark:text-gray-400">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={editingPrices[config.id] || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                // Allow empty string, numbers, and decimal point
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  setEditingPrices(prev => ({
                                    ...prev,
                                    [config.id]: value
                                  }))
                                }
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                              disabled={isSaving}
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdatePrice(menuItem!.id, config.id)}
                              disabled={isSaving}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingPrices(prev => {
                                const newState = { ...prev }
                                delete newState[config.id]
                                return newState
                              })}
                              disabled={isSaving}
                              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Toggle Switch */}
                  <div className="ml-6">
                    <button
                      onClick={() => handleToggleConfig(config.id, inMenu)}
                      disabled={isSaving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        inMenu
                          ? 'bg-green-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          inMenu ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
