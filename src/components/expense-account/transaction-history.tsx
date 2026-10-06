'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { DateInput } from '@/components/ui/date-input'
import { EditPaymentModal } from './edit-payment-modal'
import { EditDepositModal } from './edit-deposit-modal'
import { PaymentDetailModal } from './payment-detail-modal'
import { DepositDetailModal } from './deposit-detail-modal'
import { ComboRequestDetailModal } from './combo-request-detail-modal'
import { ExpensePaymentVoucherModal, PaymentSummary } from './expense-payment-voucher-modal'
import { generatePaymentVoucherPdf } from './payment-voucher-pdf'
import { AddReceiptModal } from './add-receipt-modal'
import { ViewReceiptsModal } from './view-receipts-modal'
import { ReceiptReviewBadge } from './receipt-review-badge'
import { RowActionsMenu, type RowAction } from '@/components/ui/row-actions-menu'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { Pagination } from '@/components/ui/pagination'
import { usePageSize, PAGE_SIZE_OPTIONS } from '@/hooks/use-page-size-preference'
import { TableFillerRows } from '@/components/ui/table-filler-rows'
import { useElementHeight } from '@/hooks/use-element-height'

interface Transaction {
  id: string
  type: 'DEPOSIT' | 'PAYMENT'
  amount: number
  date: string
  paymentDate?: string | null // original requested date (payments only) — may predate `date` when paidAt was set later
  description: string
  balanceAfter: number
  // Deposit-specific
  sourceType?: string
  sourcePaymentId?: string | null
  sourceBusiness?: { id: string; name: string; type: string }
  depositSource?: { id: string; name: string; emoji: string }
  fundSource?: { id: string; name: string; emoji: string }
  subSource?: { id: string; name: string; emoji: string }
  fundSourceNote?: string
  subSourceNote?: string
  transactionType?: string
  batchSubmissionId?: string | null
  // Payment-specific
  payeeType?: string
  payeeUser?: { id: string; name: string }
  payeeEmployee?: { id: string; fullName: string }
  payeePerson?: { id: string; fullName: string }
  payeeBusiness?: { id: string; name: string }
  payeeSupplier?: { id: string; name: string } | null
  category?: { id: string; name: string; emoji: string; domainId?: string | null; domain?: { id: string; name: string; emoji: string } | null }
  subcategory?: { id: string; name: string; emoji: string } | null
  incomeCategory?: { id: string; name: string; emoji: string } | null
  incomeSubcategory?: { id: string; name: string; emoji?: string } | null
  paymentType?: string
  isAutoTransfer?: boolean
  autoTransferSource?: string
  // Transfer destination link (MBM-198)
  destinationDepositId?: string | null
  destinationAccountId?: string | null
  destinationAccountName?: string | null
  receiptNumber?: string
  status?: string
  pettyCashRequestId?: string | null
  pettyCashPurpose?: string | null
  comboRequestId?: string | null
  comboPayees?: { name: string; phone?: string | null }[]
  comboRequester?: { id: string; name: string } | null
  notes?: string | null
  projectId?: string | null
  project?: { id: string; name: string } | null
  createdBy?: { id: string; name: string }
  createdAt: string
}

interface TransactionHistoryProps {
  accountId: string
  defaultType?: 'DEPOSIT' | 'PAYMENT' | ''
  defaultSortOrder?: 'asc' | 'desc'
  pageLimit?: number
  canEditPayments?: boolean
  isAdmin?: boolean
  initialStartDate?: string
  initialEndDate?: string
  refreshKey?: number
  onDataChanged?: () => void
  // Payment voucher support — if businessId/businessName provided, voucher icon appears
  businessId?: string
  businessName?: string
  onRepeatPayment?: (paymentId: string) => void
  // Deep-link support: when set (e.g. from a reminder notification's
  // ?openReceiptsForPayment=... link), opens that payment's Receipts modal
  // directly on mount, independent of whether the row is in the currently
  // loaded/filtered transaction list.
  autoOpenReceipt?: { id: string; amount: number; description: string; payee: { type: string; id: string; name: string } | null } | null
  // Deep-link support: when set (e.g. returning from a contractor/supplier
  // edit page via its own ?returnTo=), opens PaymentDetailModal for this
  // payment directly on mount — unlike autoOpenReceipt this needs no
  // pre-fetched summary, PaymentDetailModal loads its own data from the id.
  autoOpenPaymentDetailId?: string | null
}

// Resolves a PAYMENT transaction's real registered payee (not the free-text
// notes it may also match on) — shared by singlePayeeMatch and the "show
// only these" filter it drives.
function resolveTransactionPayee(t: Transaction): { type: string; id: string; name: string } | null {
  if (t.payeeEmployee) return { type: 'EMPLOYEE', id: t.payeeEmployee.id, name: t.payeeEmployee.fullName }
  if (t.payeeUser) return { type: 'USER', id: t.payeeUser.id, name: t.payeeUser.name }
  if (t.payeePerson) return { type: 'PERSON', id: t.payeePerson.id, name: t.payeePerson.fullName }
  if (t.payeeBusiness) return { type: 'BUSINESS', id: t.payeeBusiness.id, name: t.payeeBusiness.name }
  if (t.payeeSupplier) return { type: 'SUPPLIER', id: t.payeeSupplier.id, name: t.payeeSupplier.name }
  return null
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isWithin7Days(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) <= 7
}

function shortDescription(transaction: Transaction): string {
  const desc = transaction.description || ''

  // Auto-transfer labels take priority
  if (transaction.paymentType === 'TRANSFER_OUT') return 'AUTO XFER OUT'
  if (transaction.paymentType === 'PETTY_CASH_RETURN') return 'PETTY CASH RTN'
  if (transaction.sourceType === 'ACCOUNT_TRANSFER') return 'AUTO XFER IN'

  if (transaction.type === 'PAYMENT') {
    if (transaction.payeeType === 'COMBO') return 'COMBO PAY'
    if (desc.startsWith('Payment to ')) return 'PAY ' + desc.slice(11)
    if (desc === 'General Payment') return 'GEN PAY'
    return desc
  }

  // Deposits
  if (desc.startsWith('Deposit from ')) return 'DEP from ' + desc.slice(13)
  if (desc === 'Cash Deposit' || transaction.sourceType === 'CASH') return 'DEP CASH'
  if (desc === 'Bank Transfer' || transaction.sourceType === 'BANK_TRANSFER') return 'DEP BANK'
  if (desc === 'Loan Received' || transaction.sourceType === 'LOAN_RECEIVED') return 'LOAN IN'
  if (desc === 'Loan Repayment' || transaction.sourceType === 'LOAN_REPAYMENT') return 'LOAN REPAY'
  if (desc === 'Payroll Funding' || transaction.sourceType === 'PAYROLL_FUNDING') return 'PAYROLL'
  if (desc === 'Transfer Return' || transaction.sourceType === 'TRANSFER_RETURN') return 'TRANSFER RTN'
  if (desc === 'Deposit') return 'DEP'
  if (desc.startsWith('Deposit ')) return 'DEP ' + desc.slice(8)
  return desc
}

