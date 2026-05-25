'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import Link from 'next/link'

interface MissingCostItem {
  id: string
  name: string
  sku: string | null
  sellingPrice: number | null
  costPrice: number | null
  stockQuantity: number
  businessId: string
  businessName: string
  businessType: string
  categoryName: string | null
  categoryEmoji: string | null
  updatedAt: string
}

const fmtPrice = (n: number | null) =>
  n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—'

export default function MissingCostPricePage() {
  const { status } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<MissingCostItem[]>([])
  const [byBusiness, setByBusiness] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterBiz, setFilterBiz] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    setLoading(true)
    setError(null)
    fetch('/api/inventory/reports/missing-cost-price', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setItems(d.data.items)
          setByBusiness(d.data.byBusiness)
        } else {
          setError(d.error || 'Failed to load report')
        }
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false))
  }, [status])

  const businesses = useMemo(() => Array.from(new Set(items.map(i => i.businessName))).sort(), [items])

  const filtered = useMemo(() => {
    let result = items
    if (filterBiz) result = result.filter(i => i.businessName === filterBiz)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.sku ?? '').toLowerCase().includes(q) ||
        i.businessName.toLowerCase().includes(q)
      )
    }
    return result
  }, [items, filterBiz, search])

  function exportCsv() {
    const header = 'Business,Item Name,SKU,Selling Price,Stock Qty,Category,Last Updated'
    const rows = filtered.map(i =>
      [i.businessName, i.name, i.sku ?? '', fmtPrice(i.sellingPrice), i.stockQuantity, i.categoryName ?? '', i.updatedAt.slice(0, 10)].join(',')
    )
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `missing-cost-price-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ContentLayout title="Missing Cost Price" subtitle="Inventory items with no cost price set">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <Link href="/inventory" className="text-sm text-secondary hover:text-primary underline">
            ← Inventory
          </Link>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        {/* Summary cards */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4 border-l-4 border-l-red-500">
              <p className="text-xs text-secondary">Total Items Missing Cost</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{items.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 border-l-4 border-l-amber-500">
              <p className="text-xs text-secondary">Businesses Affected</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{Object.keys(byBusiness).length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 border-l-4 border-l-blue-500">
              <p className="text-xs text-secondary">Showing</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{filtered.length}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-3">
          <select
            value={filterBiz}
            onChange={e => setFilterBiz(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-primary"
          >
            <option value="">All businesses</option>
            {businesses.map(b => (
              <option key={b} value={b}>{b} ({byBusiness[b] ?? 0})</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU…"
            className="flex-1 min-w-48 px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-primary"
          />
          {(search || filterBiz) && (
            <button
              onClick={() => { setSearch(''); setFilterBiz('') }}
              className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-secondary hover:text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-secondary text-sm">
            {items.length === 0 ? '✅ All active inventory items have cost prices set.' : 'No items match your filters.'}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-secondary">Business</th>
                    <th className="text-left px-4 py-3 font-medium text-secondary">Item Name</th>
                    <th className="text-left px-4 py-3 font-medium text-secondary hidden sm:table-cell">Category</th>
                    <th className="text-right px-4 py-3 font-medium text-secondary">Selling Price</th>
                    <th className="text-right px-4 py-3 font-medium text-secondary">Stock</th>
                    <th className="text-right px-4 py-3 font-medium text-secondary hidden md:table-cell">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(item => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-secondary text-xs">{item.businessName}</td>
                      <td className="px-4 py-3 font-medium text-primary">
                        {item.name}
                        {item.sku && <span className="ml-2 text-xs text-secondary">{item.sku}</span>}
                      </td>
                      <td className="px-4 py-3 text-secondary text-xs hidden sm:table-cell">
                        {item.categoryEmoji} {item.categoryName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-primary">{fmtPrice(item.sellingPrice)}</td>
                      <td className="px-4 py-3 text-right text-primary">{item.stockQuantity}</td>
                      <td className="px-4 py-3 text-right text-secondary text-xs hidden md:table-cell">
                        {item.updatedAt.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-border text-xs text-secondary">
              Showing {filtered.length} of {items.length} items
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
