'use client'

import { useState, useMemo } from 'react'
import { Search, Barcode, Plus } from 'lucide-react'
import type { Product } from '../hooks/useProductLoader'
import type { UniversalCartItem } from '../hooks/useUniversalCart'
import type { BusinessTypeConfig } from '../config/business-type-config'

interface ProductPanelProps {
  products: Product[]
  config: BusinessTypeConfig
  loading: boolean
  onAddToCart: (item: Omit<UniversalCartItem, 'totalPrice'>) => void
}

/**
 * Universal Product Panel
 * Adapts display mode based on business type configuration
 */
export function ProductPanel({
  products,
  config,
  loading,
  onAddToCart
}: ProductPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => {
      if (p.category) cats.add(p.category)
    })
    return ['all', ...Array.from(cats)]
  }, [products])

  // Filter products based on search, barcode, and category
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.barcode?.includes(term)
      )
    }

    // Filter by barcode
    if (barcodeInput && config.features.barcodeScan) {
      filtered = filtered.filter((p) => p.barcode === barcodeInput)
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory)
    }

    return filtered
  }, [products, searchTerm, barcodeInput, selectedCategory, config.features.barcodeScan])

  const handleAddToCart = (product: Product, variant?: any) => {
    const cartItem: Omit<UniversalCartItem, 'totalPrice'> = {
      id: variant ? `${product.id}_${variant.id}` : product.id,
      name: variant ? `${product.name} - ${variant.name}` : product.name,
      sku: variant?.sku || product.barcode,
      quantity: 1,
      unitPrice: variant?.price || product.basePrice,
      productId: product.id,
      variantId: variant?.id,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl,
      isWiFiToken: product.isWiFiToken,
      tokenConfigId: product.tokenConfigId,
      packageName: product.packageName,
      duration: product.duration,
      bandwidthDownMb: product.bandwidthDownMb,
      bandwidthUpMb: product.bandwidthUpMb,
      isCombo: product.isCombo,
      comboItems: product.comboItems
    }

    onAddToCart(cartItem)

    // Clear barcode input after adding
    if (barcodeInput) {
      setBarcodeInput('')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Products
        </h2>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Barcode Scanner Input (if enabled) */}
        {config.features.barcodeScan && (
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Scan or enter barcode..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length === 1) {
                  handleAddToCart(filteredProducts[0])
                }
              }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Category Tabs (if enabled) */}
        {config.features.categoryFilter && categories.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Display */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Loading products...
              </p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 dark:text-gray-400">
              No products found
            </p>
          </div>
        ) : (
          <>
            {/* Grid Mode (Restaurant, Retail, Clothing) */}
            {config.productDisplayMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left bg-white dark:bg-gray-700"
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-24 object-cover rounded-md mb-2"
                      />
                    )}
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                      ${product.basePrice.toFixed(2)}
                    </p>
                    {product.isWiFiToken && (
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded mt-2">
                        WiFi Token
                      </span>
                    )}
                    {product.isCombo && (
                      <span className="inline-block px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded mt-2">
                        Combo
                      </span>
                    )}
                    {product.stockQuantity !== undefined && product.stockQuantity <= 0 && (
                      <span className="inline-block px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded mt-2">
                        Out of Stock
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Scan Mode (Grocery, Hardware) */}
            {config.productDisplayMode === 'scan' && (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all bg-white dark:bg-gray-700"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {product.name}
                      </h3>
                      {product.barcode && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {product.barcode}
                        </p>
                      )}
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                        ${product.basePrice.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="ml-3 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* List Mode (Construction, Vehicles, Consulting, Services) */}
            {config.productDisplayMode === 'list' && (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all bg-white dark:bg-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {product.description}
                          </p>
                        )}
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                          ${product.basePrice.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="ml-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
