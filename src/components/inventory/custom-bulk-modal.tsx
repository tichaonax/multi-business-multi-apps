'use client'

import { useState, useEffect, useRef } from 'react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import { UniversalSupplierForm } from '@/components/universal/supplier'
import { BulkPrintModal, ProductData } from '@/components/clothing/bulk-print-modal'

interface Category {
  id: string
  name: string
  emoji?: string
}

interface Supplier {
  id: string
  name: string
}

interface CustomBulkModalProps {
  businessId: string
  businessType: string
  onClose: () => void
  onSaved?: () => void
}

interface ExistingBulkProduct {
  id: string
  name: string
  batchNumber: string
  itemCount: number
  remainingCount: number
  unitPrice: string | number
  costPrice?: string | number | null
  barcode: string
  sku: string
  isActive: boolean
}

function generateScanCode() {
  const arr = new Uint8Array(4)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

const emptyForm = {
  name: '',
  barcode: '',
  batchNumber: '',
  itemCount: '',
  unitPrice: '',
  costPrice: '',
  categoryId: '',
  supplierId: '',
  notes: '',
}

export function CustomBulkModal({ businessId, businessType, onClose, onSaved }: CustomBulkModalProps) {
  const confirm = useConfirm()
  const { push: toast, error: toastError } = useToastContext()

  const [tab, setTab] = useState<'register' | 'manage'>('register')
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedBatch, setSavedBatch] = useState('')
  const [printTarget, setPrintTarget] = useState<ProductData | null>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  // Manage tab state
  const [existing, setExisting] = useState<ExistingBulkProduct[]>([])
  const [existingLoading, setExistingLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Manage tab search
  const [manageSearch, setManageSearch] = useState('')

  // Inline price edit state
  const [editPriceId, setEditPriceId] = useState<string | null>(null)
  const [editPriceValue, setEditPriceValue] = useState('')
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null)

  // Inline new category
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatLoading, setNewCatLoading] = useState(false)

  // Inline new supplier
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [creatingSupplier, setCreatingSupplier] = useState(false)

  const loadExisting = () => {
    setExistingLoading(true)
    fetch(`/api/custom-bulk?businessId=${businessId}&includeEmpty=true`)
      .then(r => r.json())
      .then(d => setExisting(Array.isArray(d.data) ? d.data : []))
      .catch(() => {})
      .finally(() => setExistingLoading(false))
  }

  useEffect(() => {
    // Load categories flat list
    fetch(`/api/universal/categories?businessId=${businessId}&businessType=${businessType}`)
      .then(r => r.json())
      .then(d => {
        const raw: Category[] = Array.isArray(d) ? d : (d.data ?? d.categories ?? [])
        // Deduplicate by name (case-insensitive) — business-specific entries appear first
        // so we keep those over global/seed duplicates with the same name
        const seenNames = new Set<string>()
        const list = raw.filter(c => {
          const key = (c.name || '').toLowerCase().trim()
          if (!key || seenNames.has(key)) return false
          seenNames.add(key)
          return true
        })
        setCategories(list.sort((a, b) => (a.name || '').localeCompare(b.name || '')))
      })
      .catch(() => {})

    // Load suppliers
    fetch(`/api/business/${businessId}/suppliers?isActive=true&limit=100`)
      .then(r => r.json())
      .then(d => {
        const raw = Array.isArray(d) ? d : (d.data ?? d.suppliers ?? [])
        setSuppliers(raw.filter((s: Supplier) => s?.id && s?.name))
      })
      .catch(() => {})
  }, [businessId, businessType])

  useEffect(() => {
    if (tab === 'manage') loadExisting()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  // Calculate cost per item (guidance only — does NOT auto-fill selling price)
  const costPerItem = (() => {
    const count = Number(form.itemCount)
    const cost  = Number(form.costPrice)
    if (count > 0 && cost > 0) return (cost / count).toFixed(4).replace(/\.?0+$/, '')
    return null
  })()

  const handleGenerateBarcode = () => {
    setForm(f => ({ ...f, barcode: generateScanCode() }))
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    setNewCatLoading(true)
    try {
      const res = await fetch('/api/universal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, businessType, name: newCatName.trim() }),
      })
      const d = await res.json()
      if (d.success && d.data?.id) {
        const newCat: Category = { id: d.data.id, name: d.data.name, emoji: d.data.emoji }
        setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)))
        setForm(f => ({ ...f, categoryId: d.data.id }))
        setShowNewCat(false)
        setNewCatName('')
      } else {
        toastError(d.error || 'Failed to create category')
      }
    } catch {
      toastError('Failed to create category')
    } finally {
      setNewCatLoading(false)
    }
  }

  const handleNewSupplierSubmit = async (data: any) => {
    setCreatingSupplier(true)
    try {
      const res = await fetch(`/api/business/${businessId}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (res.ok && (json.id || json.supplier?.id)) {
        const newSup: Supplier = { id: json.id || json.supplier?.id, name: data.name }
        setSuppliers(prev => [...prev, newSup])
        setForm(f => ({ ...f, supplierId: newSup.id }))
        setShowNewSupplier(false)
        toast('Supplier added', { type: 'success' })
      } else {
        toastError(json.error || 'Failed to create supplier')
      }
    } catch {
      toastError('Failed to create supplier')
    } finally {
      setCreatingSupplier(false)
    }
  }

  const handleSave = async () => {
    setError('')

    if (!form.name.trim()) { setError('Product name is required'); return }
    if (!form.itemCount || Number(form.itemCount) <= 0) { setError('Item count must be greater than 0'); return }
    if (!form.unitPrice || Number(form.unitPrice) <= 0) { setError('Unit price must be greater than 0'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/custom-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name: form.name.trim(),
          barcode: form.barcode.trim() || undefined,
          batchNumber: form.batchNumber.trim() || undefined,
          itemCount: Number(form.itemCount),
          unitPrice: Number(form.unitPrice),
          costPrice: form.costPrice !== '' ? Number(form.costPrice) : undefined,
          categoryId: form.categoryId || undefined,
          supplierId: form.supplierId || undefined,
          notes: form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to register bulk product')
        return
      }
      setSavedBatch(data.data.batchNumber)
      if (data.data.barcode) {
        const pd: ProductData = {
          id: data.data.id,
          name: data.data.name,
          barcodeData: data.data.barcode,
          sellingPrice: Number(data.data.unitPrice),
          sku: data.data.sku,
          batchNumber: data.data.batchNumber,
          itemCount: data.data.itemCount,
        }
        setPrintTarget(pd)
        setShowPrintModal(true)
      }
      onSaved?.()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterAnother = () => {
    setForm(emptyForm)
    setSavedBatch('')
    setPrintTarget(null)
    setShowPrintModal(false)
    setError('')
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  const handleDelete = async (product: ExistingBulkProduct) => {
    const hasSales = product.remainingCount < product.itemCount
    const ok = await confirm({
      title: hasSales ? 'Deactivate bulk product?' : 'Delete bulk product?',
      description: hasSales
        ? `${product.name} has sales history (${product.itemCount - product.remainingCount} sold). It will be deactivated instead of deleted.`
        : `Permanently delete ${product.name}? This cannot be undone.`,
      confirmText: hasSales ? 'Deactivate' : 'Delete',
      cancelText: 'Cancel',
    })
    if (!ok) return
    setDeletingId(product.id)
    try {
      const res = await fetch(`/api/custom-bulk/${product.id}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        toast(d.message ?? 'Done', { type: 'success' })
        setExisting(prev => prev.filter(p => p.id !== product.id))
        onSaved?.()
      } else {
        toastError(d.error || 'Failed')
      }
    } catch {
      toastError('Failed to delete bulk product')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSavePrice = async (product: ExistingBulkProduct) => {
    const price = Number(editPriceValue)
    if (!editPriceValue || price <= 0) {
      toastError('Selling price must be greater than 0')
      return
    }
    if (product.costPrice && Number(product.costPrice) > 0 && product.itemCount > 0) {
      const costPerItem = Number(product.costPrice) / product.itemCount
      if (price < costPerItem) {
        const ok = await confirm({
          title: '⚠️ Selling Below Cost',
          description: (
            <div className="space-y-2">
              <p>You are setting a selling price that is <strong>below the cost per item</strong>:</p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Cost per item:</span><span className="font-semibold text-red-600 dark:text-red-400">${costPerItem.toFixed(4).replace(/\.?0+$/, '')}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">New selling price:</span><span className="font-semibold text-red-600 dark:text-red-400">${price.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-red-200 dark:border-red-800 pt-1"><span className="text-gray-600 dark:text-gray-400">Loss per item:</span><span className="font-bold text-red-700 dark:text-red-300">-${(costPerItem - price).toFixed(2)}</span></div>
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
    setSavingPriceId(product.id)
    try {
      const res = await fetch(`/api/custom-bulk/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitPrice: price }),
      })
      const d = await res.json()
      if (d.success) {
        setExisting(prev => prev.map(p => p.id === product.id ? { ...p, unitPrice: price } : p))
        setEditPriceId(null)
        setEditPriceValue('')
        toast('Price updated', { type: 'success' })
        onSaved?.()
      } else {
        toastError(d.error || 'Failed to update price')
      }
    } catch {
      toastError('Network error — please try again')
    } finally {
      setSavingPriceId(null)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (savedBatch) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Bulk Product Registered</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Batch: <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{savedBatch}</span></p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Items are now available for sale in POS</p>
          <div className="flex flex-col gap-2">
            {printTarget && (
              <button onClick={() => setShowPrintModal(true)}
                className="w-full px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                🖨 Print Barcode Label
              </button>
            )}
            <div className="flex gap-3">
              <button onClick={handleRegisterAnother}
                className="flex-1 px-4 py-2 text-sm border border-orange-400 rounded-lg text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-medium">
                Register Another
              </button>
              <button onClick={onClose}
                className="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">📦 Bulk Products</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {(['register', 'manage'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t === 'register' ? '+ Register New' : '📋 Manage Existing'}
            </button>
          ))}
        </div>

        {/* Manage tab */}
        {tab === 'manage' && (
          <div className="overflow-y-auto flex-1 px-5 py-4">
            {/* Search */}
            {existing.length > 0 && (
              <div className="mb-3 relative">
                <input
                  type="text"
                  value={manageSearch}
                  onChange={e => setManageSearch(e.target.value)}
                  placeholder="Search by name or batch…"
                  className="w-full px-3 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {manageSearch && (
                  <button
                    onClick={() => setManageSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-base leading-none">
                    &times;
                  </button>
                )}
              </div>
            )}
            {existingLoading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-400 border-t-transparent" /></div>
            ) : existing.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No active bulk products found.</p>
            ) : (
              <div className="space-y-2">
                {existing.filter(p => {
                  if (!manageSearch.trim()) return true
                  const q = manageSearch.toLowerCase()
                  return p.name.toLowerCase().includes(q) || p.batchNumber.toLowerCase().includes(q)
                }).map(p => (
                  <div key={p.id} className="px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{p.batchNumber} · {p.remainingCount}/{p.itemCount} remaining · <span className="font-medium text-gray-700 dark:text-gray-300">${Number(p.unitPrice).toFixed(2)}/item</span></p>
                      </div>
                      <button
                        onClick={() => {
                          setEditPriceId(p.id)
                          setEditPriceValue(Number(p.unitPrice).toFixed(2))
                        }}
                        className="shrink-0 px-2 py-1 text-xs border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20">
                        ✏ Price
                      </button>
                      {p.barcode && (
                        <button
                          onClick={() => {
                            setPrintTarget({
                              id: p.id,
                              name: p.name,
                              barcodeData: p.barcode,
                              sellingPrice: Number(p.unitPrice),
                              sku: p.sku,
                              batchNumber: p.batchNumber,
                              itemCount: p.itemCount,
                            })
                            setShowPrintModal(true)
                          }}
                          className="shrink-0 px-2.5 py-1 text-xs border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                          🖨 Print
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.id}
                        className="shrink-0 px-2.5 py-1 text-xs border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40">
                        {deletingId === p.id ? '…' : p.remainingCount < p.itemCount ? 'Deactivate' : 'Delete'}
                      </button>
                    </div>
                    {/* Inline price edit row */}
                    {editPriceId === p.id && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                        {/* Cost guidance */}
                        {p.costPrice != null && Number(p.costPrice) > 0 && (
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>Container cost: <span className="font-medium text-gray-700 dark:text-gray-300">${Number(p.costPrice).toFixed(2)}</span></span>
                            <span>·</span>
                            <span>Cost/item: <span className="font-medium text-gray-700 dark:text-gray-300">${(Number(p.costPrice) / p.itemCount).toFixed(4).replace(/\.?0+$/, '')}</span></span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400 shrink-0">New price $</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          autoFocus
                          value={editPriceValue}
                          onChange={e => setEditPriceValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSavePrice(p); if (e.key === 'Escape') { setEditPriceId(null); setEditPriceValue('') } }}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <button
                          onClick={() => handleSavePrice(p)}
                          disabled={savingPriceId === p.id}
                          className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-40">
                          {savingPriceId === p.id ? '…' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setEditPriceId(null); setEditPriceValue('') }}
                          className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                          Cancel
                        </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {manageSearch.trim() && existing.filter(p => {
                  const q = manageSearch.toLowerCase()
                  return p.name.toLowerCase().includes(q) || p.batchNumber.toLowerCase().includes(q)
                }).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">No products match &ldquo;{manageSearch}&rdquo;</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Register tab body */}
        {tab === 'register' && <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Product Name <span className="text-red-500">*</span></label>
            <input
              ref={nameRef}
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Box of Mars Bars, Crate of Apples"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Barcode</label>
            <div className="flex gap-2">
              <input
                value={form.barcode}
                onChange={set('barcode')}
                placeholder="Scan or type supplier barcode — leave blank to auto-generate"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap">
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Use the supplier's existing barcode so POS can scan it directly</p>
          </div>

          {/* Count + Prices row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Item Count <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                value={form.itemCount}
                onChange={set('itemCount')}
                placeholder="50"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Container Cost <span className="text-gray-400 font-normal">(guidance)</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={set('costPrice')}
                placeholder="25.00"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                {costPerItem ? <>Cost/item: <span className="font-medium text-gray-500 dark:text-gray-300">${costPerItem}</span></> : 'whole box cost'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Selling Price <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.unitPrice}
                onChange={set('unitPrice')}
                placeholder="e.g. 0.50"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-0.5">price per item sold</p>
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
              <button type="button" onClick={() => { setNewCatName(''); setShowNewCat(true) }}
                className="text-xs text-orange-600 dark:text-orange-400 hover:underline">+ New category</button>
            </div>
            <SearchableSelect
              options={categories}
              value={form.categoryId}
              onChange={v => setForm(f => ({ ...f, categoryId: v }))}
              placeholder="Select category"
              allLabel="No category"
              emptyMessage="No categories found"
            />
          </div>

          {/* Supplier */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Supplier</label>
              <button type="button" onClick={() => setShowNewSupplier(true)}
                className="text-xs text-orange-600 dark:text-orange-400 hover:underline">+ New supplier</button>
            </div>
            <SearchableSelect
              options={suppliers}
              value={form.supplierId}
              onChange={v => setForm(f => ({ ...f, supplierId: v }))}
              placeholder="Select supplier"
              allLabel="No supplier"
              emptyMessage="No suppliers found"
            />
          </div>

          {/* Batch number (optional) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Batch Number <span className="text-gray-400 font-normal">(optional — auto-generated if blank)</span></label>
            <input
              value={form.batchNumber}
              onChange={set('batchNumber')}
              placeholder="CB-260323-001"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              placeholder="e.g. Delivery from Choppies, expires June 2026"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>}

        {/* Footer — only on register tab */}
        {tab === 'register' && (
          <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium">
              {loading ? 'Registering…' : 'Register Bulk Product'}
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Inline modals rendered outside main modal so z-index stacks correctly */}
    {/* New category mini-modal */}
    {showNewCat && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">New Category</h3>
          <input
            autoFocus
            type="text"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory() }}
            placeholder="Category name"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
          />
          <div className="flex gap-3">
            <button onClick={() => setShowNewCat(false)}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button onClick={handleCreateCategory} disabled={newCatLoading || !newCatName.trim()}
              className="flex-1 px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium">
              {newCatLoading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* New supplier modal */}
    {showNewSupplier && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
        <UniversalSupplierForm
          businessId={businessId}
          businessType={businessType as any}
          onSubmit={handleNewSupplierSubmit}
          onCancel={() => setShowNewSupplier(false)}
          loading={creatingSupplier}
        />
      </div>
    )}

    {/* Barcode print modal — wrapped in z-[80] so it renders above the main modal (z-[70]) */}
    {printTarget && (
      <div className="relative z-[80]">
        <BulkPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          businessId={businessId}
          productData={printTarget}
          compact
        />
      </div>
    )}
    </>
  )
}
