'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { InvoiceLineItems, LineItem, newItem, computeTotals } from './invoice-line-items'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceDocType = 'INVOICE' | 'QUOTATION'

export interface InvoiceRecord {
  id: string
  type: InvoiceDocType
  number: string
  status: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  preparedByName: string
  issueDate: string
  validUntilDate: string
  notes?: string | null
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  currency: string
  currencySymbol: string
  invoice_items: {
    id: string
    description: string
    quantity: number
    unitPrice: number
    discount: number
    total: number
    sortOrder: number
  }[]
}

interface CompanyInfo {
  umbrellaBusinessName: string
  umbrellaBusinessAddress?: string
  umbrellaBusinessPhone?: string
  umbrellaBusinessEmail?: string
  umbrellaBusinessRegistration?: string
  logoImageId?: string | null
}

interface CustomerSuggestion {
  id: string
  customerNumber: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
}

interface Props {
  mode: InvoiceDocType
  businessId: string
  preparedByName: string
  userId: string
  taxEnabled: boolean
  taxRate: number
  existingInvoice?: InvoiceRecord | null  // null = create new, set = view/edit
  onClose: () => void
  onSaved: (record: InvoiceRecord) => void
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
}

const STATUS_COLOURS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  EXPIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CANCELLED: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
}

// ─── Print helper (matches payment-voucher pattern exactly) ──────────────────

