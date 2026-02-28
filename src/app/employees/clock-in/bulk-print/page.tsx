'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface BulkEmployee {
  id: string
  fullName: string
  employeeNumber: string
  profilePhotoUrl: string | null
  phone: string | null
  businessContactPhone?: string | null
  scheduledStartTime: string | null
  scheduledEndTime: string | null
  primaryBusiness: { id: string; name: string } | null
  jobTitle: { title: string; department: string | null } | null
  isExempt: boolean
}

function escHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildCardHtml(emp: BulkEmployee, barcodeSvg: string): string {
  const hours =
    emp.scheduledStartTime && emp.scheduledEndTime
      ? `${escHtml(emp.scheduledStartTime)} – ${escHtml(emp.scheduledEndTime)}`
      : ''

  const photoHtml = emp.profilePhotoUrl
    ? `<img src="${escHtml(emp.profilePhotoUrl)}" style="width:56px;height:56px;border-radius:6px;object-fit:cover;border:1px solid #e5e7eb;">`
    : `<div style="width:56px;height:56px;border-radius:6px;background:#f3f4f6;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:22px;">&#x1F464;</div>`

  return `
    <div style="width:314px;border:2px solid #2563eb;border-radius:8px;overflow:hidden;background:white;font-family:sans-serif;display:inline-block;vertical-align:top;">
      <div style="background:#2563eb;padding:6px 12px;display:flex;align-items:center;justify-content:space-between;">
        <span style="color:white;font-weight:bold;font-size:11px;letter-spacing:0.05em;">EMPLOYEE ID CARD</span>
        ${emp.primaryBusiness?.name ? `<span style="color:#bfdbfe;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;margin-left:8px;">${escHtml(emp.primaryBusiness.name)}</span>` : ''}
      </div>
      <div style="padding:12px 12px 4px;display:flex;gap:12px;">
        <div style="flex-shrink:0;">${photoHtml}</div>
        <div style="flex:1;min-width:0;padding-top:2px;">
          <div style="font-weight:bold;color:#111827;font-size:13px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(emp.fullName)}</div>
          ${emp.jobTitle?.title ? `<div style="color:#1d4ed8;font-size:11px;font-weight:500;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(emp.jobTitle.title)}</div>` : ''}
          ${emp.jobTitle?.department ? `<div style="color:#6b7280;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(emp.jobTitle.department)}</div>` : ''}
          ${(emp.businessContactPhone || emp.phone) ? `<div style="color:#4b5563;font-size:11px;margin-top:2px;">${escHtml(emp.businessContactPhone || emp.phone || '')}</div>` : ''}
          ${hours ? `<div style="color:#374151;font-size:11px;font-weight:500;margin-top:2px;">${hours}</div>` : ''}
        </div>
      </div>
      <div style="padding:0 12px 12px;display:flex;justify-content:center;">
        ${barcodeSvg}
      </div>
    </div>
  `
}

export default function BulkPrintPage() {
  const [employees, setEmployees] = useState<BulkEmployee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPrinting, setIsPrinting] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const [todayRes, exemptRes] = await Promise.all([
        fetch('/api/clock-in/today'),
        fetch('/api/clock-in/exempt-employees'),
      ])
      const [todayData, exemptData] = await Promise.all([todayRes.json(), exemptRes.json()])

      const active: BulkEmployee[] = (todayData.employees ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => ({ ...e, isExempt: false }),
      )
      const exempt: BulkEmployee[] = (exemptData.employees ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => ({ ...e, isExempt: true }),
      )

      // Merge, deduplicate by id, sort by name
      const seen = new Set<string>()
      const all = [...active, ...exempt]
        .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
        .sort((a, b) => a.fullName.localeCompare(b.fullName))

      setEmployees(all)
      setIsLoading(false)
    }
    load()
  }, [])

  const filtered = search.trim()
    ? employees.filter(
        (e) =>
          e.fullName.toLowerCase().includes(search.toLowerCase()) ||
          e.employeeNumber.includes(search),
      )
    : employees

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id))

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((e) => next.delete(e.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((e) => next.add(e.id))
        return next
      })
    }
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePrint = async () => {
    if (selectedIds.size === 0) return
    setIsPrinting(true)
    try {
      const selected = employees.filter((e) => selectedIds.has(e.id))
      const JsBarcode = (await import('jsbarcode')).default

      const cardRows = selected.map((emp) => {
        // Generate barcode SVG in memory (no DOM needed)
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        JsBarcode(svgEl, emp.employeeNumber, {
          format: 'CODE128',
          width: 1.2,
          height: 30,
          displayValue: true,
          fontSize: 9,
          margin: 3,
        })
        const barcodeSvg = svgEl.outerHTML
        const card = buildCardHtml(emp, barcodeSvg)
        return `
          <div style="display:flex;align-items:flex-start;margin-bottom:8px;page-break-inside:avoid;">
            ${card}
            <div style="width:0;align-self:stretch;border-left:2px dashed #9ca3af;"></div>
            ${card}
          </div>
        `
      }).join('')

      const printWindow = window.open('', '_blank', 'width=800,height=700')
      if (!printWindow) { alert('Popup blocked — please allow popups for this site.'); return }

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Bulk Print — ID Cards</title><style>body{margin:10mm;background:white;font-family:sans-serif;}@media print{body{margin:5mm;}}</style></head><body>${cardRows}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`)
      printWindow.document.close()
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/employees/clock-in" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">🖨️ Bulk Print ID Cards</h1>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Select employees to include. Each card prints twice side-by-side — fold, cut, and glue back-to-back.
      </p>

      {/* Search + Print button */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or employee number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
        <button
          onClick={handlePrint}
          disabled={selectedIds.size === 0 || isPrinting}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isPrinting ? 'Preparing...' : `🖨️ Print (${selectedIds.size})`}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Loading...</span>
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
                    className="rounded"
                    title="Select all"
                  />
                </th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Employee</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Business</th>
                <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-center">Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    No employees found.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => toggle(emp.id)}
                    className={`border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors ${
                      selectedIds.has(emp.id)
                        ? 'bg-blue-50 dark:bg-blue-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(emp.id)}
                        onChange={() => toggle(emp.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {emp.profilePhotoUrl ? (
                          <img src={emp.profilePhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">
                            👤
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{emp.fullName}</div>
                          <div className="text-xs text-gray-400">
                            #{emp.employeeNumber}
                            {emp.jobTitle ? ` · ${emp.jobTitle.title}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                      {emp.primaryBusiness?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.isExempt ? (
                        <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">
                          Exempt
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky print bar when items selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {isPrinting ? 'Preparing...' : `🖨️ Print ${selectedIds.size} Card${selectedIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
