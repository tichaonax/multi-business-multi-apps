'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface BaleCategory {
  id: string
  name: string
}

interface BarcodeTemplate {
  id: string
  name: string
  symbology: string
}

interface AddStockPanelProps {
  businessId: string
  onClose: () => void
  /** If true, show "Add to cart" checkbox and dispatch pos:add-to-cart on save */
  isPosRoute?: boolean
  /** Pre-filled barcode (from global barcode modal no-match flow) */
  prefillBarcode?: string
  /** Called after a bale is registered (so caller can refresh bale list) */
  onBaleAdded?: () => void
  /** Called with print params so the parent can open BulkPrintModal instead of window.open */
  onPrintReady?: (params: { baleId?: string; qty: number; templateId?: string }) => void
}

export function AddStockPanel({ businessId, onClose, isPosRoute, prefillBarcode, onBaleAdded, onPrintReady }: AddStockPanelProps) {
  const { data: session } = useSession()
  const [tab, setTab] = useState<'bale' | 'product'>('bale')

  // ── Bale tab state ──────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<BaleCategory[]>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)
  const [baleForm, setBaleForm] = useState({
    categoryId: '', batchNumber: '', itemCount: '', unitPrice: '', costPrice: '', barcode: '', notes: '', labelCount: '',
  })
  const [baleLoading, setBaleLoading] = useState(false)
  const [baleError, setBaleError] = useState('')

  // ── Individual product tab state ────────────────────────────────────────────
  const [templates, setTemplates] = useState<BarcodeTemplate[]>([])
  const [productForm, setProductForm] = useState({
    templateId: '', name: '', barcode: prefillBarcode || '', quantity: '', sku: '', notes: '',
  })
  const [addToCart, setAddToCart] = useState(false)
  const [productLoading, setProductLoading] = useState(false)
  const [productError, setProductError] = useState('')

  useEffect(() => {
    if (!businessId) return
    // Load bale categories
    fetch('/api/clothing/bale-categories')
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data) })
      .catch(() => {})
    // Load barcode templates
    fetch(`/api/universal/barcode-management/templates?businessId=${businessId}&limit=100`)
      .then(r => r.json())
      .then(d => {
        const list: BarcodeTemplate[] = d.templates ?? d.data ?? []
        setTemplates(list)
        if (list.length > 0) setProductForm(f => ({ ...f, templateId: list[0].id }))
      })
      .catch(() => {})
  }, [businessId])

  // Pre-fill barcode when it changes (from no-match flow)
  useEffect(() => {
    if (prefillBarcode) {
      setProductForm(f => ({ ...f, barcode: prefillBarcode }))
      setTab('product')
    }
  }, [prefillBarcode])

  // ── Bale submit ─────────────────────────────────────────────────────────────
  const handleBaleRegisterAndPrint = async () => {
    setBaleError('')
    if (!baleForm.categoryId || !baleForm.itemCount || !baleForm.unitPrice || !baleForm.costPrice) {
      setBaleError('Category, item count, unit price, and bale cost are required')
      return
    }
    setBaleLoading(true)
    try {
      const res = await fetch('/api/clothing/bales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          categoryId: baleForm.categoryId,
          ...(baleForm.batchNumber.trim() ? { batchNumber: baleForm.batchNumber.trim() } : {}),
          itemCount: Number(baleForm.itemCount),
          unitPrice: Number(baleForm.unitPrice),
          costPrice: Number(baleForm.costPrice),
          barcode: baleForm.barcode.trim() || undefined,
          notes: baleForm.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setBaleError(data.error || 'Failed to register bale'); return }

      const baleId = data.data.id
      const qty = Number(baleForm.labelCount) || Number(baleForm.itemCount) || 1

      await fetch('/api/clothing/label-print-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, baleId, quantity: qty, notes: 'initial registration' }),
      })

      onBaleAdded?.()
      onClose()
      onPrintReady?.({ baleId, qty })
    } catch (e: any) {
      setBaleError(e.message || 'Failed to register bale')
    } finally {
      setBaleLoading(false)
    }
  }

  // ── Individual product submit ────────────────────────────────────────────────
  const handleProductAddAndPrint = async () => {
    setProductError('')
    if (!productForm.templateId) { setProductError('Please select a barcode template'); return }
    if (!productForm.name.trim()) { setProductError('Product name is required'); return }
    if (!productForm.quantity || Number(productForm.quantity) < 1) { setProductError('Quantity must be >= 1'); return }
    setProductLoading(true)
    try {
      const res = await fetch('/api/clothing/inventory/add-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          templateId: productForm.templateId,
          name: productForm.name.trim(),
          quantity: Number(productForm.quantity),
          barcode: productForm.barcode.trim() || undefined,
          sku: productForm.sku.trim() || undefined,
          notes: productForm.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setProductError(data.error || 'Failed to add stock'); return }

      const qty = Number(productForm.quantity)

      await fetch('/api/clothing/label-print-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, productId: data.itemId, templateId: productForm.templateId, quantity: qty, notes: 'stock intake' }),
      })

      if (addToCart && isPosRoute) {
        window.dispatchEvent(new CustomEvent('pos:add-to-cart', { detail: { productId: data.itemId } }))
      }

      onClose()
      onPrintReady?.({ qty, templateId: productForm.templateId })
    } catch (e: any) {
      setProductError(e.message || 'Failed to add stock')
    } finally {
      setProductLoading(false)
    }
  }

  const resetBaleForm = () => setBaleForm({ categoryId: '', batchNumber: '', itemCount: '', unitPrice: '', costPrice: '', barcode: '', notes: '', labelCount: '' })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">+ Add Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 m-4 mb-0 p-1 rounded-xl">
          <button
            onClick={() => setTab('bale')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'bale' ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📦 Bale
          </button>
          <button
            onClick={() => setTab('product')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'product' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🏷️ Individual Product
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* ── Bale Tab ── */}
          {tab === 'bale' && (
            <div className="space-y-3">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <div className="relative" ref={categoryRef}>
                  <input
                    type="text"
                    placeholder="Search category..."
                    value={categorySearch}
                    onChange={e => { setCategorySearch(e.target.value); setCategoryDropdownOpen(true) }}
                    onFocus={() => setCategoryDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setCategoryDropdownOpen(false), 150)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  {baleForm.categoryId && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                      ✓ {categories.find(c => c.id === baleForm.categoryId)?.name}
                    </p>
                  )}
                  {categoryDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {categories
                        .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map(c => (
                          <div
                            key={c.id}
                            onMouseDown={() => { setBaleForm(f => ({ ...f, categoryId: c.id })); setCategorySearch(c.name); setCategoryDropdownOpen(false) }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 ${baleForm.categoryId === c.id ? 'font-medium text-purple-700' : ''}`}
                          >
                            {c.name}
                          </div>
                        ))}
                      {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400">No categories found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Count *</label>
                  <input type="number" min="1" value={baleForm.itemCount}
                    onChange={e => setBaleForm(f => ({ ...f, itemCount: e.target.value }))}
                    placeholder="e.g., 150" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Labels to print</label>
                  <input type="number" min="1" value={baleForm.labelCount}
                    onChange={e => setBaleForm(f => ({ ...f, labelCount: e.target.value }))}
                    placeholder={baleForm.itemCount || 'same as count'} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price ($) *</label>
                  <input type="number" min="0.01" step="0.01" value={baleForm.unitPrice}
                    onChange={e => setBaleForm(f => ({ ...f, unitPrice: e.target.value }))}
                    placeholder="e.g., 3.00" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bale Cost ($) *</label>
                  <input type="number" min="0" step="0.01" value={baleForm.costPrice}
                    onChange={e => setBaleForm(f => ({ ...f, costPrice: e.target.value }))}
                    placeholder="Total acquisition cost" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Number</label>
                  <input type="text" value={baleForm.batchNumber}
                    onChange={e => setBaleForm(f => ({ ...f, batchNumber: e.target.value }))}
                    placeholder="Auto-generated" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode (optional)</label>
                  <input type="text" value={baleForm.barcode}
                    onChange={e => setBaleForm(f => ({ ...f, barcode: e.target.value }))}
                    placeholder="Scan or enter" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input type="text" value={baleForm.notes}
                  onChange={e => setBaleForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any notes about this bale" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>

              {baleError && <p className="text-sm text-red-600 dark:text-red-400">{baleError}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={handleBaleRegisterAndPrint} disabled={baleLoading}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {baleLoading ? 'Registering...' : '🖨️ Register & Print'}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Individual Product Tab ── */}
          {tab === 'product' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode Template *</label>
                {templates.length === 0 ? (
                  <p className="text-sm text-red-500">No barcode templates found. Create one in Barcode Management first.</p>
                ) : (
                  <select value={productForm.templateId} onChange={e => setProductForm(f => ({ ...f, templateId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
                <input type="text" value={productForm.name}
                  onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Men's Denim Jacket" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                  <input type="number" min="1" value={productForm.quantity}
                    onChange={e => setProductForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="e.g., 30" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode / Scan Code</label>
                  <input type="text" value={productForm.barcode}
                    onChange={e => setProductForm(f => ({ ...f, barcode: e.target.value }))}
                    placeholder="Scan or auto-generated" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU (optional)</label>
                  <input type="text" value={productForm.sku}
                    onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))}
                    placeholder="Stock keeping unit" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                  <input type="text" value={productForm.notes}
                    onChange={e => setProductForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g., Size M, Red" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
              </div>

              {isPosRoute && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={addToCart} onChange={e => setAddToCart(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Add 1 to cart after saving</span>
                </label>
              )}

              {productError && <p className="text-sm text-red-600 dark:text-red-400">{productError}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={handleProductAddAndPrint} disabled={productLoading || templates.length === 0}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {productLoading ? 'Adding...' : '🖨️ Add to Stock & Print'}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
