'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/format-currency'
import { formatDataAmount, formatDuration } from '@/lib/printing/format-utils'
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
  durationMinutesOverride: number | null
  bandwidthDownMbOverride: number | null
  bandwidthUpMbOverride: number | null
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
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [tokenConfigs, setTokenConfigs] = useState<TokenConfig[]>([])
  const [businessMenuItems, setBusinessMenuItems] = useState<BusinessTokenMenuItem[]>([])
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({})
  const [customizingTokens, setCustomizingTokens] = useState<Record<string, boolean>>({})
  const [editingOverrides, setEditingOverrides] = useState<Record<string, {
    durationMinutes?: string
    bandwidthDownMb?: string
    bandwidthUpMb?: string
  }>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [syncingESP32, setSyncingESP32] = useState(false)

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
      // STEP 1: Quick database counts for immediate display (non-blocking)
      console.log('📊 Step 1: Fetching database counts for quick display...')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        const dbTokensRes = await fetch(
          `/api/wifi-portal/tokens?businessId=${businessId}&status=UNUSED&limit=1000`,
          { signal: controller.signal }
        )
        clearTimeout(timeout)

        if (dbTokensRes.ok) {
          const dbTokensData = await dbTokensRes.json()
          const dbTokens = dbTokensData.tokens || []

          // Count tokens by config (initial estimate)
          const dbQuantityMap = dbTokens.reduce((acc: Record<string, number>, token: any) => {
            const configId = token.tokenConfigId
            if (configId && token.status === 'UNUSED') {
              acc[configId] = (acc[configId] || 0) + 1
            }
            return acc
          }, {})

          // Set initial counts from database (immediate display)
          setTokenConfigs(prev => prev.map(config => ({
            ...config,
            availableQuantity: dbQuantityMap[config.id] || 0
          })))

          console.log('✅ Database counts displayed:', dbQuantityMap)
        } else {
          console.warn('⚠️ Database fetch failed, showing 0 counts')
          setTokenConfigs(prev => prev.map(config => ({ ...config, availableQuantity: 0 })))
        }
      } catch (fetchError) {
        clearTimeout(timeout)
        console.warn('⚠️ Database fetch error:', fetchError)
        setTokenConfigs(prev => prev.map(config => ({ ...config, availableQuantity: 0 })))
      }

      // STEP 2: Progressive ESP32 sync in background (non-blocking)
      console.log('🔄 Step 2: Starting background ESP32 sync...')
      setSyncingESP32(true)

      // Run ESP32 sync in background without blocking
      syncESP32Counts(configs).finally(() => {
        setSyncingESP32(false)
        console.log('✅ ESP32 sync completed')
      })

    } catch (error) {
      console.error('❌ Error in fetchAvailableQuantities:', error)
      setTokenConfigs(prev => prev.map(config => ({ ...config, availableQuantity: 0 })))
    }
  }

  const syncESP32Counts = async (configs: TokenConfig[]) => {
    try {
      // Get portal integration to call ESP32 API
      const integrationRes = await fetch(`/api/business/${businessId}/portal-integration`)
      if (!integrationRes.ok) {
        console.warn('⚠️ No portal integration found, skipping ESP32 sync')
        return
      }

      const integrationData = await integrationRes.json()
      const integration = integrationData.integration

      if (!integration?.isActive) {
        console.warn('⚠️ Portal integration inactive, skipping ESP32 sync')
        return
      }

      // Get database tokens first (needed for tokenConfigId mapping)
      console.log('📊 Fetching database tokens for mapping...')
      const dbTokensRes = await fetch(
        `/api/wifi-portal/tokens?businessId=${businessId}&status=UNUSED&limit=2000`
      )

      if (!dbTokensRes.ok) {
        console.warn('⚠️ Database token fetch failed, skipping ESP32 sync')
        return
      }

      const dbTokensData = await dbTokensRes.json()
      const dbTokens = dbTokensData.tokens || []

      // Create mapping: ESP32 token code -> tokenConfigId
      const tokenToConfigMap = new Map<string, string>()
      dbTokens.forEach((t: any) => {
        if (t.token && t.tokenConfigId) {
          tokenToConfigMap.set(t.token, t.tokenConfigId)
        }
      })

      // Create set of sold tokens (have wifi_token_sales records)
      const soldTokenCodes = new Set(
        dbTokens
          .filter((t: any) => t.sale !== null && t.sale !== undefined)
          .map((t: any) => t.token)
      )

      console.log(`📊 Database: ${dbTokens.length} tokens, ${soldTokenCodes.size} sold`)

      // Fetch ESP32 tokens in batches (progressive updates)
      // CRITICAL: ESP32 limit is 20 tokens per request (not 100 or 200)
      const BATCH_SIZE = 20
      let offset = 0
      let hasMore = true
      const esp32QuantityMap: Record<string, number> = {}

      console.log('📡 Starting batched ESP32 fetch...')

      while (hasMore) {
        try {
          console.log(`📡 Batch ${Math.floor(offset / BATCH_SIZE) + 1}: Fetching tokens ${offset}-${offset + BATCH_SIZE}...`)

          const batchRes = await fetch(
            `/api/wifi-portal/esp32-tokens?businessId=${businessId}&status=unused&limit=${BATCH_SIZE}&offset=${offset}`,
            {
              signal: AbortSignal.timeout(10000) // 10 second timeout per batch
            }
          )

          if (!batchRes.ok) {
            console.warn(`⚠️ Batch ${Math.floor(offset / BATCH_SIZE) + 1} failed, stopping`)
            break
          }

          const batchData = await batchRes.json()
          const batchTokens = batchData.tokens || []

          console.log(`✅ Batch ${Math.floor(offset / BATCH_SIZE) + 1}: Received ${batchTokens.length} tokens`)

          // Process this batch
          batchTokens.forEach((espToken: any) => {
            // Skip sold tokens
            if (soldTokenCodes.has(espToken.token)) {
              return
            }

            // Get tokenConfigId from database mapping
            const configId = tokenToConfigMap.get(espToken.token)
            if (configId) {
              esp32QuantityMap[configId] = (esp32QuantityMap[configId] || 0) + 1
            }
          })

          // Progressive UI update after each batch
          setTokenConfigs(prev => prev.map(config => ({
            ...config,
            availableQuantity: esp32QuantityMap[config.id] || 0
          })))

          console.log(`📊 Progressive update: ${Object.values(esp32QuantityMap).reduce((a, b) => a + b, 0)} tokens counted`)

          // Check if there are more tokens
          hasMore = batchData.hasMore === true
          offset += BATCH_SIZE

          // Safety limit: max 50 batches (1000 tokens with 20 per batch)
          if (offset >= 1000) {
            console.log('⚠️ Safety limit reached (1000 tokens), stopping')
            break
          }

        } catch (batchError: any) {
          console.error(`❌ Batch ${Math.floor(offset / BATCH_SIZE) + 1} error:`, batchError.message)
          break
        }
      }

      console.log('✅ ESP32 sync completed:', esp32QuantityMap)

    } catch (error: any) {
      console.error('❌ ESP32 sync error:', error)
      // Don't update counts on error - keep database estimates
    }
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
      setErrorMessage('Please enter a valid price (must be 0 or greater)')
      return
    }

    // Allow $0 for free promotional tokens
    if (price === 0) {
      const confirmed = await confirm({
        title: 'Free Promotional Token',
        description: `Add "${tokenConfig.name}" as a free token (price = $0)?`,
        confirmText: 'Add as Free',
        cancelText: 'Cancel',
      })
      if (!confirmed) return
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
      setErrorMessage('Please enter a valid price (must be 0 or greater)')
      return
    }

    // Confirm if changing to $0
    if (price === 0 && menuItem.businessPrice > 0) {
      const confirmed = await confirm({
        title: 'Change to Free',
        description: `Change "${menuItem.tokenConfig.name}" price to $0 (free)?`,
        confirmText: 'Make Free',
        cancelText: 'Cancel',
      })
      if (!confirmed) return
    }

    try {
      setSaving(menuItem.tokenConfigId)
      setErrorMessage(null)
      setSuccessMessage(null)

      console.log('Updating price:', { price, menuItemId: menuItem.id, businessId })

      const response = await fetch(`/api/business/${businessId}/wifi-tokens/${menuItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessPrice: price,
          isActive: menuItem.isActive,
        }),
      })

      const data = await response.json()
      console.log('Update response:', data)

      if (response.ok) {
        setSuccessMessage(`Price updated successfully to ${formatCurrency(price)}!`)
        fetchData()
        delete editingPrices[menuItem.tokenConfigId]
      } else {
        setErrorMessage(data.error || 'Failed to update price')
      }
    } catch (error: any) {
      console.error('Update price error:', error)
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

  const handleCustomizeToggle = (config: TokenConfig, menuItem?: BusinessTokenMenuItem) => {
    const isCustomizing = customizingTokens[config.id]

    if (!isCustomizing) {
      // Entering customize mode - load current values or defaults as strings
      setEditingOverrides({
        ...editingOverrides,
        [config.id]: {
          durationMinutes: (menuItem?.durationMinutesOverride || config.durationMinutes).toString(),
          bandwidthDownMb: (menuItem?.bandwidthDownMbOverride || config.bandwidthDownMb).toString(),
          bandwidthUpMb: (menuItem?.bandwidthUpMbOverride || config.bandwidthUpMb).toString(),
        },
      })
    }

    setCustomizingTokens({
      ...customizingTokens,
      [config.id]: !isCustomizing,
    })
  }

  const handleSaveOverrides = async (config: TokenConfig) => {
    const overrides = editingOverrides[config.id]

    if (!overrides) {
      setErrorMessage('No override values to save')
      return
    }

    // Parse string values to numbers
    const durationMinutes = parseInt(overrides.durationMinutes || '0')
    const bandwidthDownMb = parseInt(overrides.bandwidthDownMb || '0')
    const bandwidthUpMb = parseInt(overrides.bandwidthUpMb || '0')

    // Validate
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      setErrorMessage('Please enter a valid duration (greater than 0)')
      return
    }
    if (isNaN(bandwidthDownMb) || bandwidthDownMb <= 0) {
      setErrorMessage('Please enter a valid download bandwidth (greater than 0)')
      return
    }
    if (isNaN(bandwidthUpMb) || bandwidthUpMb <= 0) {
      setErrorMessage('Please enter a valid upload bandwidth (greater than 0)')
      return
    }

    try {
      setSaving(config.id)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/wifi-portal/token-configs/${config.id}/business-override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          durationMinutesOverride: durationMinutes,
          bandwidthDownMbOverride: bandwidthDownMb,
          bandwidthUpMbOverride: bandwidthUpMb,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Custom settings saved successfully!')
        setCustomizingTokens({ ...customizingTokens, [config.id]: false })
        fetchData()
      } else {
        setErrorMessage(data.error || 'Failed to save custom settings')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save custom settings')
    } finally {
      setSaving(null)
    }
  }

  const handleResetOverrides = async (config: TokenConfig) => {
    const confirmed = await confirm({
      title: 'Reset to Defaults',
      description: `Reset "${config.name}" back to default duration and bandwidth settings?`,
      confirmText: 'Reset',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setSaving(config.id)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(
        `/api/wifi-portal/token-configs/${config.id}/business-override?businessId=${businessId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Settings reset to defaults!')
        delete editingOverrides[config.id]
        setCustomizingTokens({ ...customizingTokens, [config.id]: false })
        fetchData()
      } else {
        setErrorMessage(data.error || 'Failed to reset settings')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to reset settings')
    } finally {
      setSaving(null)
    }
  }

  const handlePurchaseTokens = async (config: TokenConfig) => {
    const confirmed = await confirm({
      title: 'Purchase 20 Tokens',
      description: `Create 20 new "${config.name}" tokens for your ${businessType}?`,
      confirmText: 'Purchase',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setPurchasing(config.id)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch('/api/wifi-portal/tokens/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          tokenConfigId: config.id,
          quantity: 20,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Successfully created ${data.tokensCreated} tokens!`)
        fetchData() // Refresh to update available quantity
      } else {
        setErrorMessage(data.error || 'Failed to purchase tokens')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to purchase tokens')
    } finally {
      setPurchasing(null)
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
                    <div className="space-y-3 text-sm">
                      {/* Show current/override values or editing fields */}
                      {!customizingTokens[config.id] ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">⏱️ Duration:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatDuration(menuItem?.durationMinutesOverride || config.durationMinutes)}
                            </span>
                            {menuItem?.durationMinutesOverride && (
                              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                (Customized)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">📥 Download:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatDataAmount(menuItem?.bandwidthDownMbOverride || config.bandwidthDownMb)}
                            </span>
                            {menuItem?.bandwidthDownMbOverride && (
                              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                (Customized)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">📤 Upload:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatDataAmount(menuItem?.bandwidthUpMbOverride || config.bandwidthUpMb)}
                            </span>
                            {menuItem?.bandwidthUpMbOverride && (
                              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                (Customized)
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Editing mode - show input fields */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Duration - <span className="text-purple-600 dark:text-purple-400">{formatDuration(parseInt(editingOverrides[config.id]?.durationMinutes || '0') || config.durationMinutes)}</span>
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingOverrides[config.id]?.durationMinutes || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                // Allow empty or digits only
                                if (value === '' || /^\d+$/.test(value)) {
                                  setEditingOverrides({
                                    ...editingOverrides,
                                    [config.id]: {
                                      ...editingOverrides[config.id],
                                      durationMinutes: value
                                    }
                                  })
                                }
                              }}
                              onBlur={(e) => {
                                // If empty on blur, set to default
                                if (e.target.value === '') {
                                  setEditingOverrides({
                                    ...editingOverrides,
                                    [config.id]: {
                                      ...editingOverrides[config.id],
                                      durationMinutes: config.durationMinutes.toString()
                                    }
                                  })
                                }
                              }}
                              className="w-full px-2 py-1 text-sm border border-purple-300 dark:border-purple-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Minutes"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Download - <span className="text-purple-600 dark:text-purple-400">{formatDataAmount(parseInt(editingOverrides[config.id]?.bandwidthDownMb || '0') || config.bandwidthDownMb)}</span>
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingOverrides[config.id]?.bandwidthDownMb || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                // Allow empty or digits only
                                if (value === '' || /^\d+$/.test(value)) {
                                  setEditingOverrides({
                                    ...editingOverrides,
                                    [config.id]: {
                                      ...editingOverrides[config.id],
                                      bandwidthDownMb: value
                                    }
                                  })
                                }
                              }}
                              onBlur={(e) => {
                                // If empty on blur, set to default
                                if (e.target.value === '') {
                                  setEditingOverrides({
                                    ...editingOverrides,
                                    [config.id]: {
                                      ...editingOverrides[config.id],
                                      bandwidthDownMb: config.bandwidthDownMb.toString()
                                    }
                                  })
                                }
                              }}
                              className="w-full px-2 py-1 text-sm border border-purple-300 dark:border-purple-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="MB"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Upload - <span className="text-purple-600 dark:text-purple-400">{formatDataAmount(parseInt(editingOverrides[config.id]?.bandwidthUpMb || '0') || config.bandwidthUpMb)}</span>
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingOverrides[config.id]?.bandwidthUpMb || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                // Allow empty or digits only
                                if (value === '' || /^\d+$/.test(value)) {
                                  setEditingOverrides({
                                    ...editingOverrides,
                                    [config.id]: {
                                      ...editingOverrides[config.id],
                                      bandwidthUpMb: value
                                    }
                                  })
                                }
                              }}
                              onBlur={(e) => {
                                // If empty on blur, set to default
                                if (e.target.value === '') {
                                  setEditingOverrides({
                                    ...editingOverrides,
                                    [config.id]: {
                                      ...editingOverrides[config.id],
                                      bandwidthUpMb: config.bandwidthUpMb.toString()
                                    }
                                  })
                                }
                              }}
                              className="w-full px-2 py-1 text-sm border border-purple-300 dark:border-purple-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="MB"
                            />
                          </div>
                        </>
                      )}

                      {/* Available tokens - always shown */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">📦 Available:</span>
                        <span className={`font-medium ${config.availableQuantity === 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {config.availableQuantity || 0} tokens
                        </span>
                        {syncingESP32 && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span className="animate-spin">🔄</span>
                            <span>Syncing...</span>
                          </span>
                        )}
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
                        {menuItem && parseFloat(customPrice) !== Number(menuItem.businessPrice) && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Price changed - click Update to save
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    {customizingTokens[config.id] ? (
                      /* Customization mode buttons */
                      <>
                        <button
                          onClick={() => handleSaveOverrides(config)}
                          disabled={saving === config.id}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {saving === config.id ? 'Saving...' : '✓ Save Custom Settings'}
                        </button>
                        <button
                          onClick={() => handleCustomizeToggle(config, menuItem)}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </>
                    ) : !inMenu ? (
                      /* Not in menu - show Add button */
                      <>
                        <button
                          onClick={() => handleAddToMenu(config)}
                          disabled={saving === config.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving === config.id ? 'Adding...' : '+ Add to Menu'}
                        </button>
                      </>
                    ) : (
                      /* In menu - show menu management buttons */
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
                            {/* Purchase 20 Tokens button */}
                            <button
                              onClick={() => handlePurchaseTokens(config)}
                              disabled={purchasing === config.id}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              <span>🎫</span>
                              <span>{purchasing === config.id ? 'Purchasing...' : 'Purchase 20 Tokens'}</span>
                            </button>

                            {/* Customize button */}
                            <button
                              onClick={() => handleCustomizeToggle(config, menuItem)}
                              disabled={saving === config.id}
                              className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 flex items-center gap-1"
                            >
                              <span>⚙️</span>
                              <span>Customize</span>
                            </button>

                            {/* Reset button - only show if has overrides */}
                            {(menuItem.durationMinutesOverride || menuItem.bandwidthDownMbOverride || menuItem.bandwidthUpMbOverride) && (
                              <button
                                onClick={() => handleResetOverrides(config)}
                                disabled={saving === config.id}
                                className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-50"
                              >
                                {saving === config.id ? 'Resetting...' : '↺ Reset to Defaults'}
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleActive(menuItem)}
                              disabled={saving === config.id}
                              className={`px-4 py-2 rounded-lg disabled:opacity-50 ${
                                menuItem.isActive
                                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
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
