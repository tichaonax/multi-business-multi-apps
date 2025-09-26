'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface InventoryItem {
  id: string
  businessId: string
  businessType: string
  name: string
  sku: string
  description: string
  category: string
  currentStock: number
  unit: string
  costPrice: number
  sellPrice: number
  supplier: string
  location: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  attributes: Record<string, any>
}

interface InventoryItemsTableProps {
  businessId: string
}

export function InventoryItemsTable({ businessId }: InventoryItemsTableProps) {
  const { data: session, status } = useSession()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const fetchItems = async () => {
    if (status !== 'authenticated') return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '100',
        ...(search && { search }),
        ...(category !== 'all' && { category })
      })

      const response = await fetch(`/api/inventory/${businessId}/items?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items')
      }

      const data = await response.json()
      setItems(data.items || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching inventory:', err)
      setError('Failed to load inventory items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [businessId, status, search, category])

  if (status === 'loading' || loading) {
    return (
      <div className="card bg-white dark:bg-gray-900">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-secondary">Loading inventory...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-white dark:bg-gray-900">
        <div className="p-8 text-center">
          <div className="text-red-600 mb-4">⚠️ {error}</div>
          <button
            onClick={fetchItems}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-white dark:bg-gray-900">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-primary">Inventory Items</h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field text-sm w-64 bg-white dark:bg-gray-800 text-primary dark:text-gray-100"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field text-sm bg-white dark:bg-gray-800 text-primary dark:text-gray-100"
            >
              <option value="all">All Categories</option>
              <option value="Proteins">Proteins</option>
              <option value="Vegetables">Vegetables</option>
              <option value="Dairy">Dairy</option>
              <option value="Pantry">Pantry</option>
              <option value="Beverages">Beverages</option>
              <option value="Supplies">Supplies</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left p-2 sm:p-2 sm:p-3 font-medium text-secondary">Item</th>
              <th className="hidden sm:table-cell text-left p-2 sm:p-2 sm:p-3 font-medium text-secondary">SKU</th>
              <th className="text-left p-2 sm:p-2 sm:p-3 font-medium text-secondary">Stock</th>
              <th className="hidden md:table-cell text-left p-2 sm:p-2 sm:p-3 font-medium text-secondary">Cost Price</th>
              <th className="text-left p-2 sm:p-2 sm:p-3 font-medium text-secondary">Sell Price</th>
              <th className="hidden lg:table-cell text-left p-2 sm:p-2 sm:p-3 font-medium text-secondary">Category</th>
              <th className="text-left p-2 sm:p-2 sm:p-3 font-medium text-secondary">Status</th>
              <th className="hidden lg:table-cell text-left p-2 sm:p-2 sm:p-3 font-medium text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-secondary">
                  <div className="text-4xl mb-4">📦</div>
                  <div className="text-lg font-medium mb-2">No inventory items found</div>
                  <div className="text-sm">Start by adding your first inventory item</div>
                  <button className="btn-primary mt-4">
                    ➕ Add First Item
                  </button>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-2 sm:p-3">
                    <div>
                      <div className="font-medium text-primary">{item.name}</div>
                      <div className="text-xs text-secondary">{item.description}</div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell p-2 sm:p-3 text-secondary">{item.sku}</td>
                  <td className="p-2 sm:p-3">
                    <span className={`font-medium ${
                      item.currentStock === 0 ? 'text-red-600' :
                      item.currentStock < 10 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {item.currentStock} {item.unit}
                    </span>
                  </td>
                  <td className="hidden md:table-cell p-2 sm:p-3 text-secondary">${item.costPrice.toFixed(2)}</td>
                  <td className="p-2 sm:p-3 text-secondary">${item.sellPrice.toFixed(2)}</td>
                  <td className="hidden lg:table-cell p-2 sm:p-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.currentStock === 0 ? 'bg-red-100 text-red-800' :
                      item.currentStock < 10 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.currentStock === 0 ? 'Out of Stock' :
                       item.currentStock < 10 ? 'Low Stock' :
                       'In Stock'}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell p-2 sm:p-3">
                    <div className="flex gap-1">
                      <button className="text-blue-600 hover:text-blue-800 text-xs p-1">
                        ✏️ Edit
                      </button>
                      <button className="text-green-600 hover:text-green-800 text-xs p-1">
                        📦 Receive
                      </button>
                      <button className="text-orange-600 hover:text-orange-800 text-xs p-1">
                        🔄 Use
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}