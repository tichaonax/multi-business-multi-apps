'use client'

export const dynamic = 'force-dynamic'
import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'

interface RequestItem {
  id: string
  description?: string | null
  amount: number
  status: string
  approvedAmount?: number | null
  approvalNote?: string | null
  managerNote?: string | null
  category?: { id: string; name: string } | null
  subcategory?: { id: string; name: string } | null
}

interface PaymentRequest {
  id: string
  businessId: string
  supplier: { id: string; name: string; emoji?: string | null }
  expenseAccount: { id: string; accountName: string }
  amount: number
  paidAmount: number
  remainingAmount: number
  dueDate: string
  submittedAt: string
  status: string
  notes?: string | null
  denialNote?: string | null
  receiptNumber?: string | null
  items?: RequestItem[]
}

const ITEM_STATUS_STYLES: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  DENIED:   'bg-red-100 text-red-700',
  PAID:     'bg-green-100 text-green-700',
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  DENIED: 'bg-red-100 text-red-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  PAID: 'bg-green-100 text-green-800',
}

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Custom', value: 'custom' },
]

function fmt(amount: number) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getRemaining(r: PaymentRequest): number {
  if (r.items && r.items.length > 0) {
    const approvedTotal = r.items
      .filter(i => ['APPROVED', 'PAID'].includes(i.status))
      .reduce((s, i) => s + (i.approvedAmount ?? i.amount), 0)
    return Math.max(0, approvedTotal - r.paidAmount)
  }
  return r.remainingAmount
}

