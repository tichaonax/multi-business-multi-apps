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

      // Sample clothing product data
      const sampleProducts: ClothingProduct[] = [
        {
          id: 'prod1',
          name: "Classic Cotton T-Shirt",
          sku: 'CCT-001',
          description: 'Comfortable 100% cotton t-shirt perfect for casual wear',
          basePrice: 24.99,
          category: { id: 'cat1', name: 'Tops' },
          brand: { id: 'brand1', name: 'ComfortWear' },
          condition: 'NEW',
          season: 'All Season',
          gender: 'Unisex',
          material: '100% Cotton',
          careInstructions: 'Machine wash cold, tumble dry low',
          variants: [
            { id: 'var1', sku: 'CCT-001-S-BLK', stockQuantity: 15, price: 24.99, attributes: { size: 'S', color: 'Black' } },
            { id: 'var2', sku: 'CCT-001-M-BLK', stockQuantity: 22, price: 24.99, attributes: { size: 'M', color: 'Black' } },
            { id: 'var3', sku: 'CCT-001-L-BLK', stockQuantity: 18, price: 24.99, attributes: { size: 'L', color: 'Black' } },
            { id: 'var4', sku: 'CCT-001-S-WHT', stockQuantity: 12, price: 24.99, attributes: { size: 'S', color: 'White' } },
            { id: 'var5', sku: 'CCT-001-M-WHT', stockQuantity: 8, price: 24.99, attributes: { size: 'M', color: 'White' } }
          ],
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'prod2',
          name: "Designer Summer Dress",
          sku: 'DSD-002',
          description: 'Elegant floral summer dress for special occasions',
          basePrice: 89.99,
          category: { id: 'cat2', name: 'Dresses' },
          brand: { id: 'brand2', name: 'ElegantStyle' },
          condition: 'NEW',
          season: 'Summer',
          gender: 'Women',
          material: '95% Polyester, 5% Spandex',
          careInstructions: 'Hand wash only, hang dry',
          variants: [
            { id: 'var6', sku: 'DSD-002-8-FLR', stockQuantity: 5, price: 89.99, attributes: { size: '8', color: 'Floral' } },
            { id: 'var7', sku: 'DSD-002-10-FLR', stockQuantity: 3, price: 89.99, attributes: { size: '10', color: 'Floral' } },
            { id: 'var8', sku: 'DSD-002-12-FLR', stockQuantity: 7, price: 89.99, attributes: { size: '12', color: 'Floral' } }
          ],
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'prod3',
          name: "Vintage Leather Jacket",
          sku: 'VLJ-003',
          description: 'Pre-owned genuine leather jacket in excellent condition',
          basePrice: 149.99,
          category: { id: 'cat3', name: 'Jackets' },
          brand: { id: 'brand3', name: 'RetroStyle' },
          condition: 'USED',
          season: 'Fall',
          gender: 'Men',
          material: 'Genuine Leather',
          careInstructions: 'Professional cleaning recommended',
          variants: [
            { id: 'var9', sku: 'VLJ-003-M-BRN', stockQuantity: 1, price: 149.99, attributes: { size: 'M', color: 'Brown' } },
            { id: 'var10', sku: 'VLJ-003-L-BRN', stockQuantity: 2, price: 149.99, attributes: { size: 'L', color: 'Brown' } }
          ],
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'prod4',
          name: "Kids Winter Coat",
          sku: 'KWC-004',
          description: 'Warm winter coat for children, water-resistant',
          basePrice: 79.99,
          category: { id: 'cat4', name: 'Outerwear' },
          brand: { id: 'brand4', name: 'KidsWear' },
          condition: 'NEW',
          season: 'Winter',
          gender: 'Kids',
          material: 'Polyester shell with down filling',
          careInstructions: 'Machine wash cold, do not dry clean',
          variants: [
            { id: 'var11', sku: 'KWC-004-4T-RED', stockQuantity: 8, price: 79.99, attributes: { size: '4T', color: 'Red' } },
            { id: 'var12', sku: 'KWC-004-5T-RED', stockQuantity: 6, price: 79.99, attributes: { size: '5T', color: 'Red' } },
            { id: 'var13', sku: 'KWC-004-6T-RED', stockQuantity: 4, price: 79.99, attributes: { size: '6T', color: 'Red' } },
            { id: 'var14', sku: 'KWC-004-4T-BLU', stockQuantity: 0, price: 79.99, attributes: { size: '4T', color: 'Blue' } }
          ],
          status: 'ACTIVE',
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'prod5',
          name: "Discontinued Sweater",
          sku: 'DS-005',
          description: 'Winter sweater - being phased out',
          basePrice: 45.99,
          category: { id: 'cat5', name: 'Sweaters' },
          condition: 'NEW',
          season: 'Winter',
          gender: 'Women',
          variants: [
            { id: 'var15', sku: 'DS-005-M-GRY', stockQuantity: 2, price: 35.99, attributes: { size: 'M', color: 'Gray' } }
          ],
          status: 'DISCONTINUED',
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      setProducts(sampleProducts)

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
          <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="h-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load products: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="🔍 Search products, SKU, brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All Conditions</option>
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="REFURBISHED">Refurbished</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="updated">Recently Updated</option>
            <option value="name">Name A-Z</option>
            <option value="price">Price Low-High</option>
            <option value="stock">Stock High-Low</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            {filteredProducts.length} of {products.length} products
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedProducts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-600">No products match your current filters.</p>
          </div>
        ) : (
          paginatedProducts.map((product) => {
            const conditionConfig = getConditionConfig(product.condition)
            const statusConfig = getStatusConfig(product.status)
            const totalStock = getTotalStock(product.variants)
            const stockStatus = getStockStatus(totalStock)

            return (
              <div key={product.id} className="bg-white rounded-lg border hover:shadow-lg transition-shadow">
                {/* Product Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center">
                  <div className="text-4xl opacity-40">👕</div>
                </div>

                <div className="p-4">
                  {/* Product Info */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{product.name}</h3>
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
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                          {product.season}
                        </span>
                      )}
                      {product.gender && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700">
                          {product.gender}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      SKU: {product.sku}
                      {product.brand && ` • ${product.brand.name}`}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(product.basePrice)}
                      </div>
                      <div className={`text-sm font-medium ${stockStatus.color}`}>
                        {stockStatus.label} ({totalStock})
                      </div>
                    </div>

                    {/* Variant Summary */}
                    <div className="text-xs text-gray-500 mt-1">
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
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
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
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                    >
                      Duplicate
                    </button>
                  </div>

                  {/* Quick Toggle Status */}
                  <div className="mt-2 pt-2 border-t">
                    <button
                      onClick={() => toggleProductStatus(product.id)}
                      className={`w-full px-3 py-1 text-xs rounded transition-colors ${
                        product.status === 'ACTIVE'
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
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
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="px-3 py-1 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}