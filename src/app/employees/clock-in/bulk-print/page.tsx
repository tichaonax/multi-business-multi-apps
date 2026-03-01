'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

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
  isActive: boolean
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
  const { currentBusinessId, activeBusinesses, loading: contextLoading } = useBusinessPermissionsContext()

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const businessInitRef = useRef(false)

  // Initialise business from context once (wait for context to finish loading)
  useEffect(() => {
    if (businessInitRef.current || contextLoading) return
    businessInitRef.current = true
    if (currentBusinessId) {
      setSelectedBusinessId(currentBusinessId)
    } else if (activeBusinesses.length > 0) {
      const nonDemo = activeBusinesses.find(b => !b.isDemo)
      setSelectedBusinessId((nonDemo ?? activeBusinesses[0]).businessId)
    }
  }, [contextLoading, currentBusinessId, activeBusinesses])

  const [employees, setEmployees] = useState<BulkEmployee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPrinting, setIsPrinting] = useState(false)
  const [search, setSearch] = useState('')

  // Load employees whenever the selected business changes
  useEffect(() => {
    if (!selectedBusinessId) return
    const load = async () => {
      setIsLoading(true)
      setSelectedIds(new Set())
      try {
        const params = new URLSearchParams()
        params.set('businessId', selectedBusinessId)

        // Active clock-in employees (non-exempt) + exempt employees
        const [todayRes, exemptRes, inactiveRes] = await Promise.all([
          fetch(`/api/clock-in/today?${params}`),
          fetch(`/api/clock-in/exempt-employees?${params}`),
          fetch(`/api/employees?businessId=${selectedBusinessId}&status=inactive&limit=500`),
        ])
        const [todayData, exemptData, inactiveData] = await Promise.all([
          todayRes.json(), exemptRes.json(), inactiveRes.json(),
        ])

        const active: BulkEmployee[] = (todayData.employees ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e: any) => ({ ...e, isExempt: false, isActive: true }),
        )
        const exempt: BulkEmployee[] = (exemptData.employees ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e: any) => ({ ...e, isExempt: true, isActive: true }),
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inactive: BulkEmployee[] = (inactiveData.employees ?? []).map((e: any) => ({
          id: e.id,
          fullName: e.fullName,
          employeeNumber: e.employeeNumber,
          profilePhotoUrl: e.profilePhotoUrl ?? null,
          phone: e.phone ?? null,
          businessContactPhone: e.businessContactPhone ?? null,
          scheduledStartTime: e.scheduledStartTime ?? null,
          scheduledEndTime: e.scheduledEndTime ?? null,
          primaryBusiness: e.primaryBusiness ? { id: e.primaryBusiness.id, name: e.primaryBusiness.name } : null,
          jobTitle: e.jobTitle ? { title: e.jobTitle.title, department: e.jobTitle.department ?? null } : null,
          isExempt: false,
          isActive: false,
        }))

        // Merge, deduplicate by id (active wins over inactive if both present), sort: active first then inactive, alpha within each group
        const seen = new Set<string>()
        const all = [...active, ...exempt, ...inactive]
          .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
          .sort((a, b) => {
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
            return a.fullName.localeCompare(b.fullName)
          })

        setEmployees(all)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [selectedBusinessId])

  const filtered = search.trim()
    ? employees.filter(
        (e) =>
          e.fullName.toLowerCase().includes(search.toLowerCase()) ||
          e.employeeNumber.includes(search),
      )
    : employees

  // Only active employees count for "select all"
  const activeFiltered = filtered.filter(e => e.isActive)
  const allActiveFilteredSelected = activeFiltered.length > 0 && activeFiltered.every((e) => selectedIds.has(e.id))

  const toggleAll = () => {
    if (allActiveFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        activeFiltered.forEach((e) => next.delete(e.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        activeFiltered.forEach((e) => next.add(e.id))
        return next
      })
    }
  }

  const toggle = (id: string, isActive: boolean) => {
    if (!isActive) return
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

  const clockInCount = employees.filter(e => e.isActive && !e.isExempt).length
  const exemptCount  = employees.filter(e => e.isActive && e.isExempt).length
  const inactiveCount = employees.filter(e => !e.isActive).length

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
        Only <span className="font-medium text-gray-700 dark:text-gray-300">active employees</span> can be selected for printing.
      </p>

      {/* Business filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Business</label>
          <select
            value={selectedBusinessId ?? ''}
            onChange={(e) => setSelectedBusinessId(e.target.value || null)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[200px]"
          >
            <option value="">— Select a business —</option>
            {activeBusinesses.map((biz) => (
              <option key={biz.businessId} value={biz.businessId}>{biz.businessName}</option>
            ))}
          </select>
        </div>
        {!isLoading && selectedBusinessId && employees.length > 0 && (
          <span className="text-xs text-gray-400">
            <span className="text-green-600 dark:text-green-400 font-medium">{clockInCount} clock-in</span>
            {' · '}
            <span className="text-purple-600 dark:text-purple-400 font-medium">{exemptCount} exempt</span>
            {inactiveCount > 0 && <> · <span className="text-gray-400">{inactiveCount} inactive</span></>}
          </span>
        )}
      </div>

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

      {!selectedBusinessId ? (
        <div className="text-center py-16 text-gray-400">
          Select a business above to load employees.
        </div>
      ) : isLoading ? (
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
                    checked={allActiveFilteredSelected}
                    onChange={toggleAll}
                    disabled={activeFiltered.length === 0}
                    className="rounded disabled:opacity-40"
                    title="Select all active"
                  />
                </th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Employee</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Business</th>
                <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-center">Status</th>
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
                (() => {
                  const clockIn  = filtered.filter(e => e.isActive && !e.isExempt)
                  const exempt   = filtered.filter(e => e.isActive && e.isExempt)
                  const inactive = filtered.filter(e => !e.isActive)

                  const renderRow = (emp: BulkEmployee) => {
                    const isSelectable = emp.isActive
                    const isSelected   = selectedIds.has(emp.id)
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => toggle(emp.id, isSelectable)}
                        className={`border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                          !isSelectable
                            ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
                            : isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/10 cursor-pointer'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer'
                        }`}
                      >
                        <td className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isSelectable}
                            onChange={() => toggle(emp.id, isSelectable)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {emp.profilePhotoUrl ? (
                              <img src={emp.profilePhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">👤</div>
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
                          {!emp.isActive ? (
                            <span className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          ) : emp.isExempt ? (
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
                    )
                  }

                  return (
                    <>
                      {/* ── Clock-In Employees ── */}
                      {clockIn.length > 0 && (
                        <tr className="bg-green-50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-900/30">
                          <td colSpan={4} className="px-4 py-2">
                            <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
                              📋 Clock-In Employees ({clockIn.length})
                            </span>
                          </td>
                        </tr>
                      )}
                      {clockIn.map(renderRow)}

                      {/* ── Exempt Employees ── */}
                      {exempt.length > 0 && (
                        <tr className="bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/30">
                          <td colSpan={4} className="px-4 py-2">
                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                              🏷️ Exempt Employees ({exempt.length}) — Management / Flagged
                            </span>
                          </td>
                        </tr>
                      )}
                      {exempt.map(renderRow)}

                      {/* ── Inactive Employees ── */}
                      {inactive.length > 0 && (
                        <tr className="bg-gray-100 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-600">
                          <td colSpan={4} className="px-4 py-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              🚫 Inactive Employees ({inactive.length}) — Cannot print
                            </span>
                          </td>
                        </tr>
                      )}
                      {inactive.map(renderRow)}
                    </>
                  )
                })()
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
