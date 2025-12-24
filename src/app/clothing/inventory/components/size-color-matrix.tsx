'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface MatrixProduct {
  id: string
  name: string
  sku: string
  basePrice: number
  variants: Array<{
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
  }>
}

interface MatrixData {
  sizes: string[]
  colors: string[]
  matrix: Record<string, Record<string, {
    variantId: string
    stock: number
    price: number
    reorderLevel: number
    needsReorder: boolean
  }>>
}

interface ClothingSizeColorMatrixProps {
  businessId: string
}

export function ClothingSizeColorMatrix({ businessId }: ClothingSizeColorMatrixProps) {
  const { formatCurrency } = useBusinessContext()
  const [products, setProducts] = useState<MatrixProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/universal/products?businessId=${businessId}&includeVariants=true&limit=100`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch products')
        }

        // Filter products that have size/color variants
        const clothingProducts = data.data.filter((product: any) => {
          return product.variants && product.variants.some((variant: any) =>
            variant.attributes?.size && variant.attributes?.color
          )
        })

        setProducts(clothingProducts)

        if (clothingProducts.length > 0 && !selectedProduct) {
          setSelectedProduct(clothingProducts[0].id)
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        console.error('Failed to fetch products:', err)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchProducts()
    }
  }, [businessId])

  useEffect(() => {
    if (selectedProduct) {
      generateMatrixData()
    }
  }, [selectedProduct, products])

  const generateMatrixData = () => {
    const product = products.find(p => p.id === selectedProduct)
    if (!product || !product.variants) return

    const sizes = new Set<string>()
    const colors = new Set<string>()
    const matrix: Record<string, Record<string, any>> = {}

    // Collect all sizes and colors
    product.variants.forEach(variant => {
      const size = variant.attributes?.size
      const color = variant.attributes?.color

      if (size && color) {
        sizes.add(size)
        colors.add(color)

        if (!matrix[size]) {
          matrix[size] = {}
        }

        matrix[size][color] = {
          variantId: variant.id,
          stock: variant.stockQuantity,
          price: variant.price || product.basePrice,
          reorderLevel: variant.reorderLevel,
          needsReorder: variant.stockQuantity <= variant.reorderLevel
        }
      }
    })

    // Sort sizes in logical order
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL']
    const sortedSizes = Array.from(sizes).sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a)
      const bIndex = sizeOrder.indexOf(b)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      return a.localeCompare(b)
    })

    // Sort colors alphabetically
    const sortedColors = Array.from(colors).sort()

    setMatrixData({
      sizes: sortedSizes,
      colors: sortedColors,
      matrix
    })
  }

  const getStockStatusClass = (stock: number, reorderLevel: number) => {
    if (stock === 0) return 'bg-red-100 text-red-800 border-red-200'
    if (stock <= reorderLevel) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getStockStatusIcon = (stock: number, reorderLevel: number) => {
    if (stock === 0) return '🚫'
    if (stock <= reorderLevel) return '⚠️'
    return '✅'
  }

  const updateStock = async (variantId: string, newStock: number) => {
    try {
      // This would call an API to update the variant stock
      console.log('Update stock:', { variantId, newStock })
      // Re-fetch data after update
      // await fetchProducts()
    } catch (err) {
      console.error('Failed to update stock:', err)
    }
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
        <p className="text-red-600">Failed to load matrix data: {error}</p>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Size/Color Matrix Available</h3>
        <p className="text-gray-600">Add products with size and color variants to see the matrix.</p>
      </div>
    )
  }

  const selectedProductData = products.find(p => p.id === selectedProduct)

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Size/Color Matrix</h2>
          <p className="text-sm text-gray-600 mt-1">Visual inventory tracking for clothing variants</p>
        </div>

        <select
          value={selectedProduct || ''}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProductData && matrixData && (
        <div className="bg-white rounded-lg border">
          {/* Product Info Header */}
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">{selectedProductData.name}</h3>
            <p className="text-sm text-gray-600">
              SKU: {selectedProductData.sku} • Base Price: {formatCurrency(selectedProductData.basePrice)}
            </p>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size / Color
                  </th>
                  {matrixData.colors.map(color => (
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
                                            color.toLowerCase() === 'yellow' ? '#f59e0b' :
                                            color.toLowerCase() === 'purple' ? '#8b5cf6' :
                                            color.toLowerCase() === 'pink' ? '#ec4899' :
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
                {matrixData.sizes.map(size => (
                  <tr key={size} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{size}</div>
                    </td>
                    {matrixData.colors.map(color => {
                      const cell = matrixData.matrix[size]?.[color]

                      if (!cell) {
                        return (
                          <td key={`${size}-${color}`} className="px-4 py-4 text-center">
                            <div className="text-gray-400 text-sm">N/A</div>
                          </td>
                        )
                      }

                      return (
                        <td key={`${size}-${color}`} className="px-4 py-4 text-center">
                          <div className={`inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium ${getStockStatusClass(cell.stock, cell.reorderLevel)}`}>
                            <span className="mr-2">{getStockStatusIcon(cell.stock, cell.reorderLevel)}</span>
                            <div className="text-center">
                              <div className="font-semibold">{cell.stock}</div>
                              <div className="text-xs opacity-75">
                                {formatCurrency(cell.price)}
                              </div>
                            </div>
                          </div>

                          {/* Quick Edit Stock */}
                          <div className="mt-2">
                            <input
                              type="number"
                              min="0"
                              value={cell.stock}
                              onChange={(e) => updateStock(cell.variantId, e.target.value === '' ? 0 : parseInt(e.target.value))}
                              className="w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span className="text-gray-600">In Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span className="text-gray-600">Low Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🚫</span>
                  <span className="text-gray-600">Out of Stock</span>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Total Variants: {Object.values(matrixData.matrix).reduce((sum, sizeRow) => sum + Object.keys(sizeRow).length, 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}