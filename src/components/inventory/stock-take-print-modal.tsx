'use client'

import { useRef, useState } from 'react'

interface PrintRow {
  barcode: string
  name: string
  sku?: string
  isExistingItem: boolean
  currentStock: number | null
  physicalCount: string
  sellingPrice: string
  costPrice?: string
  isFreeItem: boolean
}

interface StockTakePrintModalProps {
  isOpen: boolean
  onClose: () => void
  businessName: string
  draftTitle?: string | null
  rows: PrintRow[]
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function StockTakePrintModal({
  isOpen,
  onClose,
  businessName,
  draftTitle,
  rows,
}: StockTakePrintModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)

  if (!isOpen) return null

  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  const existingRows = rows
    .filter(r => r.isExistingItem)
    .map(r => {
      const sysQty = r.currentStock ?? 0
      const physCount = r.physicalCount !== '' ? Number(r.physicalCount) : null
      const variance = physCount !== null ? physCount - sysQty : null
      const price = r.isFreeItem ? 0 : Number(r.sellingPrice) || 0
      const shortfall = variance !== null && variance < 0 ? Math.abs(variance) : 0
      const shortfallValue = shortfall * price
      return { ...r, sysQty, physCount, variance, price, shortfallValue }
    })

  const newRows = rows
    .filter(r => !r.isExistingItem)
    .map(r => {
      const price = r.isFreeItem ? 0 : Number(r.sellingPrice) || 0
      return { ...r, price }
    })

  const totalShortfallQty = existingRows.reduce((s, r) => {
    return s + (r.variance !== null && r.variance < 0 ? Math.abs(r.variance) : 0)
  }, 0)
  const totalShortfallValue = existingRows.reduce((s, r) => s + r.shortfallValue, 0)
  const counted = existingRows.filter(r => r.physCount !== null).length

