'use client'

import { useState, useEffect } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface MenuItem {
  id: string
  name: string
  basePrice: number
  categoryId: string
  category?: {
    id: string
    name: string
  }
  images: Array<{
    id: string
    imageUrl: string
    isPrimary: boolean
    altText?: string
  }>
  variants?: Array<{
    id: string
    name: string
    price: number
    isAvailable: boolean
  }>
}

interface WifiToken {
  id: string
  name: string
  description?: string
  durationValue: number
  durationUnit: string
  deviceLimit: number
  basePrice: number
}

interface ComboItem {
  id?: string
  productId?: string
  variantId?: string
  tokenConfigId?: string
  quantity: number
  isRequired: boolean
  sortOrder: number
  product?: MenuItem
  variant?: NonNullable<MenuItem['variants']>[number]
  wifiToken?: WifiToken
}

interface Combo {
  id: string
  name: string
  description?: string
  totalPrice: number
  originalTotalPrice?: number
  isActive: boolean
  isAvailable: boolean
  imageUrl?: string
  preparationTime: number
  discountPercent?: number
  promotionStartDate?: string
  promotionEndDate?: string
  comboItems: ComboItem[]
}

interface ComboBuilderProps {
  businessId: string
  menuItems: MenuItem[]
  onComboChange?: () => void
}

