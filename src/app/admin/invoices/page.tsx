'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { InvoiceModal, InvoiceRecord, InvoiceDocType } from '@/components/invoices/invoice-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceListItem {
  id: string
  type: InvoiceDocType
  number: string
  status: string
  customerName: string
  preparedByName: string
  issueDate: string
  validUntilDate: string
  total: number | string
  currency: string
  currencySymbol: string
  createdAt: string
}

const STATUS_COLOURS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  EXPIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CANCELLED: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 line-through',
}

type Tab = 'ALL' | 'INVOICE' | 'QUOTATION'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { data: session } = useSession()
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()

  const [tab, setTab] = useState<Tab>('ALL')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<InvoiceListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [modalMode, setModalMode] = useState<InvoiceDocType | null>(null)
  const [openRecord, setOpenRecord] = useState<InvoiceRecord | null | undefined>(undefined)

  const taxEnabled = (currentBusiness as any)?.taxEnabled ?? false
  const taxRate = parseFloat((currentBusiness as any)?.taxRate ?? '0') || 0

  const preparedByName = session?.user
    ? `${(session.user as any).firstName ?? ''} ${(session.user as any).lastName ?? ''}`.trim() ||
      session.user.name ||
      session.user.email ||
      'Staff'
    : 'Staff'

  const userId = (session?.user as any)?.id ?? ''

  // ── Load list
  const loadRecords = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId, page: String(page), limit: '25' })
      if (tab !== 'ALL') params.set('type', tab)
      if (statusFilter) params.set('status', statusFilter)
      if (search.trim()) params.set('q', search.trim())

      const res = await fetch(`/api/universal/invoices?${params}`)
      const json = await res.json()
      if (json.success) {
        setRecords(json.data)
        setTotalPages(json.meta.pages || 1)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [currentBusinessId, tab, statusFilter, search, page])

  useEffect(() => { loadRecords() }, [loadRecords])

  // ── Search: check for exact number match → open directly
  useEffect(() => {
    const q = search.trim().toUpperCase()
    if (!q) return
    const exact = records.find((r) => r.number === q)
    if (exact) openExisting(exact.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records])

  async function openExisting(id: string) {
    try {
      const res = await fetch(`/api/universal/invoices/${id}`)
      const json = await res.json()
      if (json.success) {
        setOpenRecord(json.data)
        setModalMode(json.data.type)
      }
    } catch { /* ignore */ }
  }

  function handleSaved(rec: InvoiceRecord) {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === rec.id)
      const listItem: InvoiceListItem = {
        id: rec.id, type: rec.type, number: rec.number, status: rec.status,
        customerName: rec.customerName, preparedByName: rec.preparedByName,
        issueDate: rec.issueDate, validUntilDate: rec.validUntilDate,
        total: rec.total, currency: rec.currency, currencySymbol: rec.currencySymbol,
        createdAt: new Date().toISOString(),
      }
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = listItem
        return updated
      }
      return [listItem, ...prev]
    })
  }

  function closeModal() {
    setModalMode(null)
    setOpenRecord(undefined)
  }

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const fmt = (item: InvoiceListItem) =>
    `${item.currencySymbol}${Number(item.total).toFixed(2)}`

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Invoices & Quotations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Create, track, and print professional invoices and quotations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setOpenRecord(null); setModalMode('INVOICE') }}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            + New Invoice
          </button>
          <button
            onClick={() => { setOpenRecord(null); setModalMode('QUOTATION') }}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
          >
            + New Quotation
          </button>
        </div>
      </div>

      {/* Tabs + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['ALL', 'INVOICE', 'QUOTATION'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'INVOICE' ? '📄 Invoices' : '📋 Quotations'}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
        >
          <option value="">All statuses</option>
          {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
          ))}
        </select>

        {/* Search */}
        <div className="flex-1 min-w-48">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by number (e.g. INV-0001) or customer…"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading…</div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">{tab === 'QUOTATION' ? '📋' : '📄'}</p>
          <p className="text-sm">No {tab === 'ALL' ? 'invoices or quotations' : tab.toLowerCase() + 's'} found.</p>
          {!search && !statusFilter && (
            <p className="text-xs mt-1">Click a button above to create your first one.</p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Number</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Valid Until</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 font-mono font-semibold text-sm ${
                        rec.type === 'INVOICE' ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {rec.type === 'INVOICE' ? '📄' : '📋'} {rec.number}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">by {rec.preparedByName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{rec.customerName}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(rec.issueDate)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(rec.validUntilDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{fmt(rec)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[rec.status] ?? ''}`}>
                        {rec.status[0] + rec.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openExisting(rec.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalMode && (
        <InvoiceModal
          mode={modalMode}
          businessId={currentBusinessId ?? ''}
          preparedByName={preparedByName}
          userId={userId}
          taxEnabled={taxEnabled}
          taxRate={taxRate}
          existingInvoice={openRecord}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