  const handlePrint = () => {
    if (!contentRef.current) return
    setPrinting(true)
    const content = contentRef.current.innerHTML
    const win = window.open('', '_blank', 'width=1100,height=900')
    if (!win) { setPrinting(false); return }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Stock Take — ${businessName} — ${dateStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 8px; color: #111; background: #fff; padding: 12px 16px; }
    h1 { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
    .meta { font-size: 8px; color: #555; margin-bottom: 10px; }
    .section-title { font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #666; margin: 8px 0 3px; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 7.5px; }
    th { background: #f0f0f0; text-align: left; padding: 2px 4px; font-weight: bold; border: 1px solid #ccc; white-space: nowrap; }
    td { padding: 1.5px 4px; border: 1px solid #e0e0e0; white-space: nowrap; }
    td.name { white-space: normal; word-break: break-word; max-width: 200px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .neg { color: #b00; font-weight: bold; }
    .pos { color: #060; }
    .shortfall { background: #fff0f0; }
    .totals { margin-top: 8px; font-size: 8px; }
    .totals td { border: none; padding: 1px 6px; }
    @media print {
      body { padding: 6px 10px; }
      @page { size: A4 landscape; margin: 8mm; }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      setPrinting(false)
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col w-full max-w-4xl" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Stock Take Report — Print Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {printing ? 'Opening…' : 'Print / Save PDF'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1 text-lg leading-none">✕</button>
          </div>
        </div>

        {/* Preview (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-800">
          <div ref={contentRef} className="bg-white text-gray-900 rounded border border-gray-200 p-4 shadow-sm text-xs">

            <h1 className="text-base font-bold">{businessName} — Stock Take Report</h1>
            <p className="text-xs text-gray-500 mb-3">
              {draftTitle && <span>{draftTitle} · </span>}
              {dateStr} · {rows.length} item{rows.length !== 1 ? 's' : ''} · {counted} counted
            </p>

            {/* Existing Items */}
            {existingRows.length > 0 && (
              <>
                <div className="section-title text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1 mt-2 border-b border-gray-200 pb-0.5">
                  Existing Items ({existingRows.length})
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-1.5 py-1 text-left font-semibold">Barcode</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-left font-semibold">SKU</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-left font-semibold">Name</th>
                      <th className="border border-gray-300 px-1 py-1 text-center font-semibold w-10">Sys</th>
                      <th className="border border-gray-300 px-1 py-1 text-center font-semibold w-10">Phys</th>
                      <th className="border border-gray-300 px-1 py-1 text-center font-semibold w-10">Var</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-right font-semibold w-16">Cost</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-right font-semibold w-16">Price</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-right font-semibold w-20">Shortfall $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingRows.map((r, i) => (
                      <tr key={i} className={r.shortfallValue > 0 ? 'bg-red-50' : i % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="border border-gray-200 px-1.5 py-0.5 font-mono text-gray-600">{r.barcode || '—'}</td>
                        <td className="border border-gray-200 px-1.5 py-0.5 font-mono text-gray-500">{r.sku || '—'}</td>
                        <td className="border border-gray-200 px-1.5 py-0.5 max-w-[180px]" title={r.name}>{r.name}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-center text-gray-500">{r.sysQty}</td>
                        <td className="border border-gray-200 px-1 py-0.5 text-center">
                          {r.physCount !== null ? r.physCount : <span className="text-gray-300">—</span>}
                        </td>
                        <td className={`border border-gray-200 px-1 py-0.5 text-center font-medium ${
                          r.variance === null ? 'text-gray-300' :
                          r.variance < 0 ? 'text-red-600' :
                          r.variance > 0 ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {r.variance !== null ? (r.variance > 0 ? '+' : '') + r.variance : '—'}
                        </td>
                        <td className="border border-gray-200 px-1.5 py-0.5 text-right text-gray-500">
                          {r.costPrice && Number(r.costPrice) > 0 ? `$${fmt(Number(r.costPrice))}` : '—'}
                        </td>
                        <td className="border border-gray-200 px-1.5 py-0.5 text-right text-gray-600">
                          {r.isFreeItem ? 'Free' : `$${fmt(r.price)}`}
                        </td>
                        <td className={`border border-gray-200 px-1.5 py-0.5 text-right font-medium ${r.shortfallValue > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                          {r.shortfallValue > 0 ? `$${fmt(r.shortfallValue)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* New Items */}
            {newRows.length > 0 && (
              <>
                <div className="section-title text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1 mt-4 border-b border-gray-200 pb-0.5">
                  New Items ({newRows.length})
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-1.5 py-1 text-left font-semibold">Barcode</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-left font-semibold">SKU</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-left font-semibold">Name</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-right font-semibold w-16">Cost</th>
                      <th className="border border-gray-300 px-1.5 py-1 text-right font-semibold w-16">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newRows.map((r, i) => (
                      <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="border border-gray-200 px-1.5 py-0.5 font-mono text-gray-600">{r.barcode || '—'}</td>
                        <td className="border border-gray-200 px-1.5 py-0.5 font-mono text-gray-500">{r.sku || '—'}</td>
                        <td className="border border-gray-200 px-1.5 py-0.5">{r.name}</td>
                        <td className="border border-gray-200 px-1.5 py-0.5 text-right text-gray-500">
                          {r.costPrice && Number(r.costPrice) > 0 ? `$${fmt(Number(r.costPrice))}` : '—'}
                        </td>
                        <td className="border border-gray-200 px-1.5 py-0.5 text-right text-gray-600">
                          {r.isFreeItem ? 'Free' : `$${fmt(r.price)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Totals */}
            <div className="mt-4 border-t border-gray-200 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 max-w-xs">
                <span className="text-gray-500">Total items:</span>
                <span className="font-medium">{rows.length}</span>
                <span className="text-gray-500">Counted:</span>
                <span className="font-medium">{counted}</span>
                {totalShortfallQty > 0 && (
                  <>
                    <span className="text-gray-500">Total shortfall qty:</span>
                    <span className="font-medium text-red-600">{totalShortfallQty} unit{totalShortfallQty !== 1 ? 's' : ''}</span>
                    <span className="text-gray-500">Total shortfall value:</span>
                    <span className="font-medium text-red-600">${fmt(totalShortfallValue)}</span>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
