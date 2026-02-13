'use client'

import { useState, useEffect } from 'react'
import { Plus, Calendar, Trash2, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { BarcodeScanner } from '@/components/universal'

export interface ManualCartItem {
  id: string
  name: string
  price: number
  quantity: number
  isCustom?: boolean
  productVariantId?: string
}

interface MenuItemLike {
  id: string
  name: string
  price: number
  category?: string
  isAvailable?: boolean
  isCombo?: boolean
  originalPrice?: number | null
  discountPercent?: number | null
  spiceLevel?: number | null
  variants?: Array<{ id: string; name?: string; price?: number }>
  [key: string]: any
}

interface ManualEntryTabProps {
  businessId: string
  businessType: string
  menuItems?: MenuItemLike[]
  categories?: string[]
  getCategoryLabel?: (cat: string) => string
  getCategoryFilter?: (filterName: string) => string
  onAddItem?: (item: ManualCartItem) => void
  manualCartItems?: ManualCartItem[]
}

export function ManualEntryTab({
  businessId,
  businessType,
  menuItems,
  categories,
  getCategoryLabel,
  getCategoryFilter,
  onAddItem,
  manualCartItems,
}: ManualEntryTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)

  // If no menuItems provided, show legacy form (for grocery/clothing POS)
  if (!menuItems || !categories || !onAddItem) {
    return <LegacyManualEntryForm businessId={businessId} businessType={businessType} />
  }

  const labelFn = getCategoryLabel || ((c: string) => c.charAt(0).toUpperCase() + c.slice(1))
  const cartItems = manualCartItems || []

  // Handle barcode scan - match scanned product against menu items and add to cart
  const handleProductScanned = (product: any, variantId?: string) => {
    const matchedItem = menuItems.find(item => item.id === product.id)
    if (matchedItem) {
      const variant = variantId
        ? matchedItem.variants?.find(v => v.id === variantId)
        : matchedItem.variants?.[0]
      onAddItem({
        id: matchedItem.id,
        name: matchedItem.name,
        price: Number(variant?.price || matchedItem.price),
        quantity: 1,
        isCustom: false,
        productVariantId: variant?.id || variantId,
      })
    } else {
      // Product found via barcode but not in menuItems - add directly from scanned data
      onAddItem({
        id: product.id,
        name: product.name,
        price: Number(product.basePrice || product.price || 0),
        quantity: 1,
        isCustom: false,
        productVariantId: variantId || product.variants?.[0]?.id,
      })
    }
  }

  // Filter out WiFi token items (manual entries cannot include WiFi tokens)
  const availableItems = menuItems.filter(item =>
    !item.esp32Token && !item.r710Token
  )

  // Category filter (same logic as live POS)
  const categoryFiltered = selectedCategory === 'all'
    ? availableItems
    : selectedCategory === 'combos'
    ? availableItems.filter(item => item.isCombo === true)
    : availableItems.filter(item => {
        const target = getCategoryFilter ? getCategoryFilter(selectedCategory) : selectedCategory
        return item.category === target
      })

  // Search filter
  const filteredItems = searchTerm.trim()
    ? categoryFiltered.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : categoryFiltered

  // Filter categories to exclude WiFi token tabs
  const filteredCategories = categories.filter(c => c !== 'esp32-wifi' && c !== 'r710-wifi')

  const handleAddMenuItem = (item: MenuItemLike) => {
    const variantId = item.variants?.[0]?.id
    onAddItem({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: 1,
      isCustom: false,
      productVariantId: variantId,
    })
  }

  const handleAddCustomItem = () => {
    if (!customName.trim() || !customPrice) return
    onAddItem({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: customName.trim(),
      price: parseFloat(customPrice),
      quantity: 1,
      isCustom: true,
    })
    setCustomName('')
    setCustomPrice('')
    setShowCustomForm(false)
  }

  const getCartQuantity = (itemId: string) => {
    const found = cartItems.find(c => c.id === itemId)
    return found?.quantity || 0
  }

  return (
    <div className="space-y-3">
      {/* Search + Custom Item Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            🔍
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setShowCustomForm(!showCustomForm)}
          className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg border whitespace-nowrap ${
            showCustomForm
              ? 'bg-orange-600 text-white border-orange-600'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-orange-400'
          }`}
        >
          <Plus className="w-4 h-4" />
          Custom Item
        </button>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner
        onProductScanned={handleProductScanned}
        businessId={businessId}
        showScanner={showBarcodeScanner}
        onToggleScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}
      />

      {/* Custom Item Form */}
      {showCustomForm && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <input
            type="text"
            placeholder="Item name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
          />
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              placeholder="Price"
              min={0}
              step={0.01}
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="w-24 pl-5 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
            />
          </div>
          <button
            onClick={handleAddCustomItem}
            disabled={!customName.trim() || !customPrice}
            className={`px-3 py-1.5 text-sm rounded font-medium ${
              customName.trim() && customPrice
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Add
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {filteredCategories.map(category => (
          <button
            key={category}
            onClick={() => { setSelectedCategory(category); setSearchTerm('') }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-orange-600 text-white'
                : 'card text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {labelFn(category)}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4">
        {filteredItems.map(item => {
          const hasDiscount = item.originalPrice && Number(item.originalPrice) > Number(item.price)
          const isUnavailable = item.isAvailable === false
          const cartQty = getCartQuantity(item.id)

          return (
            <div
              key={item.id}
              onClick={() => !isUnavailable && handleAddMenuItem(item)}
              className={`card bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left min-h-[80px] touch-manipulation relative ${
                isUnavailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {/* Unavailable indicator */}
              {isUnavailable && (
                <div className="absolute top-1 right-1">
                  <span className="text-red-500 text-xs">❌</span>
                </div>
              )}

              {/* Discount indicator */}
              {hasDiscount && !isUnavailable && (
                <div className="absolute top-1 right-1">
                  <span className="bg-red-500 text-white text-xs px-1 rounded">
                    {item.discountPercent ? `-${item.discountPercent}%` : 'SALE'}
                  </span>
                </div>
              )}

              {/* Spice level indicator */}
              {item.spiceLevel && item.spiceLevel > 0 && (
                <div className="absolute top-1 left-1">
                  <span className="text-xs">{'🌶️'.repeat(Math.min(item.spiceLevel, 3))}</span>
                </div>
              )}

              <h3 className="font-semibold text-[10px] sm:text-xs line-clamp-2 mt-2">
                {item.name}
              </h3>

              <div className="flex items-center gap-1 mt-1">
                <p className={`text-sm sm:text-base font-bold ${hasDiscount ? 'text-red-600' : 'text-green-600'}`}>
                  ${Number(item.price).toFixed(2)}
                </p>
                {hasDiscount && (
                  <p className="text-xs text-gray-500 line-through">
                    ${Number(item.originalPrice || 0).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Cart quantity badge */}
              {cartQty > 0 && (
                <div className="absolute bottom-1 right-1">
                  <span className="bg-orange-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {cartQty}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {searchTerm ? `No items found for "${searchTerm}"` : 'No items in this category'}
        </div>
      )}
    </div>
  )
}

// Legacy form-based manual entry for grocery/clothing POS (no product grid)

interface LegacyItem {
  id: string; name: string; quantity: number; unitPrice: number; discountAmount: number
}

function generateTempId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function getPast7Days(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    days.push(`${yyyy}-${mm}-${dd}`)
  }
  return days
}

function LegacyManualEntryForm({ businessId, businessType }: { businessId: string; businessType: string }) {
  const [transactionDate, setTransactionDate] = useState('')
  const [closedDatesSet, setClosedDatesSet] = useState<Set<string>>(new Set())
  const [loadingDates, setLoadingDates] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LegacyItem[]>([
    { id: generateTempId(), name: '', quantity: 1, unitPrice: 0, discountAmount: 0 },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [successOrder, setSuccessOrder] = useState<{ orderNumber: string; totalAmount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allDates = getPast7Days()

  useEffect(() => {
    if (!businessId) { setLoadingDates(false); return }
    let cancelled = false
    setLoadingDates(true)
    fetch(`/api/universal/close-books?businessId=${businessId}&days=7`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          // Convert UTC dates from API to local dates to match the dropdown
          const closed = new Set<string>((data.closedDates || []).map((d: any) => {
            const utc = new Date(d.date + 'T00:00:00Z')
            const yyyy = utc.getFullYear()
            const mm = String(utc.getMonth() + 1).padStart(2, '0')
            const dd = String(utc.getDate()).padStart(2, '0')
            return `${yyyy}-${mm}-${dd}`
          }))
          setClosedDatesSet(closed)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingDates(false) })
    return () => { cancelled = true }
  }, [businessId])

  const availableDates = allDates.filter(d => !closedDatesSet.has(d))

  const addItem = () => setItems(prev => [...prev, { id: generateTempId(), name: '', quantity: 1, unitPrice: 0, discountAmount: 0 }])
  const removeItem = (id: string) => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev)
  const updateItem = (id: string, field: keyof LegacyItem, value: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice) - item.discountAmount, 0)

  const canSubmit = transactionDate && !submitting &&
    items.every(item => item.name.trim() && item.quantity > 0 && item.unitPrice >= 0) && items.length > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true); setError(null)
    try {
      const res = await fetch('/api/universal/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId, businessType, transactionDate, paymentMethod,
          notes: notes || 'Manual entry from book records',
          items: items.map(({ name, quantity, unitPrice, discountAmount }) => ({ name, quantity, unitPrice, discountAmount: discountAmount || 0 })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create manual order'); return }
      setSuccessOrder({ orderNumber: data.data.orderNumber, totalAmount: data.data.totalAmount })
    } catch { setError('Network error. Please try again.') }
    finally { setSubmitting(false) }
  }

  const resetForm = () => {
    setSuccessOrder(null); setError(null)
    setItems([{ id: generateTempId(), name: '', quantity: 1, unitPrice: 0, discountAmount: 0 }]); setNotes('')
  }

  if (successOrder) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Order Created</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Order <span className="font-mono font-bold">{successOrder.orderNumber}</span> recorded for <span className="font-semibold">{transactionDate}</span>.
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">Total: ${successOrder.totalAmount.toFixed(2)}</p>
          <button onClick={resetForm} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enter Another Order</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Calendar className="w-5 h-5" /> Manual Transaction Entry
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Enter transactions from book records.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Date</label>
        <select value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} disabled={loadingDates}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">{loadingDates ? 'Loading dates...' : 'Select a date...'}</option>
          {availableDates.map(date => (<option key={date} value={date}>{date} {date === allDates[0] ? '(Today)' : ''}</option>))}
        </select>
        {!loadingDates && availableDates.length === 0 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <Lock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">All dates in the past 7 days are closed. Release a day first.</span>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items</label>
          <button onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5">{index + 1}.</span>
              <input type="text" placeholder="Item name" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input type="number" placeholder="Qty" min={1} value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center" />
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" placeholder="Price" min={0} step={0.01} value={item.unitPrice || ''} onChange={(e) => updateItem(item.id, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 pl-5 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <button onClick={() => removeItem(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" disabled={items.length === 1}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
        <div className="flex gap-2">
          {['CASH', 'CARD', 'MOBILE'].map(method => (
            <button key={method} onClick={() => setPaymentMethod(method)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}>
              {method}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
        <input type="text" placeholder="e.g., Book records page 12" value={notes} onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white">
          <span>Total</span><span>${subtotal.toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{items.filter(i => i.name.trim()).length} item(s)</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      <button onClick={handleSubmit} disabled={!canSubmit}
        className={`w-full py-3 rounded-lg font-medium text-white ${canSubmit ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}>
        {submitting ? 'Creating Order...' : 'Submit Manual Order'}
      </button>
    </div>
  )
}
