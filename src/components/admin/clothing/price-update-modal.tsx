'use client'

import { Modal } from '@/components/ui/modal'
import { useState } from 'react'
import { DollarSign } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  basePrice: number
  costPrice: number | null
  originalPrice: number | null
  discountPercent: number | null
}

interface PriceUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onSuccess: () => void
}

export function PriceUpdateModal({ isOpen, onClose, product, onSuccess }: PriceUpdateModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    basePrice: '',
    costPrice: '',
    originalPrice: '',
    discountPercent: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form when product changes
  useState(() => {
    if (product) {
      setFormData({
        basePrice: Number(product.basePrice) > 0 ? Number(product.basePrice).toString() : '',
        costPrice: product.costPrice ? Number(product.costPrice).toString() : '',
        originalPrice: product.originalPrice ? Number(product.originalPrice).toString() : '',
        discountPercent: product.discountPercent ? Number(product.discountPercent).toString() : ''
      })
    }
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}

    const basePrice = parseFloat(formData.basePrice)
    if (!formData.basePrice || isNaN(basePrice) || basePrice < 0) {
      newErrors.basePrice = 'Base price is required and must be a positive number'
    }

    if (formData.costPrice) {
      const costPrice = parseFloat(formData.costPrice)
      if (isNaN(costPrice) || costPrice < 0) {
        newErrors.costPrice = 'Cost price must be a positive number'
      }
    }

    if (formData.originalPrice) {
      const originalPrice = parseFloat(formData.originalPrice)
      if (isNaN(originalPrice) || originalPrice < 0) {
        newErrors.originalPrice = 'Original price must be a positive number'
      }
    }

    if (formData.discountPercent) {
      const discountPercent = parseFloat(formData.discountPercent)
      if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
        newErrors.discountPercent = 'Discount must be between 0 and 100'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !product) return

    setLoading(true)

    try {
      const response = await fetch(`/api/admin/clothing/products/${product.id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePrice: parseFloat(formData.basePrice),
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
          originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
          discountPercent: formData.discountPercent ? parseFloat(formData.discountPercent) : null
        })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setErrors({ submit: data.error || 'Failed to update price' })
      }
    } catch (error) {
      console.error('Error updating price:', error)
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      basePrice: '',
      costPrice: '',
      originalPrice: '',
      discountPercent: ''
    })
    setErrors({})
    onClose()
  }

  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Update Product Price" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Info */}
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">{product.name}</p>
              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
            </div>
          </div>
        </div>

        {/* Base Price (Required) */}
        <div>
          <label htmlFor="basePrice" className="block text-sm font-medium mb-1">
            Base Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
            <input
              id="basePrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
              className={`w-full rounded-md border ${errors.basePrice ? 'border-red-500' : 'border-input'} bg-background pl-8 pr-3 py-2 text-sm`}
              placeholder="0.00"
            />
          </div>
          {errors.basePrice && (
            <p className="text-xs text-red-500 mt-1">{errors.basePrice}</p>
          )}
        </div>

        {/* Cost Price (Optional) */}
        <div>
          <label htmlFor="costPrice" className="block text-sm font-medium mb-1">
            Cost Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
            <input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              className={`w-full rounded-md border ${errors.costPrice ? 'border-red-500' : 'border-input'} bg-background pl-8 pr-3 py-2 text-sm`}
              placeholder="0.00"
            />
          </div>
          {errors.costPrice && (
            <p className="text-xs text-red-500 mt-1">{errors.costPrice}</p>
          )}
        </div>

        {/* Original Price (Optional) */}
        <div>
          <label htmlFor="originalPrice" className="block text-sm font-medium mb-1">
            Original Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
            <input
              id="originalPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.originalPrice}
              onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
              className={`w-full rounded-md border ${errors.originalPrice ? 'border-red-500' : 'border-input'} bg-background pl-8 pr-3 py-2 text-sm`}
              placeholder="0.00"
            />
          </div>
          {errors.originalPrice && (
            <p className="text-xs text-red-500 mt-1">{errors.originalPrice}</p>
          )}
        </div>

        {/* Discount Percent (Optional) */}
        <div>
          <label htmlFor="discountPercent" className="block text-sm font-medium mb-1">
            Discount Percent
          </label>
          <div className="relative">
            <input
              id="discountPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.discountPercent}
              onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
              className={`w-full rounded-md border ${errors.discountPercent ? 'border-red-500' : 'border-input'} bg-background pl-3 pr-8 py-2 text-sm`}
              placeholder="0"
            />
            <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
          </div>
          {errors.discountPercent && (
            <p className="text-xs text-red-500 mt-1">{errors.discountPercent}</p>
          )}
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
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Price'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
