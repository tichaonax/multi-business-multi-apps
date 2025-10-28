'use client'

import { useState, useEffect } from 'react'

interface InventorySubcategory {
  id: string
  name: string
  emoji?: string
  displayOrder: number
}

interface UniversalInventoryItem {
  id?: string
  businessId: string
  businessType: string
  name: string
  sku: string
  description?: string
  category?: string // Legacy field for backward compatibility
  categoryId?: string
  subcategoryId?: string
  currentStock: number
  unit: string
  costPrice: number
  sellPrice: number
  supplier?: string
  location?: string
  isActive: boolean
  attributes?: Record<string, any>
}

interface UniversalInventoryFormProps {
  businessId: string
  businessType: string
  item?: UniversalInventoryItem
  // legacy: onSave
  onSave?: (item: UniversalInventoryItem) => void
  // preferred: onSubmit handler used by pages
  onSubmit?: (formData: any) => Promise<void> | void
  onCancel: () => void
  isOpen?: boolean
  customFields?: any[]
  mode?: 'create' | 'edit'
  // renderMode controls whether the component renders its built-in modal wrapper
  // or only the inner form panel so a parent can supply a modal wrapper.
  renderMode?: 'modal' | 'inline'
}

export function UniversalInventoryForm({
  businessId,
  businessType,
  item,
  onSave,
  onSubmit,
  onCancel,
  isOpen = true,
  customFields = [],
  mode = 'create'
  , renderMode = 'modal'
}: UniversalInventoryFormProps) {
  const [formData, setFormData] = useState<UniversalInventoryItem>({
    businessId,
    businessType,
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    currentStock: 0,
    unit: '',
    costPrice: 0,
    sellPrice: 0,
    supplier: '',
    location: '',
    isActive: true,
    attributes: {}
  })

  const [categories, setCategories] = useState<Array<{
    id: string
    name: string
    emoji?: string
    color?: string
    subcategories?: InventorySubcategory[]
  }>>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [availableSubcategories, setAvailableSubcategories] = useState<InventorySubcategory[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when item prop changes
  useEffect(() => {
    if (item) {
      setFormData(item)
      // Set selected category if editing
      if (item.categoryId) {
        setSelectedCategory(item.categoryId)
        // Find and set subcategories for the selected category
        const category = categories.find(c => c.id === item.categoryId)
        if (category?.subcategories) {
          setAvailableSubcategories(category.subcategories)
        }
      }
    } else {
      setFormData({
        businessId,
        businessType,
        name: '',
        sku: '',
        description: '',
        categoryId: '',
        subcategoryId: '',
        currentStock: 0,
        unit: '',
        costPrice: 0,
        sellPrice: 0,
        supplier: '',
        location: '',
        isActive: true,
        attributes: {}
      })
    }
  }, [item, businessId, businessType, categories])

  // Fetch categories with subcategories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`/api/inventory/${businessId}/categories`)
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories?.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            emoji: cat.emoji || cat.icon || '📦',
            color: cat.color || 'gray',
            subcategories: cat.subcategories || []
          })) || [])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }

    if (businessId) {
      fetchCategories()
    }
  }, [businessId])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleAttributeChange = (attributeKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attributeKey]: value
      }
    }))
  }

  const handleCategoryChange = (categoryId: string) => {
    // Update form data with new category
    setFormData(prev => ({
      ...prev,
      categoryId,
      subcategoryId: '' // Reset subcategory when category changes
    }))

    // Update selected category and available subcategories
    setSelectedCategory(categoryId)
    const category = categories.find(c => c.id === categoryId)
    setAvailableSubcategories(category?.subcategories || [])

    // Clear errors
    if (errors.categoryId) {
      setErrors(prev => ({
        ...prev,
        categoryId: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    if (!formData.categoryId?.trim()) newErrors.categoryId = 'Category is required'
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required'
    if (formData.currentStock < 0) newErrors.currentStock = 'Stock cannot be negative'
    if (formData.costPrice < 0) newErrors.costPrice = 'Cost price cannot be negative'
    if (formData.sellPrice < 0) newErrors.sellPrice = 'Sell price cannot be negative'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const url = mode === 'edit' && item?.id
        ? `/api/inventory/${businessId}/items/${item.id}`
        : `/api/inventory/${businessId}/items`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        // Prefer onSubmit (page-level handler). Fall back to legacy onSave for compatibility.
        if (onSubmit) {
          await onSubmit(data.item)
        } else if (onSave) {
          onSave(data.item)
        }
      } else {
        const errorData = await response.json()
        setErrors({ general: errorData.error || 'Failed to save item' })
      }
    } catch (error) {
      setErrors({ general: 'Network error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const getBusinessSpecificFields = () => {
    switch (businessType) {
      case 'restaurant':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Restaurant-Specific Fields</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Storage Temperature
                </label>
                <select
                  value={formData.attributes?.storageTemp || ''}
                  onChange={(e) => handleAttributeChange('storageTemp', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select temperature...</option>
                  <option value="room">Room Temperature</option>
                  <option value="refrigerated">Refrigerated</option>
                  <option value="frozen">Frozen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Expiration Days
                </label>
                <input
                  type="number"
                  value={formData.attributes?.expirationDays || ''}
                  onChange={(e) => handleAttributeChange('expirationDays', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Days until expiration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Preparation Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.attributes?.preparationTime || ''}
                  onChange={(e) => handleAttributeChange('preparationTime', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Prep time in minutes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Recipe Yield
                </label>
                <input
                  type="number"
                  value={formData.attributes?.recipeYield || ''}
                  onChange={(e) => handleAttributeChange('recipeYield', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Number of servings"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Allergens
              </label>
              <input
                type="text"
                defaultValue={formData.attributes?.allergens?.join(', ') || ''}
                onBlur={(e) => {
                  // Convert to array on blur
                  const value = e.target.value
                  handleAttributeChange('allergens', value.split(',').map(s => s.trim()).filter(Boolean))
                }}
                className="input-field"
                placeholder="Comma-separated list (e.g., Dairy, Gluten, Nuts)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Ingredients
              </label>
              <textarea
                defaultValue={formData.attributes?.ingredients?.join(', ') || ''}
                onBlur={(e) => {
                  // Convert to array on blur
                  const value = e.target.value
                  handleAttributeChange('ingredients', value.split(',').map(s => s.trim()).filter(Boolean))
                }}
                className="input-field resize-none"
                rows={3}
                placeholder="Comma-separated list of ingredients"
              />
            </div>
          </div>
        )

      case 'grocery':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Grocery-Specific Fields</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  PLU Code
                </label>
                <input
                  type="text"
                  value={formData.attributes?.pluCode || ''}
                  onChange={(e) => handleAttributeChange('pluCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="4-5 digit PLU code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Temperature Zone
                </label>
                <select
                  value={formData.attributes?.temperatureZone || ''}
                  onChange={(e) => handleAttributeChange('temperatureZone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select zone...</option>
                  <option value="ambient">Ambient</option>
                  <option value="refrigerated">Refrigerated</option>
                  <option value="frozen">Frozen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={formData.attributes?.batchNumber || ''}
                  onChange={(e) => handleAttributeChange('batchNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Batch/lot number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={formData.attributes?.expirationDate || ''}
                  onChange={(e) => handleAttributeChange('expirationDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="organicCertified"
                checked={formData.attributes?.organicCertified || false}
                onChange={(e) => handleAttributeChange('organicCertified', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="organicCertified" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Organic Certified
              </label>
            </div>
          </div>
        )

      case 'clothing':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Clothing-Specific Fields</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.attributes?.brand || ''}
                  onChange={(e) => handleAttributeChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brand name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Season
                </label>
                <select
                  value={formData.attributes?.season || ''}
                  onChange={(e) => handleAttributeChange('season', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select season...</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="fall">Fall</option>
                  <option value="winter">Winter</option>
                  <option value="year-round">Year Round</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Material
                </label>
                <input
                  type="text"
                  value={formData.attributes?.material || ''}
                  onChange={(e) => handleAttributeChange('material', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Cotton, Polyester, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Available Sizes
              </label>
              <input
                type="text"
                defaultValue={formData.attributes?.sizes?.join(', ') || ''}
                onBlur={(e) => {
                  // Convert to array on blur
                  const value = e.target.value
                  handleAttributeChange('sizes', value.split(',').map(s => s.trim()).filter(Boolean))
                }}
                className="input-field"
                placeholder="Comma-separated (e.g., XS, S, M, L, XL)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Available Colors
              </label>
              <input
                type="text"
                defaultValue={formData.attributes?.colors?.join(', ') || ''}
                onBlur={(e) => {
                  // Convert to array on blur
                  const value = e.target.value
                  handleAttributeChange('colors', value.split(',').map(s => s.trim()).filter(Boolean))
                }}
                className="input-field"
                placeholder="Comma-separated (e.g., Red, Blue, Black)"
              />
            </div>
          </div>
        )

      case 'hardware':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Hardware-Specific Fields</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.attributes?.manufacturer || ''}
                  onChange={(e) => handleAttributeChange('manufacturer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Manufacturer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Model Number
                </label>
                <input
                  type="text"
                  value={formData.attributes?.model || ''}
                  onChange={(e) => handleAttributeChange('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Model number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Warranty Period
                </label>
                <input
                  type="text"
                  value={formData.attributes?.warranty || ''}
                  onChange={(e) => handleAttributeChange('warranty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 1 year, 5 years"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Specifications
              </label>
              <textarea
                value={formData.attributes?.specifications ? JSON.stringify(formData.attributes.specifications, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const specs = JSON.parse(e.target.value)
                    handleAttributeChange('specifications', specs)
                  } catch {
                    // Invalid JSON, ignore for now
                  }
                }}
                className="input-field resize-none font-mono text-sm"
                rows={4}
                placeholder='{"weight": "5 lbs", "dimensions": "10x5x3 inches"}'
              />
              <p className="text-xs text-gray-500 mt-1">Enter as JSON format</p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // support rendering either as a modal (default) or inline panel
  const panel = (
    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full min-h-[60vh] max-h-[90vh] overflow-auto text-gray-900 dark:text-gray-100">
      {/* Close button (visible on small screens where header may be off-screen) */}
      <button
        type="button"
        onClick={onCancel}
        aria-label="Close"
        className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white rounded focus:outline-none"
      >
        ×
      </button>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {mode === 'edit' ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {businessType.charAt(0).toUpperCase() + businessType.slice(1)} inventory management
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-600 text-sm">{errors.general}</div>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`input-field ${errors.name ? 'border-red-300' : ''}`}
                placeholder="Enter item name"
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                SKU *
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                className={`input-field ${errors.sku ? 'border-red-300' : ''}`}
                placeholder="Enter SKU code"
              />
              {errors.sku && <p className="text-red-600 text-sm mt-1">{errors.sku}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Category *
              </label>
              <select
                value={formData.categoryId || ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={`input-field ${errors.categoryId ? 'border-red-300' : ''}`}
              >
                <option value="">Select category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.emoji} {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="text-red-600 text-sm mt-1">{errors.categoryId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Subcategory (Optional)
              </label>
              <select
                value={formData.subcategoryId || ''}
                onChange={(e) => handleInputChange('subcategoryId', e.target.value || '')}
                className="input-field"
                disabled={!selectedCategory || availableSubcategories.length === 0}
              >
                <option value="">No subcategory</option>
                {availableSubcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.emoji && `${subcategory.emoji} `}{subcategory.name}
                  </option>
                ))}
              </select>
              {!selectedCategory && (
                <p className="text-gray-500 text-sm mt-1">Select a category first</p>
              )}
              {selectedCategory && availableSubcategories.length === 0 && (
                <p className="text-gray-500 text-sm mt-1">No subcategories available for this category</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Unit *
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                className={`input-field ${errors.unit ? 'border-red-300' : ''}`}
                placeholder="lbs, each, gallons, etc."
              />
              {errors.unit && <p className="text-red-600 text-sm mt-1">{errors.unit}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Current Stock *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.currentStock}
                onChange={(e) => handleInputChange('currentStock', parseFloat(e.target.value) || 0)}
                className={`input-field ${errors.currentStock ? 'border-red-300' : ''}`}
                placeholder="0.00"
              />
              {errors.currentStock && <p className="text-red-600 text-sm mt-1">{errors.currentStock}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Cost Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                className={`input-field ${errors.costPrice ? 'border-red-300' : ''}`}
                placeholder="0.00"
              />
              {errors.costPrice && <p className="text-red-600 text-sm mt-1">{errors.costPrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Sell Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sellPrice}
                onChange={(e) => handleInputChange('sellPrice', parseFloat(e.target.value) || 0)}
                className={`input-field ${errors.sellPrice ? 'border-red-300' : ''}`}
                placeholder="0.00"
              />
              {errors.sellPrice && <p className="text-red-600 text-sm mt-1">{errors.sellPrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Supplier
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Supplier name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Storage location"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Active Item
            </label>
          </div>
        </div>

        {/* Business-Specific Fields */}
        {getBusinessSpecificFields()}

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (mode === 'edit' ? 'Update Item' : 'Create Item')}
          </button>
        </div>
      </form>
    </div>
  )

  if (renderMode === 'modal') {
    if (!isOpen) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="w-full flex items-start justify-center pt-8">{/* ensure modal starts lower so top isn't clipped */}
          {panel}
        </div>
      </div>
    )
  }

  // inline render mode — parent provides the modal wrapper
  return panel
}