export function ComboBuilder({ businessId, menuItems, onComboChange }: ComboBuilderProps) {
  const [combos, setCombos] = useState<Combo[]>([])
  const confirm = useConfirm()
  const [showForm, setShowForm] = useState(false)
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalPrice: 0,
    originalTotalPrice: '',
    preparationTime: 0,
    discountPercent: '',
    isActive: true,
    isAvailable: true
  })

  const [comboItems, setComboItems] = useState<ComboItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [wifiTokens, setWifiTokens] = useState<WifiToken[]>([])
  const [itemTab, setItemTab] = useState<'menu' | 'wifi'>('menu')

  useEffect(() => {
    loadCombos()
    loadWifiTokens()
  }, [businessId])

  const loadCombos = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/universal/menu-combos?businessId=${businessId}`)
      const data = await response.json()

      if (data.success) {
        setCombos(data.data)
      } else {
        setError(data.error || 'Failed to load combos')
      }
    } catch (err) {
      setError('Network error while loading combos')
    } finally {
      setLoading(false)
    }
  }

  const loadWifiTokens = async () => {
    try {
      const response = await fetch(`/api/r710/token-configs?businessId=${businessId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.configs) {
          setWifiTokens(data.configs.filter((c: any) => c.isActive))
        }
      }
    } catch (err) {
      // WiFi tokens are optional, don't show error
      console.log('WiFi tokens not available for this business')
    }
  }

  const handleCreateCombo = () => {
    setEditingCombo(null)
    setFormData({
      name: '',
      description: '',
      totalPrice: 0,
      originalTotalPrice: '',
      preparationTime: 0,
      discountPercent: '',
      isActive: true,
      isAvailable: true
    })
    setComboItems([])
    setShowForm(true)
  }

  const handleEditCombo = (combo: Combo) => {
    setEditingCombo(combo)
    setFormData({
      name: combo.name,
      description: combo.description || '',
      totalPrice: combo.totalPrice,
      originalTotalPrice: combo.originalTotalPrice?.toString() || '',
      preparationTime: combo.preparationTime,
      discountPercent: combo.discountPercent?.toString() || '',
      isActive: combo.isActive,
      isAvailable: combo.isAvailable
    })
    setComboItems(combo.comboItems)
    setShowForm(true)
  }

  const addItemToCombo = (menuItem: MenuItem, variantId?: string) => {
    const variant = variantId ? menuItem.variants?.find(v => v.id === variantId) : undefined

    const newItem: ComboItem = {
      productId: menuItem.id,
      variantId,
      quantity: 1,
      isRequired: true,
      sortOrder: comboItems.length,
      product: menuItem,
      variant
    }

    setComboItems(prev => [...prev, newItem])

    // Auto-calculate total price
    calculateTotalPrice([...comboItems, newItem])
  }

  const addWifiTokenToCombo = (token: WifiToken) => {
    const newItem: ComboItem = {
      tokenConfigId: token.id,
      quantity: 1,
      isRequired: true,
      sortOrder: comboItems.length,
      wifiToken: token
    }

    setComboItems(prev => [...prev, newItem])

    // Auto-calculate total price
    calculateTotalPrice([...comboItems, newItem])
  }

  const removeItemFromCombo = (index: number) => {
    const updatedItems = comboItems.filter((_, i) => i !== index)
    setComboItems(updatedItems)
    calculateTotalPrice(updatedItems)
  }

  const updateComboItem = (index: number, field: string, value: any) => {
    const updatedItems = comboItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    setComboItems(updatedItems)

    if (field === 'quantity') {
      calculateTotalPrice(updatedItems)
    }
  }

  const calculateTotalPrice = (items: ComboItem[]) => {
    const total = items.reduce((sum, item) => {
      // Handle both menu items and WiFi tokens
      const price = item.wifiToken?.basePrice || item.variant?.price || item.product?.basePrice || 0
      return sum + (Number(price) * item.quantity)
    }, 0)

    setFormData(prev => ({
      ...prev,
      originalTotalPrice: total.toString(),
      totalPrice: prev.discountPercent
        ? total * (1 - parseFloat(prev.discountPercent) / 100)
        : total
    }))
  }

  const handleSubmitCombo = async (e: React.FormEvent) => {
    e.preventDefault()

    if (comboItems.length === 0) {
      setError('Please add at least one item to the combo')
      return
    }

    try {
      const submitData = {
        ...formData,
        businessId,
        originalTotalPrice: formData.originalTotalPrice ? parseFloat(formData.originalTotalPrice) : undefined,
        discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : undefined,
        comboItems: comboItems.map((item, index) => ({
          productId: item.productId || null,
          variantId: item.variantId || null,
          tokenConfigId: item.tokenConfigId || null,
          quantity: item.quantity,
          isRequired: item.isRequired,
          sortOrder: index
        }))
      }

      const url = editingCombo
        ? `/api/universal/menu-combos/${editingCombo.id}`
        : '/api/universal/menu-combos'

      const method = editingCombo ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()

      if (result.success) {
        await loadCombos()
        setShowForm(false)
        setEditingCombo(null)
        onComboChange?.()
      } else {
        setError(result.error || 'Failed to save combo')
      }
    } catch (err) {
      setError('Network error while saving combo')
    }
  }

  const handleDeleteCombo = async (comboId: string) => {
    const ok = await confirm({ title: 'Delete combo', description: 'Are you sure you want to delete this combo?', confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return

    try {
      const response = await fetch(`/api/universal/menu-combos/${comboId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        await loadCombos()
        onComboChange?.()
      } else {
        setError(result.error || 'Failed to delete combo')
      }
    } catch (err) {
      setError('Network error while deleting combo')
    }
  }

  const handleToggleAvailability = async (combo: Combo) => {
    try {
      const response = await fetch(`/api/universal/menu-combos/${combo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !combo.isAvailable })
      })

      const result = await response.json()
      if (result.success) {
        await loadCombos()
        onComboChange?.()
      } else {
        setError(result.error || 'Failed to update combo')
      }
    } catch (err) {
      setError('Network error while updating combo')
    }
  }

  const getUniqueCategories = () => {
    const categories = new Set<string>()
    menuItems.forEach(item => {
      if (item.category) {
        categories.add(item.category.id)
      }
    })
    return Array.from(categories).map(id => {
      const item = menuItems.find(i => i.category?.id === id)
      return item?.category
    }).filter(Boolean) as Array<{ id: string; name: string }>
  }

  // Filter menu items: exclude zero-price items and apply category filter
  const filteredMenuItems = menuItems
    .filter(item => item.basePrice > 0) // Exclude zero-price items from combo builder
    .filter(item => selectedCategory === 'all' || item.categoryId === selectedCategory)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading combos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Combo Items</h3>
          <p className="text-sm text-secondary">Create special combo deals and bundles</p>
        </div>
        <Button onClick={handleCreateCombo} className="bg-primary hover:bg-primary/90">
          🍽️ Create Combo
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600">❌</span>
            <span className="text-red-800 dark:text-red-200">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Combos List */}
      {combos.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-lg font-medium text-primary mb-2">No combos created yet</h3>
          <p className="text-secondary mb-4">Create combo deals to increase average order value</p>
          <Button onClick={handleCreateCombo}>Create Your First Combo</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {combos.map(combo => (
            <div key={combo.id} className="card overflow-hidden">
              {/* Combo Image */}
              <div className="relative h-32 bg-gray-100 dark:bg-gray-700">
                {combo.imageUrl ? (
                  <Image
                    src={combo.imageUrl}
                    alt={combo.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-3xl mb-1">🍽️</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Combo Deal</p>
                    </div>
                  </div>
                )}

                <div className="absolute top-2 left-2">
                  <Badge
                    variant={combo.isAvailable ? "success" : "outline"}
                    className={combo.isAvailable ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300" : ""}
                  >
                    {combo.isAvailable ? '✅ Available' : '❌ Unavailable'}
                  </Badge>
                </div>

                {combo.discountPercent && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-red-500 text-white">
                      -{combo.discountPercent}%
                    </Badge>
                  </div>
                )}
              </div>

              {/* Combo Details */}
              <div className="p-4">
                <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">{combo.name}</h4>

                {combo.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{combo.description}</p>
                )}

                {/* Price */}
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-primary">
                      ${Number(combo.totalPrice).toFixed(2)}
                    </span>
                    {combo.originalTotalPrice && Number(combo.originalTotalPrice) > Number(combo.totalPrice) && (
                      <span className="text-gray-500 dark:text-gray-400 line-through text-sm">
                        ${Number(combo.originalTotalPrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Combo Items */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Includes:</p>
                  <div className="space-y-1">
                    {combo.comboItems.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 dark:text-gray-300">
                          {item.wifiToken ? (
                            <>📶 {item.quantity}x {item.wifiToken.name}</>
                          ) : (
                            <>
                              {item.quantity}x {item.product?.name}
                              {item.variant?.name && ` (${item.variant.name})`}
                            </>
                          )}
                        </span>
                        {item.isRequired && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                    ))}
                    {combo.comboItems.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{combo.comboItems.length - 3} more items
                      </div>
                    )}
                  </div>
                </div>

                {/* Prep Time */}
                {combo.preparationTime > 0 && (
                  <div className="mb-3">
                    <Badge variant="outline" className="text-xs">
                      ⏱️ {combo.preparationTime}min prep
                    </Badge>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditCombo(combo)}
                    className="flex-1"
                  >
                    ✏️ Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAvailability(combo)}
                    className={`flex-1 ${combo.isAvailable
                      ? 'hover:bg-red-50 hover:text-red-700'
                      : 'hover:bg-green-50 hover:text-green-700'
                    }`}
                  >
                    {combo.isAvailable ? '🚫 Hide' : '✅ Show'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCombo(combo.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Combo Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-primary">
              <h2 className="text-xl font-bold text-primary">
                {editingCombo ? 'Edit Combo' : 'Create New Combo'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-secondary hover:text-primary text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitCombo} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Combo Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Combo Details</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Combo Name *
                        </label>
                        <Input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Family Feast"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-primary mb-1">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="input-field"
                          placeholder="Describe what's included in this combo..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Combo Price *
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.totalPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, totalPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-primary mb-1">
                            Prep Time (min)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.preparationTime}
                            onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="comboIsActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="mr-2"
                          />
                          <label htmlFor="comboIsActive" className="text-sm font-medium text-primary">
                            Active
                          </label>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="comboIsAvailable"
                            checked={formData.isAvailable}
                            onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                            className="mr-2"
                          />
                          <label htmlFor="comboIsAvailable" className="text-sm font-medium text-primary">
                            Available
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Combo Items */}
                  <div>
                    <h4 className="text-md font-medium mb-3">Combo Items ({comboItems.length})</h4>

                    {comboItems.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400">No items added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {comboItems.map((item, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex-1">
                              {item.wifiToken ? (
                                <>
                                  <p className="font-medium text-sm text-gray-900 dark:text-white">📶 {item.wifiToken.name}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {item.wifiToken.durationValue} {item.wifiToken.durationUnit.replace('DURATION_', '').toLowerCase()}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    ${(Number(item.wifiToken.basePrice) * item.quantity).toFixed(2)}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="font-medium text-sm text-gray-900 dark:text-white">{item.product?.name}</p>
                                  {item.variant && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{item.variant.name}</p>
                                  )}
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    ${((item.variant?.price || item.product?.basePrice || 0) * item.quantity).toFixed(2)}
                                  </p>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateComboItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-16 text-center"
                              />

                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={item.isRequired}
                                  onChange={(e) => updateComboItem(index, 'isRequired', e.target.checked)}
                                  className="mr-1"
                                />
                                <span className="text-xs">Required</span>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeItemFromCombo(index)}
                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                🗑️
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total Calculation */}
                    {comboItems.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                          <span>Individual Total:</span>
                          <span>${comboItems.reduce((sum, item) => sum + (Number(item.wifiToken?.basePrice || item.variant?.price || item.product?.basePrice || 0) * item.quantity), 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-gray-900 dark:text-white">
                          <span>Combo Price:</span>
                          <span className="text-primary">${formData.totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>You Save:</span>
                          <span>${Math.max(0, comboItems.reduce((sum, item) => sum + (Number(item.wifiToken?.basePrice || item.variant?.price || item.product?.basePrice || 0) * item.quantity), 0) - formData.totalPrice).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Menu Items & WiFi Tokens */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Add Items to Combo</h3>

                    {/* Tabs for Menu Items vs WiFi Tokens */}
                    <div className="flex border-b border-gray-200 dark:border-gray-600 mb-4">
                      <button
                        type="button"
                        onClick={() => setItemTab('menu')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${
                          itemTab === 'menu'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        🍽️ Menu Items
                      </button>
                      {wifiTokens.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setItemTab('wifi')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 ${
                            itemTab === 'wifi'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                          }`}
                        >
                          📶 WiFi Tokens ({wifiTokens.length})
                        </button>
                      )}
                    </div>

                    {itemTab === 'menu' && (
                      <>
                        {/* Category Filter */}
                        <div className="mb-4">
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="input-field"
                          >
                            <option value="all">All Categories</option>
                            {getUniqueCategories().map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Menu Items Grid */}
                        <div className="max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-1 gap-3">
                            {filteredMenuItems.map(item => {
                              const primaryImage = item.images?.find(img => img.isPrimary) || item.images?.[0]

                              return (
                                <div key={item.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                                      {primaryImage ? (
                                        <Image
                                          src={primaryImage.imageUrl}
                                          alt={item.name}
                                          width={48}
                                          height={48}
                                          className="object-cover w-full h-full"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                          🍽️
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1">
                                      <p className="font-medium text-sm text-gray-900 dark:text-white">{item.name}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">{item.category?.name}</p>
                                      <p className="text-sm font-medium text-primary">${item.basePrice.toFixed(2)}</p>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addItemToCombo(item)}
                                        className="text-xs"
                                      >
                                        + Add
                                      </Button>

                                      {item.variants && item.variants.length > 0 && (
                                        <select
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              addItemToCombo(item, e.target.value)
                                              e.target.value = ''
                                            }
                                          }}
                                          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-700 dark:text-white"
                                        >
                                          <option value="">+ Variant</option>
                                          {item.variants.map(variant => (
                                            <option key={variant.id} value={variant.id}>
                                              {variant.name} (${variant.price})
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {itemTab === 'wifi' && (
                      <div className="max-h-96 overflow-y-auto">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          Add complimentary WiFi access to your combo
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          {wifiTokens.map(token => (
                            <div key={token.id} className="border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <span className="text-2xl">📶</span>
                                </div>

                                <div className="flex-1">
                                  <p className="font-medium text-sm text-gray-900 dark:text-white">{token.name}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {token.durationValue} {token.durationUnit.replace('DURATION_', '').toLowerCase()}
                                    {token.deviceLimit > 1 ? ` • ${token.deviceLimit} devices` : ''}
                                  </p>
                                  <p className="text-sm font-medium text-primary">${Number(token.basePrice).toFixed(2)}</p>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addWifiTokenToCombo(token)}
                                  className="text-xs bg-white dark:bg-gray-700"
                                >
                                  + Add WiFi
                                </Button>
                              </div>
                            </div>
                          ))}
                          {wifiTokens.length === 0 && (
                            <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-gray-500 dark:text-gray-400">No WiFi tokens available</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Configure WiFi tokens in R710 Portal first
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-primary mt-6">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={comboItems.length === 0}
                >
                  {editingCombo ? 'Update Combo' : 'Create Combo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}