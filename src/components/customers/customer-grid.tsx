'use client'

import { useState } from 'react'
import { Building2, Mail, Phone, MapPin, User, Printer, CheckSquare, Square } from 'lucide-react'
import { CustomerDetailModal } from './customer-detail-modal'

interface Customer {
  id: string
  customerNumber: string
  name: string
  email?: string | null
  phone?: string | null
  customerType: string
  address?: string | null
  city?: string | null
  isActive: boolean
  photoUrl?: string | null
  businesses?: { id: string; name: string; type: string } | null
}

interface CustomerGridProps {
  customers: Customer[]
  loading: boolean
  onRefresh: () => void
}

// ─── Print helpers ────────────────────────────────────────────────────────────

function buildCardHtml(customer: Customer, barcodeSvg: string): string {
  const photoHtml = customer.photoUrl
    ? `<img src="${customer.photoUrl}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;border:1px solid #99f6e4;" />`
    : `<div style="flex-shrink:0;width:56px;height:56px;border-radius:8px;background:#f0fdfa;border:1px solid #99f6e4;display:flex;align-items:center;justify-content:center;font-size:24px;">🛍️</div>`
  return `
    <div style="display:inline-block;background:#fff;border:2px solid #0d9488;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);width:314px;font-family:sans-serif;vertical-align:top;">
      <div style="background:#0d9488;padding:6px 12px;display:flex;align-items:center;justify-content:space-between;">
        <span style="color:#fff;font-weight:700;font-size:11px;letter-spacing:.05em;">LOYALTY CARD</span>
        ${customer.businesses?.name ? `<span style="color:#99f6e4;font-size:11px;max-width:160px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${customer.businesses.name}</span>` : ''}
      </div>
      <div style="padding:12px;display:flex;gap:12px;align-items:center;">
        <div style="flex-shrink:0;">${photoHtml}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${customer.name}</div>
          <div style="color:#0d9488;font-size:11px;font-weight:500;margin-top:2px;font-family:monospace;">${customer.customerNumber}</div>
          ${customer.phone ? `<div style="color:#555;font-size:11px;margin-top:2px;">${customer.phone}</div>` : ''}
        </div>
      </div>
      <div style="padding:0 12px 12px;display:flex;flex-direction:column;align-items:center;">
        ${barcodeSvg}
        <span style="font-size:11px;color:#888;margin-top:2px;font-family:monospace;letter-spacing:.05em;">${customer.customerNumber}</span>
      </div>
    </div>`
}

function openPrintWindow(title: string, bodyContent: string) {
  const printWindow = window.open('', '_blank', 'width=960,height=700')
  if (!printWindow) return
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>${title}</title>
    <style>
      html, body { margin: 0; padding: 0; }
      body { padding: 16px; }
      .print-toolbar { position: sticky; top: 0; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; display: flex; align-items: center; gap: 12px; z-index: 100; }
      .print-btn { background: #0d9488; color: #fff; border: none; border-radius: 6px; padding: 8px 20px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
      .print-btn:hover { background: #0f766e; }
      .print-title { font-size: 13px; color: #64748b; font-family: sans-serif; }
      .card-row { display: flex; align-items: flex-start; justify-content: center; margin-bottom: 24px; page-break-inside: avoid; }
      .fold-guide { width: 0; align-self: stretch; border-left: 2px dashed #aaa; margin: 0; }
      @media print { .print-toolbar { display: none; } .fold-guide { border-left-color: #ccc; } body { padding: 0; } }
    </style>
    </head><body>
    <div class="print-toolbar no-print">
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <span class="print-title">${title}</span>
    </div>
    ${bodyContent}</body></html>`)
  printWindow.document.close()
}

