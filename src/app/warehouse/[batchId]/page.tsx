'use client'

export const dynamic = 'force-dynamic'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'

interface BatchDetail {
  id: string
  batchName: string
  batchNumber: string | null
  importedAt: string
  status: string
  rowCount: number
  totalYuanCost: number | null
  totalUsdCost: number | null
  collectionFee: string | null
  pickedUpFromHarare: boolean
  transportCostHarare: number | null
  transactionFeePct: number | null
  perItemTransport: number
  notes: string | null
  originalFileName: string
}

interface WarehouseItem {
  id: string
  rowNumber: number | null
  orderNumber: string
  trackingNumber: string | null
  additionalTrackingNumbers: string[] | null
  productName: string
  shortName: string | null
  quantity: number | null
  priceYuan: number | null
  costUsd: number | null
  exchangeRate: number | null
  orderDate: string | null
  stage: string | null
  courierName: string | null
  courierStatus: string | null
  imageId: string | null
  isPersonal: boolean
  status: string
  businessProductId: string | null
  personalExpenseId: string | null
  movedAt: string | null
  notes: string | null
}

type FilterTab = 'ALL' | 'IN_WAREHOUSE' | 'PERSONAL' | 'MOVED_TO_BUSINESS' | 'MOVED_TO_PERSONAL'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'IN_WAREHOUSE', label: 'In Warehouse' },
  { key: 'PERSONAL', label: 'Personal' },
  { key: 'MOVED_TO_BUSINESS', label: 'In Business' },
  { key: 'MOVED_TO_PERSONAL', label: 'Moved Personal' },
]

function CourierBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>
  const color = status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
    : status.includes('transit') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  return <span className={`px-1.5 py-0.5 rounded text-xs ${color}`}>{status}</span>
}

function ItemImage({ imageId, name }: { imageId: string | null; name: string }) {
  const [enlarged, setEnlarged] = useState(false)
  if (!imageId) return <div className="w-20 h-20 min-w-[5rem] bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-300 text-xs">—</div>
  return (
    <>
      <img
        src={`/api/images/${imageId}`}
        alt={name}
        className="w-20 h-20 min-w-[5rem] object-cover rounded cursor-zoom-in border border-gray-200 dark:border-gray-600 block"
        onClick={() => setEnlarged(true)}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      {enlarged && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setEnlarged(false)}>
          <img src={`/api/images/${imageId}`} alt={name} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </>
  )
}

interface EditableCellProps {
  value: number | null
  itemId: string
  field: 'costUsd' | 'exchangeRate'
  onSave: (itemId: string, field: string, value: number | null) => Promise<void>
}

function EditableCell({ value, itemId, field, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(value != null ? String(value) : '')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  async function commit() {
    const parsed = draft === '' ? null : parseFloat(draft)
    const next = (parsed === null || isNaN(parsed)) ? null : parsed
    if (next === value) { setEditing(false); return }
    setSaving(true)
    await onSave(itemId, field, next)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.0001"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-20 px-1 py-0.5 border border-blue-400 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
        disabled={saving}
        autoFocus
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      className="cursor-pointer text-xs px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors group"
    >
      {value != null ? (field === 'costUsd' ? `$${Number(value).toFixed(2)}` : Number(value).toFixed(4)) : (
        <span className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400">click to set</span>
      )}
    </span>
  )
}

interface ShortNameCellProps {
  shortName: string | null
  productName: string
  itemId: string
  locked: boolean
  onSave: (itemId: string, field: string, value: string) => Promise<void>
}

function ShortNameCell({ shortName, productName, itemId, locked, onSave }: ShortNameCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    if (locked) return
    setDraft(shortName || '')
    setEditing(true)
  }

  async function commit() {
    if (draft === shortName) { setEditing(false); return }
    setSaving(true)
    await onSave(itemId, 'shortName', draft)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        type="text"
        maxLength={100}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full px-1 py-0.5 border border-blue-400 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
        disabled={saving}
        autoFocus
      />
    )
  }

  return (
    <div className="min-w-[200px] max-w-[300px]">
      <div
        onClick={startEdit}
        className={`font-semibold text-xs truncate mb-0.5 ${locked ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400'}`}
        title={shortName || (locked ? undefined : 'Click to set short name')}
      >
        {shortName || (!locked && <span className="text-gray-400 italic text-xs">click to set short name</span>)}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-3" title={productName}>{productName}</div>
    </div>
  )
}

