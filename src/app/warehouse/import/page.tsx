'use client'

export const dynamic = 'force-dynamic'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'
import Link from 'next/link'

interface OverlapOrder {
  orderNumber: string
  batchName: string
}

export default function WarehouseImportPage() {
  const router = useRouter()
  const toast = useToastContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)

  const [file, setFile] = useState<File | null>(null)
  const [batchName, setBatchName] = useState('')
  const [notes, setNotes] = useState('')
  const [pickedUpFromHarare, setPickedUpFromHarare] = useState(false)
  const [transportCostHarare, setTransportCostHarare] = useState('')
  const [transactionFeePct, setTransactionFeePct] = useState('')
  const [importing, setImporting] = useState(false)

  // Overlap state
  const [overlapping, setOverlapping] = useState<OverlapOrder[]>([])
  const [showOverlapModal, setShowOverlapModal] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    // Auto-fill batch name from filename
    const match = f.name.match(/batch[_-](\d+)/i)
    if (match) {
      setBatchName(`batch_${match[1]} — ${new Date().toISOString().slice(0, 10)}`)
    } else {
      setBatchName(f.name.replace(/\.[^/.]+$/, ''))
    }
  }

  async function doImport(confirmOverlap = false) {
    if (submittingRef.current) return
    if (!file) { toast.error('Please select a file'); return }
    if (pickedUpFromHarare && !transportCostHarare) {
      toast.error('Please enter the transport cost for Harare pickup')
      return
    }

    submittingRef.current = true
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (batchName) fd.append('batchName', batchName)
      if (notes) fd.append('notes', notes)
      fd.append('pickedUpFromHarare', String(pickedUpFromHarare))
      if (pickedUpFromHarare && transportCostHarare) fd.append('transportCostHarare', transportCostHarare)
      if (transactionFeePct) fd.append('transactionFeePct', transactionFeePct)
      if (confirmOverlap) fd.append('confirmOverlap', 'true')

      const res = await fetch('/api/warehouse/import', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      const data = await res.json()

      if (res.status === 409) {
        // Duplicate file
        toast.error(`This file was already imported as "${data.existingBatch?.batchName}"`)
        return
      }

      if (res.status === 200 && data.warning === 'overlapping_orders') {
        setOverlapping(data.overlappingOrders)
        setShowOverlapModal(true)
        return
      }

      if (!res.ok) {
        toast.error(data.error || 'Import failed')
        return
      }

      toast.push(`Imported ${data.itemsCreated} items into "${data.batchName}"`)
      router.push(`/warehouse/${data.batchId}`)
    } catch {
      toast.error('Import failed')
    } finally {
      submittingRef.current = false
      setImporting(false)
    }
  }

  function handleOverlapConfirm() {
    setShowOverlapModal(false)
    doImport(true)
  }

  return (
    <ProtectedRoute>
      <ContentLayout title="Import Batch">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back */}
          <Link href="/warehouse" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Warehouse
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Batch</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Upload an Excel spreadsheet to create a new warehouse batch.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {/* File picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Excel File (.xlsx) *
              </label>
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f?.name.endsWith('.xlsx')) {
                    const input = fileInputRef.current
                    if (input) {
                      const dt = new DataTransfer()
                      dt.items.add(f)
                      input.files = dt.files
                    }
                    setFile(f)
                    const match = f.name.match(/batch[_-](\d+)/i)
                    if (match) setBatchName(`batch_${match[1]} — ${new Date().toISOString().slice(0, 10)}`)
                    else setBatchName(f.name.replace(/\.[^/.]+$/, ''))
                  } else {
                    toast.error('Please drop an .xlsx file')
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div>
                    <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB — click to change</p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Drop .xlsx file here or <span className="text-blue-600">browse</span></p>
                  </div>
                )}
              </div>
            </div>

            {/* Batch name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Batch Name
              </label>
              <input
                type="text"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
                placeholder="Auto-filled from filename"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about this batch…"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Harare pickup */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPickedUpFromHarare(!pickedUpFromHarare)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pickedUpFromHarare ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pickedUpFromHarare ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Picked up from Harare (add transport cost)
                </span>
              </div>

              {pickedUpFromHarare && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Transport Cost (US$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transportCostHarare}
                    onChange={e => setTransportCostHarare(e.target.value)}
                    placeholder="0.00"
                    className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Will be divided equally across all items in this batch.</p>
                </div>
              )}
            </div>

            {/* Transaction fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Foreign Transaction Fee % <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={transactionFeePct}
                  onChange={e => setTransactionFeePct(e.target.value)}
                  placeholder="e.g. 3.5"
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Charged on each item&apos;s cost to offset foreign payment fees (typically 3–4%). Added to landed cost during pricing.
              </p>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <Link
                href="/warehouse"
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={() => doImport(false)}
                disabled={importing || !file}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importing && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {importing ? 'Importing…' : 'Import Batch'}
              </button>
            </div>
          </div>
        </div>

        {/* Import loading overlay */}
        {importing && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-xs w-full mx-4">
              <svg className="animate-spin w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-white">Importing Batch…</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Parsing Excel file and creating records. This may take a minute for large batches.</p>
              </div>
            </div>
          </div>
        )}

        {/* Overlap modal */}
        {showOverlapModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Duplicate Order Numbers Found</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {overlapping.length} order number(s) already exist in another batch. Do you want to import anyway?
              </p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500">Order #</th>
                      <th className="px-3 py-2 text-left text-gray-500">Existing Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {overlapping.map(o => (
                      <tr key={o.orderNumber}>
                        <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">{o.orderNumber}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{o.batchName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowOverlapModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverlapConfirm}
                  disabled={importing}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {importing ? 'Importing…' : 'Import Anyway'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ContentLayout>
    </ProtectedRoute>
  )
}
