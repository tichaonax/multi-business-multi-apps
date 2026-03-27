'use client'

import { useState, useEffect } from 'react'

interface PreviewRow {
  barcode: string
  name: string
  isExistingItem: boolean
  currentStock: number | null   // systemQuantity
  physicalCount: string         // may be empty for existing items
  quantity: string              // newQty to add
  sellingPrice: string
  isFreeItem: boolean
}

interface Employee {
  id: string
  fullName: string
  employeeNumber: string
}

interface StockTakeReportPreviewProps {
  businessId: string
  businessName: string
  draftId: string | null
  rows: PreviewRow[]
  onBack: () => void
  onSubmitSuccess: (reportId: string) => void
  isStockTakeMode?: boolean
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function StockTakeReportPreview({
  businessId,
  businessName,
  draftId,
  rows,
  onBack,
  onSubmitSuccess,
  isStockTakeMode = false,
}: StockTakeReportPreviewProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Load active employees for this business
  useEffect(() => {
    fetch(`/api/employees?status=active&limit=200`)
      .then(r => r.json())
      .then(d => {
        const list: Employee[] = Array.isArray(d) ? d : (d.data ?? d.employees ?? [])
        setEmployees(list)
      })
      .catch(() => {})
  }, [businessId])

  const existingRows = rows.filter(r => r.isExistingItem)
  const newRows = rows.filter(r => !r.isExistingItem)

  // Compute per-row values
  const existingCalc = existingRows.map(r => {
    const sysQty = r.currentStock ?? 0
    const physCount = r.physicalCount !== '' ? Number(r.physicalCount) : null
    const variance = physCount !== null ? physCount - sysQty : null
    const shortfall = variance !== null && variance < 0 ? Math.abs(variance) : 0
    const price = r.isFreeItem ? 0 : Number(r.sellingPrice) || 0
    const shortfallValue = shortfall * price
    const newQty = Number(r.quantity) || 0
    return { ...r, sysQty, physCount, variance, shortfallValue, price, newQty }
  })

  const newCalc = newRows.map(r => {
    const price = r.isFreeItem ? 0 : Number(r.sellingPrice) || 0
    const newQty = Number(r.quantity) || 0
    return { ...r, price, newQty, newStockValue: newQty * price }
  })

  const totalShortfallQty = existingCalc.reduce((s, r) => {
    const shortfall = r.variance !== null && r.variance < 0 ? Math.abs(r.variance) : 0
    return s + shortfall
  }, 0)
  const totalShortfallValue = existingCalc.reduce((s, r) => s + r.shortfallValue, 0)
  const totalNewStockValue = [
    ...existingCalc.map(r => r.newQty * r.price),
    ...newCalc.map(r => r.newStockValue),
  ].reduce((s, v) => s + v, 0)
  const totalStockValueAfter = existingCalc.reduce((s, r) => {
    const finalQty = r.physCount !== null ? r.physCount + r.newQty : r.sysQty + r.newQty
    return s + finalQty * r.price
  }, 0) + newCalc.reduce((s, r) => s + r.newStockValue, 0)

  // Sold-out items (stock take mode only): physical count = 0 OR system qty = 0
  const soldOutRows = isStockTakeMode
    ? existingCalc.filter(r => r.physCount === 0 || r.sysQty === 0)
    : []

  const perEmployeeDeduction = selectedEmployeeIds.length > 0 && totalShortfallValue > 0
    ? totalShortfallValue / selectedEmployeeIds.length
    : 0

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const filteredEmployees = employees.filter(e =>
    !employeeSearch || e.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) || e.employeeNumber.toLowerCase().includes(employeeSearch.toLowerCase())
  )

