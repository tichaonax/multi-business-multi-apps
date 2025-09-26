'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export interface MenuItem {
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

interface MenuItemCardProps {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (itemId: string) => void
  onToggleAvailability: (itemId: string, currentAvailability: boolean) => void
}

export function MenuItemCard({ item, onEdit, onDelete, onToggleAvailability }: MenuItemCardProps) {
  const [imageError, setImageError] = useState(false)

  const primaryImage = item.images?.find(img => img.isPrimary) || item.images?.[0]

  // Normalize numeric fields that may come back as strings from the API
  const basePriceNum = typeof item.basePrice === 'number' ? item.basePrice : parseFloat(String(item.basePrice || '0'))
  const originalPriceNum = item.originalPrice !== undefined && item.originalPrice !== null ? (typeof item.originalPrice === 'number' ? item.originalPrice : parseFloat(String(item.originalPrice))) : undefined
  const discountPercentNum = item.discountPercent !== undefined && item.discountPercent !== null ? (typeof item.discountPercent === 'number' ? item.discountPercent : parseFloat(String(item.discountPercent))) : undefined

  const hasDiscount = !!(discountPercentNum || originalPriceNum)
  const discountedPrice = hasDiscount ?
    (originalPriceNum ? originalPriceNum - (originalPriceNum * (discountPercentNum || 0) / 100) : basePriceNum)
    : basePriceNum

  const formatPrice = (price: number | string) => {
    const n = typeof price === 'number' ? price : parseFloat(String(price || '0'))
    return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`
  }

  const getSpiceLevelDisplay = (level?: number) => {
    if (!level || level === 0) return null
    return '🌶️'.repeat(Math.min(level, 5))
  }

  const getDietaryBadges = (restrictions: string[]) => {
    const badgeMap: { [key: string]: { color: string; emoji: string } } = {
      'VEGETARIAN': { color: 'bg-green-100 text-green-800', emoji: '🥬' },
      'VEGAN': { color: 'bg-green-200 text-green-900', emoji: '🌱' },
      'GLUTEN_FREE': { color: 'bg-yellow-100 text-yellow-800', emoji: '🌾' },
      'DAIRY_FREE': { color: 'bg-blue-100 text-blue-800', emoji: '🥛' },
      'NUT_FREE': { color: 'bg-orange-100 text-orange-800', emoji: '🥜' },
      'KETO': { color: 'bg-purple-100 text-purple-800', emoji: '🥩' },
      'LOW_CARB': { color: 'bg-indigo-100 text-indigo-800', emoji: '🥗' }
    }

    return restrictions.slice(0, 3).map(restriction => {
      const badge = badgeMap[restriction] || { color: 'bg-gray-100 text-gray-800', emoji: '🏷️' }
      return {
        restriction,
        ...badge
      }
    })
  }

  return (
    <div className="card overflow-hidden">
      {/* Image Section */}
      <div className="relative h-48 bg-neutral-100 dark:bg-neutral-700">
        {primaryImage && !imageError ? (
          <Image
            src={primaryImage.imageUrl || (primaryImage as any).url || ''}
            alt={primaryImage.altText || item.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="text-sm">No image</p>
            </div>
          </div>
        )}

        {/* Availability Badge */}
        <div className="absolute top-2 left-2">
          <Badge
            variant={item.isAvailable ? "success" : "destructive"}
            className={`${item.isAvailable
              ? 'bg-green-100 text-green-800 border-green-200'
              : 'bg-red-100 text-red-800 border-red-200'
            }`}
          >
            {item.isAvailable ? '✅ Available' : '❌ Unavailable'}
          </Badge>
        </div>

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-red-500 text-white">
              {item.discountPercent ? `-${item.discountPercent}%` : 'Sale'}
            </Badge>
          </div>
        )}

        {/* Combo Badge */}
        {item.isCombo && (
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
              🍽️ Combo
            </Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-primary line-clamp-1">
            {item.name}
          </h3>
          {getSpiceLevelDisplay(item.spiceLevel) && (
            <span className="text-sm" title={`Spice Level: ${item.spiceLevel}/5`}>
              {getSpiceLevelDisplay(item.spiceLevel)}
            </span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-secondary text-sm mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-primary">
              {formatPrice(hasDiscount ? discountedPrice : item.basePrice)}
            </span>
            {hasDiscount && item.originalPrice && (
              <span className="text-neutral-500 dark:text-neutral-400 line-through text-sm">
                {formatPrice(item.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Category & Prep Time */}
        <div className="flex items-center gap-2 mb-3 text-sm text-secondary">
          {item.category && (
            <Badge variant="outline" className="text-xs">
              {item.category.name}
            </Badge>
          )}
          {item.preparationTime && item.preparationTime > 0 && (
            <Badge variant="outline" className="text-xs">
              ⏱️ {item.preparationTime}min
            </Badge>
          )}
          {item.calories && (
            <Badge variant="outline" className="text-xs">
              🔥 {item.calories} cal
            </Badge>
          )}
        </div>

        {/* Dietary Restrictions */}
        {item.dietaryRestrictions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {getDietaryBadges(item.dietaryRestrictions).map(({ restriction, color, emoji }) => (
              <Badge
                key={restriction}
                className={`text-xs ${color}`}
                variant="outline"
              >
                {emoji} {restriction.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        )}

        {/* Allergens */}
        {item.allergens.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-secondary mb-1">Contains:</p>
            <div className="flex flex-wrap gap-1">
              {item.allergens.slice(0, 4).map(allergen => (
                <Badge key={allergen} variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400">
                  ⚠️ {allergen.replace('_', ' ')}
                </Badge>
              ))}
              {item.allergens.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{item.allergens.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Variants */}
        {item.variants && item.variants.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-secondary mb-1">Variants:</p>
            <div className="flex flex-wrap gap-1">
              {item.variants.slice(0, 3).map(variant => (
                <Badge
                  key={variant.id}
                  variant="outline"
                  className={`text-xs ${variant.isAvailable ? 'text-green-700 dark:text-green-400' : 'text-neutral-500 dark:text-neutral-400'}`}
                >
                  {variant.name} ({formatPrice(variant.price)})
                </Badge>
              ))}
              {item.variants.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.variants.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-primary">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
            className="flex-1"
          >
            ✏️ Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleAvailability(item.id, item.isAvailable)}
            className={`flex-1 ${item.isAvailable
              ? 'hover:bg-red-50 hover:text-red-700'
              : 'hover:bg-green-50 hover:text-green-700'
            }`}
          >
            {item.isAvailable ? '🚫 Hide' : '✅ Show'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(item.id)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          >
            🗑️
          </Button>
        </div>
      </div>
    </div>
  )
}