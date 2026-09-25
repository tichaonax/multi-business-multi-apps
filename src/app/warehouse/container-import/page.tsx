'use client'

export const dynamic = 'force-dynamic'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'

interface PreviewRow {
  rowIndex: number
  isLineItem: boolean
  trackingNumber: string | null
  orderNumber: string | null
  parcelSuffix: string | null
  productName: string
  unitCost: number | null
  clearancePerUnit: number | null
  shippingPerUnit: number | null
  landedCost: number | null
  estSellingPrice: number | null
  estMarginPct: string | null
  orderedQty: number | null
  batchQty: number | null
  diffQty: number | null
  matchStatus: string | null
  imageDataUrl: string | null
  matchedWarehouseItemId: string | null
  matchedProductName: string | null
  alreadyReconciled: boolean
  alreadyReconciledInBatch: string | null
  alreadyMovedToBusiness: boolean
  currentLiveSku: string | null
  currentLiveBarcode: string | null
  currentLivePrice: number | null
}

interface PreviewResponse {
  success: true
  fileHash: string
  sourceBatchTitle: string | null
  suggestedBatchName: string
  batchStatus: string | null
  headerItemCount: number | null
  exchangeRateText: string | null
  exchangeRateYuanPerUsd: number | null
  generatedAt: string | null
  totalLandedCost: number | null
  totalProjectedSelling: number | null
  totalProjectedProfit: number | null
  profitMarginPct: string | null
  totalRowsInFile: number
  lineItemCount: number
  matchedCount: number
  duplicateCount: number
  movedToBusinessCount: number
  rows: PreviewRow[]
}

