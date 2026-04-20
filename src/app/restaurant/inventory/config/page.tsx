'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface ProductConfig {
  id: string
  name: string
  price: number
  category: string
  isTracked: boolean
}

export default function PrepInventoryConfigPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const { push: toast, error: toastError } = useToastContext()
  const [products, setProducts] = useState<ProductConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'name' | 'price'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showTrackedOnly, setShowTrackedOnly] = useState(false)

  function toggleSort(field: 'name' | 'price') {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'price' ? 'desc' : 'asc') }
  }

  useEffect(() => {
    if (!currentBusinessId) return
    fetchProducts()
  }, [currentBusinessId])

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch(`/api/restaurant/inventory-config?businessId=${currentBusinessId}`)
      const json = await res.json()
      if (json.success) setProducts(json.data)
    } catch {
      toastError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  async function toggleTracking(productId: string, currentValue: boolean) {
    setToggling(productId)
    try {
      const res = await fetch('/api/restaurant/inventory-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessProductId: productId, businessId: currentBusinessId, isTracked: !currentValue }),
      })
      const json = await res.json()
      if (json.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, isTracked: !currentValue } : p))
        toast(!currentValue ? 'Tracking enabled' : 'Tracking disabled', { type: 'success' })
      } else {
        toastError('Failed to update tracking')
      }
    } catch {
      toastError('Failed to update tracking')
    } finally {
      setToggling(null)
    }
  }

  const filtered = products
    .filter(p =>
      (showTrackedOnly ? p.isTracked : true) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
       p.category.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortField === 'price') return (a.price - b.price) * mul
      return a.name.localeCompare(b.name) * mul
    })

  const trackedCount = products.filter(p => p.isTracked).length

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Nav */}
        <div className="mb-6 flex gap-2">
          <Link href="/restaurant/inventory" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
            ← Inventory
          </Link>
          <Link href="/restaurant/inventory/initialize" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm">
            Daily Initialization →
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configure Tracked Items</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Enable tracking for items prepared in advance. Tracked items show remaining counts on the POS.
            {trackedCount > 0 && <span className="ml-2 text-teal-600 font-medium">{trackedCount} item{trackedCount !== 1 ? 's' : ''} tracked</span>}
          </p>
        </div>

        {/* Search + filter */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={() => setShowTrackedOnly(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
              showTrackedOnly
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-teal-500'
            }`}
          >
            {showTrackedOnly ? 'Tracked only' : 'All items'}
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading products...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No products found.</div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400">
                      Product {sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-400">↕</span>}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-gray-700 dark:text-gray-300 font-medium hidden sm:table-cell">Category</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">
                    <button onClick={() => toggleSort('price')} className="flex items-center gap-1 ml-auto text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400">
                      Price {sortField === 'price' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-400">↕</span>}
                    </button>
                  </th>
                  <th className="text-center px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">Track Inventory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(product => (
                  <tr key={product.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{product.name}</span>
                      {product.isTracked && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 rounded">tracked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{product.category || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">${product.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {product.price <= 0 ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">No price set</span>
                      ) : (
                        <button
                          onClick={() => toggleTracking(product.id, product.isTracked)}
                          disabled={toggling === product.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
                            product.isTracked ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          aria-label={product.isTracked ? 'Disable tracking' : 'Enable tracking'}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${product.isTracked ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
