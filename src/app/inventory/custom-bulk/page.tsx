'use client'

import { useState, useEffect, useCallback } from 'react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useConfirm } from '@/components/ui/confirm-modal'
import { BulkPrintModal, ProductData } from '@/components/clothing/bulk-print-modal'

interface BulkProduct {
  id: string
  name: string
  batchNumber: string
  barcode: string
  sku: string
  itemCount: number
  remainingCount: number
  unitPrice: string
  costPrice: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  category: { id: string; name: string } | null
  supplier: { id: string; name: string } | null
}

interface EditState {
  name: string
  unitPrice: string
  notes: string
}

const LOW_STOCK_THRESHOLD = 5

export default function CustomBulkInventoryPage() {
  const { currentBusiness } = useBusinessPermissionsContext()
  const confirm = useConfirm()
  const businessId = currentBusiness?.businessId
  const businessName = currentBusiness?.businessName ?? ''

  const [products, setProducts] = useState<BulkProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', unitPrice: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [printTarget, setPrintTarget] = useState<ProductData | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/custom-bulk?businessId=${businessId}&includeEmpty=true`)
      const data = await res.json()
      if (data.success) setProducts(data.data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [businessId])

  useEffect(() => { load() }, [load])

  const displayed = products
    .filter(p => showEmpty || p.remainingCount > 0)
    .filter(p => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.batchNumber.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
    })

  const restockCandidates = products.filter(
    p => p.isActive && (p.remainingCount <= 0 || p.remainingCount < LOW_STOCK_THRESHOLD)
  )

  const startEdit = (p: BulkProduct) => {
    setEditingId(p.id)
    setSaveError('')
    setEditState({
      name: p.name,
      unitPrice: String(p.unitPrice),
      notes: p.notes ?? '',
    })
  }

  const cancelEdit = () => { setEditingId(null); setSaveError('') }

  const saveEdit = async (id: string) => {
    setSaveError('')
    const product = products.find(p => p.id === id)
    if (product && product.costPrice && Number(product.costPrice) > 0) {
      const costPerItem = Number(product.costPrice) / product.itemCount
      const sellingPrice = Number(editState.unitPrice)
      if (sellingPrice < costPerItem) {
        const ok = await confirm({
          title: '⚠️ Selling Below Cost',
          description: (
            <div className="space-y-2">
              <p>You are setting a selling price that is <strong>below the cost per item</strong>:</p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Cost per item:</span><span className="font-semibold text-red-600 dark:text-red-400">${costPerItem.toFixed(4).replace(/\.?0+$/, '')}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">New selling price:</span><span className="font-semibold text-red-600 dark:text-red-400">${sellingPrice.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-red-200 dark:border-red-800 pt-1"><span className="text-gray-600 dark:text-gray-400">Loss per item:</span><span className="font-bold text-red-700 dark:text-red-300">-${(costPerItem - sellingPrice).toFixed(2)}</span></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Do you want to continue and sell at a loss?</p>
            </div>
          ),
          confirmText: 'Yes, sell at a loss',
          cancelText: 'Go back',
        })
        if (!ok) return
      }
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/custom-bulk/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editState.name,
          unitPrice: editState.unitPrice,
          notes: editState.notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setSaveError(data.error ?? 'Save failed'); return }
      setProducts(prev => prev.map(p => p.id === id ? data.data : p))
      setEditingId(null)
    } catch { setSaveError('Network error') }
    finally { setSaving(false) }
  }

  const deactivate = async (id: string) => {
    const ok = await confirm({ title: 'Deactivate bulk product?', description: 'This will mark the product as inactive. Stock history is preserved.', confirmText: 'Deactivate', cancelText: 'Cancel' })
    if (!ok) return
    try {
      const res = await fetch(`/api/custom-bulk/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      const data = await res.json()
      if (data.success) setProducts(prev => prev.map(p => p.id === id ? data.data : p))
    } catch { /* silent */ }
  }

  const formatPrice = (v: string | number) => `$${Number(v).toFixed(2)}`
  const pct = (remaining: number, total: number) =>
    total > 0 ? Math.round((remaining / total) * 100) : 0

  return (
    <ContentLayout title="Custom Bulk Products">
      <div className="max-w-6xl mx-auto space-y-6 p-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">📦 Custom Bulk Products</h1>
            {businessName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{businessName}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, batch or barcode…"
                className="pl-3 pr-7 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 w-64"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-base leading-none">
                  &times;
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showEmpty}
                onChange={e => setShowEmpty(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show sold-out items
            </label>
          </div>
        </div>

        {/* Restock Candidates */}
        {restockCandidates.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <h2 className="text-sm font-bold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
              ⚠️ Restock Candidates
              <span className="text-xs font-medium bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-200 rounded-full px-2 py-0.5">
                {restockCandidates.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {restockCandidates.map(p => (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700 px-3 py-2.5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.batchNumber}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-400"
                        style={{ width: `${pct(p.remainingCount, p.itemCount)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${p.remainingCount <= 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {p.remainingCount <= 0 ? 'Sold out' : `${p.remainingCount} left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading…</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-4xl mb-3">📦</p>
            {search.trim() ? (
              <>
                <p className="text-sm">No products match &ldquo;{search}&rdquo;</p>
                <button onClick={() => setSearch('')} className="text-xs text-orange-500 hover:underline mt-1">Clear search</button>
              </>
            ) : (
              <>
                <p className="text-sm">No custom bulk products found.</p>
                <p className="text-xs mt-1">Use the <strong>📦 Bulk Product</strong> button in the Bulk Stocking panel to register one.</p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Batch / Barcode</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">Items Left</th>
                    <th className="px-4 py-3 text-right font-medium">Selling Price</th>
                    <th className="px-4 py-3 text-right font-medium">Container Cost</th>
                    <th className="px-4 py-3 text-left font-medium">Added</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {displayed.map(p => (
                    <tr
                      key={p.id}
                      className={`${!p.isActive ? 'opacity-50' : ''} ${p.remainingCount <= 0 ? 'bg-red-50/40 dark:bg-red-900/10' : p.remainingCount < LOW_STOCK_THRESHOLD ? 'bg-orange-50/40 dark:bg-orange-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                    >
                      <td className="px-4 py-3">
                        {editingId === p.id ? (
                          <input
                            value={editState.name}
                            onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-indigo-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                            {p.notes && <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.notes}</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-gray-700 dark:text-gray-300">{p.batchNumber}</p>
                        <p className="font-mono text-xs text-gray-400">{p.barcode}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {p.category?.name ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-bold ${p.remainingCount <= 0 ? 'text-red-600 dark:text-red-400' : p.remainingCount < LOW_STOCK_THRESHOLD ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
                            {p.remainingCount}
                          </span>
                          <span className="text-xs text-gray-400">of {p.itemCount}</span>
                          <div className="w-16 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.remainingCount <= 0 ? 'bg-red-400' : p.remainingCount < LOW_STOCK_THRESHOLD ? 'bg-orange-400' : 'bg-green-400'}`}
                              style={{ width: `${pct(p.remainingCount, p.itemCount)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingId === p.id ? (
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editState.unitPrice}
                            onChange={e => setEditState(s => ({ ...s, unitPrice: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(p.id); if (e.key === 'Escape') cancelEdit() }}
                            className="w-24 px-2 py-1 text-sm text-right border border-indigo-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="text-gray-900 dark:text-white">{formatPrice(p.unitPrice)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {editingId === p.id ? (
                          <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {p.costPrice ? formatPrice(p.costPrice) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </p>
                            {p.costPrice && Number(p.costPrice) > 0 && p.itemCount > 0 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                ${(Number(p.costPrice) / p.itemCount).toFixed(4).replace(/\.?0+$/, '')}/item
                              </p>
                            )}
                          </div>
                        ) : (
                          p.costPrice ? formatPrice(p.costPrice) : <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === p.id ? (
                          <div className="flex flex-col items-center gap-1">
                            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveEdit(p.id)}
                                disabled={saving}
                                className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded font-medium">
                                {saving ? '…' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => startEdit(p)}
                              className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                              Edit
                            </button>
                            {p.barcode && (
                              <button
                                onClick={() => setPrintTarget({ id: p.id, name: p.name, barcodeData: p.barcode, sellingPrice: Number(p.unitPrice), sku: p.sku, batchNumber: p.batchNumber, itemCount: p.itemCount })}
                                className="px-2.5 py-1 text-xs border border-indigo-300 dark:border-indigo-700 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                🖨 Print
                              </button>
                            )}
                            {p.isActive && (
                              <button
                                onClick={() => deactivate(p.id)}
                                className="px-2.5 py-1 text-xs border border-red-300 dark:border-red-700 rounded text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
              {displayed.length} product{displayed.length !== 1 ? 's' : ''} shown
              {!showEmpty && products.filter(p => p.remainingCount <= 0).length > 0 && (
                <span className="ml-2 text-orange-500">
                  · {products.filter(p => p.remainingCount <= 0).length} sold-out hidden (enable toggle to show)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <BulkPrintModal
        isOpen={printTarget !== null}
        onClose={() => setPrintTarget(null)}
        businessId={businessId}
        productData={printTarget ?? undefined}
        compact
      />
    </ContentLayout>
  )
}
