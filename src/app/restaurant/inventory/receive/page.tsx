'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert } from '@/components/ui/confirm-modal'
import { BarcodeScanner } from '@/components/universal/barcode-scanner'
import { UniversalProduct } from '@/components/universal/product-card'
import { SupplierSelector } from '@/components/suppliers/supplier-selector'

// Searchable item selector combobox
function ItemSelector({
  value,
  onChange,
  items,
  placeholder = 'Search items...',
}: {
  value: string
  onChange: (id: string) => void
  items: Array<{ id: string; name: string; sku: string; currentStock: number }>
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = items.find(i => i.id === value)

  const filtered = query.trim()
    ? items.filter(i =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.sku.toLowerCase().includes(query.toLowerCase())
      )
    : items

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className="input-field w-full flex items-center justify-between text-left"
      >
        <span className={selected ? '' : 'text-gray-400 dark:text-gray-500'}>
          {selected
            ? `${selected.name} (${selected.sku}) — Stock: ${selected.currentStock}`
            : placeholder}
        </span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[9999] left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {/* List */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">No items found</div>
            ) : (
              filtered.map(i => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => handleSelect(i.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-between gap-2 ${
                    i.id === value ? 'bg-blue-100 dark:bg-blue-900/40 font-medium' : ''
                  }`}
                >
                  <span className="truncate text-gray-900 dark:text-gray-100">{i.name}</span>
                  <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">{i.sku} · Stock: {i.currentStock}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type CostMode = 'total' | 'per_case' | 'per_unit'

interface ReceiveItem {
  id: string
  itemId: string
  itemName: string
  // Individual mode
  quantity: number
  unitCost: number
  // Bulk / Cases mode
  bulkMode: boolean
  casesReceived: number
  unitsPerCase: number
  costMode: CostMode
  costAmount: number
  saveUnitsDefault: boolean
  // Common optional fields
  unit: string
  supplierId?: string
  supplierName?: string
  batchNumber?: string
  expirationDate?: string
  location?: string
  notes?: string
}

/** Derives sellable units, unit cost, and total cost from bulk-mode inputs */
function calcBulkDerived(item: ReceiveItem) {
  const sellableUnits = item.casesReceived * item.unitsPerCase
  let unitCost = 0
  let totalCost = 0
  if (item.costMode === 'total') {
    totalCost = item.costAmount
    unitCost = sellableUnits > 0 ? item.costAmount / sellableUnits : 0
  } else if (item.costMode === 'per_case') {
    totalCost = item.casesReceived * item.costAmount
    unitCost = sellableUnits > 0 ? totalCost / sellableUnits : 0
  } else {
    // per_unit
    unitCost = item.costAmount
    totalCost = sellableUnits * item.costAmount
  }
  return { sellableUnits, unitCost, totalCost }
}

interface InventoryItem {
  id: string
  name: string
  sku: string
  currentStock: number
  unit: string
  category: string
  costPrice: number
}

export default function ReceiveStockPage() {
  const router = useRouter()
  const customAlert = useAlert()
  const [loading, setLoading] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([])
  const [referenceNumber, setReferenceNumber] = useState('')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [generalNotes, setGeneralNotes] = useState('')
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  // Payment request
  const [requestPayment, setRequestPayment] = useState(false)
  const [paymentSupplierId, setPaymentSupplierId] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [taxFixedValue, setTaxFixedValue] = useState(0)
  const [taxMode, setTaxMode] = useState<'rate' | 'fixed'>('rate')
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())
  // Ref to the newly-added row so we can scroll to it after a scan
  const lastRowRef = useRef<HTMLDivElement>(null)

  // Auto-sync: when all items share the same supplier, push it to the payment supplier field
  useEffect(() => {
    const itemSuppliers = receiveItems.map(i => i.supplierId).filter(Boolean)
    if (itemSuppliers.length === 0) return
    const allSame = itemSuppliers.every(id => id === itemSuppliers[0])
    if (allSame) {
      setPaymentSupplierId(itemSuppliers[0]!)
    }
  }, [receiveItems])

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    hasPermission
  } = useBusinessPermissionsContext()

  const canSubmitPaymentRequest = hasPermission('canSubmitSupplierPaymentRequests')

  // Check if current business is a restaurant business
  const isRestaurantBusiness = currentBusiness?.businessType === 'restaurant'

  useEffect(() => {
    if (currentBusinessId && isRestaurantBusiness) {
      loadInventoryItems()
      loadSuppliers()
    }
  }, [currentBusinessId, isRestaurantBusiness])

  const loadInventoryItems = async () => {
    try {
      setLoadingItems(true)
      const response = await fetch(`/api/inventory/${currentBusinessId}/items?limit=1000`)
      if (response.ok) {
        const data = await response.json()
        setInventoryItems(data.items || [])
      }
    } catch (error) {
      console.error('Error loading inventory items:', error)
      await customAlert({ title: 'Error', description: 'Failed to load inventory items' })
    } finally {
      setLoadingItems(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const response = await fetch(`/api/business/${currentBusinessId}/suppliers?isActive=true&limit=200`)
      if (response.ok) {
        const data = await response.json()
        setSuppliers((data.suppliers || []).map((s: any) => ({ id: s.id, name: s.name })))
      }
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }

  if (!isAuthenticated || !currentBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please select a restaurant business to continue.</p>
        </div>
      </div>
    )
  }

  if (!isRestaurantBusiness) {
    return <BusinessTypeRedirect />
  }

  const businessId = currentBusinessId!

  const addReceiveItem = () => {
    const newId = `temp-${Date.now()}`
    const newItem: ReceiveItem = {
      id: newId,
      itemId: '', itemName: '', quantity: 0, unitCost: 0, bulkMode: false,
      casesReceived: 1, unitsPerCase: 0, costMode: 'total', costAmount: 0,
      saveUnitsDefault: false, unit: 'units',
      supplierId: requestPayment && paymentSupplierId ? paymentSupplierId : undefined,
      supplierName: '',
      batchNumber: '', expirationDate: '', location: '', notes: ''
    }
    // Collapse all existing items before opening the new one
    setCollapsedItems(prev => {
      const next = new Set(prev)
      receiveItems.forEach(i => next.add(i.id))
      return next
    })
    setReceiveItems(prev => [...prev, newItem])
  }

  const updateReceiveItem = (id: string, field: string, value: any) => {
    setReceiveItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }

          // If item is selected, auto-fill details + pre-fill saved unitsPerCase
          if (field === 'itemId' && value) {
            const selectedItem = inventoryItems.find(i => i.id === value)
            if (selectedItem) {
              updated.itemName = selectedItem.name
              updated.unit = selectedItem.unit || 'units'
              updated.unitCost = selectedItem.costPrice || 0
              updated.costAmount = selectedItem.costPrice || 0
              // Pre-fill unitsPerCase from localStorage if previously saved
              const saved = typeof window !== 'undefined'
                ? parseInt(localStorage.getItem(`upc:${value}`) || '0')
                : 0
              if (saved > 0) updated.unitsPerCase = saved
            }
          }

          return updated
        }
        return item
      })
    )
  }

  const removeReceiveItem = (id: string) => {
    setReceiveItems(items => items.filter(item => item.id !== id))
  }

  const toggleCollapse = (id: string) => {
    setCollapsedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const insertItemAfter = (afterId: string) => {
    const newId = `temp-${Date.now()}`
    const newItem: ReceiveItem = {
      id: newId,
      itemId: '', itemName: '', quantity: 0, unitCost: 0, bulkMode: false,
      casesReceived: 1, unitsPerCase: 0, costMode: 'total', costAmount: 0,
      saveUnitsDefault: false, unit: 'units',
      supplierId: requestPayment && paymentSupplierId ? paymentSupplierId : undefined,
      supplierName: '',
      batchNumber: '', expirationDate: '', location: '', notes: ''
    }
    // Collapse all existing items, open only the new one
    setCollapsedItems(prev => {
      const next = new Set(prev)
      receiveItems.forEach(i => next.add(i.id))
      return next
    })
    setReceiveItems(prev => {
      const idx = prev.findIndex(i => i.id === afterId)
      const next = [...prev]
      next.splice(idx + 1, 0, newItem)
      return next
    })
  }

  const handleProductScanned = (product: UniversalProduct) => {
    // Match scanned product to a loaded inventory item (by ID first, then by SKU)
    let inventoryItem = inventoryItems.find(i => i.id === product.id)
    if (!inventoryItem && product.sku) {
      inventoryItem = inventoryItems.find(i => i.sku === product.sku)
    }

    const resolvedId = inventoryItem?.id || product.id
    const savedUpc = typeof window !== 'undefined'
      ? parseInt(localStorage.getItem(`upc:${resolvedId}`) || '0')
      : 0

    const newItem: ReceiveItem = {
      id: `temp-${Date.now()}`,
      itemId: resolvedId,
      itemName: inventoryItem?.name || product.name,
      quantity: 0,
      unitCost: inventoryItem?.costPrice ?? (product as any).costPrice ?? 0,
      bulkMode: false,
      casesReceived: 1,
      unitsPerCase: savedUpc > 0 ? savedUpc : 0,
      costMode: 'total',
      costAmount: inventoryItem?.costPrice ?? (product as any).costPrice ?? 0,
      saveUnitsDefault: false,
      unit: inventoryItem?.unit || 'units',
      supplierId: requestPayment && paymentSupplierId ? paymentSupplierId : undefined,
      supplierName: '',
      batchNumber: '',
      expirationDate: '',
      location: '',
      notes: ''
    }

    setReceiveItems(prev => [...prev, newItem])
    // Hide scanner after a successful scan to free up screen space
    setShowBarcodeScanner(false)
    // Scroll to the new row
    setTimeout(() => lastRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (receiveItems.length === 0) {
      await customAlert({ title: 'No Items', description: 'Please add at least one item to receive' })
      return
    }

    if (requestPayment && !paymentSupplierId) {
      await customAlert({ title: 'Supplier Required', description: 'Please select a supplier for the payment request, or uncheck "Request Payment".' })
      return
    }

    // Validate all items
    const invalidItems = receiveItems.filter(item => {
      if (!item.itemId) return true
      if (item.bulkMode) return item.casesReceived <= 0 || item.unitsPerCase <= 0
      return item.quantity <= 0
    })
    if (invalidItems.length > 0) {
      await customAlert({
        title: 'Invalid Items',
        description: 'Please ensure all items have a product selected and a valid quantity. In Bulk mode, Cases and Units per case must both be greater than 0.'
      })
      return
    }

    try {
      setLoading(true)

      // Process each item as a stock movement
      for (const item of receiveItems) {
        const selectedItem = inventoryItems.find(i => i.id === item.itemId)
        if (!selectedItem) continue

        // Resolve the variant ID — movements API requires a variant ID, not a product ID
        const productResponse = await fetch(`/api/universal/products/${item.itemId}`)
        if (!productResponse.ok) {
          throw new Error(`Failed to load product details for ${selectedItem.name}`)
        }
        const productData = await productResponse.json()
        let variant = productData.data?.variants?.[0]
        if (!variant) {
          // Auto-create a default "Standard" variant for products that have none yet
          const patchRes = await fetch(`/api/universal/products/${item.itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              variants: [{
                name: 'Standard',
                sku: `${selectedItem.sku || item.itemId}-STD`,
                price: selectedItem.costPrice || 0,
                stockQuantity: 0,
                isActive: true
              }]
            })
          })
          if (!patchRes.ok) {
            throw new Error(`"${selectedItem.name}" has no variants. Failed to auto-create one — please edit the item first.`)
          }
          const patchData = await patchRes.json()
          variant = patchData.data?.variants?.[0]
          if (!variant) {
            throw new Error(`Could not create a default variant for "${selectedItem.name}". Please edit the item and save it first.`)
          }
        }

        // Resolve quantity and unit cost from whichever mode is active
        let finalQty: number
        let finalUnitCost: number
        let finalTotalCost: number

        if (item.bulkMode) {
          const derived = calcBulkDerived(item)
          finalQty = derived.sellableUnits
          finalUnitCost = derived.unitCost
          finalTotalCost = derived.totalCost
          // Persist unitsPerCase to localStorage if requested
          if (item.saveUnitsDefault && item.unitsPerCase > 0) {
            localStorage.setItem(`upc:${item.itemId}`, String(item.unitsPerCase))
          }
        } else {
          finalQty = Math.abs(item.quantity)
          finalUnitCost = item.unitCost
          finalTotalCost = finalQty * finalUnitCost
        }

        if (finalQty <= 0) {
          throw new Error(`"${selectedItem.name}": sellable quantity must be greater than 0.`)
        }

        // Build notes — include bulk summary for audit trail
        const bulkNote = item.bulkMode
          ? `${item.casesReceived} case(s) × ${item.unitsPerCase} units/case = ${finalQty} units. `
          : ''
        const movementNotes = `${bulkNote}${item.notes || generalNotes || 'Stock received'}`

        const movementData = {
          itemId: variant.id,
          itemName: selectedItem.name,
          itemSku: selectedItem.sku || variant.sku,
          movementType: 'PURCHASE_RECEIVED',
          quantity: finalQty,
          unit: item.unit,
          unitCost: finalUnitCost,
          totalCost: finalTotalCost,
          previousStock: selectedItem.currentStock,
          newStock: selectedItem.currentStock + finalQty,
          reason: 'Stock receiving',
          notes: movementNotes,
          supplierName: item.supplierName,
          referenceNumber: referenceNumber || undefined,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate,
          location: item.location
        }

        const response = await fetch(`/api/inventory/${businessId}/movements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movementData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Failed to receive ${selectedItem.name}: ${errorData.error || 'Unknown error'}`)
        }
        // Movements API updates stockQuantity automatically — no secondary update needed
      }

      // Create payment request if checked
      if (requestPayment && paymentSupplierId && totalValue > 0) {
        // Build line items — one per received item so managers can approve per line
        const paymentLineItems = receiveItems.map(rItem => {
          const qty = rItem.bulkMode ? calcBulkDerived(rItem).sellableUnits : rItem.quantity
          const unitCostVal = rItem.bulkMode ? calcBulkDerived(rItem).unitCost : rItem.unitCost
          const lineTotal = rItem.bulkMode ? calcBulkDerived(rItem).totalCost : rItem.quantity * rItem.unitCost
          return {
            description: `${rItem.itemName} × ${qty} ${rItem.unit} @ $${unitCostVal.toFixed(2)}/unit`,
            amount: lineTotal
          }
        })
        if (taxAmount > 0) {
          const taxLabel = taxMode === 'fixed' ? `Tax ($${taxAmount.toFixed(2)})` : `Tax (${taxRate}%)`
          paymentLineItems.push({ description: taxLabel, amount: taxAmount })
        }
        const paymentRes = await fetch('/api/supplier-payments/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            supplierId: paymentSupplierId,
            receiptNumber: referenceNumber || undefined,
            notes: paymentNotes || `Stock received on ${receivedDate}${generalNotes ? ` — ${generalNotes}` : ''}`,
            items: paymentLineItems
          })
        })
        if (!paymentRes.ok) {
          // Stock was received successfully; warn but don't fail
          await customAlert({
            title: 'Stock Received — Payment Request Failed',
            description: 'Stock was received successfully, but the payment request could not be created. Please submit it manually from Supplier Payments.'
          })
          router.push('/restaurant/inventory')
          return
        }
      }

      await customAlert({
        title: 'Success',
        description: `Successfully received ${receiveItems.length} item(s)${requestPayment && paymentSupplierId ? ' and submitted a payment request.' : '.'}`
      })

      // Redirect back to inventory page
      router.push('/restaurant/inventory')
    } catch (err) {
      console.error('Error receiving stock:', err)
      await customAlert({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Failed to receive stock' 
      })
    } finally {
      setLoading(false)
    }
  }

  const subtotal = receiveItems.reduce((sum, item) => {
    if (item.bulkMode) return sum + calcBulkDerived(item).totalCost
    return sum + (item.quantity * item.unitCost)
  }, 0)
  const taxAmount = taxMode === 'fixed' ? taxFixedValue : subtotal * (taxRate / 100)
  const totalValue = subtotal + taxAmount

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="Receive Stock"
        subtitle="Record incoming inventory deliveries and purchases"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', href: '/restaurant' },
          { label: 'Inventory', href: '/restaurant/inventory' },
          { label: 'Receive Stock', isActive: true }
        ]}
      >
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Information */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Delivery Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="input-field w-full"
                    placeholder="PO-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Received Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Total Value
                  </label>
                  <input
                    type="text"
                    value={`$${totalValue.toFixed(2)}`}
                    className="input-field w-full bg-gray-50 dark:bg-gray-700"
                    readOnly
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-secondary mb-1">
                  General Notes
                </label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="input-field w-full"
                  rows={2}
                  placeholder="Optional notes about this delivery..."
                />
              </div>

              {/* Tax */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-secondary">Tax</label>
                  {/* Mode toggle */}
                  <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setTaxMode('rate')}
                      className={`px-3 py-1 transition-colors ${
                        taxMode === 'rate'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      % Rate
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxMode('fixed')}
                      className={`px-3 py-1 border-l border-gray-300 dark:border-gray-600 transition-colors ${
                        taxMode === 'fixed'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      $ Fixed
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {taxMode === 'rate' ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate || ''}
                      onChange={(e) => setTaxRate(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="input-field w-32"
                      placeholder="e.g. 15"
                    />
                  ) : (
                    <input
                      type="number"
                      min="0"
                      step="0.10"
                      value={taxFixedValue || ''}
                      onChange={(e) => setTaxFixedValue(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="input-field w-32"
                      placeholder="0.00"
                    />
                  )}
                  {taxAmount > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Tax: <strong>${taxAmount.toFixed(2)}</strong>
                      {taxMode === 'rate' && subtotal > 0 && (
                        <span className="text-xs text-gray-400 ml-1">({taxRate}% of ${subtotal.toFixed(2)})</span>
                      )}
                      <span className="mx-1 text-gray-400">·</span>
                      Total: <strong>${totalValue.toFixed(2)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Request Payment section — only shown to users who can submit */}
              {canSubmitPaymentRequest && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={requestPayment}
                      onChange={(e) => setRequestPayment(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="font-medium text-primary">Request Payment for this delivery</span>
                    <span className="text-sm text-gray-500">— submits a payment request to the approval queue</span>
                  </label>

                  {requestPayment && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Supplier to pay *
                        </label>
                        <SupplierSelector
                          businessId={businessId}
                          value={paymentSupplierId}
                          onChange={(id) => {
                            const newId = id || ''
                            setPaymentSupplierId(newId)
                            // Push down to all item rows that were blank or matched the old payment supplier
                            setReceiveItems(items => items.map(item =>
                              (!item.supplierId || item.supplierId === paymentSupplierId)
                                ? { ...item, supplierId: newId || undefined, supplierName: '' }
                                : item
                            ))
                          }}
                          placeholder="— Select supplier —"
                          canCreate={false}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary mb-1">
                          Payment notes
                        </label>
                        <input
                          type="text"
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          className="input-field w-full"
                          placeholder={`Stock received on ${receivedDate}`}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          A payment request for <strong>${totalValue.toFixed(2)}</strong> will be submitted to the approval queue after stock is saved.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items to Receive */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary">Items to Receive</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(v => !v)}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                      showBarcodeScanner
                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    disabled={loadingItems}
                  >
                    {showBarcodeScanner ? '📷 Hide Scanner' : '📷 Scan Barcode'}
                  </button>
                  <button
                    type="button"
                    onClick={addReceiveItem}
                    className="btn-secondary text-sm"
                    disabled={loadingItems}
                  >
                    ➕ Add Item
                  </button>
                </div>
              </div>

              {/* Barcode Scanner */}
              {showBarcodeScanner && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-300 mb-3 font-medium">
                    Scan a barcode to automatically add the item — then fill in quantity and cost.
                  </p>
                  <BarcodeScanner
                    onProductScanned={handleProductScanned}
                    businessId={businessId}
                    showScanner={showBarcodeScanner}
                    onToggleScanner={() => setShowBarcodeScanner(v => !v)}
                  />
                </div>
              )}

              {loadingItems ? (
                <div className="text-center py-8 text-gray-500">Loading inventory items...</div>
              ) : receiveItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items added. Click "Add Item" to start.
                </div>
              ) : (
                <div className="space-y-4">
                  {receiveItems.map((item, index) => {
                    const isCollapsed = collapsedItems.has(item.id)
                    const itemTotal = item.bulkMode ? calcBulkDerived(item).totalCost : item.quantity * item.unitCost
                    return (
                    <React.Fragment key={item.id}>
                    <div
                      ref={index === receiveItems.length - 1 ? lastRowRef : undefined}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Collapsible header — always visible */}
                      <div className="flex items-stretch bg-gray-50 dark:bg-gray-800/60">
                        {/* Remove button — isolated left zone */}
                        <button
                          type="button"
                          onClick={() => removeReceiveItem(item.id)}
                          className="px-3 flex items-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-r border-gray-200 dark:border-gray-700 flex-shrink-0"
                          title="Remove item"
                        >
                          🗑
                        </button>
                        {/* Main clickable expand area */}
                        <div
                          className="flex-1 flex items-center gap-3 px-4 py-3 cursor-pointer select-none min-w-0"
                          onClick={() => toggleCollapse(item.id)}
                        >
                          <span className="text-xs font-bold text-gray-500 flex-shrink-0">#{index + 1}</span>
                          <span className="font-medium text-primary truncate">
                            {item.itemName || <span className="italic text-gray-400">New Item</span>}
                          </span>
                          {isCollapsed && item.itemName && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.bulkMode
                                ? `${item.casesReceived}×${item.unitsPerCase}=${calcBulkDerived(item).sellableUnits} ${item.unit}`
                                : `${item.quantity} ${item.unit}`}
                              {' · '}
                              <strong>${itemTotal.toFixed(2)}</strong>
                              {item.supplierName && ` · ${item.supplierName}`}
                            </span>
                          )}
                        </div>
                        {/* Expand/collapse chevron — isolated right zone */}
                        <button
                          type="button"
                          onClick={() => toggleCollapse(item.id)}
                          className="px-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-l border-gray-200 dark:border-gray-700 flex-shrink-0 text-sm"
                          title={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                          {isCollapsed ? '▶' : '▼'}
                        </button>
                      </div>

                      {/* Expanded content */}
                      {!isCollapsed && (
                      <div className="p-4 space-y-4">

                        {/* Row 1: Select Item + Mode Toggle */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Select Item *
                            </label>
                            <ItemSelector
                              value={item.itemId}
                              onChange={(id) => updateReceiveItem(item.id, 'itemId', id)}
                              items={inventoryItems}
                              placeholder="-- Select Item --"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Receiving Mode
                            </label>
                            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
                              <button
                                type="button"
                                onClick={() => updateReceiveItem(item.id, 'bulkMode', false)}
                                className={`flex-1 py-2 px-3 transition-colors ${
                                  !item.bulkMode
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                Individual
                              </button>
                              <button
                                type="button"
                                onClick={() => updateReceiveItem(item.id, 'bulkMode', true)}
                                className={`flex-1 py-2 px-3 transition-colors border-l border-gray-300 dark:border-gray-600 ${
                                  item.bulkMode
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                Bulk / Cases
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* INDIVIDUAL MODE */}
                        {!item.bulkMode && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-secondary mb-1">
                                Quantity (sellable units) *
                              </label>
                              <input
                                type="number"
                                required={!item.bulkMode}
                                min="0.01"
                                step="0.10"
                                value={item.quantity || ''}
                                onChange={(e) => updateReceiveItem(item.id, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                className="input-field w-full"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-secondary mb-1">
                                Unit Cost ($)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.10"
                                value={item.unitCost || ''}
                                onChange={(e) => updateReceiveItem(item.id, 'unitCost', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                className="input-field w-full"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-secondary mb-1">
                                Total Cost
                              </label>
                              <input
                                type="text"
                                value={`$${(item.quantity * item.unitCost).toFixed(2)}`}
                                className="input-field w-full bg-gray-50 dark:bg-gray-700"
                                readOnly
                              />
                            </div>
                          </div>
                        )}

                        {/* BULK / CASES MODE */}
                        {item.bulkMode && (() => {
                          const derived = calcBulkDerived(item)
                          return (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 space-y-4">

                              {/* Cases + Units per case */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-secondary mb-1">
                                    Cases / Crates received *
                                  </label>
                                  <input
                                    type="number"
                                    required={item.bulkMode}
                                    min="1"
                                    step="1"
                                    value={item.casesReceived || ''}
                                    onChange={(e) => updateReceiveItem(item.id, 'casesReceived', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                    className="input-field w-full"
                                    placeholder="e.g. 3"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-secondary mb-1">
                                    Units per case *
                                  </label>
                                  <input
                                    type="number"
                                    required={item.bulkMode}
                                    min="1"
                                    step="1"
                                    value={item.unitsPerCase || ''}
                                    onChange={(e) => updateReceiveItem(item.id, 'unitsPerCase', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                    className="input-field w-full"
                                    placeholder="e.g. 12"
                                  />
                                </div>
                              </div>

                              {/* Cost entry mode */}
                              <div>
                                <label className="block text-sm font-medium text-secondary mb-2">
                                  I know the cost as…
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {([
                                    { value: 'total', label: 'Total invoice' },
                                    { value: 'per_case', label: 'Per case / crate' },
                                    { value: 'per_unit', label: 'Per unit' },
                                  ] as { value: CostMode; label: string }[]).map(opt => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => updateReceiveItem(item.id, 'costMode', opt.value)}
                                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                                        item.costMode === opt.value
                                          ? 'bg-blue-600 border-blue-600 text-white'
                                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Cost amount input */}
                              <div className="grid grid-cols-2 gap-4 items-end">
                                <div>
                                  <label className="block text-sm font-medium text-secondary mb-1">
                                    {item.costMode === 'total' ? 'Total invoice amount ($)' :
                                     item.costMode === 'per_case' ? 'Cost per case ($)' :
                                     'Cost per unit ($)'}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.10"
                                    value={item.costAmount || ''}
                                    onChange={(e) => updateReceiveItem(item.id, 'costAmount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                    className="input-field w-full"
                                    placeholder="0.00"
                                  />
                                </div>
                                {/* Live summary */}
                                <div className="bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg p-3 text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Sellable units:</span>
                                    <span className="font-semibold text-green-700 dark:text-green-400">{derived.sellableUnits}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Unit cost:</span>
                                    <span className="font-semibold">${derived.unitCost.toFixed(4)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                                    <span className="text-gray-500">Total:</span>
                                    <span className="font-bold">${derived.totalCost.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Save default */}
                              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={item.saveUnitsDefault}
                                  onChange={(e) => updateReceiveItem(item.id, 'saveUnitsDefault', e.target.checked)}
                                  className="rounded"
                                />
                                <span className="text-gray-600 dark:text-gray-400">
                                  Remember {item.unitsPerCase || '?'} units/case for this item next time
                                </span>
                              </label>
                            </div>
                          )
                        })()}

                        {/* Common optional fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Unit label
                            </label>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => updateReceiveItem(item.id, 'unit', e.target.value)}
                              className="input-field w-full"
                              placeholder="units"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Supplier
                            </label>
                            {requestPayment && paymentSupplierId ? (
                              <div className="input-field w-full flex items-center gap-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-default">
                                <span>🔒</span>
                                <span className="flex-1 truncate">{suppliers.find(s => s.id === paymentSupplierId)?.name || paymentSupplierId}</span>
                                <span className="text-xs text-gray-400 flex-shrink-0">locked</span>
                              </div>
                            ) : (
                              <SupplierSelector
                                businessId={businessId}
                                value={item.supplierId || null}
                                onChange={(supplierId) => {
                                  const name = supplierId
                                    ? (suppliers.find(s => s.id === supplierId)?.name ?? '')
                                    : ''
                                  updateReceiveItem(item.id, 'supplierId', supplierId || undefined)
                                  updateReceiveItem(item.id, 'supplierName', name)
                                  if (!paymentSupplierId || paymentSupplierId === item.supplierId) {
                                    setPaymentSupplierId(supplierId || '')
                                  }
                                }}
                                placeholder="Search suppliers..."
                                canCreate={true}
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Batch Number
                            </label>
                            <input
                              type="text"
                              value={item.batchNumber || ''}
                              onChange={(e) => updateReceiveItem(item.id, 'batchNumber', e.target.value)}
                              className="input-field w-full"
                              placeholder="Batch/Lot #"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Expiration Date
                            </label>
                            <input
                              type="date"
                              value={item.expirationDate || ''}
                              onChange={(e) => updateReceiveItem(item.id, 'expirationDate', e.target.value)}
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Storage Location
                            </label>
                            <input
                              type="text"
                              value={item.location || ''}
                              onChange={(e) => updateReceiveItem(item.id, 'location', e.target.value)}
                              className="input-field w-full"
                              placeholder="e.g., Walk-in Cooler A2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                              Item Notes
                            </label>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => updateReceiveItem(item.id, 'notes', e.target.value)}
                              className="input-field w-full"
                              placeholder="Optional notes..."
                            />
                          </div>
                        </div>

                      </div>
                      )}
                    </div>
                    {/* Add next item — between every pair and after the last */}
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                      <button
                        type="button"
                        onClick={() => insertItemAfter(item.id)}
                        disabled={loadingItems}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1 rounded-full border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors bg-white dark:bg-gray-900 flex-shrink-0"
                      >
                        ➕ Add Item
                      </button>
                      <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                    </div>
                    </React.Fragment>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Summary and Actions */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Summary</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {receiveItems.length} item(s) • Total Value: ${totalValue.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => router.push('/restaurant/inventory')}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || receiveItems.length === 0}
                  className="btn-primary"
                >
                  {loading ? 'Processing...' : 'Receive Stock'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}
