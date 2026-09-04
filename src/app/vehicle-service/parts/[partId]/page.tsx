'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ImageUploadDialog } from '@/components/pos/image-upload-dialog'

const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE_RECEIVED: '➕ Received',
  SALE: '🛒 Sold',
  SERVICE_USE: '🛠️ Used in service',
  INTERNAL_USE: '🧰 Internal use',
  RETURN_IN: '↩️ Customer return',
  RETURN_OUT: '↩️ Supplier return',
  ADJUSTMENT: '🧾 Adjustment',
  TRANSFER_IN: '🔁 Transfer in',
  TRANSFER_OUT: '🔁 Transfer out',
  DAMAGE: '💥 Damage',
  THEFT: '💥 Theft/loss',
}

export default function PartDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams<{ partId: string }>()
  const { hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const canManage = isSystemAdmin || hasPermission('canManageInventory')

  const [part, setPart] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionModal, setActionModal] = useState<null | 'receive' | 'adjust' | 'write-off' | 'return' | 'internal-use'>(null)
  const [showImageDialog, setShowImageDialog] = useState(false)

  const fetchPart = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vehicle-service/parts/${params.partId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load part')
      setPart(data.part)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [params.partId])

  useEffect(() => { fetchPart() }, [fetchPart])

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const variant = part?.product_variants?.[0]

  return (
    <ContentLayout title={part?.name || 'Part'} subtitle="Vehicle parts inventory item">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/vehicle-service/parts" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Back to Parts Inventory</Link>

        {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}
        {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">{error}</div>}

        {!loading && part && (
          <>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {part.product_images?.[0] ? (
                        <img src={part.product_images[0].imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">🔧</span>
                      )}
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setShowImageDialog(true)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {part.product_images?.[0] ? 'Replace' : 'Upload'} Image
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{part.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{part.sku}{part.barcode ? ` · ${part.barcode}` : ''}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {part.business_categories?.domain?.emoji} {part.business_categories?.domain?.name} → {part.business_categories?.emoji} {part.business_categories?.name}
                      {part.inventory_subcategory && ` → ${part.inventory_subcategory.emoji || ''} ${part.inventory_subcategory.name}`}
                    </p>
                  </div>
                </div>
                <a
                  href="/universal/barcode-management/print-jobs/new"
                  className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
                >
                  🏷️ Print Label
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Condition</p>
                  <p className="text-gray-900 dark:text-white">{part.condition}{part.partType ? ` · ${part.partType}` : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Brand</p>
                  <p className="text-gray-900 dark:text-white">{part.business_brands?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Supplier</p>
                  <p className="text-gray-900 dark:text-white">{part.business_suppliers?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Location</p>
                  <p className="text-gray-900 dark:text-white">{part.business_locations ? `${part.business_locations.name} (${part.business_locations.locationCode})` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Selling Price</p>
                  <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(Number(part.basePrice))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Cost Price</p>
                  <p className="text-gray-900 dark:text-white">{part.costPrice ? formatCurrency(Number(part.costPrice)) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">In Stock</p>
                  <p className="text-gray-900 dark:text-white font-medium">{variant ? variant.stockQuantity : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Reorder Level</p>
                  <p className="text-gray-900 dark:text-white">{variant ? variant.reorderLevel : '—'}</p>
                </div>
              </div>

              {part.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">{part.description}</p>}

              {canManage && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => setActionModal('receive')} className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg">➕ Receive Stock</button>
                  <button onClick={() => setActionModal('return')} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">↩️ Process Return</button>
                  <button onClick={() => setActionModal('internal-use')} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">🧰 Internal Use</button>
                  <button onClick={() => setActionModal('adjust')} className="px-3 py-1.5 text-xs border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20">🧾 Adjust Stock</button>
                  <button onClick={() => setActionModal('write-off')} className="px-3 py-1.5 text-xs border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">💥 Write Off</button>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Vehicle Compatibility</h4>
              {part.vehicle_part_compatibility.length === 0 ? (
                <p className="text-sm text-gray-400">Not vehicle-specific (e.g. a workshop tool or consumable).</p>
              ) : (
                <div className="space-y-1.5">
                  {part.vehicle_part_compatibility.map((c: any) => (
                    <div key={c.id} className="text-sm text-gray-700 dark:text-gray-300 flex flex-wrap gap-x-3">
                      <span className="font-medium">{[c.vehicleMake, c.vehicleModel].filter(Boolean).join(' ')}</span>
                      {(c.yearFrom || c.yearTo) && <span>{c.yearFrom || '…'}–{c.yearTo || '…'}</span>}
                      {c.engineSpec && <span>{c.engineSpec}</span>}
                      {c.transmissionType && <span>{c.transmissionType}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Stock Movement History</h4>
              {part.business_stock_movements.length === 0 ? (
                <p className="text-sm text-gray-400">No stock movements recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 dark:text-gray-500 uppercase">
                        <th className="pr-4 py-1.5">Date</th>
                        <th className="pr-4 py-1.5">Type</th>
                        <th className="pr-4 py-1.5">Qty</th>
                        <th className="pr-4 py-1.5">By</th>
                        <th className="py-1.5">Reference / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {part.business_stock_movements.map((m: any) => (
                        <tr key={m.id}>
                          <td className="pr-4 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{new Date(m.createdAt).toLocaleString()}</td>
                          <td className="pr-4 py-1.5 whitespace-nowrap">{MOVEMENT_LABELS[m.movementType] || m.movementType}</td>
                          <td className={`pr-4 py-1.5 whitespace-nowrap font-medium ${m.quantity < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td className="pr-4 py-1.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{m.employees?.fullName || '—'}</td>
                          <td className="py-1.5 text-gray-500 dark:text-gray-400">{m.reference || m.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {actionModal && variant && (
        <StockActionModal
          action={actionModal}
          partId={params.partId}
          currentStock={variant.stockQuantity}
          onClose={() => setActionModal(null)}
          onDone={() => { setActionModal(null); fetchPart() }}
        />
      )}

      {showImageDialog && part && (
        <ImageUploadDialog
          businessId={part.businessId}
          itemId={part.id}
          itemName={part.name}
          sourceTable="BUSINESS_PRODUCT"
          currentImageUrl={part.product_images?.[0]?.imageUrl ?? null}
          onClose={() => setShowImageDialog(false)}
          onSaved={() => { setShowImageDialog(false); fetchPart() }}
        />
      )}
    </ContentLayout>
  )
}

function StockActionModal({ action, partId, currentStock, onClose, onDone }: {
  action: 'receive' | 'adjust' | 'write-off' | 'return' | 'internal-use'
  partId: string
  currentStock: number
  onClose: () => void
  onDone: () => void
}) {
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [movementType, setMovementType] = useState<'DAMAGE' | 'THEFT'>('DAMAGE')
  const [direction, setDirection] = useState<'customer' | 'supplier'>('customer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titles: Record<string, string> = {
    receive: '➕ Receive Stock',
    adjust: '🧾 Adjust Stock',
    'write-off': '💥 Write Off Stock',
    return: '↩️ Process Return',
    'internal-use': '🧰 Record Internal Use',
  }

  const handleSubmit = async () => {
    setError(null)
    const qty = action === 'adjust' ? parseFloat(quantity) : parseInt(quantity)
    if (!quantity || isNaN(qty) || (action !== 'adjust' && qty <= 0) || (action === 'adjust' && qty === 0)) {
      setError('Enter a valid quantity')
      return
    }
    setSubmitting(true)
    try {
      let url = `/api/vehicle-service/parts/${partId}/${action}`
      let body: any = {}
      if (action === 'receive') body = { quantity: qty, unitCost: unitCost ? parseFloat(unitCost) : undefined, reference: reference || undefined }
      else if (action === 'adjust') body = { quantityDelta: qty, reason }
      else if (action === 'write-off') body = { quantity: qty, movementType, reason }
      else if (action === 'return') body = { direction, quantity: qty, reference: reference || undefined, reason: reason || undefined }
      else if (action === 'internal-use') body = { quantity: qty, notes: reason || undefined }

      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      onDone()
    } catch {
      setError('Connection error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={submitting ? undefined : onClose} />
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{titles[action]}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Current stock: {currentStock}</p>
          </div>
          <div className="px-6 py-4 space-y-3">
            {action === 'return' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Return Direction</label>
                <select value={direction} onChange={e => setDirection(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="customer">Customer return (stock up)</option>
                  <option value="supplier">Supplier return (stock down)</option>
                </select>
              </div>
            )}
            {action === 'write-off' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select value={movementType} onChange={e => setMovementType(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="DAMAGE">Damaged</option>
                  <option value="THEFT">Stolen / Lost</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {action === 'adjust' ? 'Quantity change (+/-)' : 'Quantity'}
              </label>
              <input type="number" step={action === 'adjust' ? '1' : undefined} value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            {action === 'receive' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit Cost</label>
                  <input type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reference</label>
                  <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="PO number, invoice #, etc."
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </>
            )}
            {action === 'return' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reference</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Receipt/order number"
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            )}
            {(action === 'adjust' || action === 'write-off' || action === 'return' || action === 'internal-use') && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {action === 'internal-use' ? 'Notes (optional)' : action === 'return' ? 'Reason (optional)' : 'Reason'}
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                  className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button onClick={onClose} disabled={submitting} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium">
              {submitting ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
