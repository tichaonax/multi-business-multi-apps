'use client'

import { useState, useEffect } from 'react'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface PickerVariant {
  id: string
  price?: number
  stockQuantity?: number
  reorderLevel?: number
}

interface PickerProduct {
  id: string
  name: string
  basePrice: number
  images?: Array<{ imageUrl: string; isPrimary?: boolean }>
  variants?: PickerVariant[]
}

interface Props {
  businessId: string
  /** Variant ids already attached elsewhere (task parts, bill parts) — shown as
   * "Added" and disabled so the same part can't be attached twice from here. */
  excludeVariantIds?: string[]
  onAdd: (product: PickerProduct, variant: PickerVariant) => void
}

/**
 * Browsable parts grid (MBM-293) — replaces the old "type to see anything"
 * search boxes on Add Task's "Known Parts" and Bill Job's "Add More Parts"
 * with a grocery-POS-style card grid: shows parts by default, photo + price +
 * stock per card, search/category narrow the same grid rather than gating it.
 */
export function PartsPickerGrid({ businessId, excludeVariantIds = [], onAdd }: Props) {
  const [products, setProducts] = useState<PickerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string; emoji: string | null }>>([])
  const limit = 12

  useEffect(() => {
    fetch('/api/vehicle-service/parts/categories')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.success) return
        const flat = (data.domains || []).flatMap((d: any) =>
          (d.business_categories || []).map((c: any) => ({ id: c.id, name: c.name, emoji: c.emoji }))
        )
        setCategories(flat)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [searchDebounced, categoryId])

  useEffect(() => {
    if (!businessId) return
    setLoading(true)
    const params = new URLSearchParams({
      businessId,
      productType: 'PHYSICAL',
      includeVariants: 'true',
      includeImages: 'true',
      page: String(page),
      limit: String(limit),
    })
    if (searchDebounced) params.append('search', searchDebounced)
    if (categoryId) params.append('categoryId', categoryId)

    fetch(`/api/universal/products?${params}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.success) return
        setProducts(data.data || [])
        setTotalPages(data.meta?.totalPages || 1)
      })
      .finally(() => setLoading(false))
  }, [businessId, page, searchDebounced, categoryId])

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search parts..."
          className="flex-1 min-w-[160px] text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <div className="w-48">
          <SearchableSelect
            options={categories.map(c => ({ value: c.id, name: `${c.emoji ? c.emoji + ' ' : ''}${c.name}` }))}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="All Categories"
            allLabel="All Categories"
            searchPlaceholder="Search categories..."
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6 text-sm text-gray-400">Loading parts…</div>
      ) : products.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">No parts found</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {products.map(p => {
            const variant = p.variants?.[0]
            if (!variant) return null
            const primaryImage = p.images?.find(i => i.isPrimary) || p.images?.[0]
            const stock = Number(variant.stockQuantity ?? 0)
            const reorder = Number(variant.reorderLevel ?? 0)
            const outOfStock = stock <= 0
            const alreadyAdded = excludeVariantIds.includes(variant.id)
            const price = Number(variant.price ?? p.basePrice ?? 0)

            let stockBadge = { text: `${stock} in stock`, cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
            if (outOfStock) {
              stockBadge = { text: 'Out of stock', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
            } else if (reorder > 0 && stock <= reorder) {
              stockBadge = { text: `Low (${stock})`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
            }

            return (
              <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex flex-col gap-1">
                <div className="w-full h-16 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {primaryImage ? (
                    <img src={primaryImage.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🔧</span>
                  )}
                </div>
                <div className="text-xs font-medium text-gray-900 dark:text-white truncate" title={p.name}>{p.name}</div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(price)}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${stockBadge.cls}`}>{stockBadge.text}</span>
                </div>
                <button
                  type="button"
                  disabled={outOfStock || alreadyAdded}
                  onClick={() => onAdd(p, variant)}
                  className="mt-1 w-full text-xs py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {alreadyAdded ? 'Added' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs pt-1">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
          >
            ← Prev
          </button>
          <span className="text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
