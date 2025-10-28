'use client'

import { useState, useEffect } from 'react'

interface UniversalInventoryItem {
  id: string
  businessId: string
  businessType: string
  name: string
  sku: string
  description?: string
  category: string
  categoryEmoji?: string
  subcategory?: string | null
  subcategoryEmoji?: string | null
  currentStock: number
  unit: string
  costPrice: number
  sellPrice: number
  supplier?: string
  location?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  attributes?: Record<string, any>
}

interface UniversalInventoryGridProps {
  businessId: string
  businessType?: string
  onItemEdit?: (item: UniversalInventoryItem) => void
  onItemView?: (item: UniversalInventoryItem) => void
  onItemDelete?: (item: UniversalInventoryItem) => void
  showActions?: boolean
  headerActions?: React.ReactNode
  layout?: 'table' | 'grid' | 'cards'
  pageSize?: number
  allowSearch?: boolean
  allowFiltering?: boolean
  allowSorting?: boolean
  customColumns?: string[]
  showBusinessSpecificFields?: boolean
}

export function UniversalInventoryGrid({
  businessId,
  businessType = 'restaurant',
  onItemEdit,
  onItemView,
  onItemDelete,
  showActions = true,
  headerActions,
  layout = 'table',
  pageSize = 50,
  allowSearch = true,
  allowFiltering = true,
  allowSorting = true,
  customColumns,
  showBusinessSpecificFields = true
}: UniversalInventoryGridProps) {
  const [items, setItems] = useState<UniversalInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<string[]>([])

  // Fetch inventory items
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
          ...(searchTerm && { search: searchTerm }),
          ...(selectedCategory !== 'all' && { category: selectedCategory })
        })

        const response = await fetch(`/api/inventory/${businessId}/items?${params}`)

        if (!response.ok) {
          throw new Error('Failed to fetch inventory items')
        }

  const data = await response.json()
  // Cast items to expected shape; backend may return unknown
  const fetchedItems = (data.items || []) as unknown as UniversalInventoryItem[]
  setItems(fetchedItems)

  // Extract categories for filtering
  const uniqueCategories = [...new Set(fetchedItems.map((item) => item.category || '').filter(Boolean))] as string[]
  setCategories(uniqueCategories)

      } catch (error) {
        console.error('Error fetching inventory items:', error)
        setError('Failed to load inventory items')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchItems()
    }
  }, [businessId, currentPage, pageSize, searchTerm, selectedCategory])

  // Sort items
  const sortedItems = [...items].sort((a, b) => {
  let aValue: any = (a as any)[sortField]
  let bValue: any = (b as any)[sortField]

    // Handle nested attributes
    if (sortField.includes('.')) {
  const path = sortField.split('.')
  aValue = path.reduce((obj: any, key: string) => (obj ? obj[key] : undefined), a as any)
  bValue = path.reduce((obj: any, key: string) => (obj ? obj[key] : undefined), b as any)
    }

    // Convert to comparable values
    if (typeof aValue === 'string') aValue = aValue.toLowerCase()
    if (typeof bValue === 'string') bValue = bValue.toLowerCase()

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getBusinessSpecificDisplay = (item: UniversalInventoryItem) => {
    const attributes = item.attributes || {}

    switch (businessType) {
      case 'restaurant':
        return (
          <div className="text-xs space-y-1">
            {attributes.storageTemp && (
              <div className={`inline-block px-2 py-1 rounded-full text-xs ${
                attributes.storageTemp === 'frozen' ? 'bg-blue-100 text-blue-800' :
                attributes.storageTemp === 'refrigerated' ? 'bg-cyan-100 text-cyan-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {attributes.storageTemp}
              </div>
            )}
            {attributes.allergens && attributes.allergens.length > 0 && (
              <div className="text-red-600">
                Allergens: {attributes.allergens.join(', ')}
              </div>
            )}
            {attributes.expirationDays && (
              <div className="text-orange-600">
                Expires in {attributes.expirationDays} days
              </div>
            )}
          </div>
        )

      case 'grocery':
        return (
          <div className="text-xs space-y-1">
            {attributes.pluCode && (
              <div className="font-mono text-green-600">PLU: {attributes.pluCode}</div>
            )}
            {attributes.organicCertified && (
              <div className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Organic
              </div>
            )}
            {attributes.batchNumber && (
              <div className="text-gray-600">Batch: {attributes.batchNumber}</div>
            )}
          </div>
        )

      case 'clothing':
        return (
          <div className="text-xs space-y-1">
            {attributes.sizes && (
              <div>Sizes: {attributes.sizes.join(', ')}</div>
            )}
            {attributes.colors && (
              <div>Colors: {attributes.colors.join(', ')}</div>
            )}
            {attributes.brand && (
              <div className="font-medium">{attributes.brand}</div>
            )}
          </div>
        )

      case 'hardware':
        return (
          <div className="text-xs space-y-1">
            {attributes.manufacturer && (
              <div className="font-medium">{attributes.manufacturer}</div>
            )}
            {attributes.model && (
              <div>Model: {attributes.model}</div>
            )}
            {attributes.warranty && (
              <div className="text-blue-600">Warranty: {attributes.warranty}</div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const getStockStatusColor = (item: UniversalInventoryItem) => {
    const lowStockThreshold = 10 // Could be configurable per item

    if (item.currentStock === 0) return 'text-red-600 font-medium'
    if (item.currentStock <= lowStockThreshold) return 'text-orange-600 font-medium'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {(allowSearch || allowFiltering) && (
        <div className="space-y-4">
          {allowSearch && (
            <div className="w-full">
              <input
                type="text"
                placeholder="🔍 Search items by name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full"
              />
            </div>
          )}

          {allowFiltering && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <select
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split(':')
                    setSortField(field)
                    setSortDirection(direction as 'asc' | 'desc')
                  }}
                  className="input-field w-full"
                >
                  <option value="name:asc">Sort by Name (A-Z)</option>
                  <option value="name:desc">Sort by Name (Z-A)</option>
                  <option value="category:asc">Sort by Category</option>
                  <option value="currentStock:asc">Sort by Stock (Low-High)</option>
                  <option value="currentStock:desc">Sort by Stock (High-Low)</option>
                  <option value="costPrice:asc">Sort by Cost (Low-High)</option>
                  <option value="costPrice:desc">Sort by Cost (High-Low)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inventory Grid/Table */}
      {layout === 'table' ? (
        <div className="card overflow-hidden">
          {/* Header actions (e.g., Add button) */}
          {headerActions && (
            <div className="border-b border-gray-100 dark:border-gray-800 p-3 flex justify-end">
              {headerActions}
            </div>
          )}
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                    className={`text-left p-3 font-medium text-secondary ${allowSorting ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                    onClick={() => allowSorting && handleSort('name')}
                  >
                    Item {allowSorting && (sortField === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : '')}
                  </th>
                  <th
                    className={`text-left p-3 font-medium text-secondary ${allowSorting ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                    onClick={() => allowSorting && handleSort('currentStock')}
                  >
                    Stock {allowSorting && (sortField === 'currentStock' ? (sortDirection === 'asc' ? '↑' : '↓') : '')}
                  </th>
                  <th
                    className={`text-left p-3 font-medium text-secondary ${allowSorting ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                    onClick={() => allowSorting && handleSort('costPrice')}
                  >
                    Unit Cost {allowSorting && (sortField === 'costPrice' ? (sortDirection === 'asc' ? '↑' : '↓') : '')}
                  </th>
                  <th className="text-left p-3 font-medium text-secondary">Location</th>
                  {showBusinessSpecificFields && (
                    <th className="text-left p-3 font-medium text-secondary">Details</th>
                  )}
                  <th className="text-left p-3 font-medium text-secondary">Status</th>
                  {showActions && (
                    <th className="text-left p-3 font-medium text-secondary">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => onItemView?.(item)}
                  >
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-primary">{item.name}</div>
                        <div className="text-xs text-secondary">
                          {item.categoryEmoji && <span className="mr-1">{item.categoryEmoji}</span>}
                          {item.category}
                          {item.subcategory && (
                            <>
                              {' → '}
                              {item.subcategoryEmoji && <span className="mr-1">{item.subcategoryEmoji}</span>}
                              {item.subcategory}
                            </>
                          )}
                          {' • '}{item.sku}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className={getStockStatusColor(item)}>
                        {item.currentStock} {item.unit}
                      </div>
                    </td>
                    <td className="p-3 font-medium">
                      ${item.costPrice.toFixed(2)}
                    </td>
                    <td className="p-3 text-secondary">
                      {item.location || 'Not specified'}
                    </td>
                    {showBusinessSpecificFields && (
                      <td className="p-3">
                        {getBusinessSpecificDisplay(item)}
                      </td>
                    )}
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.isActive ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {showActions && (
                      <td className="p-3">
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onItemView?.(item)
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs w-8 h-8 flex items-center justify-center rounded"
                            title="View details"
                          >
                            👁️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onItemEdit?.(item)
                            }}
                            className="text-orange-600 hover:text-orange-800 text-xs w-8 h-8 flex items-center justify-center rounded"
                            title="Edit item"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onItemDelete?.(item)
                            }}
                            className="text-red-600 hover:text-red-800 text-xs w-8 h-8 flex items-center justify-center rounded"
                            title="Delete item"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className="card border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onItemView?.(item)}
              >
                <div className="flex flex-col space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-primary truncate">{item.name}</h3>
                      <div className="text-xs text-secondary mt-1">
                        {item.categoryEmoji && <span className="mr-1">{item.categoryEmoji}</span>}
                        {item.category}
                        {item.subcategory && (
                          <>
                            {' → '}
                            {item.subcategoryEmoji && <span className="mr-1">{item.subcategoryEmoji}</span>}
                            {item.subcategory}
                          </>
                        )}
                        {' • SKU: '}{item.sku}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.isActive ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-secondary">Stock</div>
                      <div className={getStockStatusColor(item)}>
                        {item.currentStock} {item.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary">Unit Cost</div>
                      <div className="font-medium">${item.costPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary">Location</div>
                      <div className="truncate">{item.location || 'Not specified'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary">Sell Price</div>
                      <div className="font-medium">${item.sellPrice.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Business Specific Details */}
                  {showBusinessSpecificFields && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="text-xs text-secondary mb-2">Business Details</div>
                      {getBusinessSpecificDisplay(item)}
                    </div>
                  )}

                  {/* Actions */}
                  {showActions && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onItemView?.(item)
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onItemEdit?.(item)
                          }}
                          className="px-3 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onItemDelete?.(item)
                          }}
                          className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {sortedItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-primary mb-2">No items found</h3>
              <p className="text-secondary">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Add your first inventory item to get started'
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        // Grid/Card layouts would go here
        <div className="text-center py-12">
          <p className="text-secondary">Grid and card layouts coming soon!</p>
        </div>
      )}

      {/* Pagination */}
      {sortedItems.length > 0 && (
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
          <div className="text-sm text-secondary text-center sm:text-left">
            Showing {sortedItems.length} of {items.length} items
          </div>
          <div className="flex justify-center sm:justify-end items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-secondary">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={sortedItems.length < pageSize}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}