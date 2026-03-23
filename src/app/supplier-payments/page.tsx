'use client'

export const dynamic = 'force-dynamic'
import React, { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import fetchWithValidation from '@/lib/fetchWithValidation'
import { SupplierEditor } from '@/components/suppliers/supplier-editor'
import { StarRating } from '@/components/ui/star-rating'

interface RequestItem {
  id: string
  description?: string | null
  amount: number
  taxAmount?: number | null
  status: string  // PENDING | APPROVED | DENIED | PAID
  approvedAmount?: number | null
  approvalNote?: string | null
  managerNote?: string | null
  category?: { id: string; name: string; emoji?: string | null } | null
  subcategory?: { id: string; name: string; emoji?: string | null } | null
}

const ITEM_STATUS_STYLES: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DENIED:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PAID:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

interface PaymentRequest {
  id: string
  businessId: string
  supplier: { id: string; name: string; emoji?: string | null }
  expenseAccount: { id: string; accountName: string }
  submitter: { id: string; name: string }
  approver?: { id: string; name: string } | null
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

interface ExpenseAccount {
  id: string
  accountName: string
  accountNumber: string
  balance: number
  isActive: boolean
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-800',
  QUEUED:   'bg-indigo-100 text-indigo-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  DENIED:   'bg-red-100 text-red-800',
  PARTIAL:  'bg-orange-100 text-orange-800',
  PAID:     'bg-green-100 text-green-800',
}

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Custom', value: 'custom' },
]

function fmt(amount: number) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
// Remaining = approved total − paid amount (for item-based requests).
// For non-item requests falls back to server-computed remainingAmount.
function getRemaining(r: PaymentRequest): number {
  if (r.items && r.items.length > 0) {
    const approvedTotal = r.items
      .filter(i => ['APPROVED', 'PAID'].includes(i.status))
      .reduce((s, i) => s + (i.approvedAmount ?? i.amount), 0)
    return Math.max(0, approvedTotal - r.paidAmount)
  }
  return r.remainingAmount
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function isOverdue(dueDate: string, status: string) {
  if (!['PENDING', 'QUEUED', 'APPROVED', 'PARTIAL'].includes(status)) return false
  return new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
}
function daysOverdue(dueDate: string) {
  const today = new Date(new Date().setHours(0, 0, 0, 0))
  return Math.floor((today.getTime() - new Date(dueDate).getTime()) / 86400000)
}
function isDueThisWeek(dueDate: string, status: string) {
  if (!['PENDING', 'QUEUED', 'APPROVED', 'PARTIAL'].includes(status)) return false
  const d = new Date(dueDate)
  const today = new Date()
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7)
  return d >= today && d <= weekEnd
}

export default function SupplierPaymentQueuePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId, loading: businessLoading, hasPermission, activeBusinesses } = useBusinessPermissionsContext()

  const canViewQueue = hasPermission('canViewSupplierPaymentQueue')
  const canApprove = hasPermission('canApproveSupplierPayments')
  const canCrossBusinessReports = hasPermission('canViewCrossBusinessReports')

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [accounts, setAccounts] = useState<ExpenseAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [submitterSearch, setSubmitterSearch] = useState('')
  const [datePreset, setDatePreset] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Expanded detail row + item selection
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [actionAmount, setActionAmount] = useState('')

  // Per-item action loading
  const [itemActionLoading, setItemActionLoading] = useState(false)

  // Auto-calculate total of selected items whenever selection changes
  const selectedTotal = useMemo(() => {
    if (!expandedId) return 0
    const req = requests.find(r => r.id === expandedId)
    if (!req?.items) return 0
    return req.items
      .filter(i => selectedItemIds.has(i.id))
      .reduce((s, i) => s + i.amount, 0)
  }, [expandedId, selectedItemIds, requests])

  useEffect(() => {
    setActionAmount(selectedTotal > 0 ? selectedTotal.toFixed(2) : '')
  }, [selectedTotal])

  // Action state
  const [queuingId, setQueuingId] = useState<string | null>(null)

  // Supplier view modal
  const [viewSupplier, setViewSupplier] = useState<any | null>(null)
  const [viewSupplierLoading, setViewSupplierLoading] = useState(false)
  const [viewSupplierRating, setViewSupplierRating] = useState<number | null>(null)

  const openSupplierView = async (supplierId: string, businessId: string) => {
    setViewSupplierLoading(true)
    try {
      const [supplierRes, summaryRes] = await Promise.all([
        fetch(`/api/business/${businessId}/suppliers/${supplierId}`),
        fetch(`/api/business/${businessId}/suppliers/payment-summaries`),
      ])
      if (supplierRes.ok) {
        const data = await supplierRes.json()
        setViewSupplier({ ...data.supplier, businessId })
      }
      if (summaryRes.ok) {
        const sumData = await summaryRes.json()
        setViewSupplierRating(sumData.summaries?.[supplierId]?.averageRating ?? null)
      }
    } catch { /* non-blocking */ } finally {
      setViewSupplierLoading(false)
    }
  }

  // Deny modal
  const [denyTarget, setDenyTarget] = useState<{ request: PaymentRequest; itemIds?: string[] } | null>(null)
  const [denialNote, setDenialNote] = useState('')
  const [denyingSubmitting, setDenyingSubmitting] = useState(false)

  // Pay modal
  const [payTarget, setPayTarget] = useState<PaymentRequest | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payAccountId, setPayAccountId] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [payItemIds, setPayItemIds] = useState<string[] | null>(null)
  const [payRating, setPayRating] = useState(0)
  const [paySubmitting, setPaySubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return
    if (!canViewQueue) {
      router.push('/')
      return
    }
    setSelectedBusinessId(currentBusinessId)
  }, [businessLoading, currentBusinessId, canViewQueue])

  useEffect(() => {
    if (!selectedBusinessId) return
    loadData()
  }, [selectedBusinessId, statusFilter, datePreset, startDate, endDate])

  useEffect(() => {
    if (!selectedBusinessId) return
    loadAccounts()
  }, [selectedBusinessId])

  // When accounts refresh while the pay modal is open, if the stored payAccountId
  // is no longer in the valid list (e.g. it had negative balance and was filtered out),
  // auto-select the first available account so selectedPayAccount is never null.
  useEffect(() => {
    if (!payTarget || accounts.length === 0) return
    if (!accounts.find(a => a.id === payAccountId)) {
      setPayAccountId(accounts[0].id)
    }
  }, [accounts, payTarget])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId: selectedBusinessId })
      if (statusFilter) params.set('status', statusFilter)
      if (datePreset && datePreset !== 'custom') {
        const now = new Date()
        let s: Date | null = null
        let e: Date | null = null
        if (datePreset === 'today') {
          s = new Date(now); s.setHours(0, 0, 0, 0)
          e = new Date(now); e.setHours(23, 59, 59, 999)
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
      params.set('limit', '200')

      const res = await fetchWithValidation(`/api/supplier-payments/requests?${params}`)
      setRequests(res.data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const res = await fetchWithValidation(`/api/expense-account?businessId=${selectedBusinessId}`)
      setAccounts((res.data?.accounts || []).filter((a: ExpenseAccount) => a.isActive && a.balance > 0))
    } catch {
      // non-blocking
    }
  }

  // Client-side filtered list
  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (supplierSearch && !r.supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())) return false
      if (submitterSearch && !r.submitter.name.toLowerCase().includes(submitterSearch.toLowerCase())) return false
      return true
    })
  }, [requests, supplierSearch, submitterSearch])

  // Summary bar
  const summary = useMemo(() => {
    const active = requests.filter(r => !['PAID', 'DENIED'].includes(r.status))
    return {
      pendingCount: requests.filter(r => r.status === 'PENDING').length,
      amountOwed: active.reduce((s, r) => s + getRemaining(r), 0),
      overdueCount: active.filter(r => isOverdue(r.dueDate, r.status)).length,
      dueThisWeek: active.filter(r => isDueThisWeek(r.dueDate, r.status)).length,
    }
  }, [requests])

  // Actions
  const handleQueue = async (r: PaymentRequest) => {
    setQueuingId(r.id)
    try {
      await fetchWithValidation(`/api/supplier-payments/requests/${r.id}/queue`, { method: 'POST' })
      toast.push('Queued for cashier payment')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to queue payment')
    } finally {
      setQueuingId(null)
    }
  }

  // Toggle expand — clear selection when switching rows
  const toggleExpand = (requestId: string) => {
    setExpandedId(prev => {
      if (prev !== requestId) setSelectedItemIds(new Set())
      return prev === requestId ? null : requestId
    })
  }

  // Item checkbox helpers
  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId)
      return next
    })
  }

  const selectAllItems = (items: RequestItem[], statusFilter: string[]) => {
    const eligible = items.filter(i => statusFilter.includes(i.status)).map(i => i.id)
    setSelectedItemIds(new Set(eligible))
  }

  const clearSelection = () => setSelectedItemIds(new Set())

  // Approve selected items — opens override modal if amount is reduced
  const approveSelected = (r: PaymentRequest) => {
    const ids = Array.from(selectedItemIds).filter(id =>
      r.items?.find(i => i.id === id && i.status === 'PENDING')
    )
    if (ids.length === 0) return
    const parsedAction = parseFloat(actionAmount)
    const pendingTotal = r.items!
      .filter(i => ids.includes(i.id))
      .reduce((s, i) => s + i.amount, 0)
    const isOverride = !isNaN(parsedAction) && parsedAction < pendingTotal - 0.001

    if (isOverride) {
      // Open modal to collect required note
      setApproveOverrideTarget({ request: r, itemIds: ids, amount: parsedAction })
      setApproveNote('')
    } else {
      submitApprove(r.id, ids, undefined, undefined)
    }
  }

  const submitApprove = async (requestId: string, ids: string[], amount?: number, approvalNote?: string) => {
    setItemActionLoading(true)
    try {
      await fetchWithValidation(`/api/supplier-payments/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: ids,
          ...(amount !== undefined ? { amount } : {}),
          ...(approvalNote ? { approvalNote } : {}),
        }),
      })
      toast.push(`${ids.length} item${ids.length !== 1 ? 's' : ''} approved`)
      clearSelection()
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve items')
    } finally {
      setItemActionLoading(false)
    }
  }

  const submitApproveOverride = async () => {
    if (!approveOverrideTarget) return
    setApproveOverrideSubmitting(true)
    try {
      await fetchWithValidation(`/api/supplier-payments/requests/${approveOverrideTarget.request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: approveOverrideTarget.itemIds,
          amount: approveOverrideTarget.amount,
          approvalNote: approveNote.trim(),
        }),
      })
      toast.push(`${approveOverrideTarget.itemIds.length} item${approveOverrideTarget.itemIds.length !== 1 ? 's' : ''} approved`)
      setApproveOverrideTarget(null)
      clearSelection()
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve items')
    } finally {
      setApproveOverrideSubmitting(false)
    }
  }

  // Deny selected items (opens deny modal with itemIds in context)
  const openDeny = (r: PaymentRequest, itemIds?: string[]) => {
    setDenyTarget({ request: r, itemIds })
    setDenialNote('')
  }

  const denySelected = (r: PaymentRequest) => {
    const ids = Array.from(selectedItemIds).filter(id =>
      r.items?.find(i => i.id === id && ['PENDING', 'APPROVED'].includes(i.status))
    )
    if (ids.length === 0) return
    openDeny(r, ids)
  }

  const submitDeny = async () => {
    if (!denyTarget) return
    if (denialNote.trim().length < 5) {
      toast.error('Denial note must be at least 5 characters')
      return
    }
    setDenyingSubmitting(true)
    try {
      await fetchWithValidation(`/api/supplier-payments/requests/${denyTarget.request.id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denialNote: denialNote.trim(),
          ...(denyTarget.itemIds ? { itemIds: denyTarget.itemIds } : {}),
        }),
      })
      const msg = denyTarget.itemIds
        ? `${denyTarget.itemIds.length} item${denyTarget.itemIds.length !== 1 ? 's' : ''} denied`
        : 'Request denied'
      toast.push(msg)
      setDenyTarget(null)
      clearSelection()
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to deny request')
    } finally {
      setDenyingSubmitting(false)
    }
  }

  const openPay = (r: PaymentRequest, itemIds?: string[]) => {
    setPayTarget(r)
    setPayAccountId(r.expenseAccount.id)
    setPayNotes('')
    loadAccounts() // always refresh balances when opening the pay modal

    // For item-based requests: if no specific ids given, auto-select all APPROVED items
    const effectiveIds = itemIds ?? (
      r.items && r.items.length > 0
        ? r.items.filter(i => i.status === 'APPROVED').map(i => i.id)
        : undefined
    )

    if (effectiveIds && effectiveIds.length > 0 && r.items) {
      // Amount is locked to sum of approved amounts — not editable
      const itemSum = r.items.filter(i => effectiveIds.includes(i.id))
        .reduce((s, i) => s + (i.approvedAmount ?? i.amount), 0)
      setPayAmount(itemSum.toFixed(2))
      setPayItemIds(effectiveIds)
    } else {
      setPayAmount(getRemaining(r).toFixed(2))
      setPayItemIds(null)
    }
  }

  const paySelected = (r: PaymentRequest) => {
    const ids = Array.from(selectedItemIds).filter(id =>
      r.items?.find(i => i.id === id && i.status === 'APPROVED')
    )
    if (ids.length === 0) return
    openPay(r, ids)
  }

  const submitPay = async () => {
    if (!payTarget) return
    const parsed = parseFloat(payAmount)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Enter a valid positive amount')
      return
    }
    setPaySubmitting(true)
    try {
      await fetchWithValidation(`/api/supplier-payments/requests/${payTarget.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(payItemIds ? { itemIds: payItemIds, amount: parsed } : { amount: parsed }),
          expenseAccountId: payAccountId || undefined,
          notes: payNotes.trim() || undefined,
        }),
      })
      toast.push('Payment recorded')
      // Best-effort rating — don't fail payment if this fails
      if (payRating > 0) {
        fetch(`/api/business/${payTarget.businessId}/suppliers/${payTarget.supplier.id}/ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: payRating }),
        }).catch(() => { /* non-blocking */ })
      }
      setPayTarget(null)
      setPayItemIds(null)
      setPayRating(0)
      clearSelection()
      loadData()
      loadAccounts()
    } catch (err: any) {
      toast.error(err.message || 'Payment failed')
    } finally {
      setPaySubmitting(false)
    }
  }

  const selectedPayAccount = accounts.find(a => a.id === payAccountId) || null

  if (businessLoading) {
    return (
      <ContentLayout title="Supplier Payment Queue">
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title="Supplier Payment Queue">
      <div className="space-y-5">

        {/* Business selector (owners/admins with cross-business) */}
        {canCrossBusinessReports && activeBusinesses.length > 1 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Business:</label>
            <select
              value={selectedBusinessId}
              onChange={e => setSelectedBusinessId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {activeBusinesses.map(b => (
                <option key={b.businessId} value={b.businessId}>{b.businessName}</option>
              ))}
            </select>
          </div>
        )}

        {/* Summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-700">{summary.pendingCount}</div>
            <div className="text-xs text-amber-600 mt-0.5">Pending</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <div className="text-lg font-bold text-blue-700">{fmt(summary.amountOwed)}</div>
            <div className="text-xs text-blue-600 mt-0.5">Total Owed</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{summary.overdueCount}</div>
            <div className="text-xs text-red-600 mt-0.5">Overdue</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-700">{summary.dueThisWeek}</div>
            <div className="text-xs text-orange-600 mt-0.5">Due This Week</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          {/* Date presets */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <div className="flex gap-1">
              {DATE_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setDatePreset(prev => prev === p.value ? '' : p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    datePreset === p.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

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

          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Supplier</label>
            <input value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)}
              placeholder="Search supplier..."
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-36" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Submitted By</label>
            <input value={submitterSearch} onChange={e => setSubmitterSearch(e.target.value)}
              placeholder="Search name..."
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-32" />
          </div>

          <button onClick={loadData}
            className="ml-auto px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No requests found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Supplier</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Submitted By</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Submitted</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Approved</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Paid</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Remaining</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Due</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    {canApprove && (
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => {
                    const overdue = isOverdue(r.dueDate, r.status)
                    const days = overdue ? daysOverdue(r.dueDate) : 0
                    const isExpanded = expandedId === r.id
                    const hasItems = r.items && r.items.length > 0

                    return (
                      <React.Fragment key={r.id}>
                        <tr className={overdue ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'}>
                          <td className="px-4 py-3">
                            <div>
                              <button
                                onClick={() => openSupplierView(r.supplier.id, r.businessId)}
                                disabled={viewSupplierLoading}
                                className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline text-left disabled:opacity-60"
                              >
                                {r.supplier.emoji ? `${r.supplier.emoji} ` : ''}{r.supplier.name}
                              </button>
                            </div>
                            {overdue && (
                              <span className="inline-block text-xs bg-red-100 text-red-700 rounded px-1.5 py-0.5 mt-0.5">
                                {days}d overdue
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {hasItems && (
                                <button
                                  onClick={() => toggleExpand(r.id)}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                                >
                                  {isExpanded ? '▾' : '▸'} {r.items!.length} item{r.items!.length !== 1 ? 's' : ''}
                                </button>
                              )}
                              {r.receiptNumber && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">#{r.receiptNumber}</span>
                              )}
                            </div>
                            {r.notes && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[160px] mt-0.5">{r.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.submitter.name}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(r.amount)}</td>
                          <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-400">
                            {(() => {
                              if (!r.items || r.items.length === 0) return <span className="text-gray-400">—</span>
                              const approvedTotal = r.items
                                .filter(i => ['APPROVED', 'PAID'].includes(i.status))
                                .reduce((s, i) => s + (i.approvedAmount ?? i.amount), 0)
                              if (approvedTotal === 0) return <span className="text-gray-400">—</span>
                              const isPartial = Math.abs(approvedTotal - r.amount) > 0.001
                              return (
                                <span className={isPartial ? 'text-amber-600 dark:text-amber-400' : ''}>
                                  {fmt(approvedTotal)}
                                </span>
                              )
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-green-700 dark:text-green-400">{fmt(r.paidAmount)}</span>
                            {r.status === 'PARTIAL' && (
                              <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">partial</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-700 dark:text-orange-400">{fmt(getRemaining(r))}</td>
                          <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400 text-xs">{fmtDate(r.dueDate)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
                              {r.status}
                            </span>
                            {r.status === 'DENIED' && r.denialNote && (
                              <div className="text-xs text-red-500 dark:text-red-400 mt-0.5 max-w-[120px] truncate" title={r.denialNote}>
                                {r.denialNote}
                              </div>
                            )}
                          </td>
                          {canApprove && (
                            <td className="px-4 py-3 text-center">
                              <div className="flex gap-1 justify-center flex-wrap">
                                {r.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleQueue(r)}
                                      disabled={queuingId === r.id}
                                      className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                      {queuingId === r.id ? '...' : '⏳ Queue for Payment'}
                                    </button>
                                    <button
                                      onClick={() => openDeny(r)}
                                      className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200"
                                    >
                                      Deny
                                    </button>
                                  </>
                                )}
                                {r.status === 'QUEUED' && (
                                  <span className="text-xs text-indigo-600 dark:text-indigo-400 italic">In cashier queue</span>
                                )}
                                {(r.status === 'APPROVED' || r.status === 'PARTIAL' || (r.status === 'PAID' && getRemaining(r) > 0.001)) && (
                                  <button
                                    onClick={() => openPay(r)}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                                  >
                                    {r.status === 'APPROVED' ? 'Pay' : `Pay Balance (${fmt(getRemaining(r))})`}
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Expandable items detail row */}
                        {isExpanded && hasItems && (() => {
                          const items = r.items!
                          const actionableItems = items.filter(i => ['PENDING', 'APPROVED'].includes(i.status))
                          const pendingItems = items.filter(i => i.status === 'PENDING')
                          const approvedItems = items.filter(i => i.status === 'APPROVED')
                          const allActionableSelected = actionableItems.length > 0 && actionableItems.every(i => selectedItemIds.has(i.id))
                          const selectedPendingIds = Array.from(selectedItemIds).filter(id => pendingItems.some(i => i.id === id))
                          const selectedApprovedIds = Array.from(selectedItemIds).filter(id => approvedItems.some(i => i.id === id))

                          return (
                            <tr key={`${r.id}-detail`} className="bg-blue-50 dark:bg-blue-900/10">
                              <td colSpan={canApprove ? 9 : 8} className="px-6 py-3">
                                <div className="rounded-lg border border-blue-100 dark:border-blue-800 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-blue-100/60 dark:bg-blue-900/30">
                                      <tr>
                                        {canApprove && (
                                          <th className="px-3 py-2 w-8">
                                            <input
                                              type="checkbox"
                                              checked={allActionableSelected}
                                              onChange={e => e.target.checked
                                                ? selectAllItems(items, ['PENDING', 'APPROVED'])
                                                : clearSelection()
                                              }
                                              className="rounded border-gray-400 text-blue-600 cursor-pointer"
                                              title="Select all actionable items"
                                            />
                                          </th>
                                        )}
                                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Category</th>
                                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Submitted</th>
                                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Approved</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-blue-100 dark:divide-blue-800 bg-white dark:bg-gray-800">
                                      {items.map((item, idx) => {
                                        const isActionable = ['PENDING', 'APPROVED'].includes(item.status)
                                        const isChecked = selectedItemIds.has(item.id)
                                        return (
                                          <tr
                                            key={item.id}
                                            className={isChecked ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                                            onClick={() => isActionable && canApprove && toggleItem(item.id)}
                                            style={isActionable && canApprove ? { cursor: 'pointer' } : {}}
                                          >
                                            {canApprove && (
                                              <td className="px-3 py-2">
                                                {isActionable ? (
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleItem(item.id)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="rounded border-gray-400 text-blue-600 cursor-pointer"
                                                  />
                                                ) : (
                                                  <span className="block w-4 h-4" />
                                                )}
                                              </td>
                                            )}
                                            <td className="px-3 py-2">
                                              {item.description
                                                ? <span className="text-gray-800 dark:text-gray-200">{item.description}</span>
                                                : <span className="text-gray-400 dark:text-gray-500 italic">Item {idx + 1}</span>}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                                              {[item.category?.name, item.subcategory?.name].filter(Boolean).join(' › ') || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ITEM_STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {item.status}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                              {fmt(item.amount)}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {item.approvedAmount != null ? (
                                                <span className="font-medium text-amber-700 dark:text-amber-400">{fmt(item.approvedAmount)}</span>
                                              ) : item.status === 'APPROVED' || item.status === 'PAID' ? (
                                                <span className="text-green-700 dark:text-green-400">{fmt(item.amount)}</span>
                                              ) : (
                                                <span className="text-gray-300 dark:text-gray-600">—</span>
                                              )}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot className="bg-blue-100/60 dark:bg-blue-900/30">
                                      <tr>
                                        {canApprove && <td />}
                                        <td colSpan={3} className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 text-right">Total</td>
                                        <td className="px-3 py-1.5 text-right font-bold text-gray-900 dark:text-gray-100">{fmt(r.amount)}</td>
                                        <td />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>

                                {/* Action bar */}
                                {canApprove && selectedItemIds.size > 0 && (() => {
                                  const parsedAction = parseFloat(actionAmount)
                                  const amountValid = !isNaN(parsedAction) && parsedAction > 0 && parsedAction <= selectedTotal + 0.001
                                  const amountExceedsTotal = !isNaN(parsedAction) && parsedAction > selectedTotal + 0.001

                                  return (
                                    <div className="mt-3 space-y-2">
                                      {/* Total row */}
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
                                        </span>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                          Total: {fmt(selectedTotal)}
                                        </span>
                                        <button
                                          onClick={clearSelection}
                                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline"
                                        >
                                          Clear
                                        </button>
                                      </div>

                                      {/* Editable amount + action buttons */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1">
                                          <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Amount:</label>
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs">$</span>
                                            <input
                                              type="number"
                                              step="0.10"
                                              min="0.01"
                                              value={actionAmount}
                                              onChange={e => setActionAmount(e.target.value)}
                                              className={`border rounded-lg pl-5 pr-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 ${
                                                amountExceedsTotal
                                                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 focus:ring-red-400'
                                                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-400'
                                              }`}
                                            />
                                          </div>
                                          {amountExceedsTotal && (
                                            <span className="text-xs text-red-600 dark:text-red-400">exceeds {fmt(selectedTotal)}</span>
                                          )}
                                          {!isNaN(parsedAction) && parsedAction <= 0 && (
                                            <span className="text-xs text-red-600 dark:text-red-400">must be &gt; 0</span>
                                          )}
                                        </div>

                                        {selectedPendingIds.length > 0 && (
                                          <button
                                            onClick={() => approveSelected(r)}
                                            disabled={itemActionLoading || !amountValid}
                                            className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                                          >
                                            {itemActionLoading ? '...' : `✓ Approve ${selectedPendingIds.length} item${selectedPendingIds.length !== 1 ? 's' : ''} — ${fmt(parsedAction || 0)}`}
                                          </button>
                                        )}
                                        {selectedApprovedIds.length > 0 && (
                                          <button
                                            onClick={() => paySelected(r)}
                                            disabled={itemActionLoading || !amountValid}
                                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                                          >
                                            {`$ Pay ${selectedApprovedIds.length} item${selectedApprovedIds.length !== 1 ? 's' : ''} — ${fmt(parsedAction || 0)}`}
                                          </button>
                                        )}
                                        {(selectedPendingIds.length > 0 || selectedApprovedIds.length > 0) && (
                                          <button
                                            onClick={() => denySelected(r)}
                                            disabled={itemActionLoading}
                                            className="px-3 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 font-medium"
                                          >
                                            ✕ Deny selected
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })()}
                              </td>
                            </tr>
                          )
                        })()}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Approve override modal — shown when approving less than full item total */}
      {approveOverrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setApproveOverrideTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Approve with Adjusted Amount
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {approveOverrideTarget.request.supplier.name} — {approveOverrideTarget.itemIds.length} item{approveOverrideTarget.itemIds.length !== 1 ? 's' : ''}
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-4 text-sm">
              Approving <span className="font-semibold text-amber-800 dark:text-amber-300">{fmt(approveOverrideTarget.amount)}</span>
              {' '}instead of{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {fmt(approveOverrideTarget.request.items!
                  .filter(i => approveOverrideTarget.itemIds.includes(i.id))
                  .reduce((s, i) => s + i.amount, 0))}
              </span>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                Reason for adjusted amount <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-amber-600 dark:text-amber-400 ml-1">(visible to submitter)</span>
              </label>
              <input
                type="text"
                value={approveNote}
                onChange={e => setApproveNote(e.target.value)}
                autoFocus
                className="w-full border border-amber-400 dark:border-amber-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-400"
                placeholder="e.g. Chick feed not yet delivered, approving live chicks only"
              />
              {approveNote.trim().length > 0 && approveNote.trim().length < 3 && (
                <p className="text-xs text-red-600 mt-1">Please provide a reason (min 3 characters)</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitApproveOverride}
                disabled={approveOverrideSubmitting || approveNote.trim().length < 3}
                className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-60"
              >
                {approveOverrideSubmitting ? 'Approving...' : `Approve ${fmt(approveOverrideTarget.amount)}`}
              </button>
              <button
                onClick={() => setApproveOverrideTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deny modal */}
      {denyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDenyTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {denyTarget.itemIds ? `Deny ${denyTarget.itemIds.length} Item${denyTarget.itemIds.length !== 1 ? 's' : ''}` : 'Deny Payment Request'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {denyTarget.request.supplier.emoji ? `${denyTarget.request.supplier.emoji} ` : ''}{denyTarget.request.supplier.name} — {fmt(denyTarget.request.amount)}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Denial Note <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1">(min 5 chars)</span>
              </label>
              <textarea
                value={denialNote}
                onChange={e => setDenialNote(e.target.value)}
                rows={3}
                autoFocus
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                placeholder="Explain why this request is being denied..."
              />
              <div className="text-xs text-gray-400 dark:text-gray-500 text-right mt-0.5">{denialNote.trim().length} chars</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitDeny}
                disabled={denyingSubmitting || denialNote.trim().length < 5}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {denyingSubmitting ? 'Denying...' : denyTarget.itemIds ? `Deny ${denyTarget.itemIds.length} Item${denyTarget.itemIds.length !== 1 ? 's' : ''}` : 'Deny Request'}
              </button>
              <button
                onClick={() => setDenyTarget(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPayTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {payTarget.status === 'PARTIAL' ? 'Record Additional Payment' : 'Record Payment'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {payTarget.supplier.emoji ? `${payTarget.supplier.emoji} ` : ''}{payTarget.supplier.name}
            </p>

            {/* Payment summary */}
            {(() => {
              const approvedTotal = payItemIds && payTarget.items
                ? payTarget.items.filter(i => payItemIds.includes(i.id))
                    .reduce((s, i) => s + (i.approvedAmount ?? i.amount), 0)
                : null
              const unpaid = approvedTotal !== null
                ? Math.max(0, approvedTotal - payTarget.paidAmount)
                : getRemaining(payTarget)
              return (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {approvedTotal !== null ? 'Approved' : 'Requested'}
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {fmt(approvedTotal ?? payTarget.amount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Paid So Far</div>
                    <div className="font-semibold text-green-700 text-sm">{fmt(payTarget.paidAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Unpaid</div>
                    <div className="font-semibold text-orange-700 text-sm">{fmt(unpaid)}</div>
                  </div>
                </div>
              )
            })()}

            {/* Items being paid */}
            {payItemIds && payTarget.items && payTarget.items.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Paying {payItemIds.length} item{payItemIds.length !== 1 ? 's' : ''}
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg divide-y divide-gray-100 dark:divide-gray-600 text-sm max-h-40 overflow-y-auto">
                  {payTarget.items.filter(i => payItemIds.includes(i.id)).map(item => (
                    <div key={item.id} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-gray-800 dark:text-gray-200 truncate">
                          {item.description || <span className="italic text-gray-400">No description</span>}
                        </div>
                        {(item.category || item.subcategory) && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {[item.category?.name, item.subcategory?.name].filter(Boolean).join(' › ')}
                          </div>
                        )}
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 shrink-0">
                        {item.approvedAmount != null ? (
                          <span className="text-amber-700 dark:text-amber-400">{fmt(item.approvedAmount)}</span>
                        ) : (
                          fmt(item.amount)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Receipt number if present */}
            {payTarget.receiptNumber && (
              <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Receipt: <span className="font-medium text-gray-700 dark:text-gray-300">#{payTarget.receiptNumber}</span>
              </div>
            )}

            {/* Expense account */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expense Account</label>
              {accounts.length === 0 ? (
                <div className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20">
                  No accounts with sufficient funds available
                </div>
              ) : (
                <select
                  value={payAccountId}
                  onChange={e => setPayAccountId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} — Balance: {fmt(a.balance)}
                    </option>
                  ))}
                </select>
              )}
              {selectedPayAccount && (
                <div className={`mt-1 text-xs ${selectedPayAccount.balance < parseFloat(payAmount || '0') ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                  Available balance: {fmt(selectedPayAccount.balance)}
                  {selectedPayAccount.balance < parseFloat(payAmount || '0') && ' — Insufficient'}
                </div>
              )}
              {/* Cross-account transfer notice */}
              {payTarget && selectedPayAccount && payAccountId !== payTarget.expenseAccount.id && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded px-2 py-1.5">
                  <span>Funds will be automatically transferred from this account to <strong>{payTarget.expenseAccount.accountName}</strong> before the supplier payment is recorded.</span>
                </div>
              )}
            </div>

            {/* Amount */}
            {(() => {
              const approvedCap = payItemIds && payTarget.items
                ? payTarget.items.filter(i => payItemIds.includes(i.id)).reduce((s, i) => s + (i.approvedAmount ?? i.amount), 0)
                : null
              const p = parseFloat(payAmount)
              const exceedsCap = approvedCap !== null && !isNaN(p) && p > approvedCap + 0.001
              const isZero = !isNaN(p) && p <= 0
              const exceedsRemaining = approvedCap === null && !isNaN(p) && p > getRemaining(payTarget)
              return (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Amount
                    {approvedCap !== null && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1">
                        (max: {fmt(approvedCap)})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">$</span>
                    <input
                      type="number" step="0.10" min="0.01"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        exceedsCap || isZero || exceedsRemaining
                          ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 focus:ring-red-400'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500'
                      }`}
                    />
                  </div>
                  {isZero && <div className="text-xs text-red-600 mt-1">Amount must be greater than zero</div>}
                  {exceedsCap && <div className="text-xs text-red-600 mt-1">Cannot exceed approved total ({fmt(approvedCap!)})</div>}
                  {exceedsRemaining && <div className="text-xs text-red-600 mt-1">Exceeds remaining balance</div>}
                  {approvedCap !== null && !isNaN(p) && p > 0 && p < approvedCap - 0.001 && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded px-2 py-1">
                      <span>Still outstanding after this payment:</span>
                      <span className="font-semibold">{fmt(approvedCap - p)}</span>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Notes — optional for all payments */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Payment reference, cheque number, etc."
              />
            </div>

            {/* Optional supplier rating */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rate this supplier <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <StarRating value={payRating} onChange={setPayRating} size="md" />
                {payRating > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayRating(0)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitPay}
                disabled={paySubmitting || accounts.length === 0 || !selectedPayAccount || !payAmount || parseFloat(payAmount) <= 0 || (() => {
                  const p = parseFloat(payAmount)
                  if (p > selectedPayAccount!.balance) return true
                  if (payItemIds && payTarget.items) {
                    const cap = payTarget.items.filter(i => payItemIds.includes(i.id)).reduce((s, i) => s + (i.approvedAmount ?? i.amount), 0)
                    return p > cap + 0.001
                  }
                  return p > getRemaining(payTarget)
                })()}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {paySubmitting ? 'Processing...' : 'Confirm Payment'}
              </button>
              <button
                onClick={() => { setPayTarget(null); setPayRating(0) }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier view modal — opens in-place so closing returns to this page */}
      {viewSupplier && (
        <SupplierEditor
          supplier={viewSupplier}
          businessId={viewSupplier.businessId}
          onSave={() => { setViewSupplier(null); setViewSupplierRating(null) }}
          onCancel={() => { setViewSupplier(null); setViewSupplierRating(null) }}
          viewOnly
          averageRating={viewSupplierRating}
        />
      )}
    </ContentLayout>
  )
}
