'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

interface InventoryItem {
  id: string
  name: string
  sku?: string
  currentStock: number
  category: string
  basePrice: number
}

export default function ReceiveGroceryInventoryPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [selectedItems, setSelectedItems] = useState<{[itemId: string]: { quantity: number; batchNumber?: string; expirationDate?: string; costPerUnit?: number }}>({})

  // Fetch existing inventory items
  useEffect(() => {
    fetchInventoryItems()
  }, [])

  const fetchInventoryItems = async () => {
    try {
      console.log('Fetching inventory items...')
      const response = await fetch(`/api/inventory/${BUSINESS_ID}/items`)
      if (response.ok) {
        const data = await response.json()
        console.log('Inventory items loaded:', data.items?.length || 0)
        setItems(data.items || [])
      } else {
        console.error('Failed to fetch items:', response.status)
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error)
    }
  }

  const handleItemSelect = (itemId: string, quantity: number) => {
    console.log('Item selected:', itemId, 'quantity:', quantity)
    setSelectedItems(prev => {
      const newSelected = {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          quantity: quantity
        }
      }
      console.log('Updated selectedItems:', newSelected)
      return newSelected
    })
  }

  const handleBatchInfo = (itemId: string, field: string, value: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted!')
    console.log('Selected items:', selectedItems)

    if (!session?.user) {
      setError('You must be logged in to receive inventory')
      return
    }

    const receivedItems = Object.entries(selectedItems).filter(([_, data]) => data.quantity > 0)
    console.log('Received items:', receivedItems)

    if (receivedItems.length === 0) {
      setError('Please select at least one item to receive')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      // Process each received item individually
      for (const [itemId, data] of receivedItems) {
        const item = items.find(i => i.id === itemId)
        if (!item) continue

        // Create individual stock movement
        const movement = {
          itemId,
          itemName: item.name,
          itemSku: item.sku || '',
          movementType: 'receive',
          quantity: data.quantity,
          unit: 'units',
          unitCost: data.costPerUnit ? parseFloat(data.costPerUnit) : item.basePrice,
          totalCost: data.costPerUnit ? parseFloat(data.costPerUnit) * data.quantity : item.basePrice * data.quantity,
          previousStock: item.currentStock,
          newStock: item.currentStock + data.quantity,
          reason: 'Stock Receipt',
          notes: `Received ${data.quantity} units${data.batchNumber ? ` (Batch: ${data.batchNumber})` : ''}${data.expirationDate ? ` (Expires: ${data.expirationDate})` : ''}`,
          employeeName: session.user.name || 'System',
          batchNumber: data.batchNumber || '',
          expirationDate: data.expirationDate || '',
          location: 'Warehouse'
        }

        const response = await fetch(`/api/inventory/${BUSINESS_ID}/movements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(movement)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to receive ${item.name}`)
        }
      }

      setSuccess(`Successfully received ${receivedItems.length} item(s)`)
      setSelectedItems({})

      // Refresh items to show updated stock
      fetchInventoryItems()

      // Redirect after a short delay - use replace to prevent back button from returning to form
      setTimeout(() => {
        router.replace('/grocery/inventory')
      }, 2000)
    } catch (err) {
      console.error('Error receiving inventory:', err)
      setError(err instanceof Error ? err.message : 'Failed to receive inventory')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BusinessTypeRoute requiredBusinessType="grocery">
      <ContentLayout
        title="📦 Receive Grocery Inventory"
        subtitle="Record incoming stock shipments and deliveries"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Grocery', href: '/grocery' },
          { label: 'Inventory', href: '/grocery/inventory' },
          { label: 'Receive Stock', isActive: true }
        ]}
      >
        <div className="max-w-6xl mx-auto">
          <div className="card">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {success}
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-medium text-primary">Select Items to Receive</h3>

                  {items.length === 0 ? (
                    <div className="text-center py-8 text-secondary">
                      <div className="text-4xl mb-4">📦</div>
                      <p>No inventory items found. Add some items first.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-8 gap-4 text-sm font-medium text-secondary border-b pb-2">
                        <div>Product</div>
                        <div>SKU</div>
                        <div>Category</div>
                        <div>Current Stock</div>
                        <div>Receive Qty</div>
                        <div>Cost/Unit</div>
                        <div>Batch #</div>
                        <div>Expiration</div>
                      </div>

                      {items.map(item => (
                        <div key={item.id} className="grid grid-cols-8 gap-4 items-center py-3 border-b border-gray-100">
                          <div>
                            <div className="font-medium text-primary">{item.name}</div>
                            <div className="text-sm text-secondary">${item.basePrice.toFixed(2)}/unit</div>
                          </div>
                          <div className="text-sm text-secondary">{item.sku || '-'}</div>
                          <div className="text-sm text-secondary">{item.category}</div>
                          <div className="text-sm">
                            <span className={`inline-flex px-2 py-1 rounded text-xs ${
                              item.currentStock <= 10
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {item.currentStock} units
                            </span>
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={selectedItems[item.id]?.quantity || ''}
                              onChange={(e) => handleItemSelect(item.id, parseInt(e.target.value) || 0)}
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={`$${item.basePrice.toFixed(2)}`}
                              value={selectedItems[item.id]?.costPerUnit || ''}
                              onChange={(e) => handleBatchInfo(item.id, 'costPerUnit', e.target.value)}
                              className="input-field w-full text-sm"
                              disabled={!selectedItems[item.id]?.quantity}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Batch #"
                              value={selectedItems[item.id]?.batchNumber || ''}
                              onChange={(e) => handleBatchInfo(item.id, 'batchNumber', e.target.value)}
                              className="input-field w-full text-sm"
                              disabled={!selectedItems[item.id]?.quantity}
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              value={selectedItems[item.id]?.expirationDate || ''}
                              onChange={(e) => handleBatchInfo(item.id, 'expirationDate', e.target.value)}
                              className="input-field w-full text-sm"
                              disabled={!selectedItems[item.id]?.quantity}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {Object.keys(selectedItems).some(id => selectedItems[id].quantity > 0) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Receipt Summary</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      {Object.entries(selectedItems)
                        .filter(([_, data]) => data.quantity > 0)
                        .map(([itemId, data]) => {
                          const item = items.find(i => i.id === itemId)
                          return (
                            <div key={itemId}>
                              • {item?.name}: {data.quantity} units
                              {data.batchNumber && ` (Batch: ${data.batchNumber})`}
                              {data.expirationDate && ` (Expires: ${data.expirationDate})`}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || Object.keys(selectedItems).every(id => !selectedItems[id]?.quantity)}
                    className="btn-primary"
                    onClick={() => console.log('Button clicked! Disabled:', loading || Object.keys(selectedItems).every(id => !selectedItems[id]?.quantity))}
                  >
                    {loading ? 'Processing...' : 'Receive Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}