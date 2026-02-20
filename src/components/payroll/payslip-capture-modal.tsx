'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAlert } from '@/components/ui/confirm-modal'

interface PayslipRow {
  id: string
  payrollEntryId: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  nationalId: string
  status: string
  // Earnings
  totalEarnings: number | null
  entryGrossPay: number | null
  // Statutory deductions
  payeTax: number | null
  aidsLevy: number | null
  nssaEmployee: number | null
  necEmployee: number | null
  netPayRound: number | null
  // Employee deductions (pre-filled)
  loanDeductions: number | null
  advanceDeductions: number | null
  miscDeductions: number | null
  entryLoanDeductions: number | null
  entryAdvanceDeductions: number | null
  entryMiscDeductions: number | null
  otherDeductions: unknown
  totalDeductions: number | null
  // Employer contributions
  wcif: number | null
  necCompanyContrib: number | null
  // Result
  nettPay: number | null
  // Header
  normalHours: number | null
  leaveDaysDue: number | null
  payPoint: string | null
  costCode: string | null
  notes: string | null
}

interface EditRow {
  totalEarnings: string
  payeTax: string
  aidsLevy: string
  nssaEmployee: string
  necEmployee: string
  netPayRound: string
  loanDeductions: string
  advanceDeductions: string
  miscDeductions: string
  wcif: string
  necCompanyContrib: string
  nettPay: string
  leaveDaysDue: string
  payPoint: string
}

interface PayslipCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  periodId: string
  periodName: string
  onSuccess?: () => void
}

function n(v: string): number | null {
  const parsed = parseFloat(v)
  return isNaN(parsed) ? null : parsed
}

function calcTotalDeductions(row: EditRow): number {
  return (
    (n(row.payeTax) || 0) +
    (n(row.aidsLevy) || 0) +
    (n(row.nssaEmployee) || 0) +
    (n(row.necEmployee) || 0) +
    (n(row.netPayRound) || 0) +
    (n(row.loanDeductions) || 0) +
    (n(row.advanceDeductions) || 0) +
    (n(row.miscDeductions) || 0)
  )
}

function calcNettPay(row: EditRow): number {
  return (n(row.totalEarnings) || 0) - calcTotalDeductions(row)
}

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return ''
  return v.toFixed(2)
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CAPTURED: 'bg-blue-100 text-blue-800',
    DISTRIBUTED: 'bg-green-100 text-green-800',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

