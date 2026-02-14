'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Barcode, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Product } from '../hooks/useProductLoader'
import type { UniversalCartItem } from '../hooks/useUniversalCart'
import type { BusinessTypeConfig } from '../config/business-type-config'

interface ProductPanelProps {
  products: Product[]
  config: BusinessTypeConfig
  loading: boolean
  cart: UniversalCartItem[]
  businessId?: string
  onAddToCart: (item: Omit<UniversalCartItem, 'totalPrice'>) => void
  onProductsReload?: () => void
}

/**
 * Universal Product Panel
 * Adapts display mode based on business type configuration
 */
export function ProductPanel({
  products,
  config,
  loading,
  cart,
  businessId,
  onAddToCart,
  onProductsReload
}: ProductPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [requestingMore, setRequestingMore] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Load favorites from localStorage on mount
  useEffect(() => {
    if (!businessId) return
    try {
      const stored = localStorage.getItem(`pos-favorites-${businessId}`)
      if (stored) setFavorites(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }, [businessId])

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      if (businessId) {
        localStorage.setItem(`pos-favorites-${businessId}`, JSON.stringify([...next]))
      }
      return next
    })
  }

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

    // Sort favorites to top
    filtered.sort((a, b) => {
      const aFav = favorites.has(a.id) ? 0 : 1
      const bFav = favorites.has(b.id) ? 0 : 1
      return aFav - bFav
    })

    return filtered
  }, [products, searchTerm, barcodeInput, selectedCategory, config.features.barcodeScan, favorites])

  const handleRequestMore = async (product: Product) => {
    if (!businessId || !product.tokenConfigId) return

    setRequestingMore(prev => new Set(prev).add(product.tokenConfigId!))

    try {
      const isR710 = product.isR710Token
      const apiUrl = isR710 ? '/api/r710/tokens' : '/api/wifi-portal/tokens/bulk'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          tokenConfigId: product.tokenConfigId,
          quantity: 5
        })
      })

      if (response.ok) {
        toast.success(`Requested 5 more ${isR710 ? 'R710' : 'WiFi'} tokens for "${product.packageName}"`)
        onProductsReload?.()
      } else {
        const errorData = await response.json().catch(() => null)
        toast.error(errorData?.error || 'Failed to request more tokens')
      }
    } catch (err) {
      toast.error('Failed to request more tokens')
    } finally {
      setRequestingMore(prev => {
        const next = new Set(prev)
        next.delete(product.tokenConfigId!)
        return next
      })
    }
  }

  const handleAddToCart = (product: Product, variant?: any) => {
    // Check WiFi token availability before adding to cart
    if (product.isWiFiToken && product.availableQuantity !== undefined) {
      const currentCartQuantity = cart.find(c => c.id === product.id)?.quantity || 0
      const tokenType = product.isR710Token ? 'R710 WiFi' : 'ESP32 WiFi'

      if (product.availableQuantity <= currentCartQuantity) {
        if (product.availableQuantity === 0) {
          toast.warning(`No ${tokenType} tokens available for "${product.packageName}". Please request more tokens.`, {
            duration: 7000
          })
        } else {
          toast.warning(`Only ${product.availableQuantity} ${tokenType} token${product.availableQuantity === 1 ? '' : 's'} available for "${product.packageName}".`, {
            duration: 6000
          })
        }
        return
      }
    }

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
      isService: product.isService,
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
                onClick={() => { setSelectedCategory(cat); setSearchTerm('') }}
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
                {filteredProducts.map((product) => {
                  const cartQty = cart.find(c => c.id === product.id)?.quantity || 0
                  const remaining = product.isWiFiToken ? (product.availableQuantity || 0) - cartQty : undefined
                  return (
                    <div
                      key={product.id}
                      className={`p-3 border rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left bg-white dark:bg-gray-700 ${
                        favorites.has(product.id) ? 'border-yellow-400 dark:border-yellow-500' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex justify-end -mb-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id) }}
                          className="text-lg leading-none hover:scale-110 transition-transform"
                          title={favorites.has(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {favorites.has(product.id) ? <span className="text-yellow-400">★</span> : <span className="text-gray-300 dark:text-gray-500">☆</span>}
                        </button>
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full text-left"
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
                        {product.isWiFiToken && product.duration && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                            {product.duration} {product.durationUnit || 'Days'}
                          </span>
                        )}
                        {product.isCombo && (
                          <span className="inline-block px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded mt-2">
                            Combo
                          </span>
                        )}
                        {/* WiFi token availability indicator */}
                        {product.isWiFiToken && remaining !== undefined && (
                          <span className={`text-xs font-medium block mt-1 ${
                            remaining <= 0 ? 'text-red-500' : remaining < 5 ? 'text-orange-500' : 'text-green-600'
                          }`}>
                            {remaining} available
                          </span>
                        )}
                        {!product.isWiFiToken && !product.isService && product.stockQuantity !== undefined && product.stockQuantity <= 0 && (
                          <span className="inline-block px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded mt-2">
                            Out of Stock
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${
                          (product.soldToday || 0) > 0
                            ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50'
                            : 'text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <span className={(product.soldToday || 0) > 0 ? 'text-yellow-300 font-bold' : ''}>{product.soldToday || 0}</span> sold today
                        </span>
                      </button>
                      {/* Request more tokens button - show when quantity < 5 */}
                      {product.isWiFiToken && (product.availableQuantity || 0) < 5 && businessId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRequestMore(product)
                          }}
                          disabled={requestingMore.has(product.tokenConfigId || '')}
                          className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 rounded w-full transition-colors"
                        >
                          {requestingMore.has(product.tokenConfigId || '') ? 'Requesting...' : '+ Request 5 More'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Scan Mode (Grocery, Hardware) */}
            {config.productDisplayMode === 'scan' && (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all bg-white dark:bg-gray-700 ${
                      favorites.has(product.id) ? 'border-yellow-400 dark:border-yellow-500' : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id) }}
                      className="mr-2 text-lg leading-none hover:scale-110 transition-transform flex-shrink-0"
                      title={favorites.has(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favorites.has(product.id) ? <span className="text-yellow-400">★</span> : <span className="text-gray-300 dark:text-gray-500">☆</span>}
                    </button>
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
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${
                        (product.soldToday || 0) > 0
                          ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50'
                          : 'text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <span className={(product.soldToday || 0) > 0 ? 'text-yellow-300 font-bold' : ''}>{product.soldToday || 0}</span> sold today
                      </span>
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
                {filteredProducts.map((product) => {
                  const cartQty = cart.find(c => c.id === product.id)?.quantity || 0
                  const remaining = product.isWiFiToken ? (product.availableQuantity || 0) - cartQty : undefined
                  return (
                    <div
                      key={product.id}
                      className={`p-4 border rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all bg-white dark:bg-gray-700 ${
                        favorites.has(product.id) ? 'border-yellow-400 dark:border-yellow-500' : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id) }}
                            className="mt-0.5 text-lg leading-none hover:scale-110 transition-transform flex-shrink-0"
                            title={favorites.has(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {favorites.has(product.id) ? <span className="text-yellow-400">★</span> : <span className="text-gray-300 dark:text-gray-500">☆</span>}
                          </button>
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
                          {/* WiFi token availability indicator */}
                          {product.isWiFiToken && remaining !== undefined && (
                            <span className={`text-xs font-medium block mt-1 ${
                              remaining <= 0 ? 'text-red-500' : remaining < 5 ? 'text-orange-500' : 'text-green-600'
                            }`}>
                              {remaining} available
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${
                            (product.soldToday || 0) > 0
                              ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50'
                              : 'text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
                          }`}>
                            <span className={(product.soldToday || 0) > 0 ? 'text-yellow-300 font-bold' : ''}>{product.soldToday || 0}</span> sold today
                          </span>
                          </div>
                        </div>
                        <div className="ml-3 flex flex-col items-end gap-2">
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                          >
                            Add to Cart
                          </button>
                          {/* Request more tokens button */}
                          {product.isWiFiToken && (product.availableQuantity || 0) < 5 && businessId && (
                            <button
                              onClick={() => handleRequestMore(product)}
                              disabled={requestingMore.has(product.tokenConfigId || '')}
                              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 rounded transition-colors"
                            >
                              {requestingMore.has(product.tokenConfigId || '') ? 'Requesting...' : '+ Request 5 More'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
