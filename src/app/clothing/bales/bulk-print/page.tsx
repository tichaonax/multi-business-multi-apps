'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

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
  fontSize: number
  displayValue: boolean
}

function buildLabelHtml(bale: Bale, barcodeSvg: string, businessName: string): string {
  return `
    <div style="width:200px;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;background:white;font-family:sans-serif;display:inline-block;vertical-align:top;padding:8px;box-sizing:border-box;">
      <div style="font-size:9px;color:#6b7280;text-align:center;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(businessName)}</div>
      <div style="font-size:12px;font-weight:bold;color:#111827;text-align:center;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(bale.category.name)}</div>
      <div style="font-size:9px;color:#374151;text-align:center;margin-bottom:2px;">Batch: ${escHtml(bale.batchNumber)} &nbsp;·&nbsp; $${Number(bale.unitPrice).toFixed(2)}</div>
      <div style="font-size:9px;color:#6b7280;text-align:center;margin-bottom:4px;">${bale.remainingCount} of ${bale.itemCount} items</div>
      <div style="display:flex;justify-content:center;">${barcodeSvg}</div>
      <div style="font-size:8px;color:#9ca3af;text-align:center;margin-top:2px;letter-spacing:0.04em;">${escHtml(bale.sku)}</div>
    </div>
  `
}

function escHtml(str: string) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default function BalesBulkPrintPage() {
  const { currentBusinessId, activeBusinesses, loading: contextLoading } = useBusinessPermissionsContext()

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
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

  // Templates
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
        if (list.length > 0 && !selectedTemplateId) setSelectedTemplateId(list[0].id)
      })
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false))
  }, [selectedBusinessId])

  // Bales
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
      })
      .catch(() => setBales([]))
      .finally(() => setBalesLoading(false))
  }, [selectedBusinessId])

  // Selection
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

  // Print
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = async () => {
    if (selectedIds.size === 0 || !selectedTemplateId) return
    setIsPrinting(true)
    try {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) return

      const selected = bales.filter(b => selectedIds.has(b.id))
      const JsBarcode = (await import('jsbarcode')).default
      const bizName = clothingBusinesses.find(b => b.businessId === selectedBusinessId)?.businessName ?? ''

      const labelHtmls = selected.map(bale => {
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        JsBarcode(svgEl, bale.scanCode, {
          format: template.symbology?.toUpperCase() || 'CODE128',
          width: 1.5,
          height: template.height ? Math.min(template.height, 40) : 35,
          displayValue: false,
          margin: 4,
        })
        svgEl.style.maxWidth = '100%'
        svgEl.style.display = 'block'
        return buildLabelHtml(bale, svgEl.outerHTML, bizName)
      })

      // Lay out labels in rows of 3
      const rows: string[] = []
      for (let i = 0; i < labelHtmls.length; i += 3) {
        const chunk = labelHtmls.slice(i, i + 3)
        rows.push(`<div style="display:flex;gap:8px;margin-bottom:8px;page-break-inside:avoid;">${chunk.join('')}</div>`)
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
      setIsPrinting(false)
    }
  }

  const businessName = clothingBusinesses.find(b => b.businessId === selectedBusinessId)?.businessName ?? ''

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
        Select a barcode template, choose the bales to print, then click Print. Labels are printed 3-up per row.
      </p>

      {/* Controls row */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
        {/* Business selector */}
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

        {/* Template selector */}
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

      {/* Search + Print button */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by SKU, batch, or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
        <button
          onClick={handlePrint}
          disabled={selectedIds.size === 0 || isPrinting || !selectedTemplateId}
          className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isPrinting ? 'Preparing...' : `🖨️ Print (${selectedIds.size})`}
        </button>
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
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    disabled={filtered.length === 0}
                    className="rounded disabled:opacity-40"
                    title="Select all"
                  />
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
              ) : (
                filtered.map(bale => {
                  const isSelected = selectedIds.has(bale.id)
                  return (
                    <tr
                      key={bale.id}
                      onClick={() => toggle(bale.id)}
                      className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <td className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(bale.id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{bale.category.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{bale.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell font-mono text-xs">
                        {bale.batchNumber}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                        ${Number(bale.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          bale.remainingCount < 10
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {bale.remainingCount}/{bale.itemCount}
                        </span>
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
            disabled={isPrinting || !selectedTemplateId}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl shadow-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {isPrinting ? 'Preparing...' : `🖨️ Print ${selectedIds.size} Bale${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
