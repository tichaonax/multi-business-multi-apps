'use client'

import { useState, useEffect } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Promotion {
  id: string
  name: string
  description?: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_ONE_GET_ONE' | 'COMBO_DEAL' | 'HAPPY_HOUR' | 'CATEGORY_DISCOUNT'
  value: number
  minOrderAmount?: number
  maxDiscountAmount?: number
  startDate: string
  endDate?: string
  startTime?: string
  endTime?: string
  daysOfWeek: string[]
  isActive: boolean
  usageLimit?: number
  usageCount: number
  applicableCategories: string[]
  applicableProducts: string[]
}

interface Category {
  id: string
  name: string
}

interface MenuItem {
  id: string
  name: string
  categoryId: string
}

interface PromotionManagerProps {
  businessId: string
  categories: Category[]
  menuItems: MenuItem[]
  onPromotionChange?: () => void
}

const PROMOTION_TYPES = [
  { id: 'PERCENTAGE', label: 'Percentage Discount', description: 'X% off items' },
  { id: 'FIXED_AMOUNT', label: 'Fixed Amount Off', description: '$X off items' },
  { id: 'BUY_ONE_GET_ONE', label: 'Buy One Get One', description: 'BOGO deals' },
  { id: 'COMBO_DEAL', label: 'Combo Deal', description: 'Special combo pricing' },
  { id: 'HAPPY_HOUR', label: 'Happy Hour', description: 'Time-based discounts' },
  { id: 'CATEGORY_DISCOUNT', label: 'Category Discount', description: 'Discount entire categories' }
]

const DAYS_OF_WEEK = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
]

