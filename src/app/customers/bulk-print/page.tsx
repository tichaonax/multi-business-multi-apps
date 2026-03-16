'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface BulkCustomer {
  id: string
  customerNumber: string
  name: string
  phone?: string | null
  photoUrl?: string | null
  isActive: boolean
  businesses?: { id: string; name: string; phone?: string | null } | null
}

function escHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildCardHtml(customer: BulkCustomer, barcodeSvg: string): string {
  const photoHtml = customer.photoUrl
    ? `<img src="${escHtml(customer.photoUrl)}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;border:1px solid #d1d5db;" />`
    : `<div style="width:56px;height:56px;border-radius:8px;background:#f3f4f6;border:1px solid #d1d5db;display:flex;align-items:center;justify-content:center;font-size:24px;">🛍️</div>`

  return `
    <div style="display:inline-block;background:#fff;border:2px solid #1f2937;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);width:314px;font-family:sans-serif;vertical-align:top;">
      <div style="background:#fff;padding:5px 12px;border-bottom:1px solid #d1d5db;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:700;font-size:11px;letter-spacing:.08em;color:#111;">LOYALTY CARD</span>
        ${customer.businesses?.phone ? `<span style="font-size:11px;font-weight:600;color:#111;">${escHtml(customer.businesses.phone)}</span>` : ''}
      </div>
      <div style="padding:8px 12px;display:flex;gap:10px;align-items:center;">
        <div style="flex-shrink:0;">${photoHtml}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13px;color:#111;word-break:break-word;line-height:1.4;">${escHtml(customer.name)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:2px;">
            <span style="font-size:11px;font-family:monospace;font-weight:600;color:#111;">${escHtml(customer.customerNumber)}</span>
            ${customer.phone ? `<span style="font-size:11px;font-family:monospace;font-weight:600;color:#111;white-space:nowrap;">${escHtml(customer.phone)}</span>` : ''}
          </div>
          ${customer.businesses?.name ? `<div style="font-size:11px;font-weight:600;color:#1f2937;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(customer.businesses.name)}</div>` : ''}
        </div>
      </div>
      <div style="padding:0 12px 8px;display:flex;flex-direction:column;align-items:center;">
        ${barcodeSvg}
      </div>
    </div>`
}

export default function CustomerBulkPrintPage() {
  const { currentBusinessId, activeBusinesses, loading: contextLoading } = useBusinessPermissionsContext()

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const bizInitRef = useRef(false)

  useEffect(() => {
    if (bizInitRef.current || contextLoading) return
    bizInitRef.current = true
    if (currentBusinessId) {
      setSelectedBusinessId(currentBusinessId)
    } else if (activeBusinesses.length > 0) {
      const nonDemo = activeBusinesses.find(b => !b.isDemo)
      setSelectedBusinessId((nonDemo ?? activeBusinesses[0]).businessId)
    }
  }, [contextLoading, currentBusinessId, activeBusinesses])

  const [bizSearch, setBizSearch] = useState('')
  const [bizOpen, setBizOpen] = useState(false)
  const allRealBusinesses = activeBusinesses.filter(b => !b.isUmbrellaBusiness)
  const bizOptions = bizSearch.trim()
    ? allRealBusinesses.filter(b => b.businessName.toLowerCase().includes(bizSearch.toLowerCase()))
    : allRealBusinesses
  const selectedBizName = allRealBusinesses.find(b => b.businessId === selectedBusinessId)?.businessName

  const [customers, setCustomers] = useState<BulkCustomer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPrinting, setIsPrinting] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!selectedBusinessId) { setCustomers([]); return }

    const load = async () => {
      setIsLoading(true)
      setSelectedIds(new Set())
      try {
        const params = new URLSearchParams({ businessId: selectedBusinessId, limit: '500', page: '1' })
        const res = await fetch(`/api/customers?${params}`)
        const data = await res.json()
        setCustomers(data.customers ?? [])
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [selectedBusinessId])

  const filtered = search.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.customerNumber.includes(search)
      )
    : customers

  const activeFiltered = filtered.filter(c => c.isActive)
  const allActiveSelected = activeFiltered.length > 0 && activeFiltered.every(c => selectedIds.has(c.id))

  const toggleAll = () => {
    if (allActiveSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        activeFiltered.forEach(c => next.delete(c.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        activeFiltered.forEach(c => next.add(c.id))
        return next
      })
    }
  }

  const toggle = (id: string, isActive: boolean) => {
    if (!isActive) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handlePrint = async () => {
    if (selectedIds.size === 0) return
    setIsPrinting(true)
    try {
      const selected = customers.filter(c => selectedIds.has(c.id))
      const JsBarcode = (await import('jsbarcode')).default

      const cardRows = selected.map(customer => {
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        try {
          JsBarcode(svgEl, customer.customerNumber, {
            format: 'CODE128',
            width: 1.2,
            height: 30,
            displayValue: false,
            margin: 8,
          })
        } catch { /* ignore */ }
        svgEl.style.maxWidth = '100%'
        svgEl.style.display = 'block'
        const barcodeSvg = svgEl.outerHTML
        const card = buildCardHtml(customer, barcodeSvg)
        return `
          <div style="display:flex;align-items:flex-start;justify-content:center;margin-bottom:8px;page-break-inside:avoid;">
            ${card}
            <div style="width:0;align-self:stretch;border-left:2px dashed #9ca3af;"></div>
            ${card}
          </div>`
      }).join('')

      const printWindow = window.open('', '_blank', 'width=800,height=700')
      if (!printWindow) { alert('Popup blocked — please allow popups for this site.'); return }

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Bulk Print — Loyalty Cards</title><style>body{margin:10mm;background:white;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;}@media print{body{margin:5mm;}}</style></head><body>${cardRows}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`)
      printWindow.document.close()
    } finally {
      setIsPrinting(false)
    }
  }

  const activeCount = customers.filter(c => c.isActive).length
  const inactiveCount = customers.filter(c => !c.isActive).length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">🖨️ Bulk Print Loyalty Cards</h1>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Select customers to include. Each card prints twice side-by-side — fold and cut to get a double-sided loyalty card.
        Only <span className="font-medium text-gray-700 dark:text-gray-300">active customers</span> can be selected.
      </p>

      {/* Business filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="relative flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Business</label>
          <div className="relative min-w-[220px]">
            <button
              type="button"
              onClick={() => { setBizOpen(o => !o); setBizSearch('') }}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-teal-400 transition-colors"
            >
              <span className="truncate">{selectedBizName ?? 'Select business…'}</span>
              <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {bizOpen && (
              <div className="absolute z-50 mt-1 w-full min-w-[240px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search businesses…"
                    value={bizSearch}
                    onChange={e => setBizSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {bizOptions.map(biz => (
                    <button
                      key={biz.businessId}
                      type="button"
                      onClick={() => { setSelectedBusinessId(biz.businessId); setBizOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedBusinessId === biz.businessId ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {biz.businessName}
                    </button>
                  ))}
                  {bizOptions.length === 0 && (
                    <div className="px-3 py-3 text-sm text-gray-400 text-center">No businesses found</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {bizOpen && <div className="fixed inset-0 z-40" onClick={() => setBizOpen(false)} />}
        </div>
        {!isLoading && customers.length > 0 && (
          <span className="text-xs text-gray-400">
            <span className="text-green-600 dark:text-green-400 font-medium">{activeCount} active</span>
            {inactiveCount > 0 && <> · <span className="text-gray-400">{inactiveCount} inactive</span></>}
          </span>
        )}
      </div>

      {/* Search + Print button */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or customer number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
        <button
          onClick={handlePrint}
          disabled={selectedIds.size === 0 || isPrinting}
          className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isPrinting ? 'Preparing...' : `🖨️ Print (${selectedIds.size})`}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          <span className="ml-3 text-gray-500">Loading customers...</span>
        </div>
      ) : !selectedBusinessId ? (
        <div className="text-center py-12 text-gray-400 text-sm">Select a business to load customers.</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allActiveSelected}
                    onChange={toggleAll}
                    disabled={activeFiltered.length === 0}
                    className="rounded disabled:opacity-40"
                    title="Select all active"
                  />
                </th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Phone</th>
                <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    {customers.length === 0 ? 'No customers found for this business.' : 'No results match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map(customer => {
                  const isSelectable = customer.isActive
                  const isSelected = selectedIds.has(customer.id)
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => toggle(customer.id, isSelectable)}
                      className={`border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                        !isSelectable
                          ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
                          : isSelected
                          ? 'bg-teal-50 dark:bg-teal-900/10 cursor-pointer'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer'
                      }`}
                    >
                      <td className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!isSelectable}
                          onChange={() => toggle(customer.id, isSelectable)}
                          onClick={e => e.stopPropagation()}
                          className="rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {customer.photoUrl ? (
                            <img src={customer.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">🛍️</div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                            <div className="text-xs text-gray-400 font-mono">#{customer.customerNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                        {customer.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {customer.isActive ? (
                          <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full">Active</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky print bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-6 py-3 bg-teal-600 text-white rounded-xl shadow-xl text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
          >
            {isPrinting ? 'Preparing...' : `🖨️ Print ${selectedIds.size} Card${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
