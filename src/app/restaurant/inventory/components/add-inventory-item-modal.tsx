'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface AddInventoryItemModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  onItemAdded: () => void
}

export function AddInventoryItemModal({ isOpen, onClose, businessId, onItemAdded }: AddInventoryItemModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: 'Proteins',
    basePrice: '',
    costPrice: '',
    currentStock: '',
    lowStockThreshold: '10',
    attributes: {
      storageTemp: 'refrigerated' as 'room' | 'refrigerated' | 'frozen',
      expirationDays: '7',
      allergens: [] as string[],
      preparationTime: '0'
    }
  })

  const categories = [
    'Proteins', 'Vegetables', 'Dairy', 'Pantry', 'Beverages', 'Supplies'
  ]

  const allergens = [
    'Gluten', 'Dairy', 'Eggs', 'Nuts', 'Soy', 'Shellfish', 'Fish'
  ]

  const storageOptions = [
    { value: 'room', label: 'Room Temperature' },
    { value: 'refrigerated', label: 'Refrigerated' },
    { value: 'frozen', label: 'Frozen' }
  ]

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session?.user) {
      setError('You must be logged in to add inventory items')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/inventory/${businessId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          sku: formData.sku || undefined,
          category: formData.category,
          basePrice: parseFloat(formData.basePrice),
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
          currentStock: formData.currentStock ? parseInt(formData.currentStock) : 0,
          lowStockThreshold: parseInt(formData.lowStockThreshold),
          attributes: formData.attributes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create inventory item')
      }

      onItemAdded()
      onClose()

      // Reset form
      setFormData({
        name: '',
        description: '',
        sku: '',
        category: 'Proteins',
        basePrice: '',
        costPrice: '',
        currentStock: '',
        lowStockThreshold: '10',
        attributes: {
          storageTemp: 'refrigerated',
          expirationDays: '7',
          allergens: [],
          preparationTime: '0'
        }
      })
    } catch (err) {
      console.error('Error creating inventory item:', err)
      setError(err instanceof Error ? err.message : 'Failed to create inventory item')
    } finally {
      setLoading(false)
    }
  }

  const handleAllergenToggle = (allergen: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        allergens: prev.attributes.allergens.includes(allergen)
          ? prev.attributes.allergens.filter(a => a !== allergen)
          : [...prev.attributes.allergens, allergen]
      }
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-primary">Add New Inventory Item</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-primary">Basic Information</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g., Ground Beef 80/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="input-field w-full"
                  placeholder="e.g., PROT-BEEF-001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input-field w-full"
                rows={2}
                placeholder="Optional description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="input-field w-full"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="space-y-4">
            <h4 className="font-medium text-primary">Pricing & Stock</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Sell Price * ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.basePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
                  className="input-field w-full"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Cost Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                  className="input-field w-full"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Initial Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.currentStock}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentStock: e.target.value }))}
                  className="input-field w-full"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>

          {/* Restaurant-Specific Attributes */}
          <div className="space-y-4">
            <h4 className="font-medium text-primary">Restaurant Attributes</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Storage Temperature
                </label>
                <select
                  value={formData.attributes.storageTemp}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    attributes: {
                      ...prev.attributes,
                      storageTemp: e.target.value as 'room' | 'refrigerated' | 'frozen'
                    }
                  }))}
                  className="input-field w-full"
                >
                  {storageOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Expiration Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.attributes.expirationDays}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    attributes: {
                      ...prev.attributes,
                      expirationDays: e.target.value
                    }
                  }))}
                  className="input-field w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Allergens
              </label>
              <div className="flex flex-wrap gap-2">
                {allergens.map(allergen => (
                  <button
                    key={allergen}
                    type="button"
                    onClick={() => handleAllergenToggle(allergen)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      formData.attributes.allergens.includes(allergen)
                        ? 'bg-orange-100 border-orange-300 text-orange-700'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {allergen}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Preparation Time (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={formData.attributes.preparationTime}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  attributes: {
                    ...prev.attributes,
                    preparationTime: e.target.value
                  }
                }))}
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}