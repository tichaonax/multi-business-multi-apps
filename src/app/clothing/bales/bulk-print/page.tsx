'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatDate } from '@/lib/date-format'

interface Bale {
  id: string
  sku: string
  scanCode: string
  batchNumber: string
  itemCount: number
  remainingCount: number
  unitPrice: number
  barcode: string | null
  category: { name: string }
}

interface BarcodeTemplate {
  id: string
  name: string
  symbology: string
  width: number
  height: number
  batchId?: string
}

interface NetworkPrinter {
  id: string
  printerName: string
  isOnline?: boolean
}

function escHtml(str: string) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Build one label's HTML matching the thermal label format */
function buildLabelHtml(
  bale: Bale,
  barcodeSvg: string,
  businessName: string,
  template: BarcodeTemplate,
): string {
  const today = formatDate(new Date())
  const batchLine = template.batchId ? `1-${template.batchId}` : ''
  const dateLine = [today, batchLine].filter(Boolean).join(' ')
  const price = `$ ${Number(bale.unitPrice).toFixed(2)}`

  return `
    <div style="width:220px;border:1px dashed #999;padding:8px 10px;background:white;font-family:sans-serif;display:inline-block;vertical-align:top;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#555;font-family:monospace;margin-bottom:4px;"><span>&#124;&nbsp;&nbsp;&#124;&nbsp;&nbsp;&#124;</span><span>&#124;&nbsp;&nbsp;&#124;</span></div>
      <div style="font-size:13px;font-weight:bold;text-align:center;margin-bottom:2px;line-height:1.6;">${escHtml(businessName)}</div>
      <div style="font-size:11px;font-weight:600;text-align:center;margin-bottom:2px;line-height:1.6;">${escHtml(bale.category.name)}</div>
      <div style="font-size:9px;text-align:center;margin-bottom:2px;">Batch ${escHtml(bale.batchNumber)}</div>
      <div style="font-size:9px;text-align:center;margin-bottom:4px;">${escHtml(dateLine)}</div>
      <div style="display:flex;justify-content:center;margin-bottom:2px;">${barcodeSvg}</div>
      <div style="font-size:9px;text-align:center;color:#444;margin-bottom:4px;letter-spacing:0.03em;">${escHtml(bale.scanCode)}</div>
      <div style="font-size:18px;font-weight:bold;text-align:center;margin-bottom:2px;line-height:1.6;">${escHtml(price)}</div>
      <div style="font-size:8px;text-align:center;color:#666;">${escHtml(template.name)}</div>
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#555;font-family:monospace;margin-top:4px;"><span>&#124;&nbsp;&nbsp;&#124;&nbsp;&nbsp;&#124;</span><span>&#124;&nbsp;&nbsp;&#124;</span></div>
    </div>
  `
}

