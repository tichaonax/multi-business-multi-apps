'use client'

import { Modal } from '@/components/ui/modal'
import { useState, useEffect } from 'react'
import { Package, Edit } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  isAvailable: boolean
  business_categories: {
    id: string
    name: string
    emoji: string | null
    domain: {
      id: string
      name: string
      emoji: string | null
    }
  }
  inventory_subcategory: {
    id: string
    name: string
  } | null
}

interface Category {
  id: string
  name: string
  emoji: string | null
  domain: {
    id: string
    name: string
    emoji: string | null
  }
  inventory_subcategories: {
    id: string
    name: string
  }[]
}

interface Domain {
  id: string
  name: string
  emoji: string | null
}

interface ProductEditModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onSuccess: () => void
}

export function ProductEditModal({ isOpen, onClose, product, onSuccess }: ProductEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subcategoryId: '',
    isAvailable: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [selectedDomain, setSelectedDomain] = useState('')

  // Fetch categories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  // Initialize form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        categoryId: product.business_categories?.id || '',
        subcategoryId: product.inventory_subcategory?.id || '',
        isAvailable: product.isAvailable
      })
      setSelectedDomain(product.business_categories?.domain?.id || '')
    }
  }, [product])

  const fetchCategories = async () => {
    setLoadingCategories(true)
    try {
      const response = await fetch('/api/admin/clothing/categories')
      const data = await response.json()

      if (data.success) {
        setCategories(data.data.categories)
        setDomains(data.data.domains)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const filteredCategories = selectedDomain
    ? categories.filter(c => c.domain.id === selectedDomain)
    : categories

  const selectedCategory = categories.find(c => c.id === formData.categoryId)
  const subcategories = selectedCategory?.inventory_subcategories || []

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !product) return

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/clothing/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          categoryId: formData.categoryId,
          subcategoryId: formData.subcategoryId || null,
          isAvailable: formData.isAvailable
        })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setErrors({ submit: data.error || 'Failed to update product' })
      }
    } catch (error) {
      console.error('Error updating product:', error)
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      categoryId: '',
      subcategoryId: '',
      isAvailable: false
    })
    setSelectedDomain('')
    setErrors({})
    onClose()
  }

  const handleDomainChange = (domainId: string) => {
    setSelectedDomain(domainId)
    // Reset category and subcategory when domain changes
    setFormData({
      ...formData,
      categoryId: '',
      subcategoryId: ''
    })
  }

  const handleCategoryChange = (categoryId: string) => {
    setFormData({
      ...formData,
      categoryId,
      subcategoryId: '' // Reset subcategory when category changes
    })
  }

  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Product" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Info */}
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Edit className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{product.name}</p>
              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
            </div>
          </div>
        </div>

        {/* Product Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`}
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Department Filter */}
        <div>
          <label htmlFor="department" className="block text-sm font-medium mb-1">
            Department (Filter)
          </label>
          <select
            id="department"
            value={selectedDomain}
            onChange={(e) => handleDomainChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={loadingCategories}
          >
            <option value="">All Departments</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.emoji} {domain.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Filter categories by department
          </p>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={formData.categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={`w-full rounded-md border ${errors.categoryId ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm`}
            disabled={loadingCategories}
          >
            <option value="">Select a category</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.emoji} {category.name} ({category.domain.emoji} {category.domain.name})
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>
          )}
          {loadingCategories && (
            <p className="text-xs text-muted-foreground mt-1">Loading categories...</p>
          )}
        </div>

        {/* Subcategory */}
        <div>
          <label htmlFor="subcategory" className="block text-sm font-medium mb-1">
            Subcategory (Optional)
          </label>
          <select
            id="subcategory"
            value={formData.subcategoryId}
            onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={!formData.categoryId || subcategories.length === 0}
          >
            <option value="">None</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
          {formData.categoryId && subcategories.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              No subcategories available for this category
            </p>
          )}
        </div>

        {/* Availability */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-medium">Available for sale</span>
          </label>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Make this product available in the system
          </p>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            disabled={loading || loadingCategories}
          >
            {loading ? 'Updating...' : 'Update Product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
