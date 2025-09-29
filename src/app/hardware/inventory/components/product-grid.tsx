'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface HardwareProduct {
  id: string
  name: string
  sku: string
  description?: string
  category: {
    id: string
    name: string
    icon: string
  }
  brand?: {
    id: string
    name: string
  }
  unitPrice: number
  bulkPricing?: Array<{
    minQuantity: number
    price: number
    description: string
  }>
  stockQuantity: number
  unit: 'each' | 'pair' | 'set' | 'box' | 'case' | 'ft' | 'sqFt' | 'lb' | 'gal'
  minOrderQuantity: number
  isRental?: boolean
  rentalPrice?: number
  specifications?: {
    weight?: string
    dimensions?: string
    material?: string
    voltage?: string
    powerSource?: string
    warranty?: string
    safetyRating?: string
  }
  supplier?: {
    id: string
    name: string
    leadTime: number
  }
  images?: string[]
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'
  isSpecialOrder?: boolean
  contractorPrice?: number
}

interface HardwareProductGridProps {
  businessId: string
  selectedCategory: string | null
}

export function HardwareProductGrid({ businessId, selectedCategory }: HardwareProductGridProps) {
  const { formatCurrency } = useBusinessContext()
  const [products, setProducts] = useState<HardwareProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'brand'>('name')

  useEffect(() => {
    fetchProducts()
  }, [businessId, selectedCategory])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Sample hardware products with hardware-specific attributes
      const sampleProducts: HardwareProduct[] = [
        {
          id: 'hw1',
          name: 'Milwaukee M18 Cordless Drill',
          sku: 'MIL-M18-DRILL-001',
          description: 'Professional grade cordless drill with brushless motor',
          category: { id: 'tools', name: 'Tools & Equipment', icon: '🔧' },
          brand: { id: 'milwaukee', name: 'Milwaukee' },
          unitPrice: 179.99,
          bulkPricing: [
            { minQuantity: 5, price: 165.00, description: 'Contractor 5+ discount' },
            { minQuantity: 10, price: 155.00, description: 'Volume 10+ discount' }
          ],
          stockQuantity: 24,
          unit: 'each',
          minOrderQuantity: 1,
          contractorPrice: 162.99,
          specifications: {
            weight: '3.4 lbs',
            dimensions: '8.5" x 3" x 9"',
            voltage: '18V',
            powerSource: 'Li-ion Battery',
            warranty: '5 years',
            material: 'Metal/Plastic'
          },
          supplier: { id: 'milwaukee-direct', name: 'Milwaukee Direct', leadTime: 3 },
          status: 'ACTIVE'
        },
        {
          id: 'hw2',
          name: 'DeWalt Circular Saw 7.25"',
          sku: 'DEW-CS-725-001',
          description: 'Lightweight circular saw with electric brake',
          category: { id: 'tools', name: 'Tools & Equipment', icon: '🔧' },
          brand: { id: 'dewalt', name: 'DeWalt' },
          unitPrice: 149.99,
          contractorPrice: 134.99,
          stockQuantity: 12,
          unit: 'each',
          minOrderQuantity: 1,
          isRental: true,
          rentalPrice: 25.00,
          specifications: {
            weight: '8.8 lbs',
            dimensions: '12" x 10" x 10"',
            voltage: '15 Amp',
            powerSource: 'Corded Electric',
            warranty: '3 years'
          },
          supplier: { id: 'dewalt-supply', name: 'DeWalt Supply', leadTime: 2 },
          status: 'ACTIVE'
        },
        {
          id: 'hw3',
          name: '2x4x8 Pressure Treated Lumber',
          sku: 'LUM-PT-2X4X8',
          description: 'Pressure treated lumber, ideal for outdoor construction',
          category: { id: 'lumber', name: 'Lumber & Building Materials', icon: '🪵' },
          unitPrice: 8.47,
          bulkPricing: [
            { minQuantity: 50, price: 7.99, description: 'Bundle 50+ discount' },
            { minQuantity: 100, price: 7.49, description: 'Pallet 100+ discount' }
          ],
          stockQuantity: 247,
          unit: 'each',
          minOrderQuantity: 1,
          contractorPrice: 7.89,
          specifications: {
            dimensions: '1.5" x 3.5" x 8\'',
            material: 'Pressure Treated Pine',
            weight: '~9 lbs each'
          },
          supplier: { id: 'abc-lumber', name: 'ABC Lumber', leadTime: 1 },
          status: 'ACTIVE'
        },
        {
          id: 'hw4',
          name: 'Romex 12-2 Wire 250ft Roll',
          sku: 'ELE-ROMEX-12-2-250',
          description: 'Non-metallic cable for residential wiring',
          category: { id: 'electrical', name: 'Electrical', icon: '⚡' },
          unitPrice: 89.99,
          bulkPricing: [
            { minQuantity: 5, price: 82.99, description: 'Electrician 5+ rolls' },
            { minQuantity: 10, price: 78.99, description: 'Volume 10+ rolls' }
          ],
          stockQuantity: 18,
          unit: 'each',
          minOrderQuantity: 1,
          contractorPrice: 79.99,
          specifications: {
            material: 'Copper conductor with PVC jacket',
            dimensions: '12 AWG, 2 conductor + ground',
            safetyRating: 'UL Listed',
            voltage: '600V rated'
          },
          supplier: { id: 'electrical-wholesale', name: 'Electrical Wholesalers', leadTime: 4 },
          status: 'ACTIVE'
        },
        {
          id: 'hw5',
          name: '3/4" PVC Pipe 10ft',
          sku: 'PLU-PVC-075-10',
          description: 'Schedule 40 PVC pipe for plumbing and irrigation',
          category: { id: 'plumbing', name: 'Plumbing', icon: '🚰' },
          unitPrice: 12.49,
          bulkPricing: [
            { minQuantity: 20, price: 11.49, description: 'Job lot 20+ pieces' },
            { minQuantity: 50, price: 10.99, description: 'Contractor 50+ pieces' }
          ],
          stockQuantity: 89,
          unit: 'each',
          minOrderQuantity: 1,
          contractorPrice: 10.99,
          specifications: {
            material: 'PVC Schedule 40',
            dimensions: '3/4" x 10\'',
            weight: '1.2 lbs per foot'
          },
          supplier: { id: 'plumbing-supply', name: 'Plumbing Supply Co.', leadTime: 2 },
          status: 'ACTIVE'
        },
        {
          id: 'hw6',
          name: 'Carriage Bolts 1/2" x 6" (Box of 25)',
          sku: 'FAS-CB-050-6-25',
          description: 'Galvanized carriage bolts with nuts and washers',
          category: { id: 'fasteners', name: 'Fasteners & Hardware', icon: '🔩' },
          unitPrice: 24.99,
          stockQuantity: 156,
          unit: 'box',
          minOrderQuantity: 1,
          contractorPrice: 21.99,
          specifications: {
            material: 'Galvanized Steel',
            dimensions: '1/2" diameter x 6" length',
            weight: '3.2 lbs per box'
          },
          supplier: { id: 'fastener-direct', name: 'Fastener Direct', leadTime: 5 },
          status: 'ACTIVE'
        }
      ]

      // Filter by category if selected
      const filteredProducts = selectedCategory
        ? sampleProducts.filter(product => product.category.id === selectedCategory)
        : sampleProducts

      setProducts(filteredProducts)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch hardware products:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-50' }
    if (quantity <= 10) return { label: 'Low Stock', color: 'text-orange-600 bg-orange-50' }
    return { label: 'In Stock', color: 'text-green-600 bg-green-50' }
  }

  const getUnitLabel = (unit: string) => {
    const labels = {
      each: 'ea',
      pair: 'pr',
      set: 'set',
      box: 'box',
      case: 'case',
      ft: 'ft',
      sqFt: 'sq ft',
      lb: 'lb',
      gal: 'gal'
    }
    return labels[unit as keyof typeof labels] || unit
  }

  // Filter and sort products
  const filteredProducts = products.filter(product =>
    searchTerm === '' ||
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'price':
        return a.unitPrice - b.unitPrice
      case 'stock':
        return b.stockQuantity - a.stockQuantity
      case 'brand':
        return (a.brand?.name || '').localeCompare(b.brand?.name || '')
      default:
        return 0
    }
  })

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
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search products, SKU, brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="stock">Sort by Stock</option>
            <option value="brand">Sort by Brand</option>
          </select>

          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}
            >
              List
            </button>
          </div>

          <div className="text-sm text-gray-600">
            {filteredProducts.length} products
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className={viewMode === 'grid'
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
        : 'space-y-4'
      }>
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">🔨</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-600">No products match your current filters.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stockQuantity)

            if (viewMode === 'list') {
              return (
                <div key={product.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{product.category.icon}</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-600 mb-1">
                            SKU: {product.sku} {product.brand && `• ${product.brand.name}`}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium text-orange-600">
                              {formatCurrency(product.unitPrice)}/{getUnitLabel(product.unit)}
                            </span>
                            {product.contractorPrice && (
                              <span className="text-blue-600">
                                Contractor: {formatCurrency(product.contractorPrice)}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                              {product.stockQuantity} {getUnitLabel(product.unit)} - {stockStatus.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {product.isRental && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                              Rental: {formatCurrency(product.rentalPrice!)}/day
                            </span>
                          )}
                          <button className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={product.id} className="bg-white rounded-lg border hover:shadow-lg transition-shadow">
                {/* Product Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg flex items-center justify-center">
                  <div className="text-4xl opacity-40">{product.category.icon}</div>
                </div>

                <div className="p-4">
                  {/* Product Info */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{product.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.label}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      SKU: {product.sku}
                      {product.brand && ` • ${product.brand.name}`}
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(product.unitPrice)}
                        <span className="text-sm text-gray-500">/{getUnitLabel(product.unit)}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {product.stockQuantity} {getUnitLabel(product.unit)}
                      </div>
                    </div>

                    {product.contractorPrice && (
                      <div className="text-sm text-blue-600 mb-2">
                        Contractor: {formatCurrency(product.contractorPrice)}
                      </div>
                    )}

                    {product.bulkPricing && product.bulkPricing.length > 0 && (
                      <div className="text-xs text-green-600 mb-2">
                        Bulk: {formatCurrency(product.bulkPricing[0].price)} @ {product.bulkPricing[0].minQuantity}+
                      </div>
                    )}

                    {product.isRental && (
                      <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded mb-2">
                        🚛 Rental: {formatCurrency(product.rentalPrice!)}/day
                      </div>
                    )}

                    {/* Key Specifications */}
                    {product.specifications && (
                      <div className="text-xs text-gray-500 space-y-1">
                        {product.specifications.dimensions && (
                          <div>📐 {product.specifications.dimensions}</div>
                        )}
                        {product.specifications.weight && (
                          <div>⚖️ {product.specifications.weight}</div>
                        )}
                        {product.specifications.material && (
                          <div>🔧 {product.specifications.material}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">
                      Add to Cart
                    </button>
                    <button className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Details
                    </button>
                  </div>

                  {/* Supplier Info */}
                  {product.supplier && (
                    <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                      📦 {product.supplier.name} • {product.supplier.leadTime} day{product.supplier.leadTime !== 1 ? 's' : ''} lead time
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}