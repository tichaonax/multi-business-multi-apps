'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { DateInput } from '@/components/ui/date-input'
import { EditPaymentModal } from './edit-payment-modal'
import { EditDepositModal } from './edit-deposit-modal'
import { ExpensePaymentVoucherModal, PaymentSummary } from './expense-payment-voucher-modal'
import { generatePaymentVoucherPdf } from './payment-voucher-pdf'
import { AddReceiptModal } from './add-receipt-modal'
import { ViewReceiptsModal } from './view-receipts-modal'

interface Transaction {
  id: string
  type: 'DEPOSIT' | 'PAYMENT'
  amount: number
  date: string
  description: string
  balanceAfter: number
  // Deposit-specific
  sourceType?: string
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
  category?: { id: string; name: string; emoji: string }
  incomeCategory?: { id: string; name: string; emoji: string } | null
  incomeSubcategory?: { id: string; name: string; emoji?: string } | null
  paymentType?: string
  isAutoTransfer?: boolean
  autoTransferSource?: string
  receiptNumber?: string
  status?: string
  pettyCashRequestId?: string | null
  pettyCashPurpose?: string | null
  notes?: string | null
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

export function TransactionHistory({ accountId, defaultType = '', defaultSortOrder = 'desc', pageLimit = 50, canEditPayments = false, isAdmin = false, initialStartDate, initialEndDate, refreshKey, onDataChanged, businessId, businessName }: TransactionHistoryProps) {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id as string | undefined
  const currentUserName = session?.user?.name ?? 'Staff'

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Voucher state
  const [voucherModal, setVoucherModal] = useState<{ payment: PaymentSummary; existing: any | null } | null>(null)
  const [voucherMap, setVoucherMap] = useState<Record<string, any>>({}) // paymentId → voucher or false

  // Receipt state
  const [receiptCountMap, setReceiptCountMap] = useState<Record<string, number>>({}) // paymentId → count
  const [receiptModal, setReceiptModal] = useState<{
    paymentId: string
    paymentAmount: number
    paymentDescription: string
    paymentPayee: { type: string; id: string; name: string } | null
    mode: 'add' | 'view'
  } | null>(null)
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
  const [hasMore, setHasMore] = useState(true)
  const limit = pageLimit
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null)
  const [editDepositId, setEditDepositId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>(
    initialStartDate ? 'Custom' : '30 Days'
  )

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 600)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
  }, [search])

  useEffect(() => {
    loadTransactions()
  }, [accountId, startDate, endDate, typeFilter, sourceTypeFilter, page, debouncedSearch, refreshKey])
  // also refetch when sortOrder changes
  useEffect(() => {
    setPage(0)
    loadTransactions()
  }, [sortOrder])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (typeFilter) params.append('transactionType', typeFilter)
      if (sourceTypeFilter) params.append('sourceType', sourceTypeFilter)
      if (debouncedSearch) params.append('search', debouncedSearch)
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
        setHasMore(data.data.pagination?.hasMore || false)

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

  const handleReset = () => {
    const today = new Date()
    const from = new Date(today); from.setDate(from.getDate() - 29)
    setStartDate(localDateStr(from))
    setEndDate(localDateStr(today))
    setTypeFilter(defaultType)
    setSourceTypeFilter('')
    setSearch('')
    setDebouncedSearch('')
    setActiveQuickFilter('30 Days')
    setPage(0)
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

  return (
    <>
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-3 py-2.5">

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
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap"
          >
            ↺ Reset
          </button>
        </div>

        {/* Row 2: Pills + date range + dropdowns — all inline */}
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5">

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

        </div>
      </div>

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
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
                    Source
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((transaction) => {
                  const isDeposit = transaction.type === 'DEPOSIT'

                  return (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => {
                        const detailPath = isDeposit
                          ? `/expense-accounts/${accountId}/deposits/${transaction.id}`
                          : `/expense-accounts/${accountId}/payments/${transaction.id}`
                        window.location.href = detailPath
                      }}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(transaction.date)}
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
                        {transaction.createdBy?.name && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            by {transaction.createdBy.name}
                          </div>
                        )}
                      </td>

                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {transaction.category ? (
                          <span>{transaction.category.emoji} {transaction.category.name}</span>
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
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {transaction.isAutoTransfer && transaction.autoTransferSource ? (
                          <span className="font-medium text-sky-700 dark:text-sky-400">↩ {transaction.autoTransferSource}</span>
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
                        {formatCurrency(transaction.balanceAfter)}
                      </td>

                      {/* Action column: Edit (payments) or PDF voucher (batch deposits) */}
                      <td className="px-2 py-2 sm:py-3 text-right whitespace-nowrap">
                        {canEditPayments && !isDeposit && !transaction.isAutoTransfer && !voucherMap[transaction.id] && (isAdmin || isWithin7Days(transaction.createdAt)) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditPaymentId(transaction.id) }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5"
                            title="Edit payment"
                          >
                            Edit
                          </button>
                        )}
                        {canEditPayments && isDeposit && !transaction.isAutoTransfer && transaction.sourceType !== 'ACCOUNT_TRANSFER' && (isAdmin || isWithin7Days(transaction.createdAt)) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditDepositId(transaction.id) }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5"
                            title="Edit deposit"
                          >
                            Edit
                          </button>
                        )}
                        {isDeposit && transaction.batchSubmissionId && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePrintVoucher(transaction.batchSubmissionId!) }}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline px-1 py-0.5"
                            title="View payment voucher"
                          >
                            PDF
                          </button>
                        )}
                        {/* Receipt badge — appears on all non-auto PAYMENT rows */}
                        {!isDeposit && !transaction.isAutoTransfer && (() => {
                          const count = receiptCountMap[transaction.id] ?? 0
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(page > 0 || hasMore) && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page + 1}
            </span>

            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
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
          onSuccess={() => { setEditPaymentId(null); loadTransactions(); onDataChanged?.() }}
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
          onSuccess={() => { setEditDepositId(null); loadTransactions(); onDataChanged?.() }}
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
            setReceiptCountMap(prev => ({ ...prev, [pid]: (prev[pid] ?? 0) + 1 }));
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
    </>
  )
}
