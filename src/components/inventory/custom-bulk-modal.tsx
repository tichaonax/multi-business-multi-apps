'use client'

import { useState, useEffect, useRef } from 'react'
import { randomBytes } from 'crypto'
import { SearchableSelect } from '@/components/ui/searchable-select'

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
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedBatch, setSavedBatch] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Load categories flat list
    fetch(`/api/universal/categories?businessId=${businessId}&businessType=${businessType}`)
      .then(r => r.json())
      .then(d => {
        const list: Category[] = Array.isArray(d) ? d : (d.data ?? d.categories ?? [])
        setCategories(list.sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch(() => {})

    // Load suppliers
    fetch(`/api/business/${businessId}/suppliers?isActive=true&limit=100`)
      .then(r => r.json())
      .then(d => setSuppliers(Array.isArray(d) ? d : (d.data ?? d.suppliers ?? [])))
      .catch(() => {})
  }, [businessId, businessType])

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleGenerateBarcode = () => {
    setForm(f => ({ ...f, barcode: generateScanCode() }))
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
    setError('')
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (savedBatch) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Bulk Product Registered</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Batch: <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{savedBatch}</span></p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Items are now available for sale in POS</p>
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
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">📦 Register Bulk Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

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
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unit Price <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.unitPrice}
                onChange={set('unitPrice')}
                placeholder="0.50"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-0.5">per item sold</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Container Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={set('costPrice')}
                placeholder="25.00"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-0.5">whole box cost</p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
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
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Supplier</label>
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
        </div>

        {/* Footer */}
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
      </div>
    </div>
  )
}
