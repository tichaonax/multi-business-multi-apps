'use client'

import { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

// ── Types ────────────────────────────────────────────────────────────────────

interface AlertRow {
  batchId: string
  itemId: string
  name: string
  barcode: string
  sku: string
  quantity: number
  expiryDate: string
  daysUntilExpiry: number
  sellingPrice: number | null
}

interface ActionRow {
  id: string
  batchId: string
  actionType: string
  actionDate: string
  quantity: number
  notes: string | null
  newPrice: number | null
  discountPct: number | null
  itemName: string | null
  itemBarcode: string | null
  newItemId: string | null
}

type Tab = 'needs-action' | 'resolved'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ExpiryBadge({ days }: { days: number }) {
  if (days < 0) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
      Expired {Math.abs(days)}d ago
    </span>
  )
  if (days === 0) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
      Expires today
    </span>
  )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
      {days}d left
    </span>
  )
}

function ActionTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; className: string }> = {
    DISPOSE:         { label: 'Disposed',       className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
    PRICE_REDUCTION: { label: 'Price Reduction', className: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
    BOGO:            { label: 'BOGO',            className: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  }
  const { label, className } = map[type] ?? { label: type, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ExpiryManagementPage() {
  const { currentBusiness, hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const businessId = currentBusiness?.businessId

  const [tab, setTab] = useState<Tab>('needs-action')

  // Needs-action state
  const [expired, setExpired] = useState<AlertRow[]>([])
  const [nearExpiry, setNearExpiry] = useState<AlertRow[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)

  // Resolved state
  const [actions, setActions] = useState<ActionRow[]>([])
  const [actionsLoading, setActionsLoading] = useState(false)
  const [actionPage, setActionPage] = useState(1)
  const [actionTotalPages, setActionTotalPages] = useState(1)

  const canAct = isSystemAdmin || hasPermission('canManageExpiryActions')

  // ── Fetch alerts ─────────────────────────────────────────────────────────

  const fetchAlerts = useCallback(async () => {
    if (!businessId) return
    setAlertsLoading(true)
    try {
      const res = await fetch(`/api/expiry/alerts?businessId=${businessId}`)
      const json = await res.json()
      if (json.success) {
        setExpired(json.data.expired)
        setNearExpiry(json.data.nearExpiry)
      }
    } finally {
      setAlertsLoading(false)
    }
  }, [businessId])

  // ── Fetch actions ─────────────────────────────────────────────────────────

  const fetchActions = useCallback(async (page = 1) => {
    if (!businessId) return
    setActionsLoading(true)
    try {
      const res = await fetch(`/api/expiry/actions?businessId=${businessId}&page=${page}&limit=50`)
      const json = await res.json()
      if (json.success) {
        setActions(json.data)
        setActionTotalPages(json.pagination.totalPages)
        setActionPage(page)
      }
    } finally {
      setActionsLoading(false)
    }
  }, [businessId])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])
  useEffect(() => { if (tab === 'resolved') fetchActions(1) }, [tab, fetchActions])

  const totalNeeds = expired.length + nearExpiry.length
  const allNeedsAction = [...expired, ...nearExpiry]

  // ── Access guard ─────────────────────────────────────────────────────────

  const canView = isSystemAdmin || hasPermission('canViewStockAlerts') || hasPermission('canManageExpiryActions')
  if (!canView) {
    return (
      <MainLayout>
        <ContentLayout title="Expiry Management">
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            You don&apos;t have permission to view expiry alerts.
          </div>
        </ContentLayout>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <ContentLayout title="Expiry Management">
        <div className="max-w-5xl mx-auto">

          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expiry Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and resolve expired or near-expiry inventory batches.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setTab('needs-action')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'needs-action'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Needs Action
              {totalNeeds > 0 && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                  {totalNeeds}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('resolved')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'resolved'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Resolved
            </button>
          </div>

          {/* ── Needs Action tab ───────────────────────────────────────────── */}
          {tab === 'needs-action' && (
            <>
              {alertsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : totalNeeds === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No expiry issues found</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All tracked batches are within their expiry window.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Section: Expired */}
                  {expired.length > 0 && (
                    <>
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 mb-1">
                        Expired ({expired.length})
                      </h2>
                      {expired.map(row => (
                        <AlertCard key={row.batchId} row={row} canAct={canAct} onResolved={fetchAlerts} businessId={businessId!} />
                      ))}
                    </>
                  )}

                  {/* Section: Near Expiry */}
                  {nearExpiry.length > 0 && (
                    <>
                      <h2 className={`text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1 ${expired.length > 0 ? 'mt-5' : ''}`}>
                        Expiring Soon ({nearExpiry.length})
                      </h2>
                      {nearExpiry.map(row => (
                        <AlertCard key={row.batchId} row={row} canAct={canAct} onResolved={fetchAlerts} businessId={businessId!} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Resolved tab ──────────────────────────────────────────────── */}
          {tab === 'resolved' && (
            <>
              {actionsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : actions.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-3">📋</div>
                  <p className="text-gray-500 dark:text-gray-400">No actions recorded yet.</p>
                </div>
              ) : (
                <>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Item</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Action</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-400">Qty</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400">New Price</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Date</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {actions.map(a => (
                          <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-gray-900 dark:text-white">{a.itemName ?? '—'}</p>
                              {a.itemBarcode && <p className="text-xs text-gray-400 font-mono">{a.itemBarcode}</p>}
                            </td>
                            <td className="px-4 py-2.5"><ActionTypeBadge type={a.actionType} /></td>
                            <td className="px-4 py-2.5 text-center text-gray-700 dark:text-gray-300">{a.quantity}</td>
                            <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                              {a.newPrice != null ? `$${a.newPrice.toFixed(2)}` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(a.actionDate)}</td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">{a.notes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {actionTotalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <button
                        disabled={actionPage <= 1}
                        onClick={() => fetchActions(actionPage - 1)}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">
                        Page {actionPage} of {actionTotalPages}
                      </span>
                      <button
                        disabled={actionPage >= actionTotalPages}
                        onClick={() => fetchActions(actionPage + 1)}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </ContentLayout>
    </MainLayout>
  )
}

// ── AlertCard ─────────────────────────────────────────────────────────────────

interface AlertCardProps {
  row: AlertRow
  canAct: boolean
  businessId: string
  onResolved: () => void
}

function AlertCard({ row, canAct, businessId, onResolved }: AlertCardProps) {
  const isExpired = row.daysUntilExpiry < 0

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border ${
      isExpired
        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
        : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
    }`}>
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white truncate">{row.name}</span>
          <ExpiryBadge days={row.daysUntilExpiry} />
        </div>
        <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{row.quantity} unit{row.quantity !== 1 ? 's' : ''}</span>
          <span>Expires: {formatDate(row.expiryDate)}</span>
          {row.sellingPrice != null && <span>Price: ${row.sellingPrice.toFixed(2)}</span>}
          {row.barcode && <span className="font-mono">{row.barcode}</span>}
        </div>
      </div>

      {/* Action buttons — only if user has permission */}
      {canAct && (
        <div className="flex gap-2 flex-shrink-0">
          <DisposeButton row={row} businessId={businessId} onResolved={onResolved} />
          <DiscountButton row={row} businessId={businessId} onResolved={onResolved} />
        </div>
      )}
    </div>
  )
}

// ── Inline Dispose ────────────────────────────────────────────────────────────

function DisposeButton({ row, businessId, onResolved }: { row: AlertRow; businessId: string; onResolved: () => void }) {
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(String(row.quantity))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleDispose = async () => {
    const q = Number(qty)
    if (!q || q <= 0 || q > row.quantity) { setError(`Quantity must be between 1 and ${row.quantity}`); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/expiry/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, batchId: row.batchId, actionType: 'DISPOSE', quantity: q, notes: notes.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      setOpen(false)
      onResolved()
    } catch (e: any) {
      setError(e.message || 'Failed to dispose')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
      Dispose
    </button>
  )

  return (
    <div className="flex flex-col gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 w-56 shadow-sm">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Dispose expired stock</p>
      <input type="number" min={1} max={row.quantity} value={qty} onChange={e => setQty(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Qty" />
      <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Notes (optional)" />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-1.5">
        <button onClick={handleDispose} disabled={saving}
          className="flex-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium">
          {saving ? 'Saving…' : 'Confirm'}
        </button>
        <button onClick={() => setOpen(false)}
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Inline Discount ───────────────────────────────────────────────────────────

function DiscountButton({ row, businessId, onResolved }: { row: AlertRow; businessId: string; onResolved: () => void }) {
  const [open, setOpen] = useState(false)
  const [discountType, setDiscountType] = useState<'PRICE_REDUCTION' | 'BOGO'>('PRICE_REDUCTION')
  const [newPrice, setNewPrice] = useState(row.sellingPrice != null ? (row.sellingPrice * 0.5).toFixed(2) : '')
  const [qty, setQty] = useState(String(row.quantity))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleDiscount = async () => {
    const q = Number(qty)
    if (!q || q <= 0 || q > row.quantity) { setError(`Quantity must be between 1 and ${row.quantity}`); return }
    if (discountType === 'PRICE_REDUCTION' && (!newPrice || Number(newPrice) <= 0)) { setError('New price must be > 0'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/expiry/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId, batchId: row.batchId, actionType: discountType, quantity: q,
          notes: notes.trim() || undefined,
          newPrice: discountType === 'PRICE_REDUCTION' ? Number(newPrice) : undefined,
          newName: `${row.name} (${discountType === 'BOGO' ? 'BOGO' : 'Expiry Deal'})`,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed')
      setOpen(false)
      onResolved()
    } catch (e: any) {
      setError(e.message || 'Failed to apply discount')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
      Apply Discount
    </button>
  )

  return (
    <div className="flex flex-col gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 w-64 shadow-sm">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Create discounted product</p>

      <div className="flex gap-1.5">
        {(['PRICE_REDUCTION', 'BOGO'] as const).map(t => (
          <button key={t} onClick={() => setDiscountType(t)}
            className={`flex-1 px-2 py-1 text-xs rounded-lg border font-medium ${discountType === t ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            {t === 'BOGO' ? 'BOGO' : 'Price Cut'}
          </button>
        ))}
      </div>

      <input type="number" min={1} max={row.quantity} value={qty} onChange={e => setQty(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Qty to discount" />

      {discountType === 'PRICE_REDUCTION' && (
        <input type="number" min={0.01} step={0.01} value={newPrice} onChange={e => setNewPrice(e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="New price ($)" />
      )}

      <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Notes (optional)" />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-1.5">
        <button onClick={handleDiscount} disabled={saving}
          className="flex-1 px-2 py-1 text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium">
          {saving ? 'Saving…' : 'Confirm'}
        </button>
        <button onClick={() => setOpen(false)}
          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
          Cancel
        </button>
      </div>
    </div>
  )
}
