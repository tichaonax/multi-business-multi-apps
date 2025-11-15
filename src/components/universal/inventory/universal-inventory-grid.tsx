'use client'

import { useState, useEffect } from 'react'
import { LabelPreview } from '@/components/printing/label-preview'
import { PrinterSelector } from '@/components/printing/printer-selector'
import { usePrinterPermissions } from '@/hooks/use-printer-permissions'
import { usePrintJobMonitor } from '@/hooks/use-print-job-monitor'
import type { LabelData, NetworkPrinter } from '@/types/printing'

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
  barcodes?: Array<{
    id: string
    code: string
    type: string
    isPrimary: boolean
    isUniversal: boolean
    isActive: boolean
    label?: string
    notes?: string
  }>
}

interface UniversalInventoryGridProps {
  businessId: string
  businessType?: string
  categoryFilter?: string  // External category filter (from parent component)
  departmentFilter?: string  // External department filter (from parent component)
  onItemEdit?: (item: UniversalInventoryItem) => void
  onItemView?: (item: UniversalInventoryItem) => void
  onItemDelete?: (item: UniversalInventoryItem) => void
  onResetExternalFilters?: () => void  // Callback to reset parent filters
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
  categoryFilter,  // External filter from parent
  departmentFilter,  // External department filter from parent
  onItemEdit,
  onItemView,
  onItemDelete,
  onResetExternalFilters,  // Callback to reset parent filters
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
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [showLabelPreview, setShowLabelPreview] = useState(false)
  const [selectedItemForLabel, setSelectedItemForLabel] = useState<UniversalInventoryItem | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showBulkLabelPreview, setShowBulkLabelPreview] = useState(false)

  // Printing hooks
  const { canPrintInventoryLabels } = usePrinterPermissions()
  const { monitorJob, notifyJobQueued } = usePrintJobMonitor()

  // Use external categoryFilter if provided, otherwise use internal state
  const effectiveCategory = categoryFilter || selectedCategory

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
          ...(effectiveCategory !== 'all' && { category: effectiveCategory }),
          ...(departmentFilter && { domainId: departmentFilter })
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

  // Extract suppliers for filtering
  const uniqueSuppliers = [...new Set(fetchedItems.map((item) => item.supplier || '').filter(Boolean))] as string[]
  setSuppliers(uniqueSuppliers)

  // Extract locations for filtering
  const uniqueLocations = [...new Set(fetchedItems.map((item) => item.location || '').filter(Boolean))] as string[]
  setLocations(uniqueLocations)

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
  }, [businessId, currentPage, pageSize, searchTerm, selectedCategory, categoryFilter, departmentFilter])

  // Filter items by supplier and location
  const filteredItems = items.filter(item => {
    if (selectedSupplier !== 'all' && item.supplier !== selectedSupplier) {
      return false
    }
    if (selectedLocation !== 'all' && item.location !== selectedLocation) {
      return false
    }
    return true
  })

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
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
            {attributes.manufacturer && typeof attributes.manufacturer === 'string' && (
              <div className="font-medium">{attributes.manufacturer}</div>
            )}
            {attributes.model && typeof attributes.model === 'string' && (
              <div>Model: {attributes.model}</div>
            )}
            {attributes.warranty && typeof attributes.warranty === 'string' && (
              <div className="text-blue-600">Warranty: {attributes.warranty}</div>
            )}
            {attributes.material && typeof attributes.material === 'string' && (
              <div>Material: {attributes.material}</div>
            )}
            {attributes.brand && typeof attributes.brand === 'string' && (
              <div>Brand: {attributes.brand}</div>
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

  const handleResetAllFilters = () => {
    // Reset internal filters
    setSearchTerm('')
    setSelectedCategory('all')
    setSelectedSupplier('all')
    setSelectedLocation('all')
    setCurrentPage(1)

    // Reset external filters if callback provided
    if (onResetExternalFilters) {
      onResetExternalFilters()
    }
  }

  const hasActiveFilters = searchTerm !== '' ||
                           selectedCategory !== 'all' ||
                           selectedSupplier !== 'all' ||
                           selectedLocation !== 'all' ||
                           categoryFilter ||
                           departmentFilter

  // Handle print label button click
  const handlePrintLabel = (item: UniversalInventoryItem) => {
    setSelectedItemForLabel(item)
    setShowLabelPreview(true)
  }

  // Handle item selection for bulk operations
  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (selectedItems.size === sortedItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(sortedItems.map(item => item.id)))
    }
  }

  // Handle bulk print labels
  const handleBulkPrintLabels = () => {
    if (selectedItems.size === 0) return
    setShowBulkLabelPreview(true)
  }

  // Get selected items data
  const getSelectedItemsData = (): UniversalInventoryItem[] => {
    return sortedItems.filter(item => selectedItems.has(item.id))
  }

  // Convert inventory item to label data
  const getLabelDataFromItem = (
    item: UniversalInventoryItem,
    format: 'standard' | 'with-price' | 'compact' | 'business-specific' = 'with-price'
  ): LabelData => {
    return {
      sku: item.sku,
      itemName: item.name,
      price: format === 'with-price' || format === 'business-specific' ? item.sellPrice : undefined,
      businessId: businessId,
      businessType: businessType as any,
      labelFormat: format,
      barcode: {
        data: item.sku,
        format: 'code128'
      },
      businessSpecificData: item.attributes
    }
  }

  // Handle printing the label
  const handlePrint = async (printer: NetworkPrinter, copies: number) => {
    if (!selectedItemForLabel) return

    try {
      const labelData = getLabelDataFromItem(selectedItemForLabel)

      const response = await fetch('/api/print/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId: printer.id,
          businessId: businessId,
          ...labelData,
          copies
        })
      })

      if (!response.ok) {
        throw new Error('Failed to queue print job')
      }

      const data = await response.json()
      notifyJobQueued(data.printJob.id, printer.printerName)
      monitorJob({ jobId: data.printJob.id })

      setShowLabelPreview(false)
      setSelectedItemForLabel(null)
    } catch (error) {
      console.error('Error printing label:', error)
    }
  }

  // Handle bulk printing labels
  const handleBulkPrint = async (
    printer: NetworkPrinter,
    copies: number,
    format: 'standard' | 'with-price' | 'compact' | 'business-specific' = 'with-price'
  ) => {
    const items = getSelectedItemsData()
    if (items.length === 0) return

    try {
      // Queue print jobs for each selected item
      const printPromises = items.map(item => {
        const labelData = getLabelDataFromItem(item, format)
        return fetch('/api/print/label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            printerId: printer.id,
            businessId: businessId,
            ...labelData,
            copies
          })
        })
      })

      const responses = await Promise.all(printPromises)
      const results = await Promise.all(responses.map(r => r.json()))

      // Monitor all jobs
      results.forEach(data => {
        if (data.printJob) {
          monitorJob({ jobId: data.printJob.id })
        }
      })

      notifyJobQueued('bulk', printer.printerName)

      setShowBulkLabelPreview(false)
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Error printing bulk labels:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
      {/* Bulk Actions Bar */}
      {canPrintInventoryLabels && selectedItems.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBulkPrintLabels}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              🏷️ Print Labels ({selectedItems.size})
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      {(allowSearch || allowFiltering) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {allowSearch && (
              <div className="flex-1 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="🔍 Search items by name, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            )}

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetAllFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors whitespace-nowrap"
                title="Reset all filters"
              >
                🔄 Reset Filters
              </button>
            )}
          </div>

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
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier} value={supplier}>
                      {supplier}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="all">All Locations</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
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
                  <option value="sellPrice:asc">Sort by Sell Price (Low-High)</option>
                  <option value="sellPrice:desc">Sort by Sell Price (High-Low)</option>
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
                  {canPrintInventoryLabels && (
                    <th className="w-12 p-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === sortedItems.length && sortedItems.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                        title="Select all"
                      />
                    </th>
                  )}
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
                  <th
                    className={`text-left p-3 font-medium text-secondary ${allowSorting ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                    onClick={() => allowSorting && handleSort('sellPrice')}
                  >
                    Sell Price {allowSorting && (sortField === 'sellPrice' ? (sortDirection === 'asc' ? '↑' : '↓') : '')}
                  </th>
                  <th className="text-left p-3 font-medium text-secondary">Supplier</th>
                  <th className="text-left p-3 font-medium text-secondary">Location</th>
                  <th className="text-left p-3 font-medium text-secondary">Barcodes</th>
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
                    {canPrintInventoryLabels && (
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="rounded"
                        />
                      </td>
                    )}
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
                    <td className="p-3 font-medium text-orange-600 dark:text-orange-400">
                      ${item.costPrice.toFixed(2)}
                    </td>
                    <td className="p-3 font-medium text-green-600 dark:text-green-400">
                      ${item.sellPrice.toFixed(2)}
                    </td>
                    <td className="p-3 text-secondary">
                      {item.supplier || 'Not specified'}
                    </td>
                    <td className="p-3 text-secondary">
                      {item.location || 'Not specified'}
                    </td>
                    <td className="p-3">
                      {item.barcodes && item.barcodes.length > 0 ? (
                        <div className="space-y-1">
                          {item.barcodes.slice(0, 2).map((barcode, index) => (
                            <div key={barcode.id} className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                barcode.type === 'CUSTOM' ? 'bg-purple-100 text-purple-800' :
                                barcode.type === 'SKU_BARCODE' ? 'bg-blue-100 text-blue-800' :
                                barcode.type === 'UPC_A' || barcode.type === 'EAN_13' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {barcode.type}
                              </span>
                              <span className="font-mono text-xs text-gray-600">{barcode.code}</span>
                              {barcode.isPrimary && (
                                <span className="text-xs text-blue-600 font-medium">Primary</span>
                              )}
                            </div>
                          ))}
                          {item.barcodes.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{item.barcodes.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No barcodes</span>
                      )}
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
                          {canPrintInventoryLabels && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePrintLabel(item)
                              }}
                              className="text-purple-600 hover:text-purple-800 text-xs w-8 h-8 flex items-center justify-center rounded"
                              title="Print label"
                            >
                              🏷️
                            </button>
                          )}
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
                      <div className="text-xs text-secondary">Sell Price</div>
                      <div className="font-medium">${item.sellPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary">Supplier</div>
                      <div className="truncate">{item.supplier || 'Not specified'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-secondary">Location</div>
                      <div className="truncate">{item.location || 'Not specified'}</div>
                    </div>
                  </div>

                  {/* Barcodes */}
                  {item.barcodes && item.barcodes.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="text-xs text-secondary mb-2">Barcodes</div>
                      <div className="space-y-1">
                        {item.barcodes.slice(0, 2).map((barcode) => (
                          <div key={barcode.id} className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              barcode.type === 'CUSTOM' ? 'bg-purple-100 text-purple-800' :
                              barcode.type === 'SKU_BARCODE' ? 'bg-blue-100 text-blue-800' :
                              barcode.type === 'UPC_A' || barcode.type === 'EAN_13' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {barcode.type}
                            </span>
                            <span className="font-mono text-xs">{barcode.code}</span>
                            {barcode.isPrimary && (
                              <span className="text-xs text-blue-600 font-medium">Primary</span>
                            )}
                          </div>
                        ))}
                        {item.barcodes.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{item.barcodes.length - 2} more barcodes
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                        {canPrintInventoryLabels && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePrintLabel(item)
                            }}
                            className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                          >
                            Print
                          </button>
                        )}
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

      {/* Label Preview Modal */}
      {selectedItemForLabel && (
        <LabelPreview
          isOpen={showLabelPreview}
          onClose={() => {
            setShowLabelPreview(false)
            setSelectedItemForLabel(null)
          }}
          labelData={getLabelDataFromItem(selectedItemForLabel)}
          onPrint={handlePrint}
        />
      )}

      {/* Bulk Label Preview Modal */}
      {showBulkLabelPreview && (
        <BulkLabelPreview
          isOpen={showBulkLabelPreview}
          onClose={() => {
            setShowBulkLabelPreview(false)
          }}
          items={getSelectedItemsData()}
          onPrint={handleBulkPrint}
        />
      )}
    </div>
  )
}

// Simple bulk label preview component
interface BulkLabelPreviewProps {
  isOpen: boolean
  onClose: () => void
  items: UniversalInventoryItem[]
  onPrint: (printer: NetworkPrinter, copies: number, format: 'standard' | 'with-price' | 'compact' | 'business-specific') => Promise<void>
}

function BulkLabelPreview({ isOpen, onClose, items, onPrint }: BulkLabelPreviewProps) {
  const [showPrinterSelector, setShowPrinterSelector] = useState(false)
  const [copies, setCopies] = useState(1)
  const [printing, setPrinting] = useState(false)
  const [labelFormat, setLabelFormat] = useState<'standard' | 'with-price' | 'compact' | 'business-specific'>('with-price')

  if (!isOpen) return null

  const handleSelectPrinter = async (printer: NetworkPrinter) => {
    setPrinting(true)
    await onPrint(printer, copies, labelFormat)
    setPrinting(false)
    setShowPrinterSelector(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              🏷️ Print Labels ({items.length} items)
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      SKU: {item.sku} • ${item.sellPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {index + 1} of {items.length}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Label format
              </label>
              <select
                value={labelFormat}
                onChange={(e) => setLabelFormat(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="standard">Standard (SKU + Name)</option>
                <option value="with-price">With Price (SKU + Name + Price)</option>
                <option value="compact">Compact (SKU only)</option>
                <option value="business-specific">Business-Specific</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Copies per label
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={printing}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPrinterSelector(true)}
                disabled={printing}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {printing ? 'Printing...' : 'Select Printer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPrinterSelector && (
        <PrinterSelector
          isOpen={showPrinterSelector}
          onClose={() => setShowPrinterSelector(false)}
          onSelect={handleSelectPrinter}
          printerType="label"
          title="Select Label Printer"
          description="Choose a printer for bulk label printing"
        />
      )}
    </>
  )
}