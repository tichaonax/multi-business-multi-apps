'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/format-currency'
import { useAlert } from '@/components/ui/confirm-modal'
import { generateWifiFlierPdf, WifiFlierData } from '@/lib/wifi-flier-pdf'

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
  const [showFlierModal, setShowFlierModal] = useState(false)
  const [flierSsid, setFlierSsid] = useState('')
  const [flierTagline, setFlierTagline] = useState('')
  const [flierPrinting, setFlierPrinting] = useState(false)

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
      const toMins = (v: number, u: string) => {
        const unit = u.toLowerCase()
        if (unit.includes('week')) return v * 10080
        if (unit.includes('day'))  return v * 1440
        if (unit.includes('hour')) return v * 60
        return v
      }
      const activeConfigs = (configsData.configs || [])
        .filter((c: TokenConfig) => c.isActive)
        .sort((a: TokenConfig, b: TokenConfig) => toMins(a.durationValue, a.durationUnit) - toMins(b.durationValue, b.durationUnit))
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

        if (!response.ok) throw new Error('Failed to add token to menu')

        const data = await response.json()
        setBusinessMenuItems(prev => [...prev, {
          id: data.menuItem.id,
          businessId,
          tokenConfigId: configId,
          businessPrice: Number(data.menuItem.businessPrice),
          isActive: data.menuItem.isActive,
          displayOrder: data.menuItem.displayOrder,
          tokenConfig: config,
        }])
      } else {
        // Removing from menu
        const menuItem = businessMenuItems.find(m => m.tokenConfigId === configId)
        if (!menuItem) return

        const response = await fetch(`/api/business/${businessId}/r710-tokens/${menuItem.id}`, {
          method: 'DELETE'
        })

        if (!response.ok) throw new Error('Failed to remove token from menu')

        setBusinessMenuItems(prev => prev.filter(m => m.tokenConfigId !== configId))
      }
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

  const openFlierModal = async () => {
    try {
      const res = await fetch(`/api/business/${businessId}/wifi-flier-data`)
      if (res.ok) {
        const { data } = await res.json()
        setFlierSsid(data.ssid ?? '')
      }
    } catch {
      // Leave SSID blank if fetch fails
    }
    setShowFlierModal(true)
  }

  const handlePrintFlier = async () => {
    setFlierPrinting(true)
    try {
      const res = await fetch(`/api/business/${businessId}/wifi-flier-data`)
      if (!res.ok) throw new Error('Failed to load flier data')
      const { data } = await res.json() as { data: WifiFlierData }
      generateWifiFlierPdf({ ...data, ssid: flierSsid || null, tagline: flierTagline || undefined })
      setShowFlierModal(false)
    } catch (err) {
      await alert({ title: 'Error', description: 'Failed to generate WiFi flier PDF' })
    } finally {
      setFlierPrinting(false)
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Configure R710 WiFi Token Menu</h3>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Toggle tokens on/off to make them available in your {businessType} POS. You can also customize the price for each token type.
            </p>
          </div>
          <button
            onClick={openFlierModal}
            className="shrink-0 flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <span>📶</span>
            <span>Print WiFi Flier</span>
          </button>
        </div>
      </div>

      {/* WiFi Flier Pre-print Modal */}
      {showFlierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📶 Print WiFi Advertising Flier</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Network Name (SSID)
                </label>
                <input
                  type="text"
                  value={flierSsid}
                  onChange={e => setFlierSsid(e.target.value)}
                  placeholder="WiFi network name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tagline <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={flierTagline}
                  onChange={e => setFlierTagline(e.target.value)}
                  placeholder="e.g. Fast and reliable internet for all"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowFlierModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintFlier}
                disabled={flierPrinting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {flierPrinting ? 'Generating...' : 'Print PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Configurations */}
      <div className="grid grid-cols-1 gap-2">
        {tokenConfigs.map(config => {
          const inMenu = isConfigInMenu(config.id)
          const menuItem = businessMenuItems.find(m => m.tokenConfigId === config.id)
          const currentPrice = getMenuItemPrice(config.id)
          const isEditing = !!editingPrices[config.id]
          const isSaving = saving === config.id

          return (
            <div
              key={config.id}
              className={`bg-white dark:bg-gray-800 rounded-md border transition-all ${
                inMenu
                  ? 'border-green-500 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 px-3 py-2">
                {/* Name + description */}
                <div className="w-44 shrink-0 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">{config.name}</span>
                    {inMenu && (
                      <span className="shrink-0 px-1 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 leading-none">✓</span>
                    )}
                  </div>
                  {config.description && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{config.description}</p>
                  )}
                </div>

                {/* Metadata chips */}
                <div className="flex items-center gap-3 flex-1 min-w-0 text-[11px] text-gray-500 dark:text-gray-400">
                  <span><span className="font-medium text-gray-800 dark:text-gray-200">{formatDuration(config.durationValue, config.durationUnit)}</span></span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span>{config.deviceLimit} dev</span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span>Base <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(config.basePrice)}</span></span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span><span className="font-medium text-gray-800 dark:text-gray-200">{config.availableQuantity || 0}</span> avail</span>
                </div>

                {/* Price (when in menu) */}
                <div className="shrink-0">
                  {inMenu && !isEditing && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">{formatCurrency(currentPrice || config.basePrice)}</span>
                      <button
                        onClick={() => setEditingPrices(prev => ({ ...prev, [config.id]: (currentPrice || config.basePrice).toString() }))}
                        className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  {inMenu && isEditing && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={editingPrices[config.id] || ''}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setEditingPrices(prev => ({ ...prev, [config.id]: value }))
                          }
                        }}
                        className="w-16 px-1.5 py-0.5 text-[11px] border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        disabled={isSaving}
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdatePrice(menuItem!.id, config.id)}
                        disabled={isSaving}
                        className="px-1.5 py-0.5 bg-green-600 text-white text-[10px] rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {isSaving ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingPrices(prev => { const s = { ...prev }; delete s[config.id]; return s })}
                        disabled={isSaving}
                        className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-[10px] rounded hover:bg-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggleConfig(config.id, inMenu)}
                  disabled={isSaving}
                  className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    inMenu ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${inMenu ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