export function PayslipCaptureModal({
  isOpen,
  onClose,
  periodId,
  periodName,
  onSuccess,
}: PayslipCaptureModalProps) {
  const customAlert = useAlert()
  const [slips, setSlips] = useState<PayslipRow[]>([])
  const [editRows, setEditRows] = useState<Record<string, EditRow>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewSlip, setViewSlip] = useState<PayslipRow | null>(null)

  const initSlips = useCallback(async () => {
    await fetch(`/api/payroll/periods/${periodId}/slips/init`, { method: 'POST' })
  }, [periodId])

  const loadSlips = useCallback(async () => {
    setLoading(true)
    try {
      await initSlips()
      const res = await fetch(`/api/payroll/periods/${periodId}/slips`)
      const data = await res.json()
      if (data.success) {
        setSlips(data.slips)
        // Populate edit rows from existing slip data
        const rows: Record<string, EditRow> = {}
        for (const s of data.slips as PayslipRow[]) {
          rows[s.id] = {
            totalEarnings: fmt(s.totalEarnings ?? s.entryGrossPay),
            payeTax: fmt(s.payeTax),
            aidsLevy: fmt(s.aidsLevy),
            nssaEmployee: fmt(s.nssaEmployee),
            necEmployee: fmt(s.necEmployee),
            netPayRound: fmt(s.netPayRound),
            loanDeductions: fmt(s.loanDeductions ?? s.entryLoanDeductions),
            advanceDeductions: fmt(s.advanceDeductions ?? s.entryAdvanceDeductions),
            miscDeductions: fmt(s.miscDeductions ?? s.entryMiscDeductions),
            wcif: fmt(s.wcif),
            necCompanyContrib: fmt(s.necCompanyContrib),
            nettPay: fmt(s.nettPay),
            leaveDaysDue: fmt(s.leaveDaysDue),
            payPoint: s.payPoint || '',
          }
        }
        setEditRows(rows)
      }
    } finally {
      setLoading(false)
    }
  }, [periodId, initSlips])

  useEffect(() => {
    if (isOpen) {
      loadSlips()
      setSelectedIds(new Set())
    }
  }, [isOpen, loadSlips])

  function updateField(slipId: string, field: keyof EditRow, value: string) {
    setEditRows((prev) => {
      const row = { ...prev[slipId], [field]: value }
      // Auto-calc Aids Levy as 3% of PAYE when PAYE changes
      if (field === 'payeTax') {
        const paye = n(value) || 0
        row.aidsLevy = (paye * 0.03).toFixed(2)
      }
      return { ...prev, [slipId]: row }
    })
  }

  function blurField(slipId: string, field: keyof EditRow) {
    setEditRows((prev) => {
      const val = prev[slipId]?.[field]
      if (typeof val !== 'string' || val === '') return prev
      const parsed = parseFloat(val)
      if (isNaN(parsed)) return prev
      return { ...prev, [slipId]: { ...prev[slipId], [field]: parsed.toFixed(2) } }
    })
  }

  async function handleSaveAll() {
    setSaving(true)
    try {
      const slipsPayload = slips.map((s) => {
        const row = editRows[s.id]
        if (!row) return null
        const totalDed = calcTotalDeductions(row)
        const nettPayVal = n(row.nettPay) ?? calcNettPay(row)
        return {
          slipId: s.id,
          totalEarnings: n(row.totalEarnings),
          payeTax: n(row.payeTax),
          aidsLevy: n(row.aidsLevy),
          nssaEmployee: n(row.nssaEmployee),
          necEmployee: n(row.necEmployee),
          netPayRound: n(row.netPayRound),
          loanDeductions: n(row.loanDeductions),
          advanceDeductions: n(row.advanceDeductions),
          miscDeductions: n(row.miscDeductions),
          totalDeductions: totalDed,
          wcif: n(row.wcif),
          necCompanyContrib: n(row.necCompanyContrib),
          nettPay: nettPayVal,
          leaveDaysDue: n(row.leaveDaysDue),
          payPoint: row.payPoint || null,
        }
      }).filter(Boolean)

      const res = await fetch(`/api/payroll/periods/${periodId}/slips/bulk-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slips: slipsPayload }),
      })
      const data = await res.json()
      if (data.success) {
        await customAlert({ title: 'Saved', description: `${data.updated} payslip(s) saved successfully.` })
        await loadSlips()
        onSuccess?.()
      } else {
        await customAlert({ title: 'Error', description: data.error || 'Failed to save' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDistribute() {
    if (selectedIds.size === 0) {
      await customAlert({ title: 'Select employees', description: 'Select at least one employee to mark as distributed.' })
      return
    }
    setDistributing(true)
    try {
      const res = await fetch(`/api/payroll/periods/${periodId}/slips/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipIds: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.success) {
        await customAlert({ title: 'Distributed', description: `${data.distributed} payslip(s) marked as distributed.` })
        await loadSlips()
        setSelectedIds(new Set())
      } else {
        await customAlert({ title: 'Error', description: data.error || 'Failed to distribute' })
      }
    } finally {
      setDistributing(false)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === slips.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(slips.map((s) => s.id)))
    }
  }

  // Reconciliation flags
  function earningsMismatch(slip: PayslipRow, row: EditRow) {
    const entered = n(row.totalEarnings)
    if (entered === null || slip.entryGrossPay === null) return false
    return Math.abs(entered - slip.entryGrossPay) > 0.01
  }
  function loanMismatch(slip: PayslipRow, row: EditRow) {
    const entered = n(row.loanDeductions)
    if (entered === null || slip.entryLoanDeductions === null) return false
    return Math.abs(entered - slip.entryLoanDeductions) > 0.01
  }
  function advanceMismatch(slip: PayslipRow, row: EditRow) {
    const entered = n(row.advanceDeductions)
    if (entered === null || slip.entryAdvanceDeductions === null) return false
    return Math.abs(entered - slip.entryAdvanceDeductions) > 0.01
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-auto py-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-[98vw] mx-2">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Capture Payslips</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{periodName} — Enter data from physical payslips</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDistribute}
              disabled={distributing || selectedIds.size === 0}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {distributing ? 'Distributing…' : `✓ Mark Distributed (${selectedIds.size})`}
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save All'}
            </button>
            <button onClick={onClose} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              Close
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading payslips…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                  <th className="px-2 py-2 text-left">
                    <input type="checkbox" checked={selectedIds.size === slips.length && slips.length > 0} onChange={toggleAll} />
                  </th>
                  <th className="px-2 py-2 text-left">Employee</th>
                  <th className="px-2 py-2 text-right">Total Earnings</th>
                  {/* Statutory */}
                  <th className="px-2 py-2 text-right bg-orange-50 dark:bg-orange-900/20">PAYE Tax</th>
                  <th className="px-2 py-2 text-right bg-orange-50 dark:bg-orange-900/20">Aids Levy</th>
                  <th className="px-2 py-2 text-right bg-orange-50 dark:bg-orange-900/20">NSSA Emp</th>
                  <th className="px-2 py-2 text-right bg-orange-50 dark:bg-orange-900/20">NEC Emp</th>
                  <th className="px-2 py-2 text-right bg-orange-50 dark:bg-orange-900/20">Net Round</th>
                  {/* Employee deductions */}
                  <th className="px-2 py-2 text-right bg-red-50 dark:bg-red-900/20">Loan Recovery</th>
                  <th className="px-2 py-2 text-right bg-red-50 dark:bg-red-900/20">Advance</th>
                  <th className="px-2 py-2 text-right bg-red-50 dark:bg-red-900/20">Other Ded.</th>
                  {/* Employer */}
                  <th className="px-2 py-2 text-right bg-purple-50 dark:bg-purple-900/20">WCIF</th>
                  <th className="px-2 py-2 text-right bg-purple-50 dark:bg-purple-900/20">NEC Co.</th>
                  {/* Totals */}
                  <th className="px-2 py-2 text-right font-semibold">Total Ded.</th>
                  <th className="px-2 py-2 text-right font-semibold">Nett Pay</th>
                  <th className="px-2 py-2 text-right">Leave Days</th>
                  <th className="px-2 py-2 text-center">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {slips.map((slip) => {
                  const row = editRows[slip.id]
                  if (!row) return null
                  const totalDed = calcTotalDeductions(row)
                  const nettPayCalc = calcNettPay(row)
                  const eMismatch = earningsMismatch(slip, row)
                  const lMismatch = loanMismatch(slip, row)
                  const aMismatch = advanceMismatch(slip, row)

                  const inputBase = 'text-right border rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600'

                  return (
                    <tr key={slip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(slip.id)}
                          onChange={() => toggleSelect(slip.id)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{slip.employeeName}</div>
                        <div className="text-gray-400 dark:text-gray-500">{slip.employeeNumber}</div>
                      </td>
                      {/* Total Earnings */}
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.totalEarnings}
                          onChange={(e) => updateField(slip.id, 'totalEarnings', e.target.value)}
                          onBlur={() => blurField(slip.id, 'totalEarnings')}
                          className={`w-24 ${inputBase} ${eMismatch ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30' : ''}`}
                        />
                        {eMismatch && (
                          <div className="text-amber-600 dark:text-amber-400 text-[10px]">
                            ⚠ System: {fmt(slip.entryGrossPay)}
                          </div>
                        )}
                      </td>
                      {/* Statutory deductions */}
                      <td className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20">
                        <input type="text" inputMode="decimal" value={row.payeTax}
                          onChange={(e) => updateField(slip.id, 'payeTax', e.target.value)}
                          onBlur={() => blurField(slip.id, 'payeTax')}
                          className={`w-20 ${inputBase}`} />
                      </td>
                      <td className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20">
                        <input type="text" inputMode="decimal" value={row.aidsLevy}
                          onChange={(e) => updateField(slip.id, 'aidsLevy', e.target.value)}
                          onBlur={() => blurField(slip.id, 'aidsLevy')}
                          className={`w-20 ${inputBase}`} />
                      </td>
                      <td className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20">
                        <input type="text" inputMode="decimal" value={row.nssaEmployee}
                          onChange={(e) => updateField(slip.id, 'nssaEmployee', e.target.value)}
                          onBlur={() => blurField(slip.id, 'nssaEmployee')}
                          className={`w-20 ${inputBase}`} />
                      </td>
                      <td className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20">
                        <input type="text" inputMode="decimal" value={row.necEmployee}
                          onChange={(e) => updateField(slip.id, 'necEmployee', e.target.value)}
                          onBlur={() => blurField(slip.id, 'necEmployee')}
                          className={`w-20 ${inputBase}`} />
                      </td>
                      <td className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20">
                        <input type="text" inputMode="decimal" value={row.netPayRound}
                          onChange={(e) => updateField(slip.id, 'netPayRound', e.target.value)}
                          onBlur={() => blurField(slip.id, 'netPayRound')}
                          className={`w-20 ${inputBase}`} />
                      </td>
                      {/* Employee deductions */}
                      <td className="px-2 py-1 bg-red-50 dark:bg-red-900/20">
                        <input
                          type="text" inputMode="decimal" value={row.loanDeductions}
                          onChange={(e) => updateField(slip.id, 'loanDeductions', e.target.value)}
                          onBlur={() => blurField(slip.id, 'loanDeductions')}
                          className={`w-20 ${inputBase} ${lMismatch ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30' : ''}`}
                        />
                        {lMismatch && (
                          <div className="text-amber-600 dark:text-amber-400 text-[10px]">⚠ {fmt(slip.entryLoanDeductions)}</div>
                        )}
                      </td>
                      <td className="px-2 py-1 bg-red-50 dark:bg-red-900/20">
                        <input type="text" inputMode="decimal" value={row.advanceDeductions}
                          onChange={(e) => updateField(slip.id, 'advanceDeductions', e.target.value)}
                          onBlur={() => blurField(slip.id, 'advanceDeductions')}
                          className={`w-20 ${inputBase} ${aMismatch ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30' : ''}`}
                        />
                        {aMismatch && (
                          <div className="text-amber-600 dark:text-amber-400 text-[10px]">⚠ {fmt(slip.entryAdvanceDeductions)}</div>
                        )}
                      </td>
                      <td className="px-2 py-1 bg-red-50 dark:bg-red-900/20">
                        <input type="text" inputMode="decimal" value={row.miscDeductions}
                          onChange={(e) => updateField(slip.id, 'miscDeductions', e.target.value)}
                          onBlur={() => blurField(slip.id, 'miscDeductions')}
                          className={`w-20 ${inputBase}`} />
                      </td>
                      {/* Employer contributions */}
                      <td className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20">
                        <input type="text" inputMode="decimal" value={row.wcif}
                          onChange={(e) => updateField(slip.id, 'wcif', e.target.value)}
                          onBlur={() => blurField(slip.id, 'wcif')}
                          className={`w-20 ${inputBase}`} />
                      </td>
                      <td className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20">
                        <input type="text" inputMode="decimal" value={row.necCompanyContrib}
                          onChange={(e) => updateField(slip.id, 'necCompanyContrib', e.target.value)}
                          onBlur={() => blurField(slip.id, 'necCompanyContrib')}
                          className={`w-20 ${inputBase}`} />
                      </td>
                      {/* Calculated totals */}
                      <td className="px-2 py-1 text-right font-medium text-red-700 dark:text-red-400">
                        {totalDed.toFixed(2)}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text" inputMode="decimal"
                          value={row.nettPay !== '' ? row.nettPay : nettPayCalc.toFixed(2)}
                          onChange={(e) => updateField(slip.id, 'nettPay', e.target.value)}
                          onBlur={() => blurField(slip.id, 'nettPay')}
                          className={`w-24 font-semibold ${inputBase}`}
                        />
                        {row.nettPay !== '' && Math.abs((n(row.nettPay) || 0) - nettPayCalc) > 0.01 && (
                          <div className="text-amber-600 dark:text-amber-400 text-[10px]">⚠ Calc: {nettPayCalc.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input type="text" inputMode="decimal" value={row.leaveDaysDue}
                          onChange={(e) => updateField(slip.id, 'leaveDaysDue', e.target.value)}
                          onBlur={() => blurField(slip.id, 'leaveDaysDue')}
                          className={`w-16 ${inputBase}`} />
                      </td>
                      <td className="px-2 py-1 text-center">{statusBadge(slip.status)}</td>
                      <td className="px-2 py-1">
                        <button
                          onClick={() => setViewSlip({ ...slip, ...buildViewSlip(slip, row) })}
                          className="text-blue-500 dark:text-blue-400 hover:underline text-xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span><span className="inline-block w-3 h-3 bg-orange-200 dark:bg-orange-700 rounded mr-1"></span>Statutory deductions (from payslip)</span>
          <span><span className="inline-block w-3 h-3 bg-red-200 dark:bg-red-700 rounded mr-1"></span>Employee deductions (pre-filled from our records)</span>
          <span><span className="inline-block w-3 h-3 bg-purple-200 dark:bg-purple-700 rounded mr-1"></span>Employer contributions</span>
          <span className="text-amber-600 dark:text-amber-400">⚠ = mismatch with our records</span>
        </div>
      </div>

      {/* Individual slip view */}
      {viewSlip && (
        <PayslipViewInline slip={viewSlip} onClose={() => setViewSlip(null)} />
      )}
    </div>
  )
}

function buildViewSlip(slip: PayslipRow, row: EditRow): Partial<PayslipRow> {
  return {
    totalEarnings: n(row.totalEarnings),
    payeTax: n(row.payeTax),
    aidsLevy: n(row.aidsLevy),
    nssaEmployee: n(row.nssaEmployee),
    necEmployee: n(row.necEmployee),
    netPayRound: n(row.netPayRound),
    loanDeductions: n(row.loanDeductions),
    advanceDeductions: n(row.advanceDeductions),
    miscDeductions: n(row.miscDeductions),
    wcif: n(row.wcif),
    necCompanyContrib: n(row.necCompanyContrib),
    nettPay: n(row.nettPay),
    leaveDaysDue: n(row.leaveDaysDue),
    payPoint: row.payPoint || null,
  }
}

function PayslipViewInline({ slip, onClose }: { slip: PayslipRow; onClose: () => void }) {
  const totalDed =
    (slip.payeTax || 0) + (slip.aidsLevy || 0) + (slip.nssaEmployee || 0) +
    (slip.necEmployee || 0) + (slip.netPayRound || 0) + (slip.loanDeductions || 0) +
    (slip.advanceDeductions || 0) + (slip.miscDeductions || 0)

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 font-mono text-sm">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Payslip — {slip.employeeName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
            <span>Employee No: <strong>{slip.employeeNumber}</strong></span>
            <span>National ID: <strong>{slip.nationalId}</strong></span>
            <span>Normal Hours: <strong>{fmt(slip.normalHours) || '173.36'}</strong></span>
            <span>Pay Point: <strong>{slip.payPoint || '—'}</strong></span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs border-b border-gray-200 dark:border-gray-700 pb-2">
            <div>
              <div className="font-bold text-gray-700 dark:text-gray-200 mb-1 border-b border-gray-200 dark:border-gray-700">DEDUCTIONS</div>
              <div className="space-y-0.5 text-gray-600 dark:text-gray-300">
                <div className="flex justify-between"><span>PAYE Tax</span><span>{fmt(slip.payeTax) || '0.00'}</span></div>
                <div className="flex justify-between"><span>Aids Levy</span><span>{fmt(slip.aidsLevy) || '0.00'}</span></div>
                <div className="flex justify-between"><span>NSSA Employee</span><span>{fmt(slip.nssaEmployee) || '0.00'}</span></div>
                <div className="flex justify-between"><span>NEC Employee</span><span>{fmt(slip.necEmployee) || '0.00'}</span></div>
                {(slip.loanDeductions || 0) > 0 && (
                  <div className="flex justify-between"><span>Loan Recovery</span><span>{fmt(slip.loanDeductions)}</span></div>
                )}
                {(slip.advanceDeductions || 0) > 0 && (
                  <div className="flex justify-between"><span>Advance</span><span>{fmt(slip.advanceDeductions)}</span></div>
                )}
                {(slip.miscDeductions || 0) > 0 && (
                  <div className="flex justify-between"><span>Other Deductions</span><span>{fmt(slip.miscDeductions)}</span></div>
                )}
                <div className="flex justify-between"><span>Net Pay Round</span><span>{fmt(slip.netPayRound) || '0.00'}</span></div>
              </div>
            </div>
            <div>
              <div className="font-bold text-gray-700 dark:text-gray-200 mb-1 border-b border-gray-200 dark:border-gray-700">CONTRIBUTIONS</div>
              <div className="space-y-0.5 text-gray-600 dark:text-gray-300">
                <div className="flex justify-between"><span>WCIF</span><span>{fmt(slip.wcif) || '0.00'}</span></div>
                <div className="flex justify-between"><span>NEC Company</span><span>{fmt(slip.necCompanyContrib) || '0.00'}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 text-center text-xs font-bold border border-gray-200 dark:border-gray-700 rounded p-2 bg-gray-50 dark:bg-gray-700/50">
            <div>
              <div className="text-gray-500 dark:text-gray-400 font-normal">Total Earnings</div>
              <div className="text-gray-900 dark:text-gray-100">{fmt(slip.totalEarnings) || '0.00'}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400 font-normal">Total Deductions</div>
              <div className="text-gray-900 dark:text-gray-100">{totalDed.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400 font-normal">Nett Pay</div>
              <div className="text-green-700 dark:text-green-400">{fmt(slip.nettPay) || (Number(slip.totalEarnings || 0) - totalDed).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
            <span>Leave Days Due: <strong>{fmt(slip.leaveDaysDue) || '—'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