  const handleConfirmSubmit = async () => {
    if (selectedEmployeeIds.length === 0) {
      setSubmitError('Select at least one responsible employee before submitting.')
      return
    }
    if (!draftId) {
      setSubmitError('No active draft found. Please save the draft first.')
      return
    }
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/stock-take/drafts/${draftId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: selectedEmployeeIds }),
      })
      const d = await res.json()
      if (!d.success) {
        setSubmitError(d.error || 'Submission failed')
        return
      }
      onSubmitSuccess(d.reportId)
    } catch (e: any) {
      setSubmitError(e.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col overflow-hidden pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 shrink-0">
          ← Back to Edit
        </button>
        <h1 className="font-bold text-gray-900 dark:text-white text-base flex-1 min-w-0 truncate">
          Stock Take Report — {businessName} — {new Date().toLocaleDateString()}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onBack} disabled={submitting}
            className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            Back to Edit
          </button>
          <button onClick={handleConfirmSubmit} disabled={submitting || !draftId || selectedEmployeeIds.length === 0}
            className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium"
            title={selectedEmployeeIds.length === 0 ? 'Select responsible employees below first' : undefined}>
            {submitting ? 'Submitting…' : 'Confirm & Submit'}
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

        {/* Existing Items */}
        {existingCalc.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Existing Items ({existingCalc.length})
            </h2>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-max w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Barcode</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-center w-16">System</th>
                    <th className="px-3 py-2 text-center w-20">Physical</th>
                    <th className="px-3 py-2 text-center w-20">Variance</th>
                    <th className="px-3 py-2 text-center w-16">+New</th>
                    <th className="px-3 py-2 text-right w-20">Price</th>
                    <th className="px-3 py-2 text-right w-24">Shortfall $</th>
                  </tr>
                </thead>
                <tbody>
                  {existingCalc.map(r => (
                    <tr key={r.barcode || r.name}
                      className={`border-t border-gray-100 dark:border-gray-700 ${r.shortfallValue > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                      <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300">{r.barcode || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-900 dark:text-white max-w-[180px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-3 py-1.5 text-center text-gray-500">{r.sysQty}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">
                        {r.physCount !== null ? r.physCount : <span className="text-gray-400">—</span>}
                      </td>
                      <td className={`px-3 py-1.5 text-center font-medium ${
                        r.variance === null ? 'text-gray-400' :
                        r.variance < 0 ? 'text-red-600 dark:text-red-400' :
                        r.variance > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                      }`}>
                        {r.variance !== null ? (r.variance > 0 ? '+' : '') + r.variance : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">{r.newQty || '—'}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{r.isFreeItem ? 'Free' : `$${fmt(r.price)}`}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${r.shortfallValue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                        {r.shortfallValue > 0 ? `$${fmt(r.shortfallValue)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* New Items */}
        {newCalc.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              New Items ({newCalc.length})
            </h2>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-max w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Barcode</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-center w-20">Qty</th>
                    <th className="px-3 py-2 text-right w-20">Price</th>
                    <th className="px-3 py-2 text-right w-28">New Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {newCalc.map(r => (
                    <tr key={r.barcode || r.name} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300">{r.barcode || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-900 dark:text-white max-w-[180px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700 dark:text-gray-300">{r.newQty}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{r.isFreeItem ? 'Free' : `$${fmt(r.price)}`}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{r.isFreeItem ? '—' : `$${fmt(r.newStockValue)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Totals */}
        <section className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Totals</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm max-w-sm">
            {totalShortfallQty > 0 && (
              <>
                <span className="text-gray-600 dark:text-gray-400">Total shortfall qty:</span>
                <span className="font-medium text-red-600 dark:text-red-400">{totalShortfallQty} unit{totalShortfallQty !== 1 ? 's' : ''}</span>
                <span className="text-gray-600 dark:text-gray-400">Total shortfall value:</span>
                <span className="font-medium text-red-600 dark:text-red-400">${fmt(totalShortfallValue)}</span>
              </>
            )}
            <span className="text-gray-600 dark:text-gray-400">Total new stock value:</span>
            <span className="font-medium text-gray-900 dark:text-white">${fmt(totalNewStockValue)}</span>
            <span className="text-gray-600 dark:text-gray-400">Est. stock value after:</span>
            <span className="font-medium text-gray-900 dark:text-white">${fmt(totalStockValueAfter)}</span>
          </div>
        </section>

        {/* Sold Out / Zero Stock (stock take mode only) */}
        {isStockTakeMode && soldOutRows.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-orange-500 dark:text-orange-400 mb-2">
              Sold Out / Zero Stock — Restock Candidates ({soldOutRows.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              These items had zero physical count or zero system stock. Consider restocking before the next trading period.
            </p>
            <div className="overflow-x-auto border border-orange-200 dark:border-orange-800 rounded-lg">
              <table className="min-w-max w-full text-xs">
                <thead className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Barcode</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-center w-20">System Qty</th>
                    <th className="px-3 py-2 text-center w-20">Physical Count</th>
                    <th className="px-3 py-2 text-right w-24">Last Price</th>
                  </tr>
                </thead>
                <tbody>
                  {soldOutRows.map(r => (
                    <tr key={r.barcode || r.name} className="border-t border-orange-100 dark:border-orange-900/30">
                      <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300">{r.barcode || '—'}</td>
                      <td className="px-3 py-1.5 text-gray-900 dark:text-white max-w-[200px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-3 py-1.5 text-center text-gray-500">{r.sysQty}</td>
                      <td className="px-3 py-1.5 text-center font-medium text-orange-600 dark:text-orange-400">
                        {r.physCount !== null ? r.physCount : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">
                        {r.isFreeItem ? 'Free' : `$${fmt(r.price)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Responsible Employees */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Responsible Employees <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Select all employees responsible for this stock count. All must sign off before the report is finalised.
            {totalShortfallValue > 0 && selectedEmployeeIds.length > 0 && (
              <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                Shortfall deduction per employee: ${fmt(perEmployeeDeduction)}
              </span>
            )}
          </p>

          {/* Search */}
          <input
            type="text"
            placeholder="Search employees…"
            value={employeeSearch}
            onChange={e => setEmployeeSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 mb-2"
          />

          {/* Employee list */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">
                {employees.length === 0 ? 'Loading…' : 'No employees found'}
              </p>
            ) : filteredEmployees.map(emp => {
              const checked = selectedEmployeeIds.includes(emp.id)
              return (
                <label key={emp.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${checked ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleEmployee(emp.id)}
                    className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm text-gray-900 dark:text-white">{emp.fullName}</span>
                  <span className="text-xs text-gray-400 ml-auto">{emp.employeeNumber}</span>
                </label>
              )
            })}
          </div>

          {selectedEmployeeIds.length > 0 && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1.5">
              {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </section>

      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-900 flex items-center justify-between gap-3">
        {submitError ? (
          <p className="text-sm text-red-600 dark:text-red-400 flex-1">{submitError}</p>
        ) : (
          <p className="text-xs text-gray-400 flex-1">
            {!draftId ? '⚠ Save the draft first before submitting.' : `${rows.length} item${rows.length !== 1 ? 's' : ''} · ${selectedEmployeeIds.length} employee${selectedEmployeeIds.length !== 1 ? 's' : ''} selected`}
          </p>
        )}
        <button onClick={onBack} disabled={submitting}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
          Back to Edit
        </button>
        <button onClick={handleConfirmSubmit} disabled={submitting || !draftId || selectedEmployeeIds.length === 0}
          className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">
          {submitting ? 'Submitting…' : 'Confirm & Submit'}
        </button>
      </div>
    </div>
  )
}
