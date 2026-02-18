'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useToastContext } from '@/components/ui/toast'

type EligibleItem = {
  id: string
  productId: string
  productName: string
  productBasePrice: number
  productCategory: string
  productIsAvailable: boolean
  isActive: boolean
  notes: string | null
  createdAt: string
}

type Product = {
  id: string
  name: string
  basePrice: number
  categoryName: string
}

export default function EligibleItemsPage() {
  const { currentBusinessId } = useBusinessPermissionsContext()
  const toast = useToastContext()

  const [items, setItems] = useState<EligibleItem[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [includeInactive, setIncludeInactive] = useState(false)

  // Load eligible items
  const fetchItems = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      const res = await fetch(
        `/api/restaurant/meal-program/eligible-items?businessId=${currentBusinessId}&includeInactive=${includeInactive}`
      )
      const data = await res.json()
      if (data.success) setItems(data.data)
    } catch {
      toast.push('Failed to load eligible items', { type: 'error' })
    }
  }, [currentBusinessId, includeInactive, toast])

  // Load all products
  const fetchProducts = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      const res = await fetch(
        `/api/universal/products?businessId=${currentBusinessId}&isActive=true&limit=500`
      )
      const data = await res.json()
      if (data.success) {
        setAllProducts(
          (data.data || [])
            .filter((p: any) => Number(p.basePrice || p.price || 0) > 0)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              basePrice: Number(p.basePrice || p.price || 0),
              categoryName:
                p.categoryName ||
                (typeof p.category === 'string' ? p.category : p.category?.name) ||
                'Other',
            }))
        )
      }
    } catch {
      toast.push('Failed to load products', { type: 'error' })
    }
  }, [currentBusinessId, toast])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchItems(), fetchProducts()])
      setLoading(false)
    }
    init()
  }, [fetchItems, fetchProducts])

  // Toggle a product in/out of the eligible list by clicking its card
  async function handleCardClick(product: Product) {
    if (!currentBusinessId) return
    const existing = items.find((i) => i.productId === product.id)
    setTogglingId(product.id)
    try {
      if (existing) {
        // Already in program — remove it
        const res = await fetch(`/api/restaurant/meal-program/eligible-items/${existing.id}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          setItems(prev => prev.filter(i => i.id !== existing.id))
          toast.push(`${product.name} removed from eligible items`, { type: 'success' })
        }
      } else {
        // Not in program — add it
        const res = await fetch('/api/restaurant/meal-program/eligible-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentBusinessId, productId: product.id }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          setItems(prev => [...prev, data.data])
          toast.push(`${product.name} added to eligible items`, { type: 'success' })
        } else {
          toast.push(data.error || 'Failed to add item', { type: 'error' })
        }
      }
    } catch {
      toast.push('Action failed', { type: 'error' })
    } finally {
      setTogglingId(null)
    }
  }

  async function handleToggleActive(item: EligibleItem) {
    try {
      const res = await fetch(`/api/restaurant/meal-program/eligible-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isActive: !item.isActive } : i))
        toast.push(item.isActive ? `${item.productName} deactivated` : `${item.productName} reactivated`, { type: 'success' })
      }
    } catch {
      toast.push('Failed to update item', { type: 'error' })
    }
  }


  // Build product card grid data
  const eligibleMap = new Map(items.map((i) => [i.productId, i]))
  const categories = ['all', ...Array.from(new Set(allProducts.map((p) => p.categoryName))).sort()]

  const filteredProducts = allProducts.filter((p) => {
    const matchSearch =
      !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
    const matchCat = selectedCategory === 'all' || p.categoryName === selectedCategory
    return matchSearch && matchCat
  })

  return (
    <ProtectedRoute>
      <BusinessTypeRoute requiredBusinessType="restaurant">
        <ContentLayout
          title="🍱 Eligible Program Items"
          breadcrumb={[
            { label: 'Restaurant', href: '/restaurant' },
            { label: 'Meal Program', href: '/restaurant/meal-program' },
            { label: 'Eligible Items', isActive: true },
          ]}
        >
          {/* Info banner */}
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-400">
            <strong>Click a menu item</strong> to add or remove it from the program. Items in the
            program are <span className="font-semibold text-amber-700 dark:text-amber-400">highlighted in amber</span> — participants
            pay <strong>$0 cash</strong> for these (fully covered by the $0.50 subsidy).
          </div>

          {loading ? (
            <div className="text-center py-16 text-secondary">Loading…</div>
          ) : (
            <>
              {/* Search + Category filters */}
              <div className="mb-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search menu items…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  {productSearch && (
                    <button
                      onClick={() => setProductSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    >✕</button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm text-secondary whitespace-nowrap self-center">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                    className="rounded"
                  />
                  Show inactive
                </label>
              </div>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 mb-5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-400'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>

              {/* Summary strip */}
              <div className="mb-4 text-sm text-secondary">
                <span className="font-semibold text-amber-600 dark:text-amber-400">{items.filter(i => i.isActive).length}</span> items in program
                {' · '}
                <span>{filteredProducts.length}</span> menu items shown
              </div>

              {/* Product card grid */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-secondary">
                  {productSearch ? `No items match "${productSearch}"` : 'No menu items found'}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredProducts.map((product) => {
                    const enrolled = eligibleMap.get(product.id)
                    const isActive = enrolled?.isActive ?? false
                    const isInProgram = !!enrolled
                    const isToggling = togglingId === product.id

                    let cardClass = 'relative p-3 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md select-none '
                    if (isToggling) {
                      cardClass += 'opacity-60 cursor-wait border-gray-300 bg-gray-100 dark:bg-gray-800 '
                    } else if (isInProgram && isActive) {
                      cardClass += 'border-amber-400 bg-amber-50 dark:bg-amber-900/25 shadow-sm '
                    } else if (isInProgram && !isActive) {
                      cardClass += 'border-gray-400 bg-gray-100 dark:bg-gray-800 opacity-60 '
                    } else {
                      cardClass += 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-300 '
                    }

                    return (
                      <div
                        key={product.id}
                        onClick={() => !isToggling && handleCardClick(product)}
                        className={cardClass}
                        title={isInProgram ? 'Click to remove from program' : 'Click to add to program'}
                      >
                        {/* Badge */}
                        {isInProgram && (
                          <span className={`absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-amber-400 text-white'
                              : 'bg-gray-400 text-white'
                          }`}>
                            {isActive ? '✓ IN' : 'OFF'}
                          </span>
                        )}

                        <div className={`font-semibold text-xs line-clamp-2 mb-2 pr-8 ${
                          isInProgram && isActive ? 'text-amber-800 dark:text-amber-200' : 'text-primary'
                        }`}>
                          {product.name}
                        </div>

                        <div className="text-xs text-secondary mb-1">{product.categoryName}</div>

                        <div className={`text-sm font-bold ${
                          isInProgram && isActive ? 'text-amber-700 dark:text-amber-300' : 'text-green-600 dark:text-green-400'
                        }`}>
                          ${product.basePrice.toFixed(2)}
                        </div>

                        {isInProgram && isActive && (
                          <div className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            {product.basePrice <= 0.5 ? '✅ FREE' : `Pay $${(product.basePrice - 0.5).toFixed(2)}`}
                          </div>
                        )}

                        {/* Inline disable/enable for enrolled items */}
                        {enrolled && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(enrolled) }}
                            className={`mt-2 w-full text-center text-xs py-0.5 rounded border transition-colors ${
                              isActive
                                ? 'border-gray-300 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                : 'border-green-400 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                          >
                            {isActive ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </ProtectedRoute>
  )
}
