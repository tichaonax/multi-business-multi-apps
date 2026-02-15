'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { BusinessProvider } from '@/components/universal'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

interface BaleTransferItem {
  id: string
  baleId: string
  name: string
  batchNumber: string
  category: string
  sku: string
  barcode?: string
  remainingCount: number
  unitPrice: number
  bogoActive: boolean
  transferQty: number
  newPrice: number
  selected: boolean
}

function TransferContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const {
    currentBusiness,
    currentBusinessId,
    businesses
  } = useBusinessPermissionsContext()

  const customAlert = useAlert()
  const confirm = useConfirm()

  const [items, setItems] = useState<BaleTransferItem[]>([])
  const [loading, setLoading] = useState(true)
  const [transferring, setTransferring] = useState(false)
  const [targetBusinessId, setTargetBusinessId] = useState('')
  const [notes, setNotes] = useState('')
  const [resetBogo, setResetBogo] = useState(false)

  // Get "endOfSale" flag from URL params
  const isEndOfSale = searchParams?.get('endOfSale') === 'true'

  // Get grocery businesses as transfer targets
  const groceryBusinesses = businesses.filter(
    (b: any) => b.businessType === 'grocery' && b.isActive && b.businessId !== currentBusinessId
  )

  // Auto-select first grocery business
  useEffect(() => {
    if (groceryBusinesses.length === 1 && !targetBusinessId) {
      setTargetBusinessId(groceryBusinesses[0].businessId)
    }
  }, [groceryBusinesses, targetBusinessId])

  // Load bales from current clothing business
  useEffect(() => {
    if (!currentBusinessId) return

    const fetchBales = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/clothing/bales?businessId=${currentBusinessId}`
        )
        const data = await response.json()

        if (data.success) {
          const baleItems: BaleTransferItem[] = (data.data || [])
            .filter((bale: any) => bale.isActive && bale.remainingCount > 0)
            .map((bale: any) => ({
              id: bale.id,
              baleId: bale.id,
              name: `${bale.category?.name || 'Bale'} - ${bale.batchNumber}`,
              batchNumber: bale.batchNumber,
              category: bale.category?.name || 'Unknown',
              sku: bale.sku,
              barcode: bale.barcode || undefined,
              remainingCount: bale.remainingCount,
              unitPrice: parseFloat(bale.unitPrice),
              bogoActive: bale.bogoActive,
              transferQty: bale.remainingCount,
              newPrice: parseFloat(bale.unitPrice),
              selected: isEndOfSale
            }))

          setItems(baleItems)
          if (isEndOfSale) {
            setResetBogo(true)
          }
        }
      } catch (error) {
        console.error('Error loading bales:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBales()
  }, [currentBusinessId, isEndOfSale])

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ))
  }

  const toggleAll = () => {
    const allSelected = items.every(i => i.selected)
    setItems(prev => prev.map(item => ({ ...item, selected: !allSelected })))
  }

  const updateTransferQty = (id: string, qty: number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, transferQty: Math.min(Math.max(0, qty), item.remainingCount) } : item
    ))
  }

  const updateNewPrice = (id: string, price: number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, newPrice: Math.max(0, price) } : item
    ))
  }

  const selectedItems = items.filter(i => i.selected && i.transferQty > 0)

  const handleTransfer = async () => {
    if (!currentBusinessId || !targetBusinessId || selectedItems.length === 0) return

    const targetName = groceryBusinesses.find((b: any) => b.businessId === targetBusinessId)?.businessName || 'target business'

    const confirmed = await confirm({
      title: isEndOfSale ? 'End of Sale Transfer' : 'Confirm Inventory Transfer',
      description: `Transfer ${selectedItems.length} bale(s) from ${currentBusiness?.businessName} to ${targetName}?${resetBogo ? '\n\nBOGO will be deactivated on transferred bales.' : ''}`,
      confirmText: isEndOfSale ? 'End Sale & Transfer' : 'Transfer',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    setTransferring(true)
    try {
      const payload = {
        sourceBusinessId: currentBusinessId,
        targetBusinessId,
        resetBogo,
        notes: notes || (isEndOfSale ? 'End of Sale transfer' : 'Manual bale transfer'),
        items: selectedItems.map(item => ({
          baleId: item.baleId,
          quantity: item.transferQty,
          sourcePrice: item.unitPrice,
          targetPrice: item.newPrice,
          productName: item.name,
          barcode: item.barcode || undefined
        }))
      }

      const response = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        await customAlert({
          title: 'Transfer Complete',
          description: `Successfully transferred ${data.data.itemsTransferred} item(s) to ${targetName}.`
        })
        router.push('/clothing/inventory')
      } else {
        await customAlert({
          title: 'Transfer Failed',
          description: data.error || 'An error occurred during transfer.'
        })
      }
    } catch (error: any) {
      await customAlert({
        title: 'Transfer Failed',
        description: 'Something went wrong while processing the transfer. Please try again.'
      })
    } finally {
      setTransferring(false)
    }
  }

  const businessId = currentBusinessId!

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="clothing">
        <ContentLayout
          title={isEndOfSale ? 'End of Sale - Transfer Inventory' : 'Transfer Used Inventory'}
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clothing', href: '/clothing' },
            { label: 'Inventory', href: '/clothing/inventory' },
            { label: isEndOfSale ? 'End of Sale' : 'Transfer', isActive: true }
          ]}
        >
          <div className="space-y-6 max-w-5xl">
            {isEndOfSale && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">End of Sale Mode</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  All remaining bales will be transferred and per-bale BOGO will be deactivated.
                </p>
              </div>
            )}

            {/* Target Business Selection */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Transfer Destination</h3>
              {groceryBusinesses.length === 0 ? (
                <p className="text-red-600 dark:text-red-400 text-sm">
                  No grocery businesses found. Create a grocery business first to transfer inventory.
                </p>
              ) : (
                <select
                  value={targetBusinessId}
                  onChange={(e) => setTargetBusinessId(e.target.value)}
                  className="w-full max-w-md border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select grocery business...</option>
                  {groceryBusinesses.map((b: any) => (
                    <option key={b.businessId} value={b.businessId}>
                      {b.businessName}
                    </option>
                  ))}
                </select>
              )}

              <div className="mt-3">
                <label className="text-sm text-gray-600 dark:text-gray-400">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Transfer notes..."
                  className="w-full max-w-md border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <label className="flex items-center gap-2 mt-3 text-sm">
                <input
                  type="checkbox"
                  checked={resetBogo}
                  onChange={(e) => setResetBogo(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700 dark:text-gray-300">Deactivate BOGO on transferred bales</span>
              </label>
            </div>

            {/* Items Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">Bales</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {selectedItems.length} of {items.length} selected
                  </span>
                  <button
                    onClick={toggleAll}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {items.every(i => i.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading bales...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No active bales with remaining stock found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left w-10"></th>
                        <th className="px-4 py-3 text-left">Bale</th>
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-right">Remaining</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-center">Transfer Qty</th>
                        <th className="px-4 py-3 text-right">New Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((item) => (
                        <tr key={item.id} className={`${item.selected ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleItem(item.id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-gray-100">{item.batchNumber}</div>
                            <div className="text-xs text-gray-500">{item.sku}</div>
                            {item.bogoActive && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded mt-1">
                                BOGO Active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            {item.category}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                            {item.remainingCount}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              max={item.remainingCount}
                              value={item.transferQty}
                              onChange={(e) => updateTransferQty(item.id, parseInt(e.target.value) || 0)}
                              disabled={!item.selected}
                              className="w-20 mx-auto block text-center border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.newPrice}
                                onChange={(e) => updateNewPrice(item.id, parseFloat(e.target.value) || 0)}
                                disabled={!item.selected}
                                className="w-20 text-right border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/clothing/inventory')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferring || selectedItems.length === 0 || !targetBusinessId}
                className="btn-primary bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferring ? 'Transferring...' : isEndOfSale ? `End Sale & Transfer ${selectedItems.length} Bale(s)` : `Transfer ${selectedItems.length} Bale(s)`}
              </button>
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}

export default function TransferPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    }>
      <TransferContent />
    </Suspense>
  )
}
