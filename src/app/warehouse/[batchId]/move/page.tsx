'use client'

export const dynamic = 'force-dynamic'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'
import { PricingCalculator } from '@/components/inventory/pricing-calculator'

interface BatchInfo {
  id: string
  batchName: string
  pickedUpFromHarare: boolean
  transportCostHarare: number | null
  perItemTransport: number
}

interface WarehouseItem {
  id: string
  orderNumber: string
  productName: string
  shortName: string | null
  quantity: number | null
  costUsd: number | null
  imageId: string | null
  isPersonal: boolean
  status: string
}

interface Business {
  businessId: string
  businessName: string
  businessType: string
}

interface Category {
  id: string
  name: string
}

interface MoveRow {
  item: WarehouseItem
  selected: boolean
  sellingPrice: string
  barcode: string
}

function computeCategorySuggestions(items: WarehouseItem[], cats: Category[]): Category[] {
  if (cats.length === 0 || items.length === 0) return []
  const allWords = items.flatMap(item =>
    (item.shortName || item.productName).toLowerCase().split(/\W+/).filter(w => w.length > 2)
  )
  const wordFreq = new Map<string, number>()
  for (const w of allWords) wordFreq.set(w, (wordFreq.get(w) || 0) + 1)
  const scored = cats.map(cat => {
    const catWords = cat.name.toLowerCase().split(/\W+/).filter(w => w.length > 2)
    const score = catWords.reduce((sum, w) => sum + (wordFreq.get(w) || 0), 0)
    return { cat, score }
  })
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.cat)
}

const SESSION_BIZ_KEY = 'wh-move-businessId'
const SESSION_MARKUP_KEY = 'wh-move-markupPct'