export function PromotionManager({ businessId, categories, menuItems, onPromotionChange }: PromotionManagerProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const confirm = useConfirm()
  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'PERCENTAGE' as Promotion['type'],
    value: 0,
    minOrderAmount: '',
    maxDiscountAmount: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [] as string[],
    isActive: true,
    usageLimit: '',
    applicableCategories: [] as string[],
    applicableProducts: [] as string[]
  })

  useEffect(() => {
    loadPromotions()
  }, [businessId])

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/universal/promotions?businessId=${businessId}`)
      const data = await response.json()

      if (data.success) {
        setPromotions(data.data)
      } else {
        setError(data.error || 'Failed to load promotions')
      }
    } catch (err) {
      setError('Network error while loading promotions')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePromotion = () => {
    setEditingPromotion(null)
    setFormData({
      name: '',
      description: '',
      type: 'PERCENTAGE',
      value: 0,
      minOrderAmount: '',
      maxDiscountAmount: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      isActive: true,
      usageLimit: '',
      applicableCategories: [],
      applicableProducts: []
    })
    setShowForm(true)
  }

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      value: promotion.value,
      minOrderAmount: promotion.minOrderAmount?.toString() || '',
      maxDiscountAmount: promotion.maxDiscountAmount?.toString() || '',
      startDate: promotion.startDate.split('T')[0],
      endDate: promotion.endDate?.split('T')[0] || '',
      startTime: promotion.startTime || '',
      endTime: promotion.endTime || '',
      daysOfWeek: promotion.daysOfWeek,
      isActive: promotion.isActive,
      usageLimit: promotion.usageLimit?.toString() || '',
      applicableCategories: promotion.applicableCategories,
      applicableProducts: promotion.applicableProducts
    })
    setShowForm(true)
  }

  const handleSubmitPromotion = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const submitData = {
        ...formData,
        businessId,
        value: parseFloat(formData.value.toString()),
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : undefined,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : undefined,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined
      }

      const url = editingPromotion
        ? `/api/universal/promotions/${editingPromotion.id}`
        : '/api/universal/promotions'

      const method = editingPromotion ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()

      if (result.success) {
        await loadPromotions()
        setShowForm(false)
        setEditingPromotion(null)
        onPromotionChange?.()
      } else {
        setError(result.error || 'Failed to save promotion')
      }
    } catch (err) {
      setError('Network error while saving promotion')
    }
  }

  const handleDeletePromotion = async (promotionId: string) => {
    const ok = await confirm({ title: 'Delete promotion', description: 'Are you sure you want to delete this promotion?', confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return

    try {
      const response = await fetch(`/api/universal/promotions/${promotionId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        await loadPromotions()
        onPromotionChange?.()
      } else {
        setError(result.error || 'Failed to delete promotion')
      }
    } catch (err) {
      setError('Network error while deleting promotion')
    }
  }

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      const response = await fetch(`/api/universal/promotions/${promotion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !promotion.isActive })
      })

      const result = await response.json()
      if (result.success) {
        await loadPromotions()
        onPromotionChange?.()
      } else {
        setError(result.error || 'Failed to update promotion')
      }
    } catch (err) {
      setError('Network error while updating promotion')
    }
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }))
  }

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      applicableCategories: prev.applicableCategories.includes(categoryId)
        ? prev.applicableCategories.filter(c => c !== categoryId)
        : [...prev.applicableCategories, categoryId]
    }))
  }

  const toggleProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      applicableProducts: prev.applicableProducts.includes(productId)
        ? prev.applicableProducts.filter(p => p !== productId)
        : [...prev.applicableProducts, productId]
    }))
  }

  const getPromotionTypeLabel = (type: string) => {
    return PROMOTION_TYPES.find(t => t.id === type)?.label || type
  }

  const formatPromotionValue = (promotion: Promotion) => {
    switch (promotion.type) {
      case 'PERCENTAGE':
        return `${promotion.value}% off`
      case 'FIXED_AMOUNT':
        return `$${promotion.value} off`
      case 'BUY_ONE_GET_ONE':
        return 'BOGO'
      default:
        return `$${promotion.value}`
    }
  }

  const isPromotionActive = (promotion: Promotion) => {
    const now = new Date()
    const startDate = new Date(promotion.startDate)
    const endDate = promotion.endDate ? new Date(promotion.endDate) : null

    return promotion.isActive &&
           now >= startDate &&
           (!endDate || now <= endDate) &&
           (!promotion.usageLimit || promotion.usageCount < promotion.usageLimit)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading promotions...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Promotions & Discounts</h3>
          <p className="text-sm text-secondary">Manage special offers and pricing</p>
        </div>
        <Button onClick={handleCreatePromotion} className="bg-primary hover:bg-primary/90">
          🎯 Create Promotion
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600">❌</span>
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-primary mb-2">No promotions yet</h3>
          <p className="text-secondary mb-4">Create your first promotion to boost sales</p>
          <Button onClick={handleCreatePromotion}>Create First Promotion</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map(promotion => (
            <div key={promotion.id} className="card p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-primary">{promotion.name}</h4>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isPromotionActive(promotion) ? "success" : "outline"}
                    className={isPromotionActive(promotion) ? "bg-green-100 text-green-800" : ""}
                  >
                    {isPromotionActive(promotion) ? '✅ Active' : '⏸️ Inactive'}
                  </Badge>
                </div>
              </div>

              {promotion.description && (
                <p className="text-sm text-gray-600 mb-3">{promotion.description}</p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{getPromotionTypeLabel(promotion.type)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Value:</span>
                  <span className="font-medium text-primary">{formatPromotionValue(promotion)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium">
                    {new Date(promotion.startDate).toLocaleDateString()}
                    {promotion.endDate && ` - ${new Date(promotion.endDate).toLocaleDateString()}`}
                  </span>
                </div>

                {promotion.usageLimit && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Usage:</span>
                    <span className="font-medium">
                      {promotion.usageCount} / {promotion.usageLimit}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPromotion(promotion)}
                  className="flex-1"
                >
                  ✏️ Edit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(promotion)}
                  className={`flex-1 ${promotion.isActive
                    ? 'hover:bg-orange-50 hover:text-orange-700'
                    : 'hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  {promotion.isActive ? '⏸️ Pause' : '▶️ Activate'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeletePromotion(promotion.id)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  🗑️
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Promotion Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-primary">
              <h2 className="text-xl font-bold text-primary">
                {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-secondary hover:text-primary text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitPromotion} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Weekend Special"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promotion Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Promotion['type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    {PROMOTION_TYPES.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Brief description of the promotion..."
                />
              </div>

              {/* Value and Limits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value * {formData.type === 'PERCENTAGE' ? '(%)' : '($)'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Order ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minOrderAmount: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Discount ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time (Optional)
                  </label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time (Optional)
                  </label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1 rounded-md text-sm border ${
                        formData.daysOfWeek.includes(day)
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Usage Limit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Limit
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
                    placeholder="Unlimited if empty"
                  />
                </div>

                <div className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active (promotion is enabled)
                  </label>
                </div>
              </div>

              {/* Applicable Categories */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Applicable Categories (leave empty for all)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={`px-3 py-1 rounded-md text-sm border ${
                          formData.applicableCategories.includes(category.id)
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {editingPromotion ? 'Update Promotion' : 'Create Promotion'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}