'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { canAddInventoryFromModal } from '@/lib/permission-utils'

export type InventoryType = 'clothing' | 'hardware' | 'grocery' | 'restaurant'

interface BusinessForInventory {
  id: string
  name: string
  type: string
  canAddInventory: boolean
}

export interface ProductData {
  name: string
  quantity: number
  costPrice: number
  sellPrice: number
  unit: string
  size?: string           // Clothing
  color?: string          // Clothing
}

interface BusinessSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onBusinessSelected: (businessId: string, inventoryType: InventoryType, productData: ProductData) => void
  barcode: string
}

export function BusinessSelectionModal({
  isOpen,
  onClose,
  onBusinessSelected,
  barcode
}: BusinessSelectionModalProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [businesses, setBusinesses] = useState<BusinessForInventory[]>([])
  const [selectedInventoryType, setSelectedInventoryType] = useState<InventoryType | null>(null)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Product data fields
  const [productName, setProductName] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [costPrice, setCostPrice] = useState('0')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [sellPrice, setSellPrice] = useState('0')
  const [unit, setUnit] = useState('Each')

  const inventoryTypes: { value: InventoryType; label: string; icon: string }[] = [
    { value: 'clothing', label: 'Clothing', icon: '👕' },
    { value: 'hardware', label: 'Hardware', icon: '🔧' },
    { value: 'grocery', label: 'Grocery', icon: '🛒' },
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' }
  ]

  const commonUnits = ['Each', 'Box', 'Case', 'Dozen', 'Kg', 'Lb', 'L', 'Gal', 'Meter', 'Yard']

  useEffect(() => {
    if (isOpen) {
      loadBusinesses()
      // Set default product name from barcode
      setProductName(`Scanned Product (${barcode})`)
    } else {
      // Reset state when modal closes
      setSelectedInventoryType(null)
      setSelectedBusinessId(null)
      setBusinesses([])
      setError(null)
      setProductName('')
      setQuantity('0')
      setCostPrice('0')
      setSellPrice('0')
      setUnit('Each')
      setSize('')
      setColor('')
    }
  }, [isOpen, barcode])

  const loadBusinesses = async () => {
    if (!session?.user || !selectedInventoryType) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/global/user-businesses-for-inventory?inventoryType=${selectedInventoryType}`)

      if (!response.ok) {
        throw new Error(`Failed to load businesses: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load businesses')
      }

      setBusinesses(data.businesses || [])
    } catch (err) {
      console.error('Error loading businesses:', err)
      setError(err instanceof Error ? err.message : 'Failed to load businesses')
      setBusinesses([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedInventoryType) {
      loadBusinesses()
    }
  }, [selectedInventoryType])

  const handleInventoryTypeSelect = (inventoryType: InventoryType) => {
    setSelectedInventoryType(inventoryType)
    setSelectedBusinessId(null)
    setBusinesses([])
  }

  const handleBusinessSelect = (businessId: string) => {
    setSelectedBusinessId(businessId)
  }

  const handleAddProduct = () => {
    if (!selectedBusinessId || !selectedInventoryType) return

    // Check permission before proceeding
    if (!canAddInventoryFromModal(session?.user as any, selectedBusinessId)) {
      setError('You do not have permission to add inventory to this business')
      return
    }

    // Validate required fields
    if (!productName.trim()) {
      setError('Product name is required')
      return
    }
    // Clothing requires size
    if (selectedInventoryType === 'clothing' && !size) {
      setError('Size is required for clothing items')
      return
    }

    const qty = parseFloat(quantity)
    const cost = parseFloat(costPrice)
    const sell = parseFloat(sellPrice)

    if (isNaN(qty) || qty < 0) {
      setError('Please enter a valid quantity')
      return
    }

    if (isNaN(cost) || cost < 0) {
      setError('Please enter a valid cost price')
      return
    }

    if (isNaN(sell) || sell < 0) {
      setError('Please enter a valid sell price')
      return
    }

    const productData: ProductData = {
      name: productName.trim(),
      quantity: qty,
      costPrice: cost,
      sellPrice: sell,
      unit: unit,
      ...(selectedInventoryType === 'clothing' && size ? { size } : {}),
      ...(selectedInventoryType === 'clothing' && color ? { color } : {})
    }

    onBusinessSelected(selectedBusinessId, selectedInventoryType, productData)
  }

  const canProceed = selectedBusinessId && selectedInventoryType &&
    businesses.find(b => b.id === selectedBusinessId)?.canAddInventory &&
    productName.trim() !== ''

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              📦 Add Product to Inventory
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Barcode:</span>
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100">
                {barcode}
              </code>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Inventory Type Selection */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Select inventory type:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {inventoryTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleInventoryTypeSelect(type.value)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedInventoryType === type.value
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Business Selection */}
          {selectedInventoryType && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Select business:
              </h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading businesses...</span>
                </div>
              ) : businesses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    No businesses found for {selectedInventoryType} inventory.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    You may not have permission to add inventory to any {selectedInventoryType} businesses.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {businesses.map((business) => (
                    <div
                      key={business.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        !business.canAddInventory
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                          : selectedBusinessId === business.id
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => business.canAddInventory && handleBusinessSelect(business.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {business.name}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded ${
                              business.canAddInventory
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {business.canAddInventory ? 'Can add inventory' : 'No permission'}
                            </span>
                          </div>
                        </div>
                        {business.canAddInventory && (
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedBusinessId === business.id
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-500 dark:bg-blue-400'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedBusinessId === business.id && (
                              <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Product Details - Only show when business is selected */}
          {selectedBusinessId && selectedInventoryType && (
            <div className="mb-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                Product Details:
              </h3>

              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    placeholder="Enter product name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unit
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    >
                      {commonUnits.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Cost Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cost Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Sell Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sell Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>


                {/* Clothing-Specific Fields */}
                {selectedInventoryType === 'clothing' && (
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    {/* Size */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Size <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      >
                        <option value="">Select Size</option>
                        <option value="XS">XS - Extra Small</option>
                        <option value="S">S - Small</option>
                        <option value="M">M - Medium</option>
                        <option value="L">L - Large</option>
                        <option value="XL">XL - Extra Large</option>
                        <option value="XXL">XXL - 2X Large</option>
                        <option value="XXXL">XXXL - 3X Large</option>
                        <option value="One Size">One Size</option>
                      </select>
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Color
                      </label>
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="e.g., Blue, Red, Black"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
                {/* Profit Margin Indicator */}
                {parseFloat(sellPrice) > 0 && parseFloat(costPrice) > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Profit Margin:</span>
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        {(((parseFloat(sellPrice) - parseFloat(costPrice)) / parseFloat(sellPrice)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddProduct}
              disabled={!canProceed || isLoading}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Add Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
