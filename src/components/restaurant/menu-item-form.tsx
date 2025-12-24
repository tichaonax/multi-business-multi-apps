'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface MenuItem {
  id: string
  name: string
  description?: string
  basePrice: number
  originalPrice?: number
  discountPercent?: number
  categoryId: string
  category?: {
    id: string
    name: string
  }
  isActive: boolean
  isAvailable: boolean
  isCombo: boolean
  requiresCompanionItem?: boolean
  preparationTime?: number
  spiceLevel?: number
  dietaryRestrictions: string[]
  allergens: string[]
  calories?: number
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

interface Category {
  id: string
  name: string
}

interface MenuItemFormProps {
  item: MenuItem | null
  categories: Category[]
  onSubmit: (data: any) => Promise<any>
  onCancel: () => void
  onDone?: (saved?: any) => void
}

interface ImageUpload {
  id?: string
  file?: File
  url?: string
  preview?: string
  isPrimary: boolean
  altText: string
  toDelete?: boolean
}

const DIETARY_RESTRICTIONS = [
  { id: 'VEGETARIAN', label: 'Vegetarian', emoji: '🥬' },
  { id: 'VEGAN', label: 'Vegan', emoji: '🌱' },
  { id: 'GLUTEN_FREE', label: 'Gluten Free', emoji: '🌾' },
  { id: 'DAIRY_FREE', label: 'Dairy Free', emoji: '🥛' },
  { id: 'NUT_FREE', label: 'Nut Free', emoji: '🥜' },
  { id: 'KETO', label: 'Keto', emoji: '🥩' },
  { id: 'LOW_CARB', label: 'Low Carb', emoji: '🥗' },
  { id: 'PALEO', label: 'Paleo', emoji: '🦴' },
  { id: 'HALAL', label: 'Halal', emoji: '🕌' },
  { id: 'KOSHER', label: 'Kosher', emoji: '✡️' }
]

const ALLERGENS = [
  { id: 'NUTS', label: 'Nuts' },
  { id: 'DAIRY', label: 'Dairy' },
  { id: 'EGGS', label: 'Eggs' },
  { id: 'SOY', label: 'Soy' },
  { id: 'WHEAT', label: 'Wheat' },
  { id: 'SHELLFISH', label: 'Shellfish' },
  { id: 'FISH', label: 'Fish' },
  { id: 'SESAME', label: 'Sesame' },
  { id: 'SULFITES', label: 'Sulfites' },
  { id: 'MSG', label: 'MSG' }
]

