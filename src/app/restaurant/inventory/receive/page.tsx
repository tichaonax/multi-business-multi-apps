'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert } from '@/components/ui/confirm-modal'
import { randomUUID } from 'crypto'

interface ReceiveItem {
  id: string
  itemId: string
  itemName: string
  quantity: number
  unitCost: number
  unit: string
  supplierName?: string
  batchNumber?: string
  expirationDate?: string
  location?: string
  notes?: string
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
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([])
  const [referenceNumber, setReferenceNumber] = useState('')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [generalNotes, setGeneralNotes] = useState('')

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated
  } = useBusinessPermissionsContext()

  // Check if current business is a restaurant business
  const isRestaurantBusiness = currentBusiness?.businessType === 'restaurant'

  useEffect(() => {
    if (currentBusinessId && isRestaurantBusiness) {
      loadInventoryItems()
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 dark:text-gray-400">
            This page is only available for restaurant businesses.
          </p>
        </div>
      </div>
    )
  }

  const businessId = currentBusinessId!

  const addReceiveItem = () => {
    const newItem: ReceiveItem = {
      id: `temp-${Date.now()}`,
      itemId: '',
      itemName: '',
      quantity: 0,
      unitCost: 0,
      unit: 'units',
      supplierName: '',
      batchNumber: '',
      expirationDate: '',
      location: '',
      notes: ''
    }
    setReceiveItems([...receiveItems, newItem])
  }

  const updateReceiveItem = (id: string, field: keyof ReceiveItem, value: any) => {
    setReceiveItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value }
          
          // If item is selected, auto-fill some details
          if (field === 'itemId' && value) {
            const selectedItem = inventoryItems.find(i => i.id === value)
            if (selectedItem) {
              updated.itemName = selectedItem.name
              updated.unit = selectedItem.unit || 'units'
              updated.unitCost = selectedItem.costPrice || 0
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (receiveItems.length === 0) {
      await customAlert({ title: 'No Items', description: 'Please add at least one item to receive' })
      return
    }

    // Validate all items
    const invalidItems = receiveItems.filter(item => !item.itemId || item.quantity <= 0)
    if (invalidItems.length > 0) {
      await customAlert({ 
        title: 'Invalid Items', 
        description: 'Please ensure all items have a valid selection and quantity greater than 0' 
      })
      return
    }

    try {
      setLoading(true)

      // Process each item as a stock movement
      for (const item of receiveItems) {
        const selectedItem = inventoryItems.find(i => i.id === item.itemId)
        if (!selectedItem) continue

        const movementData = {
          itemId: item.itemId,
          itemName: selectedItem.name,
          itemSku: selectedItem.sku || item.itemId,
          movementType: 'receive',
          quantity: Math.abs(item.quantity),
          unit: item.unit,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost,
          previousStock: selectedItem.currentStock,
          newStock: selectedItem.currentStock + Math.abs(item.quantity),
          reason: 'Stock receiving',
          notes: item.notes || generalNotes || 'Stock received',
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

        // Update the product variant stock
        const variantResponse = await fetch(`/api/universal/products/${item.itemId}`)
        if (variantResponse.ok) {
          const variantData = await variantResponse.json()
          if (variantData.data?.product_variants?.[0]) {
            const variant = variantData.data.product_variants[0]
            const currentStock = variant.stockQuantity || 0
            
            await fetch(`/api/universal/products/${item.itemId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                variants: [{
                  id: variant.id,
                  name: variant.name,
                  sku: variant.sku,
                  price: variant.price,
                  stockQuantity: currentStock + Math.abs(item.quantity),
                  isAvailable: variant.isAvailable
                }]
              })
            })
          }
        }
      }

      await customAlert({ 
        title: 'Success', 
        description: `Successfully received ${receiveItems.length} item(s)` 
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

  const totalValue = receiveItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)

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
            </div>

            {/* Items to Receive */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-primary">Items to Receive</h3>
                <button
                  type="button"
                  onClick={addReceiveItem}
                  className="btn-secondary text-sm"
                  disabled={loadingItems}
                >
                  ➕ Add Item
                </button>
              </div>

              {loadingItems ? (
                <div className="text-center py-8 text-gray-500">Loading inventory items...</div>
              ) : receiveItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items added. Click "Add Item" to start.
                </div>
              ) : (
                <div className="space-y-4">
                  {receiveItems.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-primary">Item {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeReceiveItem(item.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-secondary mb-1">
                            Select Item *
                          </label>
                          <select
                            required
                            value={item.itemId}
                            onChange={(e) => updateReceiveItem(item.id, 'itemId', e.target.value)}
                            className="input-field w-full"
                          >
                            <option value="">-- Select Item --</option>
                            {inventoryItems.map(invItem => (
                              <option key={invItem.id} value={invItem.id}>
                                {invItem.name} ({invItem.sku}) - Current: {invItem.currentStock} {invItem.unit}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">
                            Quantity Received *
                          </label>
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
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
                            step="0.01"
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

                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">
                            Unit
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
                          <input
                            type="text"
                            value={item.supplierName || ''}
                            onChange={(e) => updateReceiveItem(item.id, 'supplierName', e.target.value)}
                            className="input-field w-full"
                            placeholder="Supplier name"
                          />
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

                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="block text-sm font-medium text-secondary mb-1">
                            Item Notes
                          </label>
                          <textarea
                            value={item.notes || ''}
                            onChange={(e) => updateReceiveItem(item.id, 'notes', e.target.value)}
                            className="input-field w-full"
                            rows={2}
                            placeholder="Optional notes for this item..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