export default function BalesBulkPrintPage() {
  const { currentBusinessId, activeBusinesses, loading: contextLoading } = useBusinessPermissionsContext()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const searchParams = useSearchParams()

  // URL params for pre-selection (from "Register & Print" and Add Stock Panel flows)
  const paramBaleId = searchParams.get('baleId')
  const paramTemplateId = searchParams.get('templateId')
  const paramQty = searchParams.get('qty')

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [qtyPerBale, setQtyPerBale] = useState<number>(paramQty ? Math.max(1, parseInt(paramQty, 10)) : 1)
  const bizInitRef = useRef(false)

  useEffect(() => {
    if (bizInitRef.current || contextLoading) return
    bizInitRef.current = true
    if (currentBusinessId) setSelectedBusinessId(currentBusinessId)
    else if (activeBusinesses.length > 0) {
      const nonDemo = activeBusinesses.find(b => !b.isDemo)
      setSelectedBusinessId((nonDemo ?? activeBusinesses[0]).businessId)
    }
  }, [contextLoading, currentBusinessId, activeBusinesses])

  const clothingBusinesses = activeBusinesses.filter(b => b.businessType === 'clothing' && !b.isUmbrellaBusiness)

  // ── Templates ──────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<BarcodeTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templatesLoading, setTemplatesLoading] = useState(false)

  useEffect(() => {
    if (!selectedBusinessId) return
    setTemplatesLoading(true)
    fetch(`/api/universal/barcode-management/templates?businessId=${selectedBusinessId}&limit=100`)
      .then(r => r.json())
      .then(data => {
        const list: BarcodeTemplate[] = data.templates ?? data.data ?? []
        setTemplates(list)
        if (list.length === 0) return
        // Prefer URL param templateId, then first template
        const preferred = paramTemplateId && list.find(t => t.id === paramTemplateId)
        setSelectedTemplateId(preferred ? preferred.id : list[0].id)
      })
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false))
  }, [selectedBusinessId])

  // ── Bales ──────────────────────────────────────────────────────────────────
  const [bales, setBales] = useState<Bale[]>([])
  const [balesLoading, setBalesLoading] = useState(false)

  useEffect(() => {
    if (!selectedBusinessId) return
    setBalesLoading(true)
    setBales([])
    setSelectedIds(new Set())
    fetch(`/api/clothing/bales?businessId=${selectedBusinessId}`)
      .then(r => r.json())
      .then(data => {
        const list: Bale[] = (data.data ?? data.bales ?? []).filter((b: Bale) => b.remainingCount > 0)
        setBales(list)
        // Auto-select bale from URL param (include even if remainingCount=0 so new bale appears)
        if (paramBaleId) {
          setSelectedIds(new Set([paramBaleId]))
        }
      })
      .catch(() => setBales([]))
      .finally(() => setBalesLoading(false))
  }, [selectedBusinessId])

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? bales.filter(b =>
        b.sku.toLowerCase().includes(search.toLowerCase()) ||
        b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
        b.category.name.toLowerCase().includes(search.toLowerCase())
      )
    : bales

  const allFilteredSelected = filtered.length > 0 && filtered.every(b => selectedIds.has(b.id))

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(b => n.delete(b.id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(b => n.add(b.id)); return n })
    }
  }

  const toggle = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Receipt printers ───────────────────────────────────────────────────────
  const printerKey = userId ? `lastSelectedPrinterId-${userId}` : 'lastSelectedPrinterId'
  const [printers, setPrinters] = useState<NetworkPrinter[]>([])
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('')
  const [printersLoading, setPrintersLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setPrintersLoading(true)
    fetch('/api/printers?printerType=receipt', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { printers: [] })
      .then(data => {
        const list: NetworkPrinter[] = data.printers || []
        setPrinters(list)
        let saved = localStorage.getItem(printerKey)
        if (!saved) {
          const global = localStorage.getItem('lastSelectedPrinterId')
          if (global) { saved = global; localStorage.setItem(printerKey, global) }
        }
        if (saved && list.find(p => p.id === saved)) { setSelectedPrinterId(saved); return }
        const online = list.find(p => p.isOnline)
        if (online) setSelectedPrinterId(online.id)
        else if (list.length === 1) setSelectedPrinterId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setPrintersLoading(false))
  }, [userId, printerKey])

  const handlePrinterChange = (id: string) => {
    setSelectedPrinterId(id)
    localStorage.setItem(printerKey, id)
  }

  // ── Print / Save as PDF ────────────────────────────────────────────────────
  const [isPdfPrinting, setIsPdfPrinting] = useState(false)

  const handlePdfPrint = async () => {
    if (selectedIds.size === 0 || !selectedTemplateId) return
    setIsPdfPrinting(true)
    try {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) return

      const selected = bales.filter(b => selectedIds.has(b.id))
      const JsBarcode = (await import('jsbarcode')).default
      const bizName = clothingBusinesses.find(b => b.businessId === selectedBusinessId)?.businessName ?? ''

      const labelHtmls = selected.flatMap(bale => {
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        JsBarcode(svgEl, bale.scanCode, {
          format: template.symbology?.toUpperCase() || 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: false,
          margin: 4,
        })
        svgEl.style.maxWidth = '100%'
        svgEl.style.display = 'block'
        const html = buildLabelHtml(bale, svgEl.outerHTML, bizName, template)
        return Array(qtyPerBale).fill(html)
      })

      const rows: string[] = []
      for (let i = 0; i < labelHtmls.length; i += 3) {
        const chunk = labelHtmls.slice(i, i + 3)
        rows.push(`<div style="display:flex;margin-bottom:0;page-break-inside:avoid;">${chunk.join('')}</div>`)
      }
      const allLabels = rows.join('')
      const title = `Bale Barcodes — ${selected.length} label${selected.length !== 1 ? 's' : ''}`

      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) { alert('Popup blocked — please allow popups for this site.'); return }

      printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
        <style>
          html,body{margin:0;padding:0;}
          body{padding:16px;font-family:sans-serif;}
          .print-toolbar{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:12px;z-index:100;margin:-16px -16px 16px;}
          .print-btn{background:#1f2937;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:14px;font-weight:600;cursor:pointer;}
          .print-btn:hover{background:#374151;}
          .print-title{font-size:13px;color:#64748b;}
          @media print{.print-toolbar{display:none;}body{padding:5mm;}}
        </style>
        </head><body>
        <div class="print-toolbar">
          <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <span class="print-title">${title}</span>
        </div>
        ${allLabels}
        </body></html>`)
      printWindow.document.close()
    } finally {
      setIsPdfPrinting(false)
    }
  }

  // ── Print to Receipt Printer ───────────────────────────────────────────────
  const [isReceiptPrinting, setIsReceiptPrinting] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [receiptSuccess, setReceiptSuccess] = useState(false)

  const handleReceiptPrint = async () => {
    if (selectedIds.size === 0 || !selectedPrinterId) return
    setIsReceiptPrinting(true)
    setReceiptError(null)
    setReceiptSuccess(false)
    try {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) throw new Error('No template selected')

      const { generateBarcodeLabel } = await import('@/lib/barcode-label-generator')
      const bizName = clothingBusinesses.find(b => b.businessId === selectedBusinessId)?.businessName ?? ''
      const selected = bales.filter(b => selectedIds.has(b.id))

      // Build one ESC/POS string per bale (each ends with partial cut)
      let allLabels = ''
      for (const bale of selected) {
        allLabels += generateBarcodeLabel({
          barcodeData: bale.scanCode,
          displayText: bale.scanCode,
          symbology: template.symbology || 'code128',
          businessName: bizName,
          templateName: template.name,
          displayValue: true,
          batchNumber: template.batchId || '',
          quantity: qtyPerBale,
          customData: {
            productName: bale.category.name,
            description: 'Batch ' + bale.batchNumber,
            price: String(bale.unitPrice),
          },
          width: template.width || 200,
          height: template.height || 100,
        })
      }

      // Base64 encode (ESC/POS is binary — encode byte-by-byte to stay in Latin1 range)
      const bytes = new Uint8Array(allLabels.length)
      for (let i = 0; i < allLabels.length; i++) {
        bytes[i] = allLabels.charCodeAt(i) & 0xFF
      }
      const binaryStr = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
      const escPosData = btoa(binaryStr)

      const res = await fetch('/api/print/card', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerId: selectedPrinterId, businessId: selectedBusinessId, escPosData }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Print failed (${res.status})`)
      }

      setReceiptSuccess(true)
      setTimeout(() => setReceiptSuccess(false), 4000)
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : 'Print failed')
    } finally {
      setIsReceiptPrinting(false)
    }
  }

  const canPrint = selectedIds.size > 0 && !!selectedTemplateId
  const totalLabels = selectedIds.size * qtyPerBale

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clothing/inventory?tab=bales" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">🖨️ Bulk Print Bale Barcodes</h1>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Select a barcode template, choose the bales to print, then use either print option below.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center gap-2 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Business</label>
          <select
            value={selectedBusinessId}
            onChange={e => setSelectedBusinessId(e.target.value)}
            className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {clothingBusinesses.map(b => (
              <option key={b.businessId} value={b.businessId}>{b.businessName}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Labels per bale</label>
          <input
            type="number"
            min={1}
            max={999}
            value={qtyPerBale}
            onChange={e => setQtyPerBale(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-center"
          />
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Template</label>
          {templatesLoading ? (
            <span className="text-xs text-gray-400">Loading...</span>
          ) : templates.length === 0 ? (
            <span className="text-xs text-red-500">No templates found</span>
          ) : (
            <select
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Print actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        {/* PDF */}
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Label printer / PDF</p>
          <button
            onClick={handlePdfPrint}
            disabled={!canPrint || isPdfPrinting}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPdfPrinting
              ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Preparing...</>
              : <>🖨️ Print / Save as PDF {selectedIds.size > 0 && `(${totalLabels} label${totalLabels !== 1 ? 's' : ''})`}</>}
          </button>
        </div>

        <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-700" />

        {/* Receipt printer */}
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Receipt printer — one label per cut</p>
          {printersLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
              <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Looking for receipt printers…
            </div>
          ) : printers.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">No receipt printers found</p>
          ) : (
            <div className="space-y-2">
              {printers.length > 1 && (
                <select
                  value={selectedPrinterId}
                  onChange={e => handlePrinterChange(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select printer…</option>
                  {printers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.printerName}{p.isOnline === false ? ' (offline)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {printers.length === 1 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{printers[0].printerName}</p>
              )}
              <button
                onClick={handleReceiptPrint}
                disabled={!canPrint || isReceiptPrinting || !selectedPrinterId}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isReceiptPrinting
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Printing…</>
                  : receiptSuccess ? '✅ Printed!'
                  : <>🧾 Print to Receipt Printer {selectedIds.size > 0 && `(${totalLabels} label${totalLabels !== 1 ? 's' : ''})`}</>}
              </button>
              {receiptError && <p className="text-xs text-red-500 mt-1">{receiptError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by SKU, batch, or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
      </div>

      {/* Bales table */}
      {balesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          <span className="ml-3 text-gray-500">Loading bales...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll}
                    disabled={filtered.length === 0} className="rounded disabled:opacity-40" title="Select all" />
                </th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Bale</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">Batch</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">Price</th>
                <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    {bales.length === 0 ? 'No active bales found for this business.' : 'No bales match your search.'}
                  </td>
                </tr>
              ) : filtered.map(bale => {
                const isSelected = selectedIds.has(bale.id)
                return (
                  <tr key={bale.id} onClick={() => toggle(bale.id)}
                    className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-purple-50 dark:bg-purple-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                    <td className="px-4 py-3 w-10">
                      <input type="checkbox" checked={isSelected} onChange={() => toggle(bale.id)}
                        onClick={e => e.stopPropagation()} className="rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{bale.category.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{bale.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell font-mono text-xs">{bale.batchNumber}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">${Number(bale.unitPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        bale.remainingCount < 10
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                        {bale.remainingCount}/{bale.itemCount}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex gap-2">
          <button onClick={handlePdfPrint} disabled={isPdfPrinting || !selectedTemplateId}
            className="px-5 py-3 bg-gray-800 text-white rounded-xl shadow-xl text-sm font-semibold hover:bg-gray-900 disabled:opacity-50">
            {isPdfPrinting ? 'Preparing...' : `🖨️ PDF (${totalLabels})`}
          </button>
          {printers.length > 0 && (
            <button onClick={handleReceiptPrint} disabled={isReceiptPrinting || !selectedPrinterId || !selectedTemplateId}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl shadow-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {isReceiptPrinting ? 'Printing...' : receiptSuccess ? '✅ Done!' : `🧾 Receipt (${totalLabels})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