export function MenuItemForm({ item, categories, onSubmit, onCancel, onDone }: MenuItemFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    basePrice: 0,
    originalPrice: '',
    discountPercent: '',
    preparationTime: '',
    spiceLevel: 0,
    calories: '',
    dietaryRestrictions: [] as string[],
    allergens: [] as string[],
    isActive: true,
    isAvailable: true,
    isCombo: false,
    requiresCompanionItem: false
  })

  const [images, setImages] = useState<ImageUpload[]>([])
  const [variants, setVariants] = useState<Array<{ id?: string; name: string; price: number; isAvailable: boolean; sku?: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form validation
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})

  // Category creation
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦')
  const [newCategoryColor, setNewCategoryColor] = useState('#4ECDC4')

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description || '',
        categoryId: item.categoryId,
        basePrice: item.basePrice,
        originalPrice: item.originalPrice?.toString() || '',
        discountPercent: item.discountPercent?.toString() || '',
        preparationTime: item.preparationTime?.toString() || '',
        spiceLevel: item.spiceLevel || 0,
        calories: item.calories?.toString() || '',
        dietaryRestrictions: item.dietaryRestrictions,
        allergens: item.allergens,
        isActive: item.isActive,
        isAvailable: item.isAvailable,
        isCombo: item.isCombo,
        requiresCompanionItem: item.requiresCompanionItem || false
      })

      // Set existing images
      if (item.images) {
        setImages(item.images.map(img => ({
          id: img.id,
          url: img.imageUrl,
          isPrimary: img.isPrimary,
          altText: img.altText || ''
        })))
      }

      // Set variants (ensure price is always a number)
      if (item.variants) {
        setVariants(item.variants.map(v => ({
          id: v.id,
          name: v.name,
          price: typeof v.price === 'number' ? v.price : parseFloat(v.price) || 0,
          isAvailable: v.isAvailable,
          sku: (v as any).sku // Preserve existing SKU
        })))
      }
    }
  }, [item])

  const validateForm = () => {
    const errors: { [key: string]: string } = {}

    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.categoryId) errors.categoryId = 'Category is required'
    if (formData.basePrice <= 0) errors.basePrice = 'Price must be greater than 0'
    if (formData.originalPrice && parseFloat(formData.originalPrice) <= formData.basePrice) {
      errors.originalPrice = 'Original price must be greater than current price'
    }
    if (formData.discountPercent && (parseFloat(formData.discountPercent) < 0 || parseFloat(formData.discountPercent) > 100)) {
      errors.discountPercent = 'Discount must be between 0 and 100%'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          setImages(prev => [...prev, {
            file,
            preview,
            isPrimary: prev.length === 0, // First image is primary by default
            altText: file.name
          }])
        }
        reader.readAsDataURL(file)
      }
    })

    // Reset input
    event.target.value = ''
  }

  const handleImageDelete = (index: number) => {
    setImages(prev => {
      const updated = [...prev]
      const target = updated[index]
      if (target?.id) {
        // call API to delete
        fetch(`/api/universal/products/${item?.id || ''}/images`, {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ imageId: target.id })
        }).catch((e) => console.warn('Failed to delete image', e))
        // mark deleted locally
        updated[index].toDelete = true
      } else {
        // Remove new image
        updated.splice(index, 1)
      }

      // If deleted image was primary, make first remaining image primary locally
      if (target?.isPrimary) {
        const firstAvailable = updated.find(img => !img.toDelete)
        if (firstAvailable) {
          firstAvailable.isPrimary = true
        }
      }

      return updated
    })
  }

  const handleImageSetPrimary = (index: number) => {
    const target = images[index]
    if (target?.id && item?.id) {
      // call API to set primary
      fetch(`/api/universal/products/${item.id}/images/${target.id}/primary`, { method: 'POST' })
        .then(r => r.json())
        .then((res) => {
          if (res?.success && res.data) {
            // Update local state to reflect primary
            setImages(prev => prev.map(img => ({ ...img, isPrimary: img.id === res.data.id })))
          }
        })
        .catch(e => console.warn('Failed to set primary', e))
    } else {
      // local only (new images)
      setImages(prev => prev.map((img, i) => ({ ...img, isPrimary: i === index })))
    }
  }

  const toggleDietaryRestriction = (restriction: string) => {
    handleInputChange('dietaryRestrictions',
      formData.dietaryRestrictions.includes(restriction)
        ? formData.dietaryRestrictions.filter(r => r !== restriction)
        : [...formData.dietaryRestrictions, restriction]
    )
  }

  const toggleAllergen = (allergen: string) => {
    handleInputChange('allergens',
      formData.allergens.includes(allergen)
        ? formData.allergens.filter(a => a !== allergen)
        : [...formData.allergens, allergen]
    )
  }

  const addVariant = () => {
    setVariants(prev => [...prev, { name: '', price: 0, isAvailable: true }])
  }

  const updateVariant = (index: number, field: string, value: any) => {
    setVariants(prev => {
      const updated = prev.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
      if (field === 'price') {
        console.log(`[Variant Update] ${prev[index].name} price changed: ${prev[index].price} → ${value}`)
      }
      return updated
    })
  }

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index))
  }

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name is required')
      return
    }

    try {
      const response = await fetch('/api/universal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: 'restaurant-demo',
          businessType: 'restaurant',
          name: newCategoryName.trim(),
          emoji: newCategoryEmoji,
          color: newCategoryColor,
          displayOrder: 0
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Update categories list in parent would be ideal, but for now just set the new category ID
        handleInputChange('categoryId', result.data.id)
        setIsCreatingCategory(false)
        setNewCategoryName('')
        setNewCategoryEmoji('📦')
        setNewCategoryColor('#4ECDC4')
        setError(null)

        // Reload page to refresh categories list
        window.location.reload()
      } else {
        setError(result.error || 'Failed to create category')
      }
    } catch (err) {
      setError('Network error while creating category')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare form data for submission (excluding images for now)
      const submitData = {
        ...formData,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null,
        preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : null,
        calories: formData.calories ? parseInt(formData.calories) : null,
        // Skip images until image upload API is implemented
        // images: images.filter(img => !img.toDelete),
        variants: variants
          .filter(v => v.name.trim())
          .map(v => ({
            id: v.id, // Preserve ID for updates
            name: v.name,
            price: typeof v.price === 'number' ? v.price : parseFloat(v.price) || 0,
            isAvailable: v.isAvailable ?? true,
            // Use existing SKU if available, otherwise generate one
            sku: v.sku || v.id || `VAR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            stockQuantity: 0,
            reorderLevel: 0
          })),
        businessType: 'restaurant'
      }

      console.log('[Form Submit] Submitting variants:', submitData.variants.map(v => `${v.name}: $${v.price}`))

  // call onSubmit to create/update product first — expect it to return the saved product object
  const saved = await onSubmit(submitData)
  let savedWithImages = saved

  // After product saved, if we have new files to upload, send them to upload endpoint
  const productId = saved?.id || item?.id
      if (productId) {
        const newFiles = images.filter(img => img.file)
        if (newFiles.length > 0) {
          const form = new FormData()
          newFiles.forEach(f => { if (f.file) form.append('files', f.file) })
          let savedWithImages = saved
          try {
            const resp = await fetch(`/api/universal/products/${productId}/images`, { method: 'POST', body: form })
            const json = await resp.json()

            if (json?.success) {
              // Accept either: { success:true, data: [createdImages] } OR { success:true, data: productWithImages }
              let returnedImages: any[] = []
              let productFromResponse: any = null

              if (Array.isArray(json.data)) {
                returnedImages = json.data
              } else if (json.data && Array.isArray(json.data.images)) {
                productFromResponse = json.data
                returnedImages = json.data.images
              }

              if (returnedImages.length > 0) {
                // Merge returned images into state: remove local-file placeholders and append created records
                setImages(prev => {
                  const remaining = prev.filter(p => !p.file && !p.toDelete)
                  const created = returnedImages.map((d: any) => ({ id: d.id, url: d.imageUrl, isPrimary: d.isPrimary, altText: d.altText || '' }))
                  return [...remaining, ...created]
                })

                // Also enrich the saved product object so callers receive images
                if (productFromResponse) {
                  savedWithImages = { ...savedWithImages, images: productFromResponse.images }
                } else {
                  // append created image records to saved.images if present
                  const existing = Array.isArray(savedWithImages?.images) ? savedWithImages.images : []
                  const mapped = returnedImages.map((d: any) => ({ id: d.id, imageUrl: d.imageUrl, isPrimary: d.isPrimary, altText: d.altText || '' }))
                  savedWithImages = { ...savedWithImages, images: [...existing, ...mapped] }
                }
              }
            }
          } catch (err) {
            console.warn('Image upload failed', err)
            setError('Failed to upload images')
          }
        }
      }

  // Let parent know we're done and pass saved product (with any uploaded images) so parent can refresh or close UI
  if (onDone) onDone(savedWithImages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary">
          <h2 className="text-2xl font-bold text-primary">
            {item ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h2>
          <button
            onClick={onCancel}
            className="text-secondary hover:text-primary text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-red-600">❌</span>
                <span className="text-red-800 dark:text-red-200">{error}</span>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Item Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={validationErrors.name ? 'border-red-300' : ''}
                placeholder="e.g., Grilled Chicken Breast"
              />
              {validationErrors.name && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Category *
              </label>
              {!isCreatingCategory ? (
                <div className="flex gap-2">
                  <select
                    value={formData.categoryId}
                    onChange={(e) => {
                      if (e.target.value === '__create_new__') {
                        setIsCreatingCategory(true)
                      } else {
                        handleInputChange('categoryId', e.target.value)
                      }
                    }}
                    className={`input-field flex-1 ${
                      validationErrors.categoryId ? 'border-red-300' : ''
                    }`}
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {(category as any).emoji ? `${(category as any).emoji} ${category.name}` : category.name}
                      </option>
                    ))}
                    <option value="__create_new__">➕ Create New Category...</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newCategoryEmoji}
                      onChange={(e) => setNewCategoryEmoji(e.target.value)}
                      placeholder="📦"
                      className="w-16 text-center text-2xl"
                      maxLength={2}
                    />
                    <Input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          createNewCategory()
                        } else if (e.key === 'Escape') {
                          setIsCreatingCategory(false)
                          setNewCategoryName('')
                          setNewCategoryEmoji('📦')
                        }
                      }}
                    />
                    <Input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="w-16"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={createNewCategory}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      ✓ Create Category
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setIsCreatingCategory(false)
                        setNewCategoryName('')
                        setNewCategoryEmoji('📦')
                        setNewCategoryColor('#4ECDC4')
                      }}
                      size="sm"
                      variant="outline"
                    >
                      ✕ Cancel
                    </Button>
                  </div>
                </div>
              )}
              {validationErrors.categoryId && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.categoryId}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="input-field"
              placeholder="Brief description of the menu item..."
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Current Price * ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.basePrice}
                onChange={(e) => handleInputChange('basePrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className={validationErrors.basePrice ? 'border-red-300' : ''}
              />
              {validationErrors.basePrice && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.basePrice}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Original Price ($)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.originalPrice}
                onChange={(e) => handleInputChange('originalPrice', e.target.value)}
                className={validationErrors.originalPrice ? 'border-red-300' : ''}
                placeholder="For showing discounts"
              />
              {validationErrors.originalPrice && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.originalPrice}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Discount (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.discountPercent}
                onChange={(e) => handleInputChange('discountPercent', e.target.value)}
                className={validationErrors.discountPercent ? 'border-red-300' : ''}
              />
              {validationErrors.discountPercent && (
                <p className="text-red-600 text-sm mt-1">{validationErrors.discountPercent}</p>
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Preparation Time (minutes)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.preparationTime}
                onChange={(e) => handleInputChange('preparationTime', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Calories
              </label>
              <Input
                type="number"
                min="0"
                value={formData.calories}
                onChange={(e) => handleInputChange('calories', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Spice Level (0-5)
              </label>
              <select
                value={formData.spiceLevel}
                onChange={(e) => handleInputChange('spiceLevel', parseInt(e.target.value))}
                className="input-field"
              >
                <option value={0}>None</option>
                <option value={1}>🌶️ Mild</option>
                <option value={2}>🌶️🌶️ Medium</option>
                <option value={3}>🌶️🌶️🌶️ Hot</option>
                <option value={4}>🌶️🌶️🌶️🌶️ Very Hot</option>
                <option value={5}>🌶️🌶️🌶️🌶️🌶️ Extremely Hot</option>
              </select>
            </div>
          </div>

          {/* Status Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-primary">
                Active (appears in menu)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isAvailable"
                checked={formData.isAvailable}
                onChange={(e) => handleInputChange('isAvailable', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isAvailable" className="text-sm font-medium text-primary">
                Available for order
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isCombo"
                checked={formData.isCombo}
                onChange={(e) => handleInputChange('isCombo', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isCombo" className="text-sm font-medium text-primary">
                Combo Item
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="requiresCompanionItem"
                checked={formData.requiresCompanionItem}
                onChange={(e) => handleInputChange('requiresCompanionItem', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="requiresCompanionItem" className="text-sm font-medium text-primary" title="Item cannot be sold alone, requires a main item from the same category">
                Requires Companion Item 🔗
              </label>
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Images
            </label>

            <div className="border-2 border-dashed border-primary rounded-lg p-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />

              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center justify-center py-4"
              >
                <span className="text-4xl mb-2">📸</span>
                <span className="text-primary">Click to upload images</span>
                <span className="text-secondary text-sm">PNG, JPG up to 10MB each</span>
              </label>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {images
                    .filter(img => !img.toDelete)
                    .map((img, index) => (
                    <div key={index} className="relative group">
                      <div className="relative h-24 w-full bg-neutral-100 dark:bg-neutral-700 rounded-lg overflow-hidden">
                        <Image
                          src={img.preview || img.url!}
                          alt={img.altText}
                          fill
                          className="object-cover"
                        />

                        {img.isPrimary && (
                          <div className="absolute top-1 left-1">
                            <Badge className="bg-blue-500 text-white text-xs">
                              Primary
                            </Badge>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {!img.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleImageSetPrimary(index)}
                              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                            >
                              Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleImageDelete(index)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Dietary Restrictions
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_RESTRICTIONS.map(restriction => (
                <button
                  key={restriction.id}
                  type="button"
                  onClick={() => toggleDietaryRestriction(restriction.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    formData.dietaryRestrictions.includes(restriction.id)
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-primary border-primary hover:bg-neutral-200 dark:hover:bg-neutral-600'
                  }`}
                >
                  {restriction.emoji} {restriction.label}
                </button>
              ))}
            </div>
          </div>

          {/* Allergens */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Allergens
            </label>
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map(allergen => (
                <button
                  key={allergen.id}
                  type="button"
                  onClick={() => toggleAllergen(allergen.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    formData.allergens.includes(allergen.id)
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-primary border-primary hover:bg-neutral-200 dark:hover:bg-neutral-600'
                  }`}
                >
                  ⚠️ {allergen.label}
                </button>
              ))}
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-primary">
                Variants (Sizes, Options, etc.)
              </label>
              <Button type="button" onClick={addVariant} variant="outline" size="sm">
                ➕ Add Variant
              </Button>
            </div>

            {variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                <div className="col-span-5">
                  <Input
                    type="text"
                    value={variant.name}
                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                    placeholder="e.g., Large, Extra Cheese"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, 'price', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    placeholder="Price"
                  />
                </div>
                <div className="col-span-2 flex items-center">
                  <input
                    type="checkbox"
                    checked={variant.isAvailable}
                    onChange={(e) => updateVariant(index, 'isAvailable', e.target.checked)}
                    className="mr-1"
                  />
                  <span className="text-sm">Available</span>
                </div>
                <div className="col-span-2">
                  <Button
                    type="button"
                    onClick={() => removeVariant(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-primary">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}