async function generateCardRows(customers: Customer[]): Promise<string> {
  const JsBarcode = (await import('jsbarcode')).default
  let html = ''
  for (const customer of customers) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    document.body.appendChild(svg)
    try {
      JsBarcode(svg, customer.customerNumber, { format: 'CODE128', width: 1.2, height: 30, displayValue: false, margin: 8 })
    } catch { /* ignore */ }
    const barcodeSvg = svg.outerHTML
    document.body.removeChild(svg)

    const card = buildCardHtml(customer, barcodeSvg)
    // Two copies per row for fold-in-half
    html += `<div class="card-row">${card}<div class="fold-guide"></div>${card}</div>`
  }
  return html
}

async function printSingleCard(customer: Customer) {
  const rows = await generateCardRows([customer])
  openPrintWindow(`Loyalty Card — ${customer.name}`, rows)
}

async function printBulkCards(customers: Customer[]) {
  const rows = await generateCardRows(customers)
  openPrintWindow(`Loyalty Cards — ${customers.length} customers`, rows)
}

// ─── Type colors ──────────────────────────────────────────────────────────────

const typeColor: Record<string, string> = {
  INDIVIDUAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  BUSINESS:   'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  EMPLOYEE:   'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  USER:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  GOVERNMENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  NGO:        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomerGrid({ customers, loading, onRefresh }: CustomerGridProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [printing, setPrinting] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(customers.map(c => c.id)))
    }
  }

  const handleBulkPrint = async () => {
    const selected = customers.filter(c => selectedIds.has(c.id))
    if (!selected.length) return
    setPrinting(true)
    try { await printBulkCards(selected) } finally { setPrinting(false) }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="card p-12 text-center">
        <User className="h-12 w-12 text-secondary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-primary mb-2">No customers found</h3>
        <p className="text-secondary">Try adjusting your search or filters</p>
      </div>
    )
  }

  const allSelected = selectedIds.size === customers.length && customers.length > 0
  const someSelected = selectedIds.size > 0

  return (
    <>
      {/* Bulk actions bar */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
        >
          {allSelected
            ? <CheckSquare className="h-4 w-4 text-teal-600" />
            : <Square className="h-4 w-4" />
          }
          {allSelected ? 'Deselect All' : `Select All (${customers.length})`}
        </button>

        {someSelected && (
          <button
            onClick={handleBulkPrint}
            disabled={printing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Printer className="h-4 w-4" />
            {printing ? 'Preparing...' : `Print ${selectedIds.size} Card${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => {
          const isSelected = selectedIds.has(customer.id)
          return (
            <div
              key={customer.id}
              className={`card p-5 hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-teal-500' : ''}`}
            >
              {/* Header row */}
              <div className="flex items-start gap-2 mb-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(customer.id)}
                  className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-teal-600 transition-colors"
                  title="Select for bulk print"
                >
                  {isSelected
                    ? <CheckSquare className="h-4 w-4 text-teal-600" />
                    : <Square className="h-4 w-4" />
                  }
                </button>

                {/* Photo avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center cursor-pointer" onClick={() => setSelectedCustomerId(customer.id)}>
                  {customer.photoUrl
                    ? <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover" />
                    : <User className="h-5 w-5 text-gray-400" />}
                </div>

                {/* Name + number */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedCustomerId(customer.id)}>
                  <h3 className="font-semibold text-primary truncate">{customer.name}</h3>
                  <p className="text-xs text-secondary font-mono mt-0.5">{customer.customerNumber}</p>
                </div>

                <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${typeColor[customer.customerType] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {customer.customerType}
                </span>
              </div>

              {/* Business */}
              {customer.businesses?.name && (
                <div className="flex items-center gap-2 text-xs text-secondary mb-2">
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{customer.businesses.name}</span>
                </div>
              )}

              {/* Contact */}
              <div className="space-y-1.5 mb-4">
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.city && (
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{customer.city}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className="flex-1 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-primary transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => printSingleCard(customer)}
                  title="Print / Save PDF Loyalty Card"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-400 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Card
                </button>
              </div>

              {!customer.isActive && (
                <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400 font-medium">Inactive</p>
              )}
            </div>
          )
        })}
      </div>

      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onUpdate={onRefresh}
        />
      )}
    </>
  )
}