const money = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`)

export default function ContainerImportPage() {
  const router = useRouter()
  const toast = useToastContext()
  const confirmDialog = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [batchName, setBatchName] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [included, setIncluded] = useState<Record<number, boolean>>({})
  const [sellingOverrides, setSellingOverrides] = useState<Record<number, string>>({})
  const [committing, setCommitting] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  async function handlePreview() {
    if (!file) { toast.error('Please select a file'); return }
    setLoadingPreview(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/warehouse/container-import/preview', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (res.status === 409) {
        toast.error(`This exact file was already imported as "${data.existingBatch?.batchName}"`)
        return
      }
      if (!res.ok) {
        toast.error(data.error || 'Failed to parse file')
        return
      }
      setPreview(data)
      setBatchName(data.suggestedBatchName)
      // Default: import all — nothing is ever pre-excluded automatically.
      const initial: Record<number, boolean> = {}
      for (const r of data.rows as PreviewRow[]) if (r.isLineItem) initial[r.rowIndex] = true
      setIncluded(initial)
      setSellingOverrides({})
      setStep('review')
    } catch {
      toast.error('Failed to parse file')
    } finally {
      setLoadingPreview(false)
    }
  }

  const lineRows = useMemo(() => (preview?.rows ?? []).filter(r => r.isLineItem), [preview])

  const totals = useMemo(() => {
    let count = 0, landed = 0, selling = 0
    for (const r of lineRows) {
      if (!included[r.rowIndex]) continue
      count++
      landed += (r.landedCost ?? 0) * (r.orderedQty ?? 0)
      const overridden = sellingOverrides[r.rowIndex]
      const price = overridden !== undefined && overridden !== '' ? parseFloat(overridden) : r.estSellingPrice
      selling += (isNaN(price as number) ? 0 : (price ?? 0)) * (r.orderedQty ?? 0)
    }
    return { count, landed, selling }
  }, [lineRows, included, sellingOverrides])

  function toggleAll(value: boolean) {
    const next: Record<number, boolean> = {}
    for (const r of lineRows) next[r.rowIndex] = value
    setIncluded(next)
  }

  async function handleImport() {
    if (!file || !preview) return
    if (!batchName.trim()) { toast.error('Batch name is required'); return }
    if (totals.count === 0) { toast.error('Select at least one item to import'); return }

    const pricingOnlyCount = lineRows.filter(r => included[r.rowIndex] && r.alreadyMovedToBusiness).length
    const pricingOnlyNote = pricingOnlyCount > 0
      ? ` ${pricingOnlyCount} of these are already live in a business — no duplicate will be created for them, only their selling price/cost/margin will be refreshed.`
      : ''

    const step1 = await confirmDialog({
      title: 'Import this batch?',
      description: `You're about to reconcile/import ${totals.count} of ${lineRows.length} items into the Warehouse — continue?${pricingOnlyNote}`,
      confirmText: 'Continue',
      cancelText: 'Cancel',
    })
    if (!step1) return

    const step2 = await confirmDialog({
      title: 'Confirm import',
      description: `Import batch "${batchName.trim()}" — ${totals.count} items, ${money(totals.landed)} landed cost, ${money(totals.selling)} projected selling price.${pricingOnlyNote} This cannot be undone. Import now?`,
      confirmText: 'Yes, import now',
      cancelText: 'Cancel',
    })
    if (!step2) return

    setCommitting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('batchName', batchName.trim())
      fd.append('includedRowIndexes', JSON.stringify(lineRows.filter(r => included[r.rowIndex]).map(r => r.rowIndex)))
      const overridesPayload: Record<number, number> = {}
      for (const [rowIndex, val] of Object.entries(sellingOverrides)) {
        const n = parseFloat(val)
        if (val !== '' && !isNaN(n)) overridesPayload[Number(rowIndex)] = n
      }
      fd.append('sellingPriceOverrides', JSON.stringify(overridesPayload))
      const res = await fetch('/api/warehouse/container-import/commit', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (res.status === 409) {
        toast.error(`This exact file was already imported as "${data.existingBatch?.batchName}"`)
        return
      }
      if (!res.ok) {
        toast.error(data.error || 'Import failed')
        return
      }
      const pricingMsg = data.pricingUpdatedCount > 0 ? `, ${data.pricingUpdatedCount} price-refreshed on already-live products` : ''
      toast.push(`Imported: ${data.createdCount} new, ${data.updatedCount} reconciled with existing items${pricingMsg}`)
      router.push(`/warehouse/${data.batchId}`)
    } catch {
      toast.error('Import failed')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <ProtectedRoute>
      <ContentLayout title="Container Batch Import">
        <div className={step === 'upload' ? 'max-w-2xl mx-auto space-y-6' : 'max-w-5xl mx-auto space-y-4'}>
          <Link href="/warehouse" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
            ← Back to Warehouse
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Container Batch Import</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Import the post-clearance "Container Batch" report (landed cost, est. selling price, tracking #/order # reconciliation). Matches against items already tracked in the Warehouse by order #.
            </p>
          </div>

          {step === 'upload' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Container Batch Excel File (.xlsx) *</label>
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB — click to change</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Click to choose the Container Batch .xlsx export</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <Link href="/warehouse" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  Cancel
                </Link>
                <button
                  onClick={handlePreview}
                  disabled={loadingPreview || !file}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loadingPreview ? 'Parsing…' : 'Preview →'}
                </button>
              </div>
            </div>
          )}

          {step === 'review' && preview && (
            <div className="space-y-4">
              {(preview.exchangeRateText || preview.batchStatus) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 px-1">
                  {preview.batchStatus && <span>Status: <span className="font-medium text-gray-700 dark:text-gray-300">{preview.batchStatus}</span></span>}
                  {preview.headerItemCount != null && <span>{preview.headerItemCount} items</span>}
                  {preview.exchangeRateText && <span>Exchange Rate: <span className="font-medium text-gray-700 dark:text-gray-300">{preview.exchangeRateText}</span></span>}
                  {preview.generatedAt && <span>Generated: {preview.generatedAt}</span>}
                </div>
              )}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Batch Name *</label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={e => setBatchName(e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                {(preview.totalLandedCost != null || preview.totalProjectedSelling != null) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-100 dark:border-blue-900/30">
                    <div><span className="text-gray-500">File Total Landed</span><p className="font-semibold text-gray-900 dark:text-white">{money(preview.totalLandedCost)}</p></div>
                    <div><span className="text-gray-500">File Total Selling</span><p className="font-semibold text-gray-900 dark:text-white">{money(preview.totalProjectedSelling)}</p></div>
                    <div><span className="text-gray-500">File Total Profit</span><p className="font-semibold text-gray-900 dark:text-white">{money(preview.totalProjectedProfit)}</p></div>
                    <div><span className="text-gray-500">File Margin</span><p className="font-semibold text-gray-900 dark:text-white">{preview.profitMarginPct ?? '—'}</p></div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Selected</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{totals.count} / {lineRows.length}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Landed Cost</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{money(totals.landed)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Projected Selling</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{money(totals.selling)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Reconciling existing</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{preview.matchedCount}</p>
                  </div>
                </div>
                {preview.duplicateCount > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                    ⚠ {preview.duplicateCount} item(s) below were already reconciled by an earlier container import — still checked by default (importing again will refresh their economics with this file's numbers). Review the ⚠ badges and uncheck any you don't want to overwrite.
                  </div>
                )}
                {preview.movedToBusinessCount > 0 && (
                  <div className="rounded-lg border border-purple-300 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 text-sm text-purple-800 dark:text-purple-200">
                    💲 {preview.movedToBusinessCount} item(s) below are already live in a business (SKU/barcode already assigned). No duplicate will be created — importing will only refresh their selling price, cost and margin. Uncheck any you don&apos;t want repriced.
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs">
                  <button onClick={() => toggleAll(true)} className="text-blue-600 hover:underline">Select all</button>
                  <button onClick={() => toggleAll(false)} className="text-gray-500 hover:underline">Skip all</button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
                  {preview.rows.map((r, i) => {
                    const prevTracking = i > 0 ? preview.rows[i - 1].trackingNumber : null
                    const isGroupStart = r.trackingNumber !== prevTracking
                    if (!r.isLineItem) {
                      return (
                        <div key={r.rowIndex} className={`px-4 py-2 bg-gray-50 dark:bg-gray-900/40 text-xs text-gray-500 dark:text-gray-400 ${isGroupStart ? '' : 'border-t-0'}`}>
                          📦 Tracking {r.trackingNumber} — {r.orderedQty} unit(s) across the items below ({r.matchStatus})
                        </div>
                      )
                    }
                    const overrideVal = sellingOverrides[r.rowIndex]
                    const overrideNum = overrideVal !== undefined && overrideVal !== '' ? parseFloat(overrideVal) : null
                    const isOverridden = overrideNum != null && !isNaN(overrideNum) && r.estSellingPrice != null && Math.abs(overrideNum - r.estSellingPrice) > 0.001
                    return (
                      <label key={r.rowIndex} className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 ${!isGroupStart ? 'pl-8' : ''}`}>
                        <input
                          type="checkbox"
                          checked={!!included[r.rowIndex]}
                          onChange={e => setIncluded(prev => ({ ...prev, [r.rowIndex]: e.target.checked }))}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        {r.imageDataUrl ? (
                          <img src={r.imageDataUrl} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800" />
                        ) : (
                          <span className="w-9 h-9 rounded flex-shrink-0 bg-gray-100 dark:bg-gray-800" />
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.productName}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.trackingNumber && <span className="text-[10px] text-gray-400 font-mono">TRK {r.trackingNumber}</span>}
                            {r.orderNumber && <span className="text-[10px] text-gray-400 font-mono">ORD {r.orderNumber}{r.parcelSuffix}</span>}
                            {r.matchedWarehouseItemId && !r.alreadyReconciled && !r.alreadyMovedToBusiness && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">🔄 will update existing item</span>
                            )}
                            {!r.matchedWarehouseItemId && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">🆕 new item</span>
                            )}
                            {r.alreadyReconciled && !r.alreadyMovedToBusiness && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" title={`Already reconciled in batch "${r.alreadyReconciledInBatch}"`}>
                                ⚠ possible duplicate — already reconciled in &quot;{r.alreadyReconciledInBatch}&quot;
                              </span>
                            )}
                            {r.alreadyMovedToBusiness && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                title={`Already live — SKU ${r.currentLiveSku ?? 'n/a'}${r.currentLiveBarcode ? `, barcode ${r.currentLiveBarcode}` : ''}, current price ${money(r.currentLivePrice)}. SKU/barcode stay unchanged; only price + margin refresh.`}
                              >
                                💲 already moved — will update price only
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-3 gap-y-1 text-[11px] pt-0.5">
                            <div>
                              <span className="text-gray-400 block">Unit Cost</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{money(r.unitCost)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Clearance/Unit</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{money(r.clearancePerUnit)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Shipping/Unit</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{money(r.shippingPerUnit)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Landed Cost</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{money(r.landedCost)}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Est. Selling ({r.estMarginPct ?? '—'})</span>
                              <div className="flex items-center gap-1">
                                {isOverridden && (
                                  <span className="text-gray-400 line-through">{money(r.estSellingPrice)}</span>
                                )}
                                <span className="text-gray-500">$</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={overrideVal ?? (r.estSellingPrice != null ? r.estSellingPrice.toFixed(2) : '')}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => {
                                    const v = e.target.value
                                    if (v === '' || /^\d*\.?\d*$/.test(v)) setSellingOverrides(prev => ({ ...prev, [r.rowIndex]: v }))
                                  }}
                                  className={`w-16 px-1 py-0.5 border rounded text-xs font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none ${isOverridden ? 'border-blue-400' : 'border-gray-300 dark:border-gray-600'}`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-gray-400">{r.orderedQty ?? '—'} units → stock</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setStep('upload')} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
                  ← Choose a different file
                </button>
                <button
                  onClick={handleImport}
                  disabled={committing || totals.count === 0}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {committing ? 'Importing…' : `Continue to Import (${totals.count}) →`}
                </button>
              </div>
            </div>
          )}
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}