export default function MyRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId, loading: businessLoading, hasPermission } = useBusinessPermissionsContext()

  const canSubmit = hasPermission('canSubmitSupplierPaymentRequests')

  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [datePreset, setDatePreset] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Row state
  const [expandedDenial, setExpandedDenial] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Supplier view modal
  const [viewSupplier, setViewSupplier] = useState<any | null>(null)
  const [viewSupplierLoading, setViewSupplierLoading] = useState(false)

  const openSupplierView = async (supplierId: string, businessId: string) => {
    setViewSupplierLoading(true)
    try {
      const res = await fetch(`/api/business/${businessId}/suppliers/${supplierId}`)
      if (res.ok) {
        const data = await res.json()
        setViewSupplier({ ...data.supplier, businessId })
      }
    } catch { /* non-blocking */ } finally {
      setViewSupplierLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return
    if (!canSubmit) {
      router.push('/')
      return
    }
    loadRequests()
  }, [businessLoading, currentBusinessId, canSubmit, statusFilter, datePreset, startDate, endDate])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId! })
      if (statusFilter) params.set('status', statusFilter)
      if (datePreset && datePreset !== 'custom') {
        // Translate preset to date range
        const now = new Date()
        let s: Date | null = null
        let e: Date | null = null
        if (datePreset === 'today') {
          s = new Date(now); s.setHours(0, 0, 0, 0)
          e = new Date(now); e.setHours(23, 59, 59, 999)
        } else if (datePreset === 'yesterday') {
          s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0)
          e = new Date(now); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59, 999)
        } else if (datePreset === 'this_week') {
          s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0)
        } else if (datePreset === 'this_month') {
          s = new Date(now.getFullYear(), now.getMonth(), 1)
        }
        if (s) params.set('startDate', s.toISOString().slice(0, 10))
        if (e) params.set('endDate', e.toISOString().slice(0, 10))
      } else if (datePreset === 'custom') {
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
      }

      const res = await fetchWithValidation(`/api/supplier-payments/requests?${params}`)
      setRequests(res.data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const cancelRequest = async (id: string) => {
    setCancellingId(id)
    try {
      await fetchWithValidation(`/api/supplier-payments/requests/${id}`, { method: 'DELETE' })
      toast.push('Request cancelled')
      loadRequests()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel request')
    } finally {
      setCancellingId(null)
    }
  }

  // Summary counts
  const counts = { PENDING: 0, APPROVED: 0, DENIED: 0, PARTIAL: 0, PAID: 0 }
  for (const r of requests) {
    if (r.status in counts) counts[r.status as keyof typeof counts]++
  }

  if (businessLoading) {
    return (
      <ContentLayout title="My Payment Requests">
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title="My Payment Requests">
      <div className="space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Pending', key: 'PENDING', color: 'amber' },
            { label: 'Approved', key: 'APPROVED', color: 'blue' },
            { label: 'Denied', key: 'DENIED', color: 'red' },
            { label: 'Partial', key: 'PARTIAL', color: 'orange' },
            { label: 'Paid', key: 'PAID', color: 'green' },
          ].map(({ label, key, color }) => (
            <div key={key} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold text-${color}-700`}>{counts[key as keyof typeof counts]}</div>
              <div className={`text-xs text-${color}-600 mt-0.5`}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          {/* Date presets */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date Range</label>
            <div className="flex gap-1 flex-wrap">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setDatePreset(prev => prev === p.value ? '' : p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    datePreset === p.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date inputs */}
          {datePreset === 'custom' && (
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
            </div>
          )}

          {/* Status filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          {/* Submit new */}
          <button
            onClick={() => router.push('/supplier-payments/request')}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + New Request
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-sm">No requests found</p>
              <button
                onClick={() => router.push('/supplier-payments/request')}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Submit Your First Request
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Supplier</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Paid</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Remaining</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Due</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Submitted</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map(r => {
                  const canEdit = r.status === 'PENDING' && r.paidAmount === 0
                  const isDenied = r.status === 'DENIED'
                  const denialExpanded = expandedDenial === r.id

                  return (
                    <React.Fragment key={r.id}>
                      <tr className={`hover:bg-gray-50 ${isDenied ? 'opacity-70' : ''}`}>
                        <td className="px-4 py-3">
                          <div>
                            <button
                              onClick={() => openSupplierView(r.supplier.id, r.businessId)}
                              disabled={viewSupplierLoading}
                              className="font-medium text-gray-900 hover:text-blue-600 hover:underline text-left disabled:opacity-60"
                            >
                              {r.supplier.emoji ? `${r.supplier.emoji} ` : ''}{r.supplier.name}
                            </button>
                          </div>
                          {r.items && r.items.length > 0 && (
                            <button
                              onClick={() => setExpandedItems(prev => prev === r.id ? null : r.id)}
                              className="text-xs text-blue-600 hover:underline mt-0.5 flex items-center gap-0.5"
                            >
                              {expandedItems === r.id ? '▾' : '▸'} {r.items.length} item{r.items.length !== 1 ? 's' : ''}
                            </button>
                          )}
                          {r.receiptNumber && (
                            <div className="text-xs text-gray-400 mt-0.5">#{r.receiptNumber}</div>
                          )}
                          {r.notes && (
                            <div className="text-xs text-gray-400 truncate max-w-[180px]">{r.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(r.amount)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-green-700">{fmt(r.paidAmount)}</span>
                          {(r.status === 'PARTIAL' || (r.status === 'PAID' && getRemaining(r) > 0.001)) && (
                            <div className="text-xs text-orange-600 font-medium">partial</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-700">{fmt(getRemaining(r))}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{fmtDate(r.dueDate)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                            {r.status}
                          </span>
                          {isDenied && r.denialNote && (
                            <button
                              onClick={() => setExpandedDenial(prev => prev === r.id ? null : r.id)}
                              className="block mx-auto mt-1 text-xs text-red-500 underline hover:text-red-700"
                            >
                              {denialExpanded ? 'Hide note' : 'See note'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 text-xs">{fmtDate(r.submittedAt)}</td>
                        <td className="px-4 py-3 text-center">
                          {canEdit && (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => router.push(`/supplier-payments/request?edit=${r.id}`)}
                                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => cancelRequest(r.id)}
                                disabled={cancellingId === r.id}
                                className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200 disabled:opacity-50"
                              >
                                {cancellingId === r.id ? '...' : 'Cancel'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Denial note expansion row */}
                      {isDenied && denialExpanded && r.denialNote && (
                        <tr key={`${r.id}-denial`} className="bg-red-50 border-l-4 border-red-400">
                          <td colSpan={8} className="px-4 py-2">
                            <p className="text-xs font-medium text-red-700 mb-0.5">Denial Note:</p>
                            <p className="text-sm text-red-800">{r.denialNote}</p>
                          </td>
                        </tr>
                      )}

                      {/* Items breakdown with per-item status */}
                      {expandedItems === r.id && r.items && r.items.length > 0 && (
                        <tr key={`${r.id}-items`} className="bg-gray-50">
                          <td colSpan={8} className="px-5 py-3">
                            <div className="rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="text-left px-3 py-1.5 text-xs font-medium text-gray-500">Description</th>
                                    <th className="text-left px-3 py-1.5 text-xs font-medium text-gray-500">Category</th>
                                    <th className="text-center px-3 py-1.5 text-xs font-medium text-gray-500">Status</th>
                                    <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-500">Submitted</th>
                                    <th className="text-right px-3 py-1.5 text-xs font-medium text-gray-500">Approved</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {r.items.map((item, idx) => (
                                    <React.Fragment key={item.id}>
                                      <tr>
                                        <td className="px-3 py-2 text-gray-800">
                                          {item.description || <span className="italic text-gray-400">Item {idx + 1}</span>}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-gray-500">
                                          {[item.category?.name, item.subcategory?.name].filter(Boolean).join(' › ') || '—'}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ITEM_STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {item.status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-gray-900">{fmt(item.amount)}</td>
                                        <td className="px-3 py-2 text-right">
                                          {item.approvedAmount != null ? (
                                            <span className="font-medium text-amber-700">{fmt(item.approvedAmount)}</span>
                                          ) : ['APPROVED', 'PAID'].includes(item.status) ? (
                                            <span className="text-green-700">{fmt(item.amount)}</span>
                                          ) : (
                                            <span className="text-gray-300">—</span>
                                          )}
                                        </td>
                                      </tr>
                                      {(item.approvalNote || item.managerNote) && (
                                        <tr className="bg-amber-50">
                                          <td colSpan={5} className="px-3 py-1.5 border-t border-amber-100">
                                            {item.approvalNote && (
                                              <div className="flex items-start gap-1.5 mb-0.5">
                                                <span className="text-blue-500 text-xs mt-0.5 shrink-0">✓</span>
                                                <p className="text-xs text-blue-800">{item.approvalNote}</p>
                                              </div>
                                            )}
                                            {item.managerNote && (
                                              <div className="flex items-start gap-1.5">
                                                <span className="text-amber-500 text-xs mt-0.5 shrink-0">💬</span>
                                                <p className="text-xs text-amber-800">{item.managerNote}</p>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Supplier view modal */}
      {viewSupplier && (
        <SupplierEditor
          supplier={viewSupplier}
          businessId={viewSupplier.businessId}
          onSave={() => setViewSupplier(null)}
          onCancel={() => setViewSupplier(null)}
          viewOnly
        />
      )}
    </ContentLayout>
  )
}
