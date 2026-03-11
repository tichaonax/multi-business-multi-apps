'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatDate, formatCurrency } from '@/lib/date-format'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateInput } from '@/components/ui/date-input'

const todayStr = () => new Date().toISOString().split('T')[0]

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const LABEL_CLS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
const SUBMIT_CLS = 'px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50'
const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5'

export default function InventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const confirm = useConfirm()
  const { currentBusinessId, currentBusiness, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [businesses, setBusinesses] = useState<any[]>([])

  // Transfer form state per inventory id
  const [transferOpen, setTransferOpen] = useState<string | null>(null)
  const [transferForm, setTransferForm] = useState({
    movementDate: todayStr(),
    movementType: 'KITCHEN_OUT',
    quantity: '',
    destinationBusinessId: '',
    purpose: '',
    notes: '',
  })
  const [transferSubmitting, setTransferSubmitting] = useState(false)

  const fetchInventory = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/inventory?businessId=${currentBusinessId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load inventory')
      setInventory(json.data || [])
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, alert])

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch('/api/user/business-memberships', { credentials: 'include' })
      const json = await res.json()
      if (res.ok) setBusinesses(json.data || json || [])
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetchInventory()
    fetchBusinesses()
  }, [session, status, router, fetchInventory, fetchBusinesses])

  const handleOpenTransfer = (inventoryId: string) => {
    setTransferForm({ movementDate: todayStr(), movementType: 'KITCHEN_OUT', quantity: '', destinationBusinessId: '', purpose: '', notes: '' })
    setTransferOpen(inventoryId)
  }

  const handleTransferSubmit = async (inventoryId: string) => {
    if (!transferForm.quantity || Number(transferForm.quantity) <= 0) {
      await alert({ title: 'Invalid quantity', description: 'Quantity must be greater than 0.' })
      return
    }
    setTransferSubmitting(true)
    try {
      const res = await fetch(`/api/chicken-run/inventory/${inventoryId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          movementDate: transferForm.movementDate,
          movementType: transferForm.movementType,
          quantity: Number(transferForm.quantity),
          destinationBusinessId: transferForm.movementType === 'BUSINESS_TRANSFER' ? transferForm.destinationBusinessId || null : null,
          purpose: transferForm.purpose || null,
          notes: transferForm.notes || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Transfer failed')
      setTransferOpen(null)
      fetchInventory()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setTransferSubmitting(false)
    }
  }

  if (status === 'loading' || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated) return null

  const raised = inventory.filter(i => i.source === 'RAISED')
  const purchased = inventory.filter(i => i.source === 'PURCHASED')

  return (
    <ContentLayout title="Chicken Run — Inventory">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Link href="/chicken-run" className="hover:text-gray-700 dark:hover:text-gray-200">Chicken Run</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">Inventory</span>
        </nav>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
            {currentBusiness && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentBusiness.businessName}</p>
            )}
          </div>
          <Link
            href="/chicken-run/inventory/purchase"
            className={SUBMIT_CLS}
          >
            + Add Purchased Stock
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading inventory...</div>
        ) : (
          <>
            {/* Raised Stock */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Raised Stock ({raised.length})</h2>
              {raised.length === 0 ? (
                <div className={CARD_CLS + ' text-center'}>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No raised stock yet. Stock is added when a culling session is closed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {raised.map((item: any) => (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      businesses={businesses}
                      transferOpen={transferOpen}
                      transferForm={transferForm}
                      transferSubmitting={transferSubmitting}
                      onOpenTransfer={handleOpenTransfer}
                      onCloseTransfer={() => setTransferOpen(null)}
                      onTransferFormChange={setTransferForm}
                      onTransferSubmit={handleTransferSubmit}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Purchased Stock */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Purchased Stock ({purchased.length})</h2>
              {purchased.length === 0 ? (
                <div className={CARD_CLS + ' text-center'}>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No purchased stock yet.</p>
                  <Link href="/chicken-run/inventory/purchase" className="mt-2 inline-block text-sm text-green-600 dark:text-green-400 hover:underline">
                    Add purchased stock →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchased.map((item: any) => (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      businesses={businesses}
                      transferOpen={transferOpen}
                      transferForm={transferForm}
                      transferSubmitting={transferSubmitting}
                      onOpenTransfer={handleOpenTransfer}
                      onCloseTransfer={() => setTransferOpen(null)}
                      onTransferFormChange={setTransferForm}
                      onTransferSubmit={handleTransferSubmit}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ContentLayout>
  )
}

function InventoryCard({
  item,
  businesses,
  transferOpen,
  transferForm,
  transferSubmitting,
  onOpenTransfer,
  onCloseTransfer,
  onTransferFormChange,
  onTransferSubmit,
}: {
  item: any
  businesses: any[]
  transferOpen: string | null
  transferForm: any
  transferSubmitting: boolean
  onOpenTransfer: (id: string) => void
  onCloseTransfer: () => void
  onTransferFormChange: (f: any) => void
  onTransferSubmit: (id: string) => void
}) {
  const isOpen = item.weighingStatus === 'OPEN'
  const isTransferVisible = transferOpen === item.id

  return (
    <div className={CARD_CLS + ' space-y-4'}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {item.source === 'RAISED' ? 'Raised' : `Purchased${item.supplier?.name ? ` — ${item.supplier.name}` : ''}`}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isOpen
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
            }`}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(item.entryDate)}</p>
        </div>
        {!isOpen && (
          <div className="flex gap-2">
            {item.source === 'PURCHASED' && isOpen && (
              <Link
                href={`/chicken-run/inventory/${item.id}/weigh`}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Continue Weighing
              </Link>
            )}
            <button
              onClick={() => onOpenTransfer(item.id)}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
            >
              Transfer to Kitchen
            </button>
          </div>
        )}
        {isOpen && item.source === 'PURCHASED' && (
          <Link
            href={`/chicken-run/inventory/${item.id}/weigh`}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Continue Weighing
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Birds</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{item.quantityWhole}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total kg</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{Number(item.totalWeightKg).toFixed(3)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">In Freezer</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{item.quantityInFreezer}</p>
        </div>
        {item.source === 'PURCHASED' && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Cost/kg</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(Number(item.costPerKg))}</p>
          </div>
        )}
      </div>

      {/* Movements history */}
      {item.movements?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Movements</p>
          <div className="space-y-1">
            {item.movements.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded px-2 py-1">
                <span>{formatDate(m.movementDate)} — {m.movementType.replace('_', ' ')}</span>
                <span>{m.quantity} birds{m.weightKg ? ` · ${Number(m.weightKg).toFixed(3)} kg` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer form */}
      {isTransferVisible && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transfer from Freezer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <DateInput
                value={transferForm.movementDate}
                onChange={(d) => onTransferFormChange({ ...transferForm, movementDate: d })}
                label="Movement Date"
                compact={true}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Movement Type</label>
              <select
                value={transferForm.movementType}
                onChange={e => onTransferFormChange({ ...transferForm, movementType: e.target.value })}
                className={INPUT_CLS}
              >
                <option value="KITCHEN_OUT">Kitchen Out</option>
                <option value="BUSINESS_TRANSFER">Business Transfer</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Quantity (birds) — max {item.quantityInFreezer}</label>
              <input
                type="number"
                min="1"
                max={item.quantityInFreezer}
                value={transferForm.quantity}
                onChange={e => onTransferFormChange({ ...transferForm, quantity: e.target.value })}
                className={INPUT_CLS}
                placeholder="e.g. 10"
              />
            </div>
            {transferForm.movementType === 'BUSINESS_TRANSFER' && (
              <div>
                <label className={LABEL_CLS}>Destination Business</label>
                <select
                  value={transferForm.destinationBusinessId}
                  onChange={e => onTransferFormChange({ ...transferForm, destinationBusinessId: e.target.value })}
                  className={INPUT_CLS}
                >
                  <option value="">— Select business —</option>
                  {businesses.map((b: any) => (
                    <option key={b.businessId || b.id} value={b.businessId || b.id}>
                      {b.isUmbrellaBusiness ? 'All' : b.businessName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={LABEL_CLS}>Purpose (optional)</label>
              <input
                type="text"
                value={transferForm.purpose}
                onChange={e => onTransferFormChange({ ...transferForm, purpose: e.target.value })}
                className={INPUT_CLS}
                placeholder="e.g. Sunday roast"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Notes (optional)</label>
              <input
                type="text"
                value={transferForm.notes}
                onChange={e => onTransferFormChange({ ...transferForm, notes: e.target.value })}
                className={INPUT_CLS}
                placeholder="Additional notes"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onTransferSubmit(item.id)}
              disabled={transferSubmitting}
              className={SUBMIT_CLS}
            >
              {transferSubmitting ? 'Submitting...' : 'Submit Transfer'}
            </button>
            <button
              onClick={onCloseTransfer}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
