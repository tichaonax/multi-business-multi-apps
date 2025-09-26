'use client'

import { useState } from 'react'
import { useBusinessContext, useBusinessFeatures } from './business-context'

export interface UniversalProduct {
  id: string
  name: string
  description?: string
  sku: string
  barcode?: string
  productType: 'PHYSICAL' | 'DIGITAL' | 'SERVICE' | 'COMBO'
  condition: 'NEW' | 'USED' | 'REFURBISHED' | 'DAMAGED' | 'EXPIRED'
  basePrice: number
  costPrice?: number
  businessType: string
  attributes?: Record<string, any>
  isActive: boolean
  brand?: {
    id: string
    name: string
  }
  category?: {
    id: string
    name: string
  }
  variants?: Array<{
    id: string
    name?: string
    sku: string
    price?: number
    stockQuantity: number
    attributes?: Record<string, any>
  }>
  images?: Array<{
    id: string
    imageUrl: string
    altText?: string
    isPrimary: boolean
  }>
}

interface ProductCardProps {
  product: UniversalProduct
  onAddToCart?: (productId: string, variantId?: string, quantity?: number) => void
  onEdit?: (productId: string) => void
  onView?: (productId: string) => void
  showActions?: boolean
  compact?: boolean
}

export function UniversalProductCard({
  product,
  onAddToCart,
  onEdit,
  onView,
  showActions = true,
  compact = false
}: ProductCardProps) {
  const { formatCurrency, isBusinessType } = useBusinessContext()
  const businessFeatures = useBusinessFeatures()
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    product.variants?.[0]?.id || null
  )

  const currentVariant = product.variants?.find(v => v.id === selectedVariant)
  const currentPrice = currentVariant?.price ?? product.basePrice
  const primaryImage = product.images?.find(img => img.isPrimary)?.imageUrl
  const stockQuantity = currentVariant?.stockQuantity ?? 0

  const getBusinessSpecificBadges = () => {
    const badges: Array<{ label: string; color: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'error' }> = []

    if (businessFeatures.isClothing()) {
      if (product.condition === 'USED') {
        badges.push({ label: 'Used', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200', variant: 'warning' })
      }
      if (product.attributes?.season) {
        badges.push({ label: product.attributes.season, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200', variant: 'default' })
      }
      if (product.attributes?.gender) {
        badges.push({ label: product.attributes.gender, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200', variant: 'secondary' })
      }
    }

    if (businessFeatures.isHardware()) {
      if (product.attributes?.grade === 'professional') {
        badges.push({ label: 'Professional Grade', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200', variant: 'success' })
      }
      if (product.attributes?.requiresAge) {
        badges.push({ label: '18+ Required', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200', variant: 'error' })
      }
    }

    if (businessFeatures.isGrocery()) {
      if (product.attributes?.organic) {
        badges.push({ label: 'Organic', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200', variant: 'success' })
      }
      if (product.attributes?.perishable) {
        badges.push({ label: 'Perishable', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200', variant: 'warning' })
      }
      if (product.attributes?.halal) {
        badges.push({ label: 'Halal', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200', variant: 'success' })
      }
    }

    if (businessFeatures.isRestaurant()) {
      if (product.attributes?.spiceLevel) {
        badges.push({
          label: `${product.attributes.spiceLevel} Spicy`,
          color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
          variant: 'error'
        })
      }
      if (product.attributes?.vegetarian) {
        badges.push({ label: 'Vegetarian', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200', variant: 'success' })
      }
      if (product.attributes?.preparationTime) {
        badges.push({
          label: `${product.attributes.preparationTime} min`,
          color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
          variant: 'default'
        })
      }
    }

    if (businessFeatures.isConsulting()) {
      if (product.attributes?.expertise) {
        badges.push({
          label: product.attributes.expertise,
          color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200',
          variant: 'default'
        })
      }
      if (product.attributes?.remote) {
        badges.push({ label: 'Remote Available', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200', variant: 'default' })
      }
    }

    return badges
  }

  const getStockStatus = () => {
    if (product.productType !== 'PHYSICAL') return null

    if (stockQuantity <= 0) {
      return { label: 'Out of Stock', color: 'text-red-600', canOrder: false }
    }

    const lowStockThreshold = businessFeatures.hasInventoryTracking() ? 10 : 5
    if (stockQuantity <= lowStockThreshold) {
      return { label: `Low Stock (${stockQuantity})`, color: 'text-orange-600', canOrder: true }
    }

    return { label: `In Stock (${stockQuantity})`, color: 'text-green-600', canOrder: true }
  }

  const stockStatus = getStockStatus()
  const badges = getBusinessSpecificBadges()

  return (
    <div className={`card rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow ${compact ? 'p-3' : 'p-4'}`}>
      {/* Product Image */}
      {!compact && (
        <div className="aspect-square mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-secondary">
              <div className="text-center">
                <div className="text-4xl mb-2">
                  {businessFeatures.isClothing() && '👕'}
                  {businessFeatures.isHardware() && '🔧'}
                  {businessFeatures.isGrocery() && '🛒'}
                  {businessFeatures.isRestaurant() && '🍽️'}
                  {businessFeatures.isConsulting() && '💼'}
                </div>
                <span className="text-sm">No Image</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="flex-1">
        {/* Title and Brand */}
        <div className="mb-2">
          <h3 className={`font-semibold text-primary ${compact ? 'text-sm' : 'text-lg'} line-clamp-2`}>
            {product.name}
          </h3>
          {product.brand && (
            <p className={`text-secondary ${compact ? 'text-xs' : 'text-sm'}`}>
              {product.brand.name}
            </p>
          )}
        </div>

        {/* Description */}
        {!compact && product.description && (
          <p className="text-sm text-secondary mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {badges.slice(0, compact ? 2 : 4).map((badge, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
              >
                {badge.label}
              </span>
            ))}
            {badges.length > (compact ? 2 : 4) && (
              <span className="text-xs text-secondary">
                +{badges.length - (compact ? 2 : 4)} more
              </span>
            )}
          </div>
        )}

        {/* Variants */}
        {product.variants && product.variants.length > 1 && !compact && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-primary mb-1">
              {businessFeatures.isClothing() && 'Size & Color:'}
              {businessFeatures.isHardware() && 'Specification:'}
              {businessFeatures.isGrocery() && 'Package:'}
              {businessFeatures.isRestaurant() && 'Portion:'}
              {businessFeatures.isConsulting() && 'Duration:'}
            </label>
            <select
              value={selectedVariant || ''}
              onChange={(e) => setSelectedVariant(e.target.value)}
              className="input-field w-full text-sm"
            >
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name} ({formatCurrency(variant.price || product.basePrice)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className={`font-bold text-primary ${compact ? 'text-lg' : 'text-xl'}`}>
              {formatCurrency(currentPrice)}
            </span>
            {currentVariant?.price && currentVariant.price !== product.basePrice && (
              <span className="text-sm text-secondary line-through">
                {formatCurrency(product.basePrice)}
              </span>
            )}
          </div>
          {businessFeatures.isGrocery() && product.attributes?.unit && (
            <span className="text-xs text-secondary">
              per {product.attributes.unit}
            </span>
          )}
          {businessFeatures.isConsulting() && (
            <span className="text-xs text-secondary">
              per {product.attributes?.duration || 'hour'}
            </span>
          )}
        </div>

        {/* Stock Status */}
        {stockStatus && (
          <div className="mb-3">
            <span className={`text-sm font-medium ${stockStatus.color}`}>
              {stockStatus.label}
            </span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {onAddToCart && stockStatus?.canOrder !== false && (
              <button
                onClick={() => onAddToCart(product.id, selectedVariant || undefined, 1)}
                className="flex-1 bg-primary text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {businessFeatures.isRestaurant() && 'Order'}
                {businessFeatures.isConsulting() && 'Book'}
                {(!businessFeatures.isRestaurant() && !businessFeatures.isConsulting()) && 'Add to Cart'}
              </button>
            )}

            {onView && (
              <button
                onClick={() => onView(product.id)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                View
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(product.id)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        )}

        {/* SKU */}
        {!compact && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-secondary">
              SKU: {currentVariant?.sku || product.sku}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}