// Scan mode panel — persistent scan-to-resolve panel
interface ScanResult {
  item: WarehouseItem
  batch: { batchName: string; transportCostHarare: number | null; pickedUpFromHarare: boolean }
}

function ScanPanel({ batchId, onItemResolved }: { batchId: string; onItemResolved: () => void }) {
  const toast = useToastContext()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [resolving, setResolving] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [barcode, setBarcode] = useState('')
  const [moving, setMoving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function resolve(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setResolving(true)
    setResult(null)
    try {
      const res = await fetch(`/api/warehouse/items/resolve?q=${encodeURIComponent(trimmed)}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Item not found')
      } else {
        setResult(data)
      }
    } catch {
      toast.error('Resolve failed')
    } finally {
      setResolving(false)
    }
  }

  async function moveToPersonal() {
    if (!result) return
    setMoving(true)
    try {
      const res = await fetch(`/api/warehouse/${batchId}/move-personal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemIds: [result.item.id] }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Move failed'); return }
      toast.push(`"${result.item.shortName || result.item.orderNumber}" moved to Personal`)
      setResult(null)
      setQuery('')
      onItemResolved()
      inputRef.current?.focus()
    } catch {
      toast.error('Move failed')
    } finally {
      setMoving(false)
    }
  }

  function clear() {
    setResult(null)
    setQuery('')
    setBarcode('')
    inputRef.current?.focus()
  }

  function goToMoveWizard() {
    if (!result) return
    const params = new URLSearchParams({ itemId: result.item.id })
    if (barcode.trim()) params.set('barcode', barcode.trim())
    router.push(`/warehouse/${batchId}/move?${params}`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.24M16.24 12l-1.42-1.41M10 12l1.41-1.41M5.76 12H8m6.24 0l1.42 1.41M8 12l-1.41 1.41" />
        </svg>
        Scan / Lookup
      </h3>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') resolve(query) }}
          placeholder="Scan barcode or type order #, tracking #, name…"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
        <button
          onClick={() => resolve(query)}
          disabled={resolving || !query.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {resolving ? '…' : 'Find'}
        </button>
      </div>

      {result && (
        <div className="border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20 p-3 space-y-2">
          <div className="flex items-start gap-3">
            <ItemImage imageId={result.item.imageId} name={result.item.shortName || result.item.productName} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {result.item.shortName || result.item.productName.slice(0, 60)}
              </div>
              <div className="text-xs text-gray-500 font-mono">{result.item.orderNumber}</div>
              {result.item.trackingNumber && (
                <div className="text-xs text-gray-400 font-mono">{result.item.trackingNumber}</div>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                {result.item.quantity != null && <span>Qty: {result.item.quantity}</span>}
                {result.item.costUsd != null && <span>Cost: ${Number(result.item.costUsd).toFixed(2)}</span>}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Barcode (optional — assigned when moved to business)"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={goToMoveWizard}
                className="flex-1 text-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Move to Business →
              </button>
              <button
                onClick={moveToPersonal}
                disabled={moving}
                className="flex-1 px-3 py-1.5 bg-purple-600 text-white rounded-md text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {moving ? 'Moving…' : 'Personal'}
              </button>
              <button onClick={clear} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BatchDetailPage() {
  const { batchId } = useParams() as { batchId: string }
  const router = useRouter()
  const toast = useToastContext()
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [items, setItems] = useState<WarehouseItem[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>('ALL')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showScanPanel, setShowScanPanel] = useState(false)
  const [personalPanelOpen, setPersonalPanelOpen] = useState(false)
  const [personalItems, setPersonalItems] = useState<WarehouseItem[]>([])
  const [movingAllPersonal, setMovingAllPersonal] = useState(false)

  // Bulk fill state
  const [bulkRate, setBulkRate] = useState('')
  const [bulkCost, setBulkCost] = useState('')
  const [applyingBulk, setApplyingBulk] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => { setPage(1) }, [tab, search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (tab !== 'ALL') params.set('status', tab)
      if (search) params.set('search', search)

      const res = await fetch(`/api/warehouse/${batchId}?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setBatch(data.batch)
        setItems(data.items || [])
        setStatusCounts(data.statusCounts || {})
        setTotalPages(data.pagination?.pages || 1)
        setTotalItems(data.pagination?.total || 0)
      } else {
        toast.error(data.error || 'Failed to load batch')
        if (res.status === 404) router.push('/warehouse')
      }
    } catch {
      toast.error('Failed to load batch')
    } finally {
      setLoading(false)
    }
  }, [batchId, page, tab, search, router])

  useEffect(() => { load() }, [load])

  // Load personal items whenever panel opens or after moves
  const loadPersonalItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/warehouse/${batchId}?status=PERSONAL&limit=200`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setPersonalItems(data.items || [])
    } catch {}
  }, [batchId])

  useEffect(() => {
    if (personalPanelOpen) loadPersonalItems()
  }, [personalPanelOpen, loadPersonalItems])

  async function patchItem(itemId: string, field: string, value: any) {
    try {
      const res = await fetch(`/api/warehouse/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Save failed'); return }
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: data.item[field] } : i))
    } catch {
      toast.error('Save failed')
    }
  }

  async function togglePersonal(item: WarehouseItem) {
    try {
      const res = await fetch(`/api/warehouse/items/${item.id}/flag-personal`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPersonal: !item.isPersonal }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to update'); return }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isPersonal: data.isPersonal } : i))
    } catch {
      toast.error('Failed to update')
    }
  }

  async function moveSelectedToPersonal() {
    const ids = Array.from(selected).filter(id => {
      const item = items.find(i => i.id === id)
      return item?.status === 'IN_WAREHOUSE'
    })
    if (ids.length === 0) { toast.error('No IN_WAREHOUSE items selected'); return }
    if (!confirm(`Move ${ids.length} item(s) to Personal?`)) return

    const res = await fetch(`/api/warehouse/${batchId}/move-personal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ itemIds: ids }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Move failed'); return }
    toast.push(`${data.movedCount} item(s) moved to Personal`)
    setSelected(new Set())
    load()
  }

  // Bulk fill: apply rate or cost to selected rows that currently have null value
  async function applyBulkFill(field: 'costUsd' | 'exchangeRate', rawValue: string) {
    const val = parseFloat(rawValue)
    if (!rawValue || isNaN(val)) { toast.error(`Enter a valid ${field === 'costUsd' ? 'cost' : 'rate'}`); return }

    const targetIds = selected.size > 0
      ? Array.from(selected).filter(id => {
          const item = items.find(i => i.id === id)
          return item?.status === 'IN_WAREHOUSE' && item[field] == null
        })
      : items.filter(i => i.status === 'IN_WAREHOUSE' && i[field] == null).map(i => i.id)

    if (targetIds.length === 0) {
      toast.error(`No eligible empty rows found (${selected.size > 0 ? 'from selection' : 'all visible'})`)
      return
    }

    if (!confirm(`Apply ${field === 'costUsd' ? `$${val}` : val} to ${targetIds.length} empty row(s)?`)) return

    setApplyingBulk(true)
    let successCount = 0
    for (const id of targetIds) {
      try {
        const res = await fetch(`/api/warehouse/items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ [field]: val }),
        })
        if (res.ok) {
          successCount++
          setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i))
        }
      } catch {}
    }
    setApplyingBulk(false)
    toast.push(`Applied ${field === 'costUsd' ? `$${val}` : val} to ${successCount} item(s)`)
  }

  // Bulk flag: mark selected IN_WAREHOUSE items as personal/business
  async function bulkFlagPersonal(isPersonal: boolean) {
    const ids = Array.from(selected).filter(id => {
      const item = items.find(i => i.id === id)
      return item?.status === 'IN_WAREHOUSE' && item.isPersonal !== isPersonal
    })
    if (ids.length === 0) { toast.error('No eligible items in selection'); return }

    setApplyingBulk(true)
    let successCount = 0
    for (const id of ids) {
      try {
        const res = await fetch(`/api/warehouse/items/${id}/flag-personal`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isPersonal }),
        })
        if (res.ok) {
          successCount++
          setItems(prev => prev.map(i => i.id === id ? { ...i, isPersonal } : i))
        }
      } catch {}
    }
    setApplyingBulk(false)
    toast.push(`Flagged ${successCount} item(s) as ${isPersonal ? 'Personal' : 'Business'}`)
  }

  async function moveAllPersonalItems() {
    if (personalItems.length === 0) return
    if (!confirm(`Move all ${personalItems.length} personal item(s) to Personal expenses?`)) return
    setMovingAllPersonal(true)
    const ids = personalItems.filter(i => i.status === 'IN_WAREHOUSE').map(i => i.id)
    if (ids.length === 0) { toast.error('No IN_WAREHOUSE personal items to move'); setMovingAllPersonal(false); return }

    const res = await fetch(`/api/warehouse/${batchId}/move-personal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ itemIds: ids }),
    })
    const data = await res.json()
    setMovingAllPersonal(false)
    if (!res.ok) { toast.error(data.error || 'Move failed'); return }
    toast.push(`${data.movedCount} personal item(s) moved`)
    loadPersonalItems()
    load()
  }

  function toggleSelectAll() {
    const ids = items.filter(i => i.status === 'IN_WAREHOUSE').map(i => i.id)
    const allSelected = ids.length > 0 && ids.every(id => selected.has(id))
    setSelected(allSelected ? new Set() : new Set(ids))
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalMoved = (statusCounts['MOVED_TO_BUSINESS'] || 0) + (statusCounts['MOVED_TO_PERSONAL'] || 0)
  const progress = batch ? Math.round((totalMoved / Math.max(batch.rowCount, 1)) * 100) : 0
  const perItemTransport = batch?.perItemTransport ?? 0
  const selectableItems = items.filter(i => i.status === 'IN_WAREHOUSE')
  const allSelectableSelected = selectableItems.length > 0 && selectableItems.every(i => selected.has(i.id))

  if (!batch && loading) {
    return (
      <ProtectedRoute>
        <ContentLayout title="Loading…">
          <div className="p-8 text-center text-gray-500">Loading batch…</div>
        </ContentLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <ContentLayout title={batch?.batchName || 'Batch Detail'}>
        <div className="space-y-4">
          {/* Back */}
          <Link href="/warehouse" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Warehouse
          </Link>

          {batch && (
            <>
              {/* Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{batch.batchName}</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Imported {new Date(batch.importedAt).toLocaleString()} · {batch.rowCount} items · {batch.originalFileName}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap text-sm">
                    {batch.totalUsdCost != null && (
                      <div>
                        <span className="text-gray-500">Total USD</span>
                        <span className="ml-2 font-bold text-gray-900 dark:text-white">${Number(batch.totalUsdCost).toFixed(2)}</span>
                      </div>
                    )}
                    {batch.totalYuanCost != null && (
                      <div>
                        <span className="text-gray-500">Total ¥</span>
                        <span className="ml-2 font-bold text-gray-900 dark:text-white">¥{Number(batch.totalYuanCost).toFixed(2)}</span>
                      </div>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${batch.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {batch.status}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{totalMoved} of {batch.rowCount} items dispatched</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              {/* Cost adjustments banner */}
              {(batch.pickedUpFromHarare && batch.transportCostHarare != null) || batch.transactionFeePct != null ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm flex flex-wrap gap-4">
                  {batch.pickedUpFromHarare && batch.transportCostHarare != null && (
                    <span>
                      <span className="font-medium text-amber-800 dark:text-amber-300">Transport: </span>
                      <span className="text-amber-700 dark:text-amber-400">
                        ${Number(batch.transportCostHarare).toFixed(2)} ÷ {statusCounts['IN_WAREHOUSE'] || 0} items
                        {perItemTransport > 0 && <> = <strong>${perItemTransport.toFixed(2)}/item</strong></>}
                      </span>
                    </span>
                  )}
                  {batch.transactionFeePct != null && (
                    <span>
                      <span className="font-medium text-amber-800 dark:text-amber-300">Transaction fee: </span>
                      <span className="text-amber-700 dark:text-amber-400"><strong>{Number(batch.transactionFeePct).toFixed(1)}%</strong> of each item&apos;s cost</span>
                    </span>
                  )}
                </div>
              ) : null}
            </>
          )}

          {/* Scan panel */}
          <div>
            <button
              onClick={() => setShowScanPanel(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showScanPanel ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.24M16.24 12l-1.42-1.41M10 12l1.41-1.41M5.76 12H8" />
              </svg>
              {showScanPanel ? 'Hide Scan Panel' : 'Scan / Lookup'}
            </button>
            {showScanPanel && (
              <div className="mt-2">
                <ScanPanel batchId={batchId} onItemResolved={() => { load(); loadPersonalItems() }} />
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search product, order #, tracking…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setSearch('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {batch && (() => {
              const eligibleSelected = items.filter(i => selected.has(i.id) && !i.isPersonal && i.status === 'IN_WAREHOUSE')
              const missingCost = eligibleSelected.some(i => i.costUsd == null)
              const disabled = eligibleSelected.length === 0 || missingCost
              const title = eligibleSelected.length === 0
                ? 'Select at least one non-personal item'
                : missingCost ? 'All selected items must have a cost price set' : undefined
              return (
                <button
                  onClick={() => {
                    const ids = eligibleSelected.map(i => i.id).join(',')
                    router.push(`/warehouse/${batchId}/move?ids=${encodeURIComponent(ids)}`)
                  }}
                  disabled={disabled}
                  title={title}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Move to Business{eligibleSelected.length > 0 ? ` (${eligibleSelected.length})` : ''}
                </button>
              )
            })()}
          </div>

          {/* Bulk fill toolbar — shown when items are selected */}
          {selected.size > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap text-sm">
              <span className="font-medium text-blue-800 dark:text-blue-300">{selected.size} selected</span>

              {/* Bulk rate */}
              <div className="flex items-center gap-2">
                <span className="text-blue-700 dark:text-blue-400 text-xs">Rate:</span>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 7.2"
                  value={bulkRate}
                  onChange={e => setBulkRate(e.target.value)}
                  className="w-24 px-2 py-1 border border-blue-300 dark:border-blue-700 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => applyBulkFill('exchangeRate', bulkRate)}
                  disabled={applyingBulk}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Apply to empty
                </button>
              </div>

              {/* Bulk cost */}
              <div className="flex items-center gap-2">
                <span className="text-blue-700 dark:text-blue-400 text-xs">Cost $:</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 12.50"
                  value={bulkCost}
                  onChange={e => setBulkCost(e.target.value)}
                  className="w-24 px-2 py-1 border border-blue-300 dark:border-blue-700 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => applyBulkFill('costUsd', bulkCost)}
                  disabled={applyingBulk}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Apply to empty
                </button>
              </div>

              {/* Bulk flag */}
              <div className="flex items-center gap-2 border-l border-blue-200 dark:border-blue-700 pl-4">
                <button
                  onClick={() => bulkFlagPersonal(true)}
                  disabled={applyingBulk}
                  className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  Flag Personal
                </button>
                <button
                  onClick={() => bulkFlagPersonal(false)}
                  disabled={applyingBulk}
                  className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 disabled:opacity-50"
                >
                  Flag Business
                </button>
                <button
                  onClick={moveSelectedToPersonal}
                  disabled={applyingBulk}
                  className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  Move to Personal
                </button>
              </div>

              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Bulk rate/cost fill for all visible (when nothing selected) */}
          {selected.size === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 flex items-center gap-4 flex-wrap text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Apply to all empty visible rows:</span>
              <div className="flex items-center gap-2">
                <span>Rate:</span>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 7.2"
                  value={bulkRate}
                  onChange={e => setBulkRate(e.target.value)}
                  className="w-20 px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => applyBulkFill('exchangeRate', bulkRate)}
                  disabled={applyingBulk}
                  className="px-2 py-0.5 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span>Cost $:</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 12.50"
                  value={bulkCost}
                  onChange={e => setBulkCost(e.target.value)}
                  className="w-20 px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => applyBulkFill('costUsd', bulkCost)}
                  disabled={applyingBulk}
                  className="px-2 py-0.5 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
            {TABS.map(t => {
              const count = t.key === 'ALL'
                ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
                : statusCounts[t.key] || 0
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.key
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t.label} {count > 0 && <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 rounded-full">{count}</span>}
                </button>
              )
            })}
          </div>

          {/* Items table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading items…</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No items match the current filter.</div>
            ) : (
              <>
                <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 28rem)', minHeight: '16rem' }}>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <th className="px-3 py-3 w-8">
                          <input
                            type="checkbox"
                            checked={allSelectableSelected}
                            onChange={toggleSelectAll}
                            className="rounded"
                          />
                        </th>
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider w-24">Img</th>
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider min-w-[240px]">Short Name / Product</th>
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider">Order #</th>
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider">¥ Price</th>
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider">Cost $</th>
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider">Rate</th>
                        {perItemTransport > 0 && (
                          <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider">Est. Sell</th>
                        )}
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider">Courier</th>
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider">Personal</th>
                        <th className="px-3 py-3 text-left text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {items.map(item => {
                        const costUsd = item.costUsd != null ? Number(item.costUsd) : null
                        const itemQty = item.quantity || 1
                        const costUsdPerUnit = costUsd != null ? costUsd / itemQty : null
                        const txFee = costUsdPerUnit != null && batch.transactionFeePct != null ? costUsdPerUnit * (Number(batch.transactionFeePct) / 100) : 0
                        const costPrice = costUsdPerUnit != null ? costUsdPerUnit + txFee + perItemTransport / itemQty : null
                        const calcSell = costPrice != null ? costPrice * 1.3 : null
                        const isLocked = item.status === 'MOVED_TO_BUSINESS' || item.status === 'MOVED_TO_PERSONAL'

                        return (
                          <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isLocked ? 'opacity-70' : ''} ${item.isPersonal && !isLocked ? 'bg-purple-50 dark:bg-purple-900/20' : ''} ${selected.has(item.id) ? 'bg-blue-100 dark:bg-blue-900' : ''}`}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selected.has(item.id)}
                                disabled={isLocked}
                                onChange={() => toggleSelect(item.id)}
                                className="rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-2 py-2 align-top w-24 min-w-[5rem]">
                              <ItemImage imageId={item.imageId} name={item.shortName || item.productName} />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <ShortNameCell
                                shortName={item.shortName}
                                productName={item.productName}
                                itemId={item.id}
                                locked={isLocked}
                                onSave={patchItem}
                              />
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400 max-w-[140px] truncate" title={item.orderNumber}>
                              {item.orderNumber}
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-white text-center">
                              {item.quantity ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              {item.priceYuan != null ? `¥${Number(item.priceYuan).toFixed(2)}` : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {item.status === 'IN_WAREHOUSE' ? (
                                <EditableCell value={costUsd} itemId={item.id} field="costUsd" onSave={patchItem} />
                              ) : (
                                <span className="text-gray-600 dark:text-gray-400">{costUsd != null ? `$${costUsd.toFixed(2)}` : '—'}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {item.status === 'IN_WAREHOUSE' ? (
                                <EditableCell value={item.exchangeRate != null ? Number(item.exchangeRate) : null} itemId={item.id} field="exchangeRate" onSave={patchItem} />
                              ) : (
                                <span className="text-gray-600 dark:text-gray-400">{item.exchangeRate != null ? Number(item.exchangeRate).toFixed(4) : '—'}</span>
                              )}
                            </td>
                            {perItemTransport > 0 && (
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                {calcSell != null ? (
                                  <span className="text-green-600 dark:text-green-400 font-medium">${calcSell.toFixed(2)}</span>
                                ) : '—'}
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <CourierBadge status={item.courierStatus} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              {item.status === 'IN_WAREHOUSE' ? (
                                <button
                                  onClick={() => togglePersonal(item)}
                                  title={item.isPersonal ? 'Personal — click to unmark' : 'Business — click to mark personal'}
                                  className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${item.isPersonal ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                  <span className={`block w-3 h-3 rounded-full bg-white transition-transform ${item.isPersonal ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                              ) : (
                                item.isPersonal ? <span className="text-purple-500 font-medium">P</span> : <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {isLocked && (
                                  <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  item.status === 'IN_WAREHOUSE' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : item.status === 'MOVED_TO_BUSINESS' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                }`}>
                                  {item.status === 'IN_WAREHOUSE' ? 'Warehouse'
                                    : item.status === 'MOVED_TO_BUSINESS' ? 'Business'
                                    : 'Personal'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
                    <span>Showing {items.length} of {totalItems}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40">Prev</button>
                      <span>{page} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40">Next</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Personal items collapsible panel */}
          {(statusCounts['PERSONAL'] || 0) > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setPersonalPanelOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
              >
                <span>Personal Items ({statusCounts['PERSONAL']} flagged)</span>
                <svg className={`w-4 h-4 transition-transform ${personalPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {personalPanelOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-700 dark:text-purple-400">
                      {personalItems.filter(i => i.status === 'IN_WAREHOUSE').length} of {personalItems.length} still in warehouse (not yet moved)
                    </span>
                    {personalItems.filter(i => i.status === 'IN_WAREHOUSE').length > 0 && (
                      <button
                        onClick={moveAllPersonalItems}
                        disabled={movingAllPersonal}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                      >
                        {movingAllPersonal ? 'Moving…' : `Move all ${personalItems.filter(i => i.status === 'IN_WAREHOUSE').length} to Personal`}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {personalItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 py-1.5 text-xs">
                        <ItemImage imageId={item.imageId} name={item.shortName || item.productName} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {item.shortName || item.productName.slice(0, 60)}
                          </div>
                          <div className="text-gray-500 font-mono">{item.orderNumber}</div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          item.status === 'IN_WAREHOUSE' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {item.status === 'IN_WAREHOUSE' ? 'Flagged' : 'Moved'}
                        </span>
                        {item.costUsd != null && (
                          <span className="text-gray-600 dark:text-gray-400">${Number(item.costUsd).toFixed(2)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}