function printDocument(contentHtml: string, title: string) {
  const win = window.open('', '_blank', 'width=850,height=1100')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111; background: #fff; font-size: 11px; }
    .inv-outer { max-width: 720px; margin: 0 auto; }
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
    .inv-logo { max-height: 56px; max-width: 140px; object-fit: contain; }
    .inv-company { font-size: 11px; color: #444; line-height: 1.5; }
    .inv-company strong { font-size: 14px; color: #000; display: block; margin-bottom: 2px; }
    .inv-title-block { text-align: right; }
    .inv-title-block h1 { font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-bottom: 4px; }
    .inv-title-block p { font-size: 10px; color: #555; line-height: 1.6; }
    .inv-parties { display: flex; justify-content: space-between; margin-bottom: 10px; gap: 20px; }
    .inv-party { flex: 1; border: 1px solid #ccc; padding: 8px 10px; border-radius: 3px; }
    .inv-party-title { font-size: 9px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 1px solid #eee; }
    .inv-party p { font-size: 10px; line-height: 1.6; color: #333; }
    .inv-party strong { color: #000; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    thead th { background: #f4f4f4; padding: 5px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #ccc; }
    thead th.right { text-align: right; }
    tbody td { padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #eee; vertical-align: top; }
    tbody td.right { text-align: right; }
    tfoot td { padding: 4px 8px; font-size: 10px; text-align: right; }
    tfoot tr.total-row td { font-weight: bold; font-size: 12px; border-top: 2px solid #000; padding-top: 6px; }
    .inv-notes { border: 1px solid #ccc; padding: 8px 10px; border-radius: 3px; font-size: 10px; color: #555; margin-bottom: 8px; }
    .inv-notes-title { font-size: 9px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #888; margin-bottom: 3px; }
    .inv-disclaimer { font-size: 9px; color: #888; font-style: italic; border-top: 1px dashed #ccc; padding-top: 6px; margin-top: 4px; }
    .inv-footer { display: flex; justify-content: space-between; font-size: 9px; color: #aaa; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 8px; }
  </style>
</head><body>${contentHtml}</body></html>`)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 400)
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function InvoiceModal({
  mode,
  businessId,
  preparedByName,
  userId,
  taxEnabled,
  taxRate,
  existingInvoice,
  onClose,
  onSaved,
}: Props) {
  const isQuotation = mode === 'QUOTATION'
  const accentClass = isQuotation
    ? 'bg-amber-600 hover:bg-amber-700'
    : 'bg-blue-600 hover:bg-blue-700'

  // ── Company info
  const [company, setCompany] = useState<CompanyInfo | null>(null)

  // ── Form state
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [customerName, setCustomerName] = useState(existingInvoice?.customerName ?? '')
  const [customerEmail, setCustomerEmail] = useState(existingInvoice?.customerEmail ?? '')
  const [customerPhone, setCustomerPhone] = useState(existingInvoice?.customerPhone ?? '')
  const [customerAddress, setCustomerAddress] = useState(existingInvoice?.customerAddress ?? '')
  const [issueDate, setIssueDate] = useState(
    existingInvoice?.issueDate
      ? existingInvoice.issueDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  )
  const [validUntilDate, setValidUntilDate] = useState(
    existingInvoice?.validUntilDate
      ? existingInvoice.validUntilDate.slice(0, 10)
      : (() => {
          const d = new Date()
          d.setDate(d.getDate() + (isQuotation ? 30 : 60))
          return d.toISOString().slice(0, 10)
        })()
  )
  const [notes, setNotes] = useState(existingInvoice?.notes ?? '')
  const [items, setItems] = useState<LineItem[]>(() => {
    if (existingInvoice?.invoice_items?.length) {
      return existingInvoice.invoice_items
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => ({
          id: crypto.randomUUID(),
          description: i.description,
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice),
          discount: i.discount ? String(i.discount) : '',
        }))
    }
    return [newItem()]
  })
  const [discountAmount, setDiscountAmount] = useState(
    existingInvoice?.discountAmount ? String(existingInvoice.discountAmount) : ''
  )

  // ── Modal state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(!!existingInvoice)
  const [savedRecord, setSavedRecord] = useState<InvoiceRecord | null>(existingInvoice ?? null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // ── Load company info once
  useEffect(() => {
    fetch('/api/admin/umbrella-business')
      .then((r) => r.json())
      .then((d) => setCompany(d))
      .catch(() => {})
  }, [])

  // ── Customer search
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setCustomerSuggestions([]); return }
    try {
      const res = await fetch(`/api/universal/customers?businessId=${businessId}&q=${encodeURIComponent(q)}&limit=8`)
      if (!res.ok) return
      const json = await res.json()
      setCustomerSuggestions(json.data ?? json ?? [])
    } catch { /* ignore */ }
  }, [businessId])

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(customerQuery), 250)
    return () => clearTimeout(t)
  }, [customerQuery, searchCustomers])

  function selectCustomer(c: CustomerSuggestion) {
    setCustomerName(c.name)
    setCustomerEmail(c.email ?? '')
    setCustomerPhone(c.phone ?? '')
    setCustomerAddress(c.address ?? '')
    setCustomerQuery(c.name)
    setShowSuggestions(false)
  }

  // ── Save
  async function handleSave() {
    if (!customerName.trim()) { setError('Customer name is required'); return }
    if (!validUntilDate) { setError('Valid until date is required'); return }
    if (items.some((i) => !i.description.trim())) { setError('All line items need a description'); return }
    if (items.some((i) => !i.unitPrice || parseFloat(i.unitPrice) < 0)) {
      setError('All line items need a unit price'); return
    }

    setSaving(true)
    setError('')
    try {
      const { tax } = computeTotals(items, discountAmount, taxRate, taxEnabled)
      const res = await fetch('/api/universal/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          type: mode,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          customerAddress: customerAddress.trim() || undefined,
          preparedByName,
          issueDate,
          validUntilDate,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            description: i.description,
            quantity: parseFloat(i.quantity) || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
            discount: parseFloat(i.discount) || 0,
          })),
          discountAmount: parseFloat(discountAmount) || 0,
          taxAmount: tax,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to save'); return }
      setSavedRecord(json.data)
      setShowPreview(true)
      onSaved(json.data)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  // ── Status update
  async function updateStatus(status: string) {
    if (!savedRecord) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/universal/invoices/${savedRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (res.ok) {
        setSavedRecord(json.data)
        onSaved(json.data)
      }
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ── Print
  function handlePrint() {
    if (!previewRef.current) return
    printDocument(previewRef.current.innerHTML, savedRecord?.number ?? mode)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PREVIEW STATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (showPreview && savedRecord) {
    const rec = savedRecord
    const fmt = (n: number) => `${rec.currencySymbol}${Number(n).toFixed(2)}`
    const fmtDate = (s: string) =>
      new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

    const canChangeStatus = !['CANCELLED'].includes(rec.status)
    const nextStatuses = rec.type === 'INVOICE'
      ? [
          rec.status === 'DRAFT' && 'SENT',
          rec.status === 'SENT' && 'ACCEPTED',
          rec.status === 'SENT' && 'REJECTED',
          rec.status !== 'CANCELLED' && 'CANCELLED',
        ].filter(Boolean) as string[]
      : [
          rec.status === 'DRAFT' && 'SENT',
          rec.status === 'SENT' && 'ACCEPTED',
          rec.status === 'SENT' && 'REJECTED',
          rec.status === 'SENT' && 'EXPIRED',
          rec.status !== 'CANCELLED' && 'CANCELLED',
        ].filter(Boolean) as string[]

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '92vh' }}>
          {/* Preview header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {isQuotation ? '📋' : '📄'} {rec.number}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[rec.status]}`}>
                {STATUS_LABELS[rec.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canChangeStatus && nextStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={updatingStatus}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-colors disabled:opacity-50 ${
                    s === 'CANCELLED'
                      ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20'
                      : s === 'ACCEPTED'
                      ? 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Mark as {STATUS_LABELS[s]}
                </button>
              ))}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                🖨️ Print
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none ml-1">×</button>
            </div>
          </div>

          {/* Scrollable preview content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
            <div ref={previewRef} className="bg-white text-gray-900 font-sans inv-outer max-w-2xl mx-auto p-6 shadow-sm rounded">

              {/* Header: logo + company | document title + number */}
              <div className="flex justify-between items-start border-b-2 border-gray-900 pb-3 mb-4 gap-4">
                <div className="flex items-start gap-3">
                  {company?.logoImageId && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/images/${company.logoImageId}`}
                      alt="Company logo"
                      className="inv-logo max-h-14 max-w-36 object-contain"
                    />
                  )}
                  <div className="inv-company">
                    <strong className="text-sm font-bold text-gray-900">{company?.umbrellaBusinessName}</strong>
                    {company?.umbrellaBusinessAddress && <p className="text-xs text-gray-500">{company.umbrellaBusinessAddress}</p>}
                    {company?.umbrellaBusinessPhone && <p className="text-xs text-gray-500">Tel: {company.umbrellaBusinessPhone}</p>}
                    {company?.umbrellaBusinessEmail && <p className="text-xs text-gray-500">{company.umbrellaBusinessEmail}</p>}
                    {company?.umbrellaBusinessRegistration && <p className="text-xs text-gray-500">Reg: {company.umbrellaBusinessRegistration}</p>}
                  </div>
                </div>
                <div className="text-right inv-title-block shrink-0">
                  <h1 className="text-xl font-bold tracking-widest text-gray-900">
                    {isQuotation ? 'QUOTATION' : 'INVOICE'}
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">No: <strong className="text-gray-800">{rec.number}</strong></p>
                  <p className="text-xs text-gray-500">Date: {fmtDate(rec.issueDate)}</p>
                  <p className="text-xs text-gray-500">{isQuotation ? 'Quote Valid Until' : 'Valid Until'}: <strong className="text-gray-800">{fmtDate(rec.validUntilDate)}</strong></p>
                </div>
              </div>

              {/* Bill to / Prepared by */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="inv-party border border-gray-200 rounded p-3">
                  <p className="inv-party-title text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 pb-1 border-b border-gray-100">Bill To</p>
                  <p className="font-semibold text-sm text-gray-900">{rec.customerName}</p>
                  {rec.customerPhone && <p className="text-xs text-gray-500 mt-0.5">{rec.customerPhone}</p>}
                  {rec.customerEmail && <p className="text-xs text-gray-500">{rec.customerEmail}</p>}
                  {rec.customerAddress && <p className="text-xs text-gray-500 whitespace-pre-line">{rec.customerAddress}</p>}
                </div>
                <div className="inv-party border border-gray-200 rounded p-3">
                  <p className="inv-party-title text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 pb-1 border-b border-gray-100">Prepared By</p>
                  <p className="font-semibold text-sm text-gray-900">{rec.preparedByName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmtDate(rec.issueDate)}</p>
                </div>
              </div>

              {/* Line items table */}
              <table className="w-full text-xs border-collapse mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600 border-b-2 border-gray-300 w-8">#</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-600 border-b-2 border-gray-300">Description</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600 border-b-2 border-gray-300 w-16">Qty</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600 border-b-2 border-gray-300 w-24">Unit Price</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600 border-b-2 border-gray-300 w-16">Disc%</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-gray-600 border-b-2 border-gray-300 w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.invoice_items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-2 py-1.5 text-gray-400">{idx + 1}</td>
                      <td className="px-2 py-1.5 text-gray-900">{item.description}</td>
                      <td className="px-2 py-1.5 text-right text-gray-700">{Number(item.quantity)}</td>
                      <td className="px-2 py-1.5 text-right text-gray-700">{fmt(Number(item.unitPrice))}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{Number(item.discount) > 0 ? `${item.discount}%` : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900">{fmt(Number(item.total))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={5} className="px-2 py-1 text-right text-gray-500 text-xs">Subtotal</td><td className="px-2 py-1 text-right text-gray-700">{fmt(Number(rec.subtotal))}</td></tr>
                  {Number(rec.discountAmount) > 0 && (
                    <tr><td colSpan={5} className="px-2 py-1 text-right text-gray-500 text-xs">Discount</td><td className="px-2 py-1 text-right text-gray-700">-{fmt(Number(rec.discountAmount))}</td></tr>
                  )}
                  {Number(rec.taxAmount) > 0 && (
                    <tr><td colSpan={5} className="px-2 py-1 text-right text-gray-500 text-xs">Tax</td><td className="px-2 py-1 text-right text-gray-700">{fmt(Number(rec.taxAmount))}</td></tr>
                  )}
                  <tr className="total-row">
                    <td colSpan={5} className="px-2 pt-2 pb-1 text-right font-bold text-sm border-t-2 border-gray-900">TOTAL</td>
                    <td className="px-2 pt-2 pb-1 text-right font-bold text-sm border-t-2 border-gray-900">{fmt(Number(rec.total))}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Notes */}
              {rec.notes && (
                <div className="inv-notes border border-gray-200 rounded p-3 mt-3">
                  <p className="inv-notes-title text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Notes</p>
                  <p className="text-xs text-gray-600 whitespace-pre-line">{rec.notes}</p>
                </div>
              )}

              {/* Quotation disclaimer */}
              {isQuotation && (
                <p className="inv-disclaimer text-xs text-gray-400 italic border-t border-dashed border-gray-200 pt-2 mt-3">
                  This quotation is subject to change at any time prior to acceptance.
                </p>
              )}

              {/* Footer */}
              <div className="inv-footer flex justify-between text-xs text-gray-400 border-t border-gray-200 pt-2 mt-4">
                <span>Prepared by: {rec.preparedByName}</span>
                <span>{rec.number} · Generated {new Date().toLocaleString('en-GB')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM STATE
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {isQuotation ? '📋 New Quotation' : '📄 New Invoice'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Prepared by {preparedByName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Customer */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Customer / Bill To
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Search */}
              <div className="col-span-2 relative">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search existing customer
                </label>
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => { setCustomerQuery(e.target.value); setShowSuggestions(true) }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Type name or customer number…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                    {customerSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400 text-xs ml-2">{c.customerNumber}</span>
                        {c.phone && <span className="text-gray-400 text-xs ml-2">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name or company name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Customer address"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Document Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isQuotation ? 'Quote Valid Until' : 'Valid Until'} <span className="text-red-500">*</span>
                </label>
                <input type="date" value={validUntilDate} onChange={(e) => setValidUntilDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  rows={2} placeholder="Any additional notes to include on the document…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Line Items
            </h3>
            <InvoiceLineItems
              items={items}
              onChange={setItems}
              currencySymbol="$"
              taxEnabled={taxEnabled}
              taxRate={taxRate}
              discountAmount={discountAmount}
              onDiscountChange={setDiscountAmount}
            />
          </div>

          {isQuotation && (
            <p className="text-xs text-amber-600 dark:text-amber-400 italic border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/20">
              This quotation is subject to change at any time prior to acceptance.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 ${accentClass}`}
          >
            {saving ? 'Saving…' : `Save ${isQuotation ? 'Quotation' : 'Invoice'} & Preview`}
          </button>
        </div>
      </div>
    </div>
  )
}