export function TransactionHistory({ accountId, defaultType = '', defaultSortOrder = 'desc', pageLimit, canEditPayments = false, isAdmin = false, initialStartDate, initialEndDate, refreshKey, onDataChanged, businessId, businessName, onRepeatPayment, autoOpenReceipt, autoOpenPaymentDetailId }: TransactionHistoryProps) {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id as string | undefined
  const currentUserName = session?.user?.name ?? 'Staff'

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Voucher state
  const [voucherModal, setVoucherModal] = useState<{ payment: PaymentSummary; existing: any | null } | null>(null)
  const [voucherMap, setVoucherMap] = useState<Record<string, any>>({}) // paymentId → voucher or false

  // Project state
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [assignTxId, setAssignTxId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)

  // Receipt state
  type ReceiptReviewInfo = { status: string; total: number; expected: number; daysSincePaid: number }
  const [receiptCountMap, setReceiptCountMap] = useState<Record<string, { count: number; review?: ReceiptReviewInfo }>>({}) // paymentId → info
  const [receiptModal, setReceiptModal] = useState<{
    paymentId: string
    paymentAmount: number
    paymentDescription: string
    paymentPayee: { type: string; id: string; name: string } | null
    mode: 'add' | 'view'
  } | null>(null)

  // Deep-link open — e.g. a reminder notification's ?openReceiptsForPayment=
  // link. Only fires once per distinct autoOpenReceipt.id so it doesn't
  // reopen after the user closes it.
  const autoOpenedIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!autoOpenReceipt || autoOpenedIdRef.current === autoOpenReceipt.id) return
    autoOpenedIdRef.current = autoOpenReceipt.id
    setReceiptModal({
      paymentId: autoOpenReceipt.id,
      paymentAmount: autoOpenReceipt.amount,
      paymentDescription: autoOpenReceipt.description,
      paymentPayee: autoOpenReceipt.payee,
      mode: 'view',
    })
  }, [autoOpenReceipt])
  const [startDate, setStartDate] = useState(() => {
    if (initialStartDate) return initialStartDate
    const d = new Date(); d.setDate(d.getDate() - 29)
    return localDateStr(d)
  })
  const [endDate, setEndDate] = useState(() => {
    if (initialEndDate) return initialEndDate
    return localDateStr(new Date())
  })
  const [typeFilter, setTypeFilter] = useState<string>(defaultType)
  const [sourceTypeFilter, setSourceTypeFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder)
  const [page, setPage] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const {
    pageSize: limit,
    setPageSize: setLocalPageSize,
    isOverridden: isPageSizeOverridden,
    resetToDefault: resetPageSizeToDefault,
  } = usePageSize(pageLimit)
  const { ref: filtersRef, height: filtersHeight } = useElementHeight<HTMLDivElement>()
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null)
  const [editDepositId, setEditDepositId] = useState<string | null>(null)
  const [detailPaymentId, setDetailPaymentId] = useState<string | null>(null)
  const [detailDepositId, setDetailDepositId] = useState<string | null>(null)
  const [detailComboRequestId, setDetailComboRequestId] = useState<string | null>(null)

  // Deep-link open — e.g. returning from a contractor/supplier edit page via
  // its own ?returnTo= link. Only fires once per distinct id so it doesn't
  // reopen after the user closes it.
  const autoOpenedPaymentDetailRef = useRef<string | null>(null)
  useEffect(() => {
    if (!autoOpenPaymentDetailId || autoOpenedPaymentDetailRef.current === autoOpenPaymentDetailId) return
    autoOpenedPaymentDetailRef.current = autoOpenPaymentDetailId
    setDetailPaymentId(autoOpenPaymentDetailId)
  }, [autoOpenPaymentDetailId])

  const [editVersion, setEditVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [reversingId, setReversingId] = useState<string | null>(null)

  async function handleReversePayment(paymentId: string) {
    const reason = window.prompt('Reason for reversing this payment (e.g. "duplicate payment"):')
    if (!reason?.trim()) return
    if (!window.confirm('This will fully reverse the payment and credit the amount back to the account. Continue?')) return

    setReversingId(paymentId)
    try {
      const res = await fetch(`/api/expense-account/payments/${paymentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to reverse payment'); return }
      setEditVersion(v => v + 1)
      onDataChanged?.()
    } catch {
      alert('Failed to reverse payment')
    } finally {
      setReversingId(null)
    }
  }

  async function openVoucherModal(transaction: Transaction) {
    if (!businessId) return
    const paymentId = transaction.id
    // Fetch existing voucher and fresh payment data in parallel
    const [voucherRes, paymentRes] = await Promise.all([
      fetch(`/api/payment-vouchers?paymentId=${paymentId}`),
      fetch(`/api/expense-account/${accountId}/payments/${paymentId}`),
    ])
    const [voucherJson, paymentJson] = await Promise.all([voucherRes.json(), paymentRes.json()])
    const existing = voucherJson.data ?? null

    // If a voucher already exists, immediately update the map so the badge shows correctly
    if (existing?.voucherNumber) {
      setVoucherMap(prev => ({ ...prev, [paymentId]: existing.voucherNumber }))
    }

    const freshNotes: string = paymentJson.data?.payment?.notes ?? ''

    const payeeName = transaction.payeeEmployee?.fullName
      ?? transaction.payeeUser?.name
      ?? transaction.payeeBusiness?.name
      ?? transaction.payeePerson?.fullName
      ?? 'Unknown'

    const payment: PaymentSummary = {
      id: paymentId,
      amount: Math.abs(transaction.amount),
      paymentDate: transaction.date,
      payeeName,
      payeeType: transaction.payeeType ?? 'GENERAL',
      purpose: freshNotes.trim() || transaction.notes?.trim() || '',
      category: transaction.category ? `${transaction.category.emoji} ${transaction.category.name}` : undefined,
      businessId,
      businessName: businessName ?? '',
    }
    setVoucherModal({ payment, existing })
  }

  async function handlePrintVoucher(batchId: string) {
    try {
      const res = await fetch(`/api/expense-account/payment-batch/${batchId}/voucher`)
      const json = await res.json()
      if (!res.ok) { alert(json.error || 'Failed to load voucher'); return }
      const d = json.data
      const fmt = (n: number) => `$${n.toFixed(2)}`
      const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const rows = d.payments.map((p: any) => {
        const contact = [p.payeePhone, p.payeeContact].filter(Boolean).join(' · ')
        return `<tr>
          <td>
            <div style="font-weight:600">${esc(p.payeeName)}</div>
            ${contact ? `<div style="font-size:11px;color:#2563eb;margin-top:2px">📞 ${esc(contact)}</div>` : ''}
          </td>
          <td>${esc(p.categoryName)}${p.subcategoryName ? ' / ' + esc(p.subcategoryName) : ''}</td>
          <td style="text-align:right;font-weight:600">${fmt(p.amount)}</td>
          <td style="color:#555">${esc(p.notes || '')}</td>
          <td style="color:#888;font-size:11px">${esc(p.createdBy)}</td>
        </tr>`
      }).join('')
      const title = `Payment Voucher — ${esc(d.accountName)}`
      const win = window.open('', '_blank', 'width=820,height=700')
      if (!win) { alert('Popup blocked — please allow popups for this site.'); return }
      win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
        <style>
          html,body{margin:0;padding:0;}
          body{padding:16px;font-family:sans-serif;font-size:13px;color:#111;}
          .print-toolbar{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:12px;z-index:100;margin:-16px -16px 16px;}
          .print-btn{background:#1f2937;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:14px;font-weight:600;cursor:pointer;}
          .print-btn:hover{background:#374151;}
          .print-title{font-size:13px;color:#64748b;}
          .meta{margin-bottom:16px;line-height:1.8;}
          .meta strong{color:#111;}
          table{width:100%;border-collapse:collapse;font-size:13px;}
          th{text-align:left;background:#f1f5f9;padding:8px 10px;border-bottom:2px solid #cbd5e1;font-weight:600;color:#334155;}
          td{padding:7px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top;}
          tr:last-child td{border-bottom:none;}
          .total-row{font-weight:700;font-size:14px;background:#f8fafc;}
          .total-row td{border-top:2px solid #cbd5e1;padding:10px;}
          @media print{.print-toolbar{display:none;}body{padding:8mm;}}
        </style>
        </head><body>
        <div class="print-toolbar">
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <span class="print-title">${title}</span>
        </div>
        <div class="meta">
          <strong>Business:</strong> ${esc(d.businessName)} &nbsp;&nbsp;
          <strong>Account:</strong> ${esc(d.accountName)}<br/>
          <strong>Approved by:</strong> ${esc(d.cashierName)} &nbsp;&nbsp;
          <strong>Date:</strong> ${new Date(d.submittedAt).toLocaleString()}
        </div>
        <table>
          <thead><tr><th>Payee</th><th>Category</th><th style="text-align:right">Amount</th><th>Notes</th><th>Requested by</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2">Total — ${d.paymentCount} payment${d.paymentCount !== 1 ? 's' : ''}</td>
              <td style="text-align:right">${fmt(d.totalAmount)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
        </body></html>`)
      win.document.close()
    } catch {
      alert('Failed to load voucher')
    }
  }
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [debouncedMinAmount, setDebouncedMinAmount] = useState('')
  const [debouncedMaxAmount, setDebouncedMaxAmount] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>(
    initialStartDate ? 'Custom' : '30 Days'
  )
  // Collapsed by default (MBM-299) — the date/type/source/sort/amount pills
  // are secondary controls; search stays always visible above them.
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 600)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
  }, [search])

  // Debounce amount inputs
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedMinAmount(minAmount); setPage(0) }, 600)
    return () => clearTimeout(t)
  }, [minAmount])

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedMaxAmount(maxAmount); setPage(0) }, 600)
    return () => clearTimeout(t)
  }, [maxAmount])

  useEffect(() => {
    loadTransactions()
  }, [accountId, startDate, endDate, typeFilter, sourceTypeFilter, page, debouncedSearch, refreshKey, editVersion, debouncedMinAmount, debouncedMaxAmount, limit])
  // also refetch when sortOrder changes
  useEffect(() => {
    setPage(0)
    loadTransactions()
  }, [sortOrder])

  // Reset to page 1 whenever the row-count preference changes, so we don't
  // land on a now out-of-range page.
  useEffect(() => {
    setPage(0)
  }, [limit])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (typeFilter) params.append('transactionType', typeFilter)
      if (sourceTypeFilter) params.append('sourceType', sourceTypeFilter)
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (debouncedMinAmount !== '') params.append('minAmount', debouncedMinAmount)
      if (debouncedMaxAmount !== '') params.append('maxAmount', debouncedMaxAmount)
      params.append('limit', limit.toString())
      params.append('offset', (page * limit).toString())
      params.append('sortOrder', sortOrder)

      const response = await fetch(
        `/api/expense-account/${accountId}/transactions?${params.toString()}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        const txns = data.data.transactions || []
        setTransactions(txns)
        setTotalTransactions(data.data.pagination?.total || 0)

        // Batch-check which payment IDs already have vouchers (only when businessId present)
        const paymentIds = txns
          .filter((t: any) => t.type === 'PAYMENT' && !t.isAutoTransfer)
          .map((t: any) => t.id as string)

        if (businessId && paymentIds.length > 0) {
          fetch(`/api/payment-vouchers?paymentIds=${paymentIds.join(',')}`, { credentials: 'include' })
            .then(r => r.json())
            .then(json => {
              if (json.data) setVoucherMap(prev => ({ ...prev, ...json.data }))
            })
            .catch(() => {})
        }

        // Batch-fetch receipt counts for all payment rows
        if (paymentIds.length > 0) {
          fetch(`/api/expense-account/payments/receipt-counts?paymentIds=${paymentIds.join(',')}`, { credentials: 'include' })
            .then(r => r.json())
            .then(json => {
              if (json.data) setReceiptCountMap(prev => ({ ...prev, ...json.data }))
            })
            .catch(() => {})
        }
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // A payment's displayed `date` is when it was actually paid (paidAt), which
  // can trail the originally-requested paymentDate by a long gap when a
  // request sat unpaid before being settled — surface that gap so the date
  // shown isn't mistaken for when the request was made.
  const paidLateNote = (transaction: Transaction): string | null => {
    if (!transaction.paymentDate) return null
    const paid = new Date(transaction.date).getTime()
    const requested = new Date(transaction.paymentDate).getTime()
    if (Math.abs(paid - requested) < 24 * 60 * 60 * 1000) return null
    return `Requested ${formatDate(transaction.paymentDate)}`
  }

  const handleReset = () => {
    const today = new Date()
    const from = new Date(today); from.setDate(from.getDate() - 29)
    setStartDate(localDateStr(from))
    setEndDate(localDateStr(today))
    setTypeFilter(defaultType)
    setSourceTypeFilter('')
    setSearch('')
    setDebouncedSearch('')
    setMinAmount('')
    setMaxAmount('')
    setDebouncedMinAmount('')
    setDebouncedMaxAmount('')
    setActiveQuickFilter('30 Days')
    setPage(0)
  }

  // Load projects for the business (only when businessId is set)
  useEffect(() => {
    if (!businessId) return
    fetch(`/api/projects?businessId=${businessId}&status=active`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setProjects((data.projects || []).map((p: any) => ({ id: p.id, name: p.name }))))
      .catch(() => {})
  }, [businessId])

  async function assignProject(transactionId: string, projectId: string) {
    setAssigning(true)
    try {
      const res = await fetch(`/api/expense-account/${accountId}/payments/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId: projectId || null }),
      })
      if (res.ok) {
        const linked = projectId ? (projects.find(p => p.id === projectId) ?? null) : null
        setTransactions(prev => prev.map(t =>
          t.id === transactionId ? { ...t, projectId: projectId || null, project: linked } : t
        ))
        setAssignTxId(null)
      }
    } finally {
      setAssigning(false)
    }
  }

  const applyAllTime = () => {
    setStartDate('')
    setEndDate('')
    setActiveQuickFilter('All Time')
    setPage(0)
  }

  const applyQuickFilter = (days: number | 'today' | 'yesterday', label: string) => {
    const today = new Date()
    if (days === 'today') {
      setStartDate(localDateStr(today))
      setEndDate(localDateStr(today))
    } else if (days === 'yesterday') {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      setStartDate(localDateStr(y))
      setEndDate(localDateStr(y))
    } else {
      const from = new Date(today)
      from.setDate(from.getDate() - days + 1)
      setStartDate(localDateStr(from))
      setEndDate(localDateStr(today))
    }
    setActiveQuickFilter(label)
    setPage(0)
  }

  const QUICK_FILTERS = [
    { label: 'Today',     action: () => applyQuickFilter('today', 'Today') },
    { label: 'Yesterday', action: () => applyQuickFilter('yesterday', 'Yesterday') },
    { label: '7 Days',   action: () => applyQuickFilter(7, '7 Days') },
    { label: '30 Days',  action: () => applyQuickFilter(30, '30 Days') },
    { label: '90 Days',  action: () => applyQuickFilter(90, '90 Days') },
    { label: 'All Time', action: () => applyAllTime() },
  ]

  const hasActiveFilters = activeQuickFilter !== '30 Days' || typeFilter !== defaultType ||
    sourceTypeFilter !== '' || sortOrder !== defaultSortOrder || minAmount !== '' || maxAmount !== ''
  // Non-date filters only — used to flag "something else is filtered too"
  // separately from the date badge, which is now always shown (see below).
  const hasOtherActiveFilters = typeFilter !== defaultType ||
    sourceTypeFilter !== '' || sortOrder !== defaultSortOrder || minAmount !== '' || maxAmount !== ''

  // The server computes each row's running balance by walking back from the
  // account's true current balance through just the rows it fetched — correct
  // only when that's a complete, gapless slice of history (the plain
  // date-range view, page 1). Any other filter (search, type, source type,
  // amount range) or being past page 1 skips real transactions in between,
  // so the number would be fabricated — don't show it rather than mislead.
  const balanceColumnReliable = !search.trim() && typeFilter === defaultType &&
    sourceTypeFilter === '' && minAmount === '' && maxAmount === '' && page === 0

  // When a free-text search matches a real registered payee by name, surface
  // a shortcut to that payee's full cross-account history (Payee Payment
  // History report). The search here is free-text (it also matches notes),
  // so results may include payments made *about* this payee rather than *to*
  // them (e.g. a Combo Request paid to someone else whose notes mention the
  // searched name) — those are filtered out by requiring the resolved
  // payee's own name to match the search text, not just by appearing in the
  // result set, so unrelated noise doesn't prevent (or get confused with)
  // the real match.
  const singlePayeeMatch = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    const matches = transactions
      .filter(t => t.type === 'PAYMENT' && t.payeeType && t.payeeType !== 'COMBO')
      .map(t => ({ t, payee: resolveTransactionPayee(t) }))
      .filter((x): x is { t: Transaction; payee: { type: string; id: string; name: string } } => !!x.payee)
      .filter(x => x.payee.name.toLowerCase().includes(q))
    if (matches.length === 0) return null
    const uniqueKeys = new Set(matches.map(x => `${x.payee.type}:${x.payee.id}`))
    if (uniqueKeys.size !== 1) return null
    const total = matches.reduce((sum, x) => sum + x.t.amount, 0)
    const transactionIds = new Set(matches.map(x => x.t.id))
    return { type: matches[0].payee.type, id: matches[0].payee.id, name: matches[0].payee.name, total, transactionIds }
  }, [search, transactions])

  // "Show only these" toggle on the matching-payee banner — lets the user
  // narrow the visible list down to exactly the matched payee's payments,
  // since the free-text search above it may still be showing unrelated
  // results (e.g. Combo Request notes that merely mention the same name).
  const [payeeOnlyFilter, setPayeeOnlyFilter] = useState(false)
  useEffect(() => { setPayeeOnlyFilter(false) }, [search])
  const displayedTransactions = (payeeOnlyFilter && singlePayeeMatch)
    ? transactions.filter(t => singlePayeeMatch.transactionIds.has(t.id))
    : transactions

  // Extracted so the mobile card list (below) can reuse the exact same
  // actions — Edit/Repeat/Reverse/receipt/project/voucher — instead of
  // duplicating this ~190-line conditional cluster a second time.
  const renderTransactionActions = (transaction: Transaction, isDeposit: boolean) => {
    const rowActions: RowAction[] = []

    if (canEditPayments && !isDeposit && !transaction.isAutoTransfer && !transaction.comboRequestId && !voucherMap[transaction.id] && (isAdmin || isWithin7Days(transaction.createdAt))) {
      rowActions.push({
        key: 'edit',
        label: 'Edit',
        icon: '✏️',
        title: 'Edit payment',
        onClick: () => setEditPaymentId(transaction.id),
      })
    }
    if (onRepeatPayment && !isDeposit && !transaction.isAutoTransfer && !transaction.comboRequestId) {
      rowActions.push({
        key: 'repeat',
        label: 'Repeat',
        icon: '🔁',
        title: 'Create a new payment pre-filled from this one',
        onClick: () => onRepeatPayment(transaction.id),
      })
    }
    if (isAdmin && !isDeposit && !transaction.isAutoTransfer && !transaction.comboRequestId && transaction.status !== 'REVERSED') {
      rowActions.push({
        key: 'reverse',
        label: reversingId === transaction.id ? 'Reversing…' : 'Reverse',
        icon: '↩️',
        title: 'Fully reverse this payment — use for a payment that should never have happened (e.g. a duplicate), not for correcting the amount of a real one',
        disabled: reversingId === transaction.id,
        destructive: true,
        onClick: () => handleReversePayment(transaction.id),
      })
    }
    if (canEditPayments && isDeposit && !transaction.isAutoTransfer && transaction.sourceType !== 'ACCOUNT_TRANSFER' && transaction.sourceType !== 'PAYMENT_ADJUSTMENT' && (transaction.sourceType !== 'COMBO_SETTLE' || isAdmin) && (isAdmin || isWithin7Days(transaction.createdAt))) {
      rowActions.push({
        key: 'edit-deposit',
        label: 'Edit',
        icon: '✏️',
        title: 'Edit deposit',
        onClick: () => setEditDepositId(transaction.id),
      })
    }
    if (isDeposit && transaction.sourceType === 'PAYMENT_ADJUSTMENT' && transaction.sourcePaymentId) {
      rowActions.push({
        key: 'view-payment',
        label: 'View Payment',
        icon: '🔗',
        title: 'View source payment',
        onClick: () => { window.location.href = `/expense-accounts/${accountId}/payments/${transaction.sourcePaymentId}` },
      })
    }
    if (isDeposit && transaction.batchSubmissionId) {
      rowActions.push({
        key: 'pdf',
        label: 'PDF Voucher',
        icon: '📄',
        title: 'View payment voucher',
        onClick: () => handlePrintVoucher(transaction.batchSubmissionId!),
      })
    }

    return (
    <>
      {rowActions.length > 0 && (
        <span onClick={(e) => e.stopPropagation()}>
          <RowActionsMenu actions={rowActions} />
        </span>
      )}
      {/* Receipt badge — appears on all non-auto PAYMENT rows */}
      {!isDeposit && !transaction.isAutoTransfer && (() => {
        const info = receiptCountMap[transaction.id]
        const count = info?.count ?? 0
        const paymentPayee = transaction.payeeEmployee
          ? { type: 'EMPLOYEE', id: transaction.payeeEmployee.id, name: transaction.payeeEmployee.fullName }
          : transaction.payeeUser
          ? { type: 'USER', id: transaction.payeeUser.id, name: transaction.payeeUser.name }
          : transaction.payeeBusiness
          ? { type: 'BUSINESS', id: transaction.payeeBusiness.id, name: transaction.payeeBusiness.name }
          : transaction.payeePerson
          ? { type: 'PERSON', id: transaction.payeePerson.id, name: transaction.payeePerson.fullName }
          : transaction.payeeSupplier
          ? { type: 'SUPPLIER', id: transaction.payeeSupplier.id, name: transaction.payeeSupplier.name }
          : null

        if (info?.review) {
          return (
            <ReceiptReviewBadge
              status={info.review.status}
              total={info.review.total}
              expected={info.review.expected}
              daysSincePaid={info.review.daysSincePaid}
              onClick={() => setReceiptModal({
                paymentId: transaction.id,
                paymentAmount: Math.abs(transaction.amount),
                paymentDescription: transaction.description,
                paymentPayee,
                mode: 'view',
              })}
            />
          )
        }

        return count > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setReceiptModal({
                paymentId: transaction.id,
                paymentAmount: Math.abs(transaction.amount),
                paymentDescription: transaction.description,
                paymentPayee,
                mode: 'view',
              })
            }}
            className="ml-1 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/60 font-medium transition-colors"
            title={`${count} receipt${count !== 1 ? 's' : ''} — click to view`}
          >
            🧾 {count}
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setReceiptModal({
                paymentId: transaction.id,
                paymentAmount: Math.abs(transaction.amount),
                paymentDescription: transaction.description,
                paymentPayee,
                mode: 'add',
              })
            }}
            className="ml-1 text-sm px-1 py-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-green-500 dark:hover:text-green-400 transition-colors"
            title="No receipts yet — click to add"
          >
            🧾
          </button>
        )
      })()}

      {/* Project badge / assign button */}
      {!isDeposit && !transaction.isAutoTransfer && !transaction.comboRequestId && projects.length > 0 && (
        assignTxId === transaction.id ? (
          <select
            autoFocus
            disabled={assigning}
            value={transaction.projectId || ''}
            onChange={e => assignProject(transaction.id, e.target.value)}
            onBlur={() => setAssignTxId(null)}
            className="ml-1 text-xs border border-indigo-300 dark:border-indigo-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white max-w-[140px]"
          >
            <option value="">— No project —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : transaction.project ? (
          <button
            onClick={(e) => { e.stopPropagation(); setAssignTxId(transaction.id) }}
            className="ml-1 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60 font-medium transition-colors"
            title={`Project: ${transaction.project.name} — click to change`}
          >
            📁 {transaction.project.name.length > 12 ? transaction.project.name.slice(0, 12) + '…' : transaction.project.name}
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setAssignTxId(transaction.id) }}
            className="ml-1 text-sm px-1 py-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
            title="Assign to a project"
          >
            📁
          </button>
        )
      )}

      {/* Payment Voucher icon — appears on all PAYMENT rows when businessId is provided */}
      {!isDeposit && !transaction.isAutoTransfer && businessId && (
        voucherMap[transaction.id] ? (
          <button
            onClick={(e) => { e.stopPropagation(); openVoucherModal(transaction) }}
            className="ml-1 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800/60 font-medium transition-colors"
            title={`Voucher issued: ${voucherMap[transaction.id]} — click to view PDF`}
          >
            ✅ VCH
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); openVoucherModal(transaction) }}
            className="ml-1 text-sm px-1 py-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
            title="No voucher yet — click to generate one"
          >
            📄
          </button>
        )
      )}
    </>
    )
  }

  return (
    <>
    <div className="space-y-4">
      {/* Filters and the table header both stick to the WINDOW (not to a
          bounded local scrollbox — a box like that can itself drift out
          from under the fixed nav during normal page scroll, dragging its
          "stuck" children out of view along with it). The header's `top`
          is filters' own measured height added on top of the nav offset,
          so the two always sit flush with no gap and can't slide past each
          other. Real server-side pagination already caps this table at
          `limit` rows, so an unbounded-height table here is fine — no local
          scrollbar needed. */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div ref={filtersRef} className="sticky top-14 sm:top-16 z-20 bg-white dark:bg-gray-800 px-3 py-2.5 border-b border-gray-200 dark:border-gray-600 rounded-t-lg">

        {/* Row 1: Search + Reset */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search payee, category, source, notes, receipt…"
              className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(v => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              hasActiveFilters
                ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {/* Date range is always shown here — including the default — so
                the collapsed state always tells you what's applied, matching
                the DateRangeSelector header used elsewhere in the app. */}
            <span className="flex items-center gap-1">
              📅 <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold">{activeQuickFilter || 'Custom'}</span>
            </span>
            {hasOtherActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" title="Other filters (type/source/sort/amount) are also active" />
            )}
            <span className="text-[10px]">{filtersOpen ? '▲' : '▼'}</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap"
          >
            ↺ Reset
          </button>
        </div>

        {/* Row 2: Pills + date range + dropdowns — all inline. Collapsed by
            default (MBM-299); the toggle above shows the active quick
            filter so the user can tell at a glance what's applied without
            expanding. */}
        {filtersOpen && (
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5 pt-2">

          {/* Quick pills */}
          <div className="flex gap-1 flex-wrap">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={f.action}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                  activeQuickFilter === f.label
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Thin divider */}
          <div className="w-px self-stretch bg-gray-200 dark:bg-gray-600 mx-0.5 hidden sm:block" />

          {/* Date range: From → To inline */}
          <div className="flex items-end gap-1">
            <div className="w-32">
              <DateInput
                label="From"
                value={startDate}
                onChange={(v) => { setStartDate(v); setActiveQuickFilter('') }}
                compact
              />
            </div>
            <span className="text-gray-400 dark:text-gray-500 text-xs pb-2">→</span>
            <div className="w-32">
              <DateInput
                label="To"
                value={endDate}
                onChange={(v) => { setEndDate(v); setActiveQuickFilter('') }}
                compact
              />
            </div>
          </div>

          {/* Thin divider */}
          <div className="w-px self-stretch bg-gray-200 dark:bg-gray-600 mx-0.5 hidden sm:block" />

          {/* Type */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Transactions</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="PAYMENT">Payments</option>
            </select>
          </div>

          {/* Deposit Source */}
          {typeFilter !== 'PAYMENT' && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide">Source</label>
              <select
                value={sourceTypeFilter}
                onChange={(e) => { setSourceTypeFilter(e.target.value); setPage(0) }}
                className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sources</option>
                <option value="CASH">💵 Cash</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                <option value="BUSINESS_TRANSFER">🏢 Business Transfer</option>
                <option value="LOAN_RECEIVED">🤝 Loan Received</option>
                <option value="LOAN_REPAYMENT">🔄 Loan Repayment</option>
                <option value="PAYROLL_FUNDING">💼 Payroll Funding</option>
                <option value="TRANSFER_RETURN">↩️ Transfer Return</option>
                <option value="WIFI_TOKEN_SALE">📡 WiFi Portal Sale</option>
                <option value="R710_TOKEN_SALE">📶 R710 WiFi Sale</option>
              </select>
            </div>
          )}

          {/* Sort */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide">Sort</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          {/* Thin divider */}
          <div className="w-px self-stretch bg-gray-200 dark:bg-gray-600 mx-0.5 hidden sm:block" />

          {/* Amount range */}
          <div className="flex items-end gap-1">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide">Min $</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0.00"
                className="w-20 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-gray-400 dark:text-gray-500 text-xs pb-2">→</span>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide">Max $</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Any"
                className="w-20 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

        </div>
        )}
      </div>

      {singlePayeeMatch && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-blue-700 dark:text-blue-300">
            Matching payee: <strong>{singlePayeeMatch.name}</strong> — {formatCurrency(singlePayeeMatch.total)}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPayeeOnlyFilter(v => !v)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              {payeeOnlyFilter ? 'Show all results' : `Show only these (${singlePayeeMatch.transactionIds.size})`}
            </button>
            <Link
              href={`/expense-accounts/reports/payee-history?payeeType=${singlePayeeMatch.type}&payeeId=${singlePayeeMatch.id}&payeeName=${encodeURIComponent(singlePayeeMatch.name)}&allTime=true`}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              View Full Payment History →
            </Link>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="relative">
        {/* Subtle in-place loading overlay — does not replace the UI */}
        {loading && (
          <div className="absolute inset-0 z-10 rounded-lg bg-white/60 dark:bg-gray-800/60 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading…
            </div>
          </div>
        )}
        {displayedTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {payeeOnlyFilter ? 'No matching payments in this date range' : 'No transactions found'}
            </p>
          </div>
        ) : (
          <>
          {/* Mobile card list (MBM-299 responsive-reports template) — vertical
              scroll only. Desktop keeps the full table below (hidden here). */}
          <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {displayedTransactions.map((transaction) => {
              const isDeposit = transaction.type === 'DEPOSIT'
              return (
                <div
                  key={transaction.id}
                  onClick={() => {
                    if (!isDeposit && transaction.comboRequestId) {
                      setDetailComboRequestId(transaction.comboRequestId)
                      return
                    }
                    if (isDeposit) setDetailDepositId(transaction.id)
                    else setDetailPaymentId(transaction.id)
                  }}
                  className="p-3 space-y-1.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(transaction.date)}
                      {paidLateNote(transaction) && (
                        <span className="block text-[10px] text-amber-600 dark:text-amber-400">{paidLateNote(transaction)}</span>
                      )}
                    </span>
                    <span className={`text-sm font-semibold ${isDeposit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isDeposit ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                        isDeposit ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {isDeposit ? '📥 Deposit' : '📤 Payment'}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{shortDescription(transaction)}</span>
                    </div>
                  </div>
                  {(transaction.notes || transaction.receiptNumber || transaction.createdBy?.name) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      {!isDeposit && transaction.notes && <p className="italic truncate">{transaction.notes}</p>}
                      {transaction.receiptNumber && <p>{transaction.receiptNumber}</p>}
                      {transaction.createdBy?.name && <p className="text-gray-400 dark:text-gray-500">by {transaction.createdBy.name}</p>}
                    </div>
                  )}
                  {!isDeposit && transaction.comboRequestId && transaction.comboPayees && transaction.comboPayees.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                        🧾 Combo Request
                      </span>
                      {transaction.comboPayees.map((p, i) => <div key={i}>👤 {p.name}</div>)}
                    </div>
                  )}
                  <div
                    className="flex items-center flex-wrap gap-1 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderTransactionActions(transaction, isDeposit)}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden sm:block">
            <table className="w-full border-separate border-spacing-0">
              <thead
                className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky z-10 top-[calc(3.5rem+1rem+var(--filters-h,0px))] sm:top-[calc(4rem+1rem+var(--filters-h,0px))]"
                style={{ ['--filters-h' as any]: `${filtersHeight}px` }}
              >
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source / Dest
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th
                    className="hidden md:table-cell px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    title={balanceColumnReliable ? undefined : 'Running balance is hidden while a search or filter is narrowing the list — it would skip transactions not shown here'}
                  >
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayedTransactions.map((transaction) => {
                  const isDeposit = transaction.type === 'DEPOSIT'

                  return (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => {
                        if (!isDeposit && transaction.comboRequestId) {
                          setDetailComboRequestId(transaction.comboRequestId)
                          return
                        }
                        if (isDeposit) {
                          setDetailDepositId(transaction.id)
                        } else {
                          setDetailPaymentId(transaction.id)
                        }
                      }}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(transaction.date)}
                        {paidLateNote(transaction) && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400">{paidLateNote(transaction)}</span>
                        )}
                      </td>

                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full ${
                            isDeposit
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {isDeposit ? '📥' : '📤'}<span className="hidden sm:inline"> {isDeposit ? 'Deposit' : 'Payment'}</span>
                        </span>
                      </td>

                      <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div className="font-medium">
                          {shortDescription(transaction)}
                        </div>
                        {!isDeposit && transaction.notes && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">
                            {transaction.notes}
                          </div>
                        )}
                        {transaction.receiptNumber && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {transaction.receiptNumber}
                          </div>
                        )}
                        {transaction.pettyCashRequestId && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300" title={transaction.pettyCashPurpose ?? 'Petty Cash'}>
                              🪙 PC-{transaction.pettyCashRequestId.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {!isDeposit && transaction.comboRequestId && (
                          <div className="mt-0.5 space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                              🧾 Combo Request
                            </span>
                            {transaction.comboPayees && transaction.comboPayees.length > 0 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                {transaction.comboPayees.map((p, i) => (
                                  <div key={i}>
                                    👤 {p.name}
                                    {p.phone && (
                                      <span className="ml-1 text-gray-400 dark:text-gray-500">• {formatPhoneNumberForDisplay(p.phone)}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {transaction.createdBy?.name && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            by {transaction.createdBy.name}
                          </div>
                        )}
                      </td>

                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {transaction.category ? (
                          <span>
                            {[
                              transaction.category.domain
                                ? `${transaction.category.domain.emoji || ''} ${transaction.category.domain.name}`.trim()
                                : null,
                              `${transaction.category.emoji || ''} ${transaction.category.name}`.trim(),
                              transaction.subcategory
                                ? `${transaction.subcategory.emoji || ''} ${transaction.subcategory.name}`.trim()
                                : null,
                            ].filter(Boolean).join(' › ')}
                          </span>
                        ) : transaction.incomeCategory ? (
                          <span>
                            {transaction.incomeCategory.emoji} {transaction.incomeCategory.name}
                            {transaction.incomeSubcategory && (
                              <span className="text-xs text-gray-500 dark:text-gray-400"> / {transaction.incomeSubcategory.name}</span>
                            )}
                          </span>
                        ) : transaction.paymentType === 'LOAN_DISBURSEMENT' ? (
                          <span className="text-green-700 dark:text-green-400">🤝 Loan Disbursement</span>
                        ) : transaction.paymentType === 'LOAN_REPAYMENT' ? (
                          <span className="text-blue-600 dark:text-blue-400">🏦 Loan Repayment</span>
                        ) : transaction.paymentType === 'PAYROLL_FUNDING' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">💵 Payroll Funding</span>
                        ) : transaction.paymentType === 'TRANSFER_OUT' ? (
                          <span className="text-sky-600 dark:text-sky-400">💸 Transfer Out</span>
                        ) : transaction.paymentType === 'TRANSFER_RETURN' ? (
                          <span className="text-purple-600 dark:text-purple-400">🔄 Transfer Return</span>
                        ) : transaction.paymentType === 'PETTY_CASH_RETURN' ? (
                          <span className="text-amber-600 dark:text-amber-400">💵 Petty Cash Return</span>
                        ) : transaction.sourceType === 'LOAN_REPAYMENT' ? (
                          <span className="text-blue-600 dark:text-blue-400">🤝 Loan Repayment</span>
                        ) : transaction.sourceType === 'LOAN_RECEIVED' ? (
                          <span className="text-green-700 dark:text-green-400">🤝 Loan Received</span>
                        ) : transaction.sourceType === 'PAYROLL_FUNDING' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">💵 Payroll Funding</span>
                        ) : transaction.sourceType === 'ACCOUNT_TRANSFER' ? (
                          <span className="text-sky-600 dark:text-sky-400">↩ Transfer In</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {transaction.paymentType === 'TRANSFER_OUT' && transaction.destinationAccountName ? (
                          <span className="font-medium text-sky-700 dark:text-sky-400">→ {transaction.destinationAccountName}</span>
                        ) : transaction.paymentType === 'TRANSFER_OUT' ? (
                          <span className="text-xs text-sky-600 dark:text-sky-500 italic">→ Transferred out</span>
                        ) : transaction.isAutoTransfer && transaction.autoTransferSource ? (
                          <span className="font-medium text-sky-700 dark:text-sky-400">↩ {transaction.autoTransferSource}</span>
                        ) : transaction.comboRequestId && transaction.comboRequester ? (
                          <span className="font-medium text-purple-700 dark:text-purple-400">📎 {transaction.comboRequester.name}</span>
                        ) : transaction.sourceBusiness ? (
                          <span className="font-medium">{transaction.sourceBusiness.name}</span>
                        ) : (transaction.fundSource || transaction.fundSourceNote) ? (
                          <span className="font-medium">
                            {transaction.fundSource ? `${transaction.fundSource.emoji} ${transaction.fundSource.name}` : transaction.fundSourceNote}
                            {(transaction.subSource || transaction.subSourceNote) && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                via {transaction.subSource ? `${transaction.subSource.emoji} ${transaction.subSource.name}` : transaction.subSourceNote}
                              </span>
                            )}
                          </span>
                        ) : transaction.depositSource ? (
                          <span className="font-medium">{transaction.depositSource.emoji} {transaction.depositSource.name}</span>
                        ) : isDeposit && transaction.sourceType ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                            {transaction.sourceType === 'MANUAL' ? 'Manual Entry'
                              : transaction.sourceType === 'OTHER' ? 'Other'
                              : transaction.sourceType === 'CASH' ? 'Cash'
                              : transaction.sourceType === 'BANK_TRANSFER' ? 'Bank Transfer'
                              : transaction.sourceType.charAt(0) + transaction.sourceType.slice(1).toLowerCase().replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-right">
                        <span
                          className={`text-xs sm:text-sm font-semibold ${
                            isDeposit
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isDeposit ? '+' : '-'}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </td>

                      <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        {balanceColumnReliable
                          ? formatCurrency(transaction.balanceAfter)
                          : <span className="text-gray-400 dark:text-gray-500" title="Not shown — this list is filtered, so the running balance can't be trusted">—</span>}
                      </td>

                      {/* Action column: Edit (payments) or PDF voucher (batch deposits) — extracted to renderTransactionActions, shared with the mobile card list below */}
                      <td className="px-2 py-2 sm:py-3 text-right whitespace-nowrap">
                        {renderTransactionActions(transaction, isDeposit)}
                      </td>
                    </tr>
                  )
                })}
                <TableFillerRows count={Math.min(limit, totalTransactions) - transactions.length} colSpan={7} cellClassName="p-3 h-[72px]" />
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

        {/* Pagination */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <Pagination
            currentPage={page + 1}
            totalPages={Math.max(1, Math.ceil(totalTransactions / limit))}
            totalItems={totalTransactions}
            pageSize={limit}
            onPageChange={(p) => setPage(p - 1)}
            loading={loading}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setLocalPageSize}
            isPageSizeOverridden={isPageSizeOverridden}
            onResetPageSize={resetPageSizeToDefault}
          />
        </div>
      </div>
    </div>

      {/* Edit Payment Modal */}
      {editPaymentId && (
        <EditPaymentModal
          isOpen={true}
          onClose={() => setEditPaymentId(null)}
          accountId={accountId}
          paymentId={editPaymentId}
          isAdmin={isAdmin}
          onSuccess={() => { setEditPaymentId(null); setEditVersion(v => v + 1); onDataChanged?.() }}
        />
      )}

      {/* Edit Deposit Modal */}
      {editDepositId && (
        <EditDepositModal
          isOpen={true}
          onClose={() => setEditDepositId(null)}
          accountId={accountId}
          depositId={editDepositId}
          isAdmin={isAdmin}
          onSuccess={() => { setEditDepositId(null); setEditVersion(v => v + 1); onDataChanged?.() }}
        />
      )}

      {/* Receipt Modals */}
      {receiptModal && receiptModal.mode === 'add' && (
        <AddReceiptModal
          paymentId={receiptModal.paymentId}
          paymentPayee={receiptModal.paymentPayee}
          onClose={() => setReceiptModal(null)}
          onSuccess={(result) => {
            const pid = receiptModal.paymentId;
            setReceiptCountMap(prev => ({ ...prev, [pid]: { ...prev[pid], count: (prev[pid]?.count ?? 0) + 1 } }));
            // Full refresh (picks up review total/status) — cheap, single payment
            fetch(`/api/expense-account/payments/receipt-counts?paymentIds=${pid}`, { credentials: 'include' })
              .then(r => r.json())
              .then(json => { if (json.data) setReceiptCountMap(prev => ({ ...prev, ...json.data })) })
              .catch(() => {})
            setReceiptModal(null);
            // Use the updated payment object from the API to update the row instantly
            if (result && result.updatedPayment) {
              const p = result.updatedPayment;
              setTransactions(prev => prev.map(t => {
                if (t.id !== pid) return t;
                // Set only the correct payee field, clear others
                let payeePerson, payeeBusiness, payeeSupplier, payeeUser, payeeEmployee;
                if (p.type === 'PERSON') payeePerson = { id: p.id, fullName: p.name };
                if (p.type === 'BUSINESS') payeeBusiness = { id: p.id, name: p.name };
                if (p.type === 'SUPPLIER') payeeSupplier = { id: p.id, name: p.name };
                if (p.type === 'USER') payeeUser = { id: p.id, name: p.name };
                if (p.type === 'EMPLOYEE') payeeEmployee = { id: p.id, fullName: p.name };
                const payeeName = p.name;
                return {
                  ...t,
                  payeeType: p.type,
                  payeePerson,
                  payeeBusiness,
                  payeeSupplier,
                  payeeUser,
                  payeeEmployee,
                  description: payeeName ? `Payment to ${payeeName}` : t.description,
                };
              }));
            }
          }}
        />
      )}
      {receiptModal && receiptModal.mode === 'view' && (
        <ViewReceiptsModal
          paymentId={receiptModal.paymentId}
          paymentAmount={receiptModal.paymentAmount}
          paymentDescription={receiptModal.paymentDescription}
          paymentPayee={receiptModal.paymentPayee}
          onClose={() => setReceiptModal(null)}
          onReceiptsChanged={() => {
            const pid = receiptModal.paymentId
            // Refresh badge count
            fetch(`/api/expense-account/payments/receipt-counts?paymentIds=${pid}`, { credentials: 'include' })
              .then(r => r.json())
              .then(json => { if (json.data) setReceiptCountMap(prev => ({ ...prev, ...json.data })) })
              .catch(() => {})
            // Refresh the row so any payee update made inside AddReceiptModal is reflected immediately
            fetch(`/api/expense-account/${accountId}/payments/${pid}`, { credentials: 'include' })
              .then(r => r.json())
              .then(json => {
                if (!json.success || !json.data?.payment) return
                const p = json.data.payment
                const payeeName = p.payeePerson?.fullName ?? p.payeeBusiness?.name ?? p.payeeSupplier?.name ?? p.payeeUser?.name ?? p.payeeEmployee?.fullName
                setTransactions(prev => prev.map(t => {
                  if (t.id !== pid) return t
                  return {
                    ...t,
                    payeeType: p.payeeType,
                    payeePerson:   p.payeePerson   ? { id: p.payeePerson.id,   fullName: p.payeePerson.fullName }   : undefined,
                    payeeBusiness: p.payeeBusiness ? { id: p.payeeBusiness.id, name: p.payeeBusiness.name }         : undefined,
                    payeeSupplier: p.payeeSupplier ? { id: p.payeeSupplier.id, name: p.payeeSupplier.name }         : undefined,
                    payeeUser:     p.payeeUser     ? { id: p.payeeUser.id,     name: p.payeeUser.name }             : undefined,
                    payeeEmployee: p.payeeEmployee ? { id: p.payeeEmployee.id, fullName: p.payeeEmployee.fullName } : undefined,
                    description: payeeName ? `Payment to ${payeeName}` : t.description,
                  }
                }))
              })
              .catch(() => {})
          }}
        />
      )}

      {/* Payment Voucher Modal */}
      {voucherModal && currentUserId && (
        <ExpensePaymentVoucherModal
          payment={voucherModal.payment}
          existingVoucher={voucherModal.existing}
          userId={currentUserId}
          creatorName={currentUserName}
          onClose={() => setVoucherModal(null)}
          onSaved={(saved) => {
            setVoucherMap(prev => ({ ...prev, [voucherModal.payment.id]: saved }))
            setVoucherModal(null)
          }}
        />
      )}

      {/* Payment Detail Modal (MBM-198) */}
      {detailPaymentId && (
        <PaymentDetailModal
          isOpen={true}
          onClose={() => setDetailPaymentId(null)}
          accountId={accountId}
          paymentId={detailPaymentId}
        />
      )}

      {/* Deposit Detail Modal (MBM-198) */}
      {detailDepositId && (
        <DepositDetailModal
          isOpen={true}
          onClose={() => setDetailDepositId(null)}
          accountId={accountId}
          depositId={detailDepositId}
        />
      )}

      {/* Combo Request Detail Modal */}
      {detailComboRequestId && (
        <ComboRequestDetailModal
          isOpen={true}
          onClose={() => setDetailComboRequestId(null)}
          accountId={accountId}
          comboRequestId={detailComboRequestId}
        />
      )}
    </>
  )
}
