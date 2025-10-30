'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'
import { useConfirm } from '@/components/ui/confirm-modal'

interface ProductVariant {
  id: string
  sku: string
  stockQuantity: number
  reorderLevel: number
  price?: number
  attributes: {
    size?: string
    color?: string
    [key: string]: any
  }
}

interface Product {
  id: string
  name: string
  sku: string
  basePrice: number
  variants: ProductVariant[]
}

interface ClothingVariantManagerProps {
  businessId: string
  selectedProduct: string | null
  onProductSelect: (productId: string | null) => void
}

interface VariantMatrix {
  sizes: string[]
  colors: string[]
  matrix: Record<string, Record<string, ProductVariant | null>>
}

export function ClothingVariantManager({
  businessId,
  selectedProduct,
  onProductSelect
}: ClothingVariantManagerProps) {
  const { formatCurrency } = useBusinessContext()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [variantMatrix, setVariantMatrix] = useState<VariantMatrix | null>(null)
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkStock, setBulkStock] = useState('')
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set())
  const confirm = useConfirm()

  // Default size and color options for clothing
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4', '6', '8', '10', '12', '14', '16', '18']
  const availableColors = ['Black', 'White', 'Gray', 'Navy', 'Brown', 'Red', 'Blue', 'Green', 'Pink', 'Purple', 'Yellow', 'Orange']

  useEffect(() => {
    fetchProducts()
  }, [businessId])

  useEffect(() => {
    if (selectedProduct) {
      generateVariantMatrix()
    }
  }, [selectedProduct, products])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Sample product data with variants
      const sampleProducts: Product[] = [
        {
          id: 'prod1',
          name: "Classic Cotton T-Shirt",
          sku: 'CCT-001',
          basePrice: 24.99,
          variants: [
            { id: 'var1', sku: 'CCT-001-S-BLK', stockQuantity: 15, reorderLevel: 5, price: 24.99, attributes: { size: 'S', color: 'Black' } },
            { id: 'var2', sku: 'CCT-001-M-BLK', stockQuantity: 22, reorderLevel: 5, price: 24.99, attributes: { size: 'M', color: 'Black' } },
            { id: 'var3', sku: 'CCT-001-L-BLK', stockQuantity: 18, reorderLevel: 5, price: 24.99, attributes: { size: 'L', color: 'Black' } },
            { id: 'var4', sku: 'CCT-001-S-WHT', stockQuantity: 12, reorderLevel: 5, price: 24.99, attributes: { size: 'S', color: 'White' } },
            { id: 'var5', sku: 'CCT-001-M-WHT', stockQuantity: 8, reorderLevel: 5, price: 24.99, attributes: { size: 'M', color: 'White' } }
          ]
        },
        {
          id: 'prod2',
          name: "Designer Summer Dress",
          sku: 'DSD-002',
          basePrice: 89.99,
          variants: [
            { id: 'var6', sku: 'DSD-002-8-FLR', stockQuantity: 5, reorderLevel: 2, price: 89.99, attributes: { size: '8', color: 'Floral' } },
            { id: 'var7', sku: 'DSD-002-10-FLR', stockQuantity: 3, reorderLevel: 2, price: 89.99, attributes: { size: '10', color: 'Floral' } }
          ]
        }
      ]

      setProducts(sampleProducts)

      // Auto-select first product if none selected
      if (!selectedProduct && sampleProducts.length > 0) {
        onProductSelect(sampleProducts[0].id)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateVariantMatrix = () => {
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const sizes = new Set<string>()
    const colors = new Set<string>()
    const matrix: Record<string, Record<string, ProductVariant | null>> = {}

    // Collect existing sizes and colors
    product.variants.forEach(variant => {
      const size = variant.attributes.size
      const color = variant.attributes.color

      if (size) sizes.add(size)
      if (color) colors.add(color)

      if (size && color) {
        if (!matrix[size]) matrix[size] = {}
        matrix[size][color] = variant
      }
    })

    // Sort sizes in logical order
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4', '6', '8', '10', '12', '14', '16', '18']
    const sortedSizes = Array.from(sizes).sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a)
      const bIndex = sizeOrder.indexOf(b)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      return a.localeCompare(b)
    })

    const sortedColors = Array.from(colors).sort()

    setVariantMatrix({
      sizes: sortedSizes,
      colors: sortedColors,
      matrix
    })
  }

  const updateVariant = (variantId: string, field: keyof ProductVariant, value: any) => {
    setProducts(products.map(product => ({
      ...product,
      variants: product.variants.map(variant =>
        variant.id === variantId ? { ...variant, [field]: value } : variant
      )
    })))
  }

  const createVariant = (size: string, color: string) => {
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`,
      sku: `${product.sku}-${size}-${color.substring(0, 3).toUpperCase()}`,
      stockQuantity: 0,
      reorderLevel: 5,
      price: product.basePrice,
      attributes: { size, color }
    }

    setProducts(products.map(p =>
      p.id === selectedProduct
        ? { ...p, variants: [...p.variants, newVariant] }
        : p
    ))
  }

  const deleteVariant = async (variantId: string) => {
    const ok = await confirm({ title: 'Delete variant', description: 'Are you sure you want to delete this variant?', confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return

    setProducts(products.map(product => ({
      ...product,
      variants: product.variants.filter(variant => variant.id !== variantId)
    })))
  }

  const bulkUpdateSelectedVariants = () => {
    if (selectedVariants.size === 0) return

    setProducts(products.map(product => ({
      ...product,
      variants: product.variants.map(variant => {
        if (selectedVariants.has(variant.id)) {
          const updates: Partial<ProductVariant> = {}
          if (bulkPrice) updates.price = parseFloat(bulkPrice)
          if (bulkStock) updates.stockQuantity = parseInt(bulkStock)
          return { ...variant, ...updates }
        }
        return variant
      })
    })))

    // Clear selections and values
    setSelectedVariants(new Set())
    setBulkPrice('')
    setBulkStock('')
    setBulkEditMode(false)
  }

  const generateMissingVariants = () => {
    const product = products.find(p => p.id === selectedProduct)
    if (!product || !variantMatrix) return

    const newVariants: ProductVariant[] = []

    // Get all possible size/color combinations
    const allSizes = [...variantMatrix.sizes, ...availableSizes.filter(s => !variantMatrix.sizes.includes(s))]
    const allColors = [...variantMatrix.colors, ...availableColors.filter(c => !variantMatrix.colors.includes(c))]

    // For demo, just add a few missing combinations
    const missingCombinations = [
      { size: 'L', color: 'White' },
      { size: 'XL', color: 'Black' },
      { size: 'XL', color: 'White' }
    ].filter(combo => !variantMatrix.matrix[combo.size]?.[combo.color])

    missingCombinations.forEach(({ size, color }) => {
      newVariants.push({
        id: `var-${Date.now()}-${size}-${color}`,
        sku: `${product.sku}-${size}-${color.substring(0, 3).toUpperCase()}`,
        stockQuantity: 0,
        reorderLevel: 5,
        price: product.basePrice,
        attributes: { size, color }
      })
    })

    if (newVariants.length > 0) {
      setProducts(products.map(p =>
        p.id === selectedProduct
          ? { ...p, variants: [...p.variants, ...newVariants] }
          : p
      ))
    }
  }

  const getStockStatusColor = (stock: number, reorderLevel: number) => {
    if (stock === 0) return 'bg-red-100 text-red-800 border-red-200'
    if (stock <= reorderLevel) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load variant manager: {error}</p>
      </div>
    )
  }

  const selectedProductData = products.find(p => p.id === selectedProduct)

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Variant Manager</h2>
          <p className="text-sm text-gray-600 mt-1">Manage product variants in bulk</p>
        </div>

        <select
          value={selectedProduct || ''}
          onChange={(e) => onProductSelect(e.target.value || null)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Select a product</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.variants.length} variants)
            </option>
          ))}
        </select>
      </div>

      {selectedProductData && variantMatrix && (
        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900">{selectedProductData.name}</h3>
            <p className="text-sm text-gray-600">
              SKU: {selectedProductData.sku} • Base Price: {formatCurrency(selectedProductData.basePrice)}
            </p>
          </div>

          {/* Bulk Actions */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Bulk Actions</h3>
              <div className="flex gap-2">
                <button
                  onClick={generateMissingVariants}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Generate Missing Variants
                </button>
                <button
                  onClick={() => setBulkEditMode(!bulkEditMode)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                >
                  {bulkEditMode ? 'Cancel Bulk Edit' : 'Bulk Edit'}
                </button>
              </div>
            </div>

            {bulkEditMode && (
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bulk Update Price</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="New price"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bulk Update Stock</label>
                  <input
                    type="number"
                    placeholder="New stock quantity"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={bulkUpdateSelectedVariants}
                  disabled={selectedVariants.size === 0 || (!bulkPrice && !bulkStock)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Update Selected ({selectedVariants.size})
                </button>
              </div>
            )}
          </div>

          {/* Variant Matrix */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">Variant Matrix</h3>
              <p className="text-sm text-gray-600">
                Click cells to edit variants inline, or select multiple for bulk operations
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {bulkEditMode && (
                        <input
                          type="checkbox"
                          checked={selectedVariants.size === selectedProductData.variants.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVariants(new Set(selectedProductData.variants.map(v => v.id)))
                            } else {
                              setSelectedVariants(new Set())
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      )}
                      {!bulkEditMode && 'Size / Color'}
                    </th>
                    {variantMatrix.colors.map(color => (
                      <th key={color} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{
                              backgroundColor: color.toLowerCase() === 'white' ? '#ffffff' :
                                              color.toLowerCase() === 'black' ? '#000000' :
                                              color.toLowerCase() === 'red' ? '#ef4444' :
                                              color.toLowerCase() === 'blue' ? '#3b82f6' :
                                              color.toLowerCase() === 'green' ? '#10b981' :
                                              color.toLowerCase() === 'navy' ? '#1e3a8a' :
                                              color.toLowerCase() === 'gray' ? '#6b7280' :
                                              color.toLowerCase() === 'brown' ? '#92400e' :
                                              '#d1d5db'
                            }}
                          />
                          {color}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {variantMatrix.sizes.map(size => (
                    <tr key={size} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{size}</div>
                      </td>
                      {variantMatrix.colors.map(color => {
                        const variant = variantMatrix.matrix[size]?.[color]

                        return (
                          <td key={`${size}-${color}`} className="px-4 py-4 text-center">
                            {variant ? (
                              <div className={`inline-block p-3 rounded-lg border min-w-[120px] ${getStockStatusColor(variant.stockQuantity, variant.reorderLevel)}`}>
                                {bulkEditMode && (
                                  <input
                                    type="checkbox"
                                    checked={selectedVariants.has(variant.id)}
                                    onChange={(e) => {
                                      const newSelection = new Set(selectedVariants)
                                      if (e.target.checked) {
                                        newSelection.add(variant.id)
                                      } else {
                                        newSelection.delete(variant.id)
                                      }
                                      setSelectedVariants(newSelection)
                                    }}
                                    className="rounded border-gray-300 mb-2"
                                  />
                                )}

                                <div className="space-y-1">
                                  <div className="text-xs text-gray-600">{variant.sku}</div>
                                  <div className="font-semibold">{variant.stockQuantity} units</div>
                                  <div className="text-xs">{formatCurrency(variant.price || 0)}</div>
                                </div>

                                <div className="flex gap-1 mt-2">
                                  <input
                                    type="number"
                                    value={variant.stockQuantity}
                                    onChange={(e) => updateVariant(variant.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                                    className="w-16 px-1 py-1 text-xs text-center border rounded"
                                    title="Stock quantity"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={variant.price || ''}
                                    onChange={(e) => updateVariant(variant.id, 'price', parseFloat(e.target.value) || undefined)}
                                    className="w-20 px-1 py-1 text-xs text-center border rounded"
                                    title="Price"
                                  />
                                </div>

                                <button
                                  onClick={() => void deleteVariant(variant.id)}
                                  className="mt-2 text-xs text-red-600 hover:text-red-700"
                                  title="Delete variant"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => createVariant(size, color)}
                                className="inline-flex items-center justify-center w-24 h-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                              >
                                <span className="text-2xl text-gray-400">+</span>
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{selectedProductData.variants.length}</div>
              <div className="text-sm text-gray-600">Total Variants</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">
                {selectedProductData.variants.reduce((sum, v) => sum + v.stockQuantity, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Stock</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">
                {selectedProductData.variants.filter(v => v.stockQuantity <= v.reorderLevel).length}
              </div>
              <div className="text-sm text-gray-600">Low Stock</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">
                {selectedProductData.variants.filter(v => v.stockQuantity === 0).length}
              </div>
              <div className="text-sm text-gray-600">Out of Stock</div>
            </div>
          </div>
        </div>
      )}

      {!selectedProductData && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Product</h3>
          <p className="text-gray-600">Choose a product from the dropdown to manage its variants.</p>
        </div>
      )}
    </div>
  )
}