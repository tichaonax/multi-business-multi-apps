'use client'

import { useState, useEffect } from 'react'
import { UniversalProductCard, UniversalProduct } from './product-card'
import { UniversalCategoryNavigation } from './category-navigation'
import { useBusinessContext, useBusinessFeatures } from './business-context'

interface ProductGridProps {
  businessId: string
  onAddToCart?: (productId: string, variantId?: string, quantity?: number) => void
  onProductEdit?: (productId: string) => void
  onProductView?: (productId: string) => void
  layout?: 'grid' | 'list'
  itemsPerPage?: number
  showCategories?: boolean
  showSearch?: boolean
  showFilters?: boolean
}

interface ProductFilters {
  categoryId?: string | null
  brandId?: string | null
  productType?: string
  condition?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  inStockOnly?: boolean
}

export function UniversalProductGrid({
  businessId,
  onAddToCart,
  onProductEdit,
  onProductView,
  layout = 'grid',
  itemsPerPage = 12,
  showCategories = true,
  showSearch = true,
  showFilters = true
}: ProductGridProps) {
  const { formatCurrency } = useBusinessContext()
  const businessFeatures = useBusinessFeatures()

  const [products, setProducts] = useState<UniversalProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<ProductFilters>({})
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchProducts()
    if (showFilters) {
      fetchBrands()
    }
  }, [businessId, filters, currentPage])

  const fetchProducts = async () => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        businessId,
        includeVariants: 'true',
        includeImages: 'true',
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })

      // Add filters to params
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.brandId) params.set('brandId', filters.brandId)
      if (filters.productType) params.set('productType', filters.productType)
      if (filters.condition) params.set('condition', filters.condition)
      if (filters.search) params.set('search', filters.search)

      const response = await fetch(`/api/universal/products?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products')
      }

      if (data.success) {
        setProducts(data.data)
        setTotalPages(data.meta.totalPages)
      } else {
        throw new Error(data.error || 'Invalid response format')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBrands = async () => {
    try {
      const response = await fetch(`/api/universal/brands?businessId=${businessId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setBrands(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err)
    }
  }

  const updateFilter = (key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setFilters({})
    setCurrentPage(1)
  }

  const handleCategorySelect = (categoryId: string | null) => {
    updateFilter('categoryId', categoryId)
  }

  const getBusinessSpecificFilters = () => {
    const commonFilters = [
      {
        key: 'productType',
        label: 'Product Type',
        options: [
          { value: '', label: 'All Types' },
          { value: 'PHYSICAL', label: 'Physical' },
          { value: 'DIGITAL', label: 'Digital' },
          { value: 'SERVICE', label: 'Service' },
          { value: 'COMBO', label: 'Combo' }
        ]
      }
    ]

    if (businessFeatures.isClothing()) {
      return [
        ...commonFilters,
        {
          key: 'condition',
          label: 'Condition',
          options: [
            { value: '', label: 'All Conditions' },
            { value: 'NEW', label: 'New' },
            { value: 'USED', label: 'Used' },
            { value: 'REFURBISHED', label: 'Refurbished' }
          ]
        }
      ]
    }

    if (businessFeatures.isGrocery()) {
      return [
        ...commonFilters,
        {
          key: 'condition',
          label: 'Freshness',
          options: [
            { value: '', label: 'All Items' },
            { value: 'NEW', label: 'Fresh' },
            { value: 'EXPIRED', label: 'Near Expiry' }
          ]
        }
      ]
    }

    return commonFilters
  }

  const businessSpecificFilters = getBusinessSpecificFilters()

  return (
    <div className="w-full space-y-6">
      {/* Categories */}
      {showCategories && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4">Categories</h2>
          <UniversalCategoryNavigation
            businessId={businessId}
            onCategorySelect={handleCategorySelect}
            selectedCategoryId={filters.categoryId}
            layout="horizontal"
            showProductCounts={true}
          />
        </div>
      )}

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            {showSearch && (
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={`Search ${businessFeatures.isRestaurant() ? 'menu items' : 'products'}...`}
                  value={filters.search || ''}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="input-field w-full"
                />
              </div>
            )}

            {/* Filters */}
            {showFilters && (
              <div className="flex gap-3">
                {/* Brand Filter */}
                {brands.length > 0 && (
                  <select
                    value={filters.brandId || ''}
                    onChange={(e) => updateFilter('brandId', e.target.value || null)}
                    className="input-field"
                  >
                    <option value="">All Brands</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                )}

                {/* Business-specific Filters */}
                {businessSpecificFilters.map(filter => (
                  <select
                    key={filter.key}
                    value={filters[filter.key as keyof ProductFilters] as string || ''}
                    onChange={(e) => updateFilter(filter.key as keyof ProductFilters, e.target.value || null)}
                    className="input-field"
                  >
                    {filter.options.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ))}

                {/* Stock Filter for inventory-tracked businesses */}
                {businessFeatures.hasInventoryTracking() && (
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-primary">
                    <input
                      type="checkbox"
                      checked={filters.inStockOnly || false}
                      onChange={(e) => updateFilter('inStockOnly', e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    In Stock Only
                  </label>
                )}

                {/* Clear Filters */}
                {Object.keys(filters).some(key => filters[key as keyof ProductFilters]) && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">Failed to load products: {error}</p>
          <button
            onClick={fetchProducts}
            className="mt-2 text-sm text-red-800 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Products Grid/List */}
      {!loading && !error && (
        <>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">
                {businessFeatures.isClothing() && '👕'}
                {businessFeatures.isHardware() && '🔧'}
                {businessFeatures.isGrocery() && '🛒'}
                {businessFeatures.isRestaurant() && '🍽️'}
                {businessFeatures.isConsulting() && '💼'}
              </div>
              <h3 className="text-lg font-medium text-primary mb-2">
                No {businessFeatures.isRestaurant() ? 'menu items' : 'products'} found
              </h3>
              <p className="text-secondary">
                Try adjusting your filters or search terms.
              </p>
            </div>
          ) : (
            <>
              {/* Results Count */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-secondary">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, products.length)} products
                </p>

                {/* Layout Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 text-primary"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-primary">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 text-primary"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Product Grid */}
              <div className={`grid gap-6 ${
                layout === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-1'
              }`}>
                {products.map((product) => (
                  <UniversalProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    onEdit={onProductEdit}
                    onView={onProductView}
                    showActions={true}
                    compact={layout === 'list'}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}