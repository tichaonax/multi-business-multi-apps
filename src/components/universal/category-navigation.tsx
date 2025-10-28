'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from './business-context'

export interface UniversalCategory {
  id: string
  name: string
  emoji?: string
  color?: string
  description?: string
  displayOrder: number
  isActive: boolean
  businessType: string
  attributes?: Record<string, any>
  parent?: {
    id: string
    name: string
    emoji?: string
    color?: string
  }
  children: Array<{
    id: string
    name: string
    emoji?: string
    color?: string
    displayOrder: number
  }>
  subcategories?: Array<{
    id: string
    name: string
    emoji?: string
    description?: string
    displayOrder: number
  }>
  _count?: {
    products: number
    subcategories?: number
  }
}

interface CategoryNavigationProps {
  businessId: string
  onCategorySelect: (categoryId: string | null, categoryName?: string) => void
  selectedCategoryId?: string | null
  showProductCounts?: boolean
  layout?: 'horizontal' | 'vertical' | 'grid'
  maxDepth?: number
}

export function UniversalCategoryNavigation({
  businessId,
  onCategorySelect,
  selectedCategoryId = null,
  showProductCounts = true,
  layout = 'horizontal',
  maxDepth = 2
}: CategoryNavigationProps) {
  const { config, isBusinessType } = useBusinessContext()
  const [categories, setCategories] = useState<UniversalCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchCategories = async () => {
      if (!businessId) return

      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          businessId,
          includeProducts: showProductCounts ? 'true' : 'false'
        })

        const response = await fetch(`/api/universal/categories?${params}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch categories')
        }

        if (data.success) {
          setCategories(data.data)
        } else {
          throw new Error(data.error || 'Invalid response format')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        console.error('Failed to fetch categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [businessId, showProductCounts])

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const getBusinessTypeIcon = (businessType: string) => {
    const icons = {
      clothing: '👕',
      hardware: '🔧',
      grocery: '🛒',
      restaurant: '🍽️',
      consulting: '💼'
    }
    return icons[businessType as keyof typeof icons] || '📦'
  }

  const getCategoryIcon = (categoryName: string, businessType: string) => {
    // Business-specific category icons
    const clothingIcons: Record<string, string> = {
      'Men': '👔',
      'Women': '👗',
      'Kids': '👶',
      'Shoes': '👟',
      'Accessories': '💼',
      'Electronics': '📱'
    }

    const hardwareIcons: Record<string, string> = {
      'Tools': '🔨',
      'Plumbing': '🚰',
      'Electrical': '⚡',
      'Building Materials': '🧱',
      'Paint & Supplies': '🎨',
      'Garden & Outdoor': '🌱'
    }

    const groceryIcons: Record<string, string> = {
      'Produce': '🥬',
      'Meat & Seafood': '🥩',
      'Dairy': '🥛',
      'Bakery': '🍞',
      'Pantry': '🥫',
      'Beverages': '🥤'
    }

    const restaurantIcons: Record<string, string> = {
      'Appetizers': '🥗',
      'Main Courses': '🍽️',
      'Desserts': '🍰',
      'Beverages': '☕',
      'Specials': '⭐',
      'Kids Menu': '🧸'
    }

    const consultingIcons: Record<string, string> = {
      'Strategy': '📈',
      'Operations': '⚙️',
      'Technology': '💻',
      'HR & Training': '👥',
      'Financial': '💰',
      'Legal': '⚖️'
    }

    const iconSets = {
      clothing: clothingIcons,
      hardware: hardwareIcons,
      grocery: groceryIcons,
      restaurant: restaurantIcons,
      consulting: consultingIcons
    }

    const businessIcons = iconSets[businessType as keyof typeof iconSets] || {}
    return businessIcons[categoryName] || '📂'
  }

  const renderCategoryItem = (category: UniversalCategory, depth = 0) => {
    const isSelected = selectedCategoryId === category.id
    const hasChildren = category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    // Use emoji from database, fallback to hardcoded icons for backward compatibility
    const icon = category.emoji || getCategoryIcon(category.name, category.businessType)

    const baseClasses = `
      flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer
      ${isSelected
        ? 'bg-primary text-white'
        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-primary'
      }
      ${depth > 0 ? `ml-${depth * 4}` : ''}
    `

    return (
      <div key={category.id}>
        <div
          className={baseClasses}
          onClick={() => onCategorySelect(category.id, category.name)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <div>
              <span className="font-medium">{category.name}</span>
              {showProductCounts && category._count && (
                <span className={`ml-2 text-sm ${isSelected ? 'text-white/80' : 'text-secondary'}`}>
                  ({category._count.products})
                </span>
              )}
            </div>
          </div>

          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleCategory(category.id)
              }}
              className={`p-1 rounded-full transition-colors ${
                isSelected ? 'hover:bg-white/20' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {hasChildren && isExpanded && depth < maxDepth && (
          <div className="ml-4 space-y-1">
            {category.children
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((child) => {
                const childCategory = categories.find(c => c.id === child.id)
                if (childCategory) {
                  return renderCategoryItem(childCategory, depth + 1)
                }
                return null
              })}
          </div>
        )}
      </div>
    )
  }

  const renderCategories = () => {
    const rootCategories = categories
      .filter(cat => !cat.parent)
      .sort((a, b) => a.displayOrder - b.displayOrder)

    if (layout === 'grid') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {rootCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id
            const icon = getCategoryIcon(category.name, category.businessType)

            return (
              <div
                key={category.id}
                className={`
                  p-4 rounded-lg border-2 transition-all cursor-pointer text-center
                  ${isSelected
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
                onClick={() => onCategorySelect(category.id, category.name)}
              >
                <div className="text-3xl mb-2">{icon}</div>
                <div className="font-medium text-sm">{category.name}</div>
                {showProductCounts && category._count && (
                  <div className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-secondary'}`}>
                    {category._count.products} items
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (layout === 'horizontal') {
      return (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => onCategorySelect(null)}
            className={`
              flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors
              ${selectedCategoryId === null
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-primary hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            All Categories
          </button>
          {rootCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id
            const icon = getCategoryIcon(category.name, category.businessType)

            return (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id, category.name)}
                className={`
                  flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${isSelected
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-primary hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span>{icon}</span>
                <span>{category.name}</span>
                {showProductCounts && category._count && (
                  <span className={`text-sm ${isSelected ? 'text-white/80' : 'text-secondary'}`}>
                    ({category._count.products})
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )
    }

    // Vertical layout (default)
    return (
      <div className="space-y-1">
        <div
          className={`
            flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer
            ${selectedCategoryId === null
              ? 'bg-primary text-white'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-primary'
            }
          `}
          onClick={() => onCategorySelect(null)}
        >
          <span className="text-lg">{getBusinessTypeIcon(config?.businessType || '')}</span>
          <span className="font-medium">All Categories</span>
        </div>
        {rootCategories.map((category) => renderCategoryItem(category))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400 text-sm">Failed to load categories: {error}</p>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="p-8 text-center text-secondary">
        <div className="text-4xl mb-2">{getBusinessTypeIcon(config?.businessType || '')}</div>
        <p>No categories found for this business.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {renderCategories()}
    </div>
  )
}