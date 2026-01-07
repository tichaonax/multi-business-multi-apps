'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface ClothingProduct {
  id: string
  name: string
  sku: string
  description?: string
  basePrice: number
  category?: {
    id: string
    name: string
    parentId?: string
  }
  brand?: {
    id: string
    name: string
  }
  condition: 'NEW' | 'USED' | 'REFURBISHED'
  season?: 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'All Season'
  gender?: 'Men' | 'Women' | 'Kids' | 'Unisex'
  material?: string
  careInstructions?: string
  variants: Array<{
    id: string
    sku: string
    stockQuantity: number
    price?: number
    attributes: {
      size?: string
      color?: string
      [key: string]: any
    }
  }>
  images?: string[]
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'
  createdAt: string
  updatedAt: string
}

interface ClothingProductListProps {
  businessId: string
  onProductView: (productId: string) => void
  onProductEdit: (productId: string) => void
  onVariantManage: (productId: string) => void
}

export function ClothingProductList({
  businessId,
  onProductView,
  onProductEdit,
  onVariantManage
}: ClothingProductListProps) {
  const { formatCurrency } = useBusinessContext()
  const [products, setProducts] = useState<ClothingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterCondition, setFilterCondition] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'updated'>('updated')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  useEffect(() => {
    fetchProducts()
  }, [businessId])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch real products from database filtered by businessId
      const response = await fetch(
        `/api/universal/products?businessId=${businessId}&businessType=clothing&includeVariants=true&limit=1000`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }

      const result = await response.json()

      if (result.success && result.data) {
        // Map API response to component format
        const fetchedProducts: ClothingProduct[] = result.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          description: p.description,
          basePrice: parseFloat(p.basePrice || p.price || 0),
          category: p.category ? { id: p.category.id, name: p.category.name } : undefined,
          brand: p.brand ? { id: p.brand.id, name: p.brand.name } : undefined,
          condition: p.condition || 'NEW',
          season: p.season,
          gender: p.gender,
          material: p.material,
          careInstructions: p.careInstructions,
          variants: (p.variants || []).map((v: any) => ({
            id: v.id,
            sku: v.sku,
            stockQuantity: v.stockQuantity || 0,
            price: parseFloat(v.price || 0),
            attributes: v.attributes || {}
          })),
          images: p.images || [],
          status: p.isAvailable ? 'ACTIVE' : 'INACTIVE',
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString()
        }))

        setProducts(fetchedProducts)
      } else {
        setProducts([])
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  const getConditionConfig = (condition: string) => {
    const configs = {
      NEW: { label: 'New', color: 'bg-green-100 text-green-800', icon: '✨' },
      USED: { label: 'Used', color: 'bg-orange-100 text-orange-800', icon: '🔄' },
      REFURBISHED: { label: 'Refurbished', color: 'bg-blue-100 text-blue-800', icon: '🛠️' }
    }
    return configs[condition as keyof typeof configs] || configs.NEW
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
      INACTIVE: { label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
      DISCONTINUED: { label: 'Discontinued', color: 'bg-red-100 text-red-800' }
    }
    return configs[status as keyof typeof configs] || configs.ACTIVE
  }

  const getTotalStock = (variants: ClothingProduct['variants']) => {
    return variants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
  }

  const getStockStatus = (totalStock: number) => {
    if (totalStock === 0) return { label: 'Out of Stock', color: 'text-red-600' }
    if (totalStock <= 10) return { label: 'Low Stock', color: 'text-orange-600' }
    return { label: 'In Stock', color: 'text-green-600' }
  }

  // Filter and sort products
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = filterCategory === '' || product.category?.id === filterCategory
    const matchesCondition = filterCondition === '' || product.condition === filterCondition
    const matchesStatus = filterStatus === '' || product.status === filterStatus

    return matchesSearch && matchesCategory && matchesCondition && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'price':
        return a.basePrice - b.basePrice
      case 'stock':
        return getTotalStock(b.variants) - getTotalStock(a.variants)
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      default:
        return 0
    }
  })

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  const duplicateProduct = (productId: string) => {
    console.log('Duplicating product:', productId)
    // Would create a copy of the product
  }

  const toggleProductStatus = (productId: string) => {
    setProducts(products.map(product =>
      product.id === productId
        ? { ...product, status: product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' as any }
        : product
    ))
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Failed to load products: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="🔍 Search products, SKU, brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Categories</option>
            <option value="cat1">Tops</option>
            <option value="cat2">Dresses</option>
            <option value="cat3">Jackets</option>
            <option value="cat4">Outerwear</option>
            <option value="cat5">Sweaters</option>
          </select>

          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Conditions</option>
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="REFURBISHED">Refurbished</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="updated">Recently Updated</option>
            <option value="name">Name A-Z</option>
            <option value="price">Price Low-High</option>
            <option value="stock">Stock High-Low</option>
          </select>

          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {filteredProducts.length} of {products.length} products
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedProducts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            {products.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Products Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Get started by adding your first product.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Click "Add New Product" above to create your first clothing item.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Products Found</h3>
                <p className="text-gray-600 dark:text-gray-400">No products match your current filters.</p>
              </>
            )}
          </div>
        ) : (
          paginatedProducts.map((product) => {
            const conditionConfig = getConditionConfig(product.condition)
            const statusConfig = getStatusConfig(product.status)
            const totalStock = getTotalStock(product.variants)
            const stockStatus = getStockStatus(totalStock)

            return (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-xl transition-shadow">
                {/* Product Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-t-lg flex items-center justify-center">
                  <div className="text-4xl opacity-40">👕</div>
                </div>

                <div className="p-4">
                  {/* Product Info */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-2">{product.name}</h3>
                      <div className="flex gap-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${conditionConfig.color}`}>
                        {conditionConfig.icon} {conditionConfig.label}
                      </span>
                      {product.season && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                          {product.season}
                        </span>
                      )}
                      {product.gender && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                          {product.gender}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      SKU: {product.sku}
                      {product.brand && ` • ${product.brand.name}`}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(product.basePrice)}
                      </div>
                      <div className={`text-sm font-medium ${stockStatus.color}`}>
                        {stockStatus.label} ({totalStock})
                      </div>
                    </div>

                    {/* Variant Summary */}
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                      {product.variants.length > 0 && (
                        <span>
                          {' • '}
                          {[...new Set(product.variants.map(v => v.attributes.size).filter(Boolean))].slice(0, 3).join(', ')}
                          {product.variants.some(v => v.attributes.color) && (
                            <span>
                              {' • '}
                              {[...new Set(product.variants.map(v => v.attributes.color).filter(Boolean))].slice(0, 2).join(', ')}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onProductView(product.id)}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onProductEdit(product.id)}
                      className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onVariantManage(product.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Variants
                    </button>
                    <button
                      onClick={() => duplicateProduct(product.id)}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      Duplicate
                    </button>
                  </div>

                  {/* Quick Toggle Status */}
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => toggleProductStatus(product.id)}
                      className={`w-full px-3 py-1 text-xs rounded transition-colors ${
                        product.status === 'ACTIVE'
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                      }`}
                    >
                      {product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
          >
            Previous
          </button>

          <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}