export default function MoveWizardPage() {
  const { batchId } = useParams() as { batchId: string }
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToastContext()

  // URL params from scan panel (single-item pre-select + barcode)
  const scanItemId = searchParams.get('itemId')
  const scanBarcode = searchParams.get('barcode')

  const [batch, setBatch] = useState<BatchInfo | null>(null)
  const [allItems, setAllItems] = useState<WarehouseItem[]>([])
  const [rows, setRows] = useState<MoveRow[]>([])
  const [loading, setLoading] = useState(true)

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState(() =>
    typeof window !== 'undefined' ? (sessionStorage.getItem(SESSION_BIZ_KEY) || '') : ''
  )
  const [selectedBusinessType, setSelectedBusinessType] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [suggestedCategories, setSuggestedCategories] = useState<Category[]>([])
  const [markupPct, setMarkupPct] = useState(() =>
    typeof window !== 'undefined' ? (sessionStorage.getItem(SESSION_MARKUP_KEY) || '30') : '30'
  )
  const [moving, setMoving] = useState(false)
  const [openCalcIdx, setOpenCalcIdx] = useState<number | null>(null)

  // Load batch + items
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/warehouse/${batchId}?limit=200&status=IN_WAREHOUSE`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to load batch'); return }
      setBatch(data.batch)
      const eligible: WarehouseItem[] = (data.items || []).filter((i: WarehouseItem) => !i.isPersonal)
      setAllItems(eligible)
    } catch {
      toast.error('Failed to load batch')
    } finally {
      setLoading(false)
    }
  }, [batchId])

  // Load user businesses
  useEffect(() => {
    fetch('/api/user/business-memberships', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const list: Business[] = (data.memberships || data || []).map((m: any) => ({
          businessId: m.businessId || m.id,
          businessName: m.businessName || m.name,
          businessType: m.businessType || m.type,
        }))
        setBusinesses(list)
        // Restore selectedBusinessType for the sessionStorage-restored businessId
        if (selectedBusinessId) {
          const saved = list.find((b: Business) => b.businessId === selectedBusinessId)
          if (saved) setSelectedBusinessType(saved.businessType)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  // Load categories when business changes
  useEffect(() => {
    if (!selectedBusinessId || !selectedBusinessType) { setCategories([]); setSuggestedCategories([]); return }
    fetch(`/api/universal/categories?businessId=${selectedBusinessId}&businessType=${selectedBusinessType}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const cats: Category[] = data.categories || data?.data || data || []
        setCategories(cats)
        setSelectedCategoryId('')
        setSuggestedCategories(computeCategorySuggestions(allItems, cats))
      })
      .catch(() => {})
  }, [selectedBusinessId, selectedBusinessType, allItems])

  // Build rows when items or markup changes
  useEffect(() => {
    const markup = parseFloat(markupPct) / 100 || 0.3
    setRows(allItems.map(item => {
      const cost = item.costUsd != null ? Number(item.costUsd) + (batch?.perItemTransport || 0) : 0
      const sell = cost > 0 ? (cost * (1 + markup)).toFixed(2) : ''
      const selected = scanItemId ? item.id === scanItemId : true
      const barcode = (scanItemId && item.id === scanItemId && scanBarcode) ? scanBarcode : ''
      return { item, selected, sellingPrice: sell, barcode }
    }))
  }, [allItems, markupPct, batch, scanItemId, scanBarcode])

  function handleBusinessChange(bizId: string) {
    const biz = businesses.find(b => b.businessId === bizId)
    setSelectedBusinessId(bizId)
    setSelectedBusinessType(biz?.businessType || '')
    sessionStorage.setItem(SESSION_BIZ_KEY, bizId)
  }

  function updateRow(idx: number, patch: Partial<MoveRow>) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function recalcAll() {
    const markup = parseFloat(markupPct) / 100 || 0.3
    sessionStorage.setItem(SESSION_MARKUP_KEY, markupPct)
    setRows(prev => prev.map(r => {
      const cost = r.item.costUsd != null ? Number(r.item.costUsd) + (batch?.perItemTransport || 0) : 0
      const sell = cost > 0 ? (cost * (1 + markup)).toFixed(2) : r.sellingPrice
      return { ...r, sellingPrice: sell }
    }))
  }

  const selectedRows = rows.filter(r => r.selected)
  const missingPrice = selectedRows.some(r => !r.sellingPrice || parseFloat(r.sellingPrice) <= 0)

  async function handleMove() {
    if (!selectedBusinessId) { toast.error('Select a target business'); return }
    if (!selectedCategoryId) { toast.error('Select a category'); return }
    if (selectedRows.length === 0) { toast.error('Select at least one item'); return }
    if (missingPrice) { toast.error('All selected items need a selling price > 0'); return }

    const items = selectedRows.map(r => ({
      itemId: r.item.id,
      sellingPrice: parseFloat(r.sellingPrice),
      barcode: r.barcode || undefined,
    }))

    setMoving(true)
    try {
      const res = await fetch(`/api/warehouse/${batchId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: selectedBusinessId,
          businessType: selectedBusinessType,
          categoryId: selectedCategoryId,
          items,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Move failed'); return }
      toast.push(`${data.movedCount} item(s) moved to business inventory`)
      router.push(`/warehouse/${batchId}`)
    } catch {
      toast.error('Move failed')
    } finally {
      setMoving(false)
    }
  }

  const perItemTransport = batch?.perItemTransport || 0

  return (
    <ProtectedRoute>
      <ContentLayout title="Move to Business">
        <div className="space-y-6">
          {/* Back */}
          <Link href={`/warehouse/${batchId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {batch?.batchName || 'Batch'}
          </Link>

          <div className="flex items-start gap-4 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">Move to Business Inventory</h1>
          </div>

          {/* Settings panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Target Business *</label>
                <select
                  value={selectedBusinessId}
                  onChange={e => handleBusinessChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select business…</option>
                  {businesses.map(b => (
                    <option key={b.businessId} value={b.businessId}>{b.businessName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category *</label>
                <select
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                  disabled={!selectedBusinessId || categories.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Select category…</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {suggestedCategories.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-[10px] text-gray-400 self-center">Suggested:</span>
                    {suggestedCategories.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(c.id)}
                        className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                          selectedCategoryId === c.id
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Markup %</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={markupPct}
                    onChange={e => setMarkupPct(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={recalcAll}
                    className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
              {perItemTransport > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Transport / item</label>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400 pt-2">${perItemTransport.toFixed(2)}</p>
                </div>
              )}
            </div>

          </div>

          {/* Items table */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading items…</div>
          ) : allItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No eligible IN_WAREHOUSE items (non-personal) found.</div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedRows.length} of {rows.length} items selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: true })))}
                    className="text-xs text-blue-600 hover:underline"
                  >Select all</button>
                  <span className="text-gray-300">·</span>
                  <button
                    onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: false })))}
                    className="text-xs text-blue-600 hover:underline"
                  >Deselect all</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Order #</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Cost USD</th>
                      {perItemTransport > 0 && <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">+ Transport</th>}
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Cost Price</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Sell Price *</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Barcode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map((row, idx) => {
                      const costUsd = row.item.costUsd != null ? Number(row.item.costUsd) : 0
                      const costPrice = costUsd + perItemTransport
                      return (
                        <React.Fragment key={row.item.id}>
                        <tr className={`${!row.selected ? 'opacity-40' : ''} hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors`}>
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={row.selected} onChange={e => updateRow(idx, { selected: e.target.checked })} className="rounded" />
                          </td>
                          <td className="px-3 py-2 max-w-[160px]">
                            <div className="font-medium text-gray-900 dark:text-white truncate" title={row.item.shortName || row.item.productName}>
                              {row.item.shortName || row.item.productName.slice(0, 40)}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-500 max-w-[120px] truncate">{row.item.orderNumber}</td>
                          <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{row.item.quantity ?? 1}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            {row.item.costUsd != null ? `$${costUsd.toFixed(2)}` : <span className="text-red-500">missing</span>}
                          </td>
                          {perItemTransport > 0 && (
                            <td className="px-3 py-2 text-amber-600 dark:text-amber-400">+${perItemTransport.toFixed(2)}</td>
                          )}
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                            ${costPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 min-w-[90px]">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.sellingPrice}
                              onChange={e => updateRow(idx, { sellingPrice: e.target.value })}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 block"
                            />
                            <button
                              type="button"
                              onClick={() => setOpenCalcIdx(openCalcIdx === idx ? null : idx)}
                              className={`mt-1 px-2 py-0.5 rounded text-xs font-medium transition-colors border w-20 ${openCalcIdx === idx ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-600' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'}`}
                            >💡 Calc</button>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              placeholder="optional"
                              value={row.barcode}
                              onChange={e => updateRow(idx, { barcode: e.target.value })}
                              className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                        {openCalcIdx === idx && (
                          <tr className="bg-blue-50/60 dark:bg-blue-900/10">
                            <td colSpan={perItemTransport > 0 ? 9 : 8} className="px-6 py-3">
                              {row.item.costUsd != null ? (
                                <PricingCalculator
                                  costPrice={Number(row.item.costUsd)}
                                  sellingPrice={row.sellingPrice}
                                  onSelectPrice={price => updateRow(idx, { sellingPrice: String(price) })}
                                  transportEnabled={perItemTransport > 0}
                                  transportDistanceKm={null}
                                  transportCostPerKm={null}
                                  transportPerUnitOverride={perItemTransport > 0 ? perItemTransport : null}
                                />
                              ) : (
                                <p className="text-xs text-amber-600 dark:text-amber-400">Set a cost price (Cost $) for this item to use the calculator.</p>
                              )}
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-end gap-4">
            <Link href={`/warehouse/${batchId}`} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Cancel
            </Link>
            <button
              onClick={handleMove}
              disabled={moving || selectedRows.length === 0 || !selectedBusinessId || !selectedCategoryId}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {moving ? 'Moving…' : `Move ${selectedRows.length} Item${selectedRows.length !== 1 ? 's' : ''} to Business`}
            </button>
          </div>
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}
