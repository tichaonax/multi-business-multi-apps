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
        const activeConfigs = configsData.tokenConfigs.filter((c: TokenConfig) => c.isActive)
        setTokenConfigs(activeConfigs)

        // Fetch available quantities from ESP32 for each config
        await fetchAvailableQuantities(activeConfigs)
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

  const fetchAvailableQuantities = async (configs: TokenConfig[]) => {
    try {
      // Fetch all UNUSED tokens from database to check for sales
      const dbTokensRes = await fetch(`/api/wifi-portal/tokens?businessId=${businessId}&status=UNUSED&limit=1000`)

      if (!dbTokensRes.ok) {
        console.error('Failed to fetch database tokens')
        return
      }

      const dbTokensData = await dbTokensRes.json()
      const dbTokens = dbTokensData.tokens || []

      // Create a set of sold token IDs (from BOTH DIRECT and POS channels)
      const soldTokenIds = new Set(
        dbTokens
          .filter((t: any) => t.sale !== null && t.sale !== undefined)
          .map((t: any) => t.token)
      )

      // Count unsold UNUSED tokens by tokenConfigId from database
      const dbQuantityMap = dbTokens.reduce((acc: Record<string, number>, token: any) => {
        const configId = token.tokenConfig?.id
        // Include only UNUSED tokens that have NOT been sold (either channel)
        if (configId && token.status === 'UNUSED' && !soldTokenIds.has(token.token)) {
          acc[configId] = (acc[configId] || 0) + 1
        }
        return acc
      }, {})

      // Get the authoritative list of available tokens from ESP32 with proper pagination
      let esp32Tokens: any[] = []
      let offset = 0
      const batchSize = 100 // Fetch in batches to respect rate limits

      try {
        while (true) {
          const esp32TokensRes = await fetch(
            `/api/wifi-portal/integration/tokens/list?businessId=${businessId}&status=unused&limit=${batchSize}&offset=${offset}`
          )

          if (!esp32TokensRes.ok) {
            console.warn(`Failed to fetch ESP32 tokens batch at offset ${offset}:`, esp32TokensRes.status)
            break
          }

          const esp32Data = await esp32TokensRes.json()
          if (!esp32Data.success || !esp32Data.tokens) {
            console.warn(`Invalid ESP32 response at offset ${offset}:`, esp32Data)
            break
          }

          const batchTokens = esp32Data.tokens
          esp32Tokens = esp32Tokens.concat(batchTokens)

          // Check if there are more tokens available using the API's has_more flag
          if (!esp32Data.has_more) {
            break
          }

          // Move to next batch
          offset += batchSize

          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        console.log(`Fetched ${esp32Tokens.length} ESP32 tokens in ${Math.ceil((offset + (esp32Tokens.length % batchSize || batchSize)) / batchSize)} batches`)
      } catch (esp32Error) {
        console.warn('Failed to fetch ESP32 tokens:', esp32Error)
      }

      // Filter ESP32 tokens: exclude those that are marked as sold in database
      const availableTokens = esp32Tokens.filter(esp32Token => {
        // Include token if it's not marked as sold in database
        return !soldTokenIds.has(esp32Token.token)
      })

      // Count available tokens by tokenConfigId
      const combinedQuantityMap: Record<string, number> = {}
      availableTokens.forEach(token => {
        // Find matching config by duration and bandwidth
        const matchingConfig = configs.find(config =>
          config.durationMinutes === token.durationMinutes &&
          config.bandwidthDownMb === token.bandwidthDownMb &&
          config.bandwidthUpMb === token.bandwidthUpMb
        )
        
        if (matchingConfig) {
          combinedQuantityMap[matchingConfig.id] = (combinedQuantityMap[matchingConfig.id] || 0) + 1
        }
      })

      // Update configs with available quantities
      setTokenConfigs(prev => prev.map(config => ({
        ...config,
        availableQuantity: combinedQuantityMap[config.id] || 0
      })))
    } catch (error) {
      console.error('Error fetching available quantities:', error)
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

    if (isNaN(price) || price < 0) {
      setErrorMessage('Please enter a valid price (0 or greater)')
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

    if (isNaN(price) || price < 0) {
      setErrorMessage('Please enter a valid price (0 or greater)')
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Status Messages */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">ℹ️ About WiFi Token Menu</h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Add WiFi access tokens to your {businessType} menu with custom pricing.
          Tokens added here will appear in your POS system and can be sold to customers.
        </p>
      </div>

      {/* Token Configurations List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Available WiFi Packages</h2>

        {tokenConfigs.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">No WiFi packages configured yet.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
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
                    inMenu ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{config.name}</h3>
                        {inMenu && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium flex items-center gap-1">
                            ✓ In Menu
                          </span>
                        )}
                        {inMenu && !menuItem?.isActive && (
                          <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                      {config.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{config.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">⏱️ Duration:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatDuration(config.durationMinutes)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">📥 Download:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{config.bandwidthDownMb} MB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">📤 Upload:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{config.bandwidthUpMb} MB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">📦 Available:</span>
                        <span className={`font-medium ${config.availableQuantity === 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {config.availableQuantity || 0} tokens
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Base Price (Reference)
                        </label>
                        <div className="text-lg font-medium text-gray-500">
                          {formatCurrency(config.basePrice)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Your {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Price * <span className="text-xs font-normal text-green-600 dark:text-green-400">(0 = Free Promo)</span>
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={customPrice}
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow empty, numbers, and decimal point
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setEditingPrices({ ...editingPrices, [config.id]: value })
                            }
                          }}
                          onBlur={(e) => {
                            // Clean up on blur
                            const value = e.target.value
                            if (value === '' || value === '.') {
                              setEditingPrices({ ...editingPrices, [config.id]: '0' })
                            } else {
                              const parsed = parseFloat(value)
                              if (!isNaN(parsed)) {
                                setEditingPrices({ ...editingPrices, [config.id]: parsed.toString() })
                              }
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Enter price: 0 for free, 5.00, etc."
                        />
                        {parseFloat(customPrice) === 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ✓ Free promotional token
                          </p>
                        )}
                        {menuItem && parseFloat(customPrice) !== menuItem.businessPrice && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
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
