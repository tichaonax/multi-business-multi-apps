'use client'

import { useState, useEffect, useCallback } from 'react'
import { ModalPortal } from '@/components/ui/modal-portal'

/**
 * MBM-288 — the admin UI for enabling/configuring per-business sales
 * targets, opened from Edit Business (mirrors the existing Rent Account
 * pattern: a compact status row there, full configuration in this modal).
 */

interface Commitment {
  id: string
  category: 'LOAN_REPAYMENT' | 'OTHER'
  label: string
  monthlyAmount: number
  notes: string | null
}

interface Breakdown {
  rentMonthly: number
  payrollMonthly: number
  recurringCommitmentsMonthly: number
  loanRepaymentMonthly: number
  otherCommitmentsMonthly: number
  buffer: number
  minimumRequiredMonthlyTarget: number
  tradingDaysInMonth: number
  rentMonthlyLive: number
  payrollMonthlyLive: number
  recurringCommitmentsMonthlyLive: number
  rentMonthlyIsOverridden: boolean
  payrollMonthlyIsOverridden: boolean
  recurringCommitmentsMonthlyIsOverridden: boolean
}

type OverridableLine = 'RENT' | 'PAYROLL' | 'RECURRING_COMMITMENTS'

interface ConfigData {
  isEnabled: boolean
  approvedMonthlyTarget: number | null
  recommendedMonthlyTarget: number | null
  minimumRequiredMonthlyTarget: number | null
  bufferType?: 'PERCENT' | 'FIXED'
  bufferValue?: number
  commitments?: Commitment[]
  breakdown?: Breakdown
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-60'
const smallInputCls = 'w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs disabled:opacity-60'

// Rent/Payroll/Recurring commitments are normally computed live — this row
// lets an admin raise one manually (e.g. payroll fluctuates ahead of what's
// on file). Never lets it go below the live-computed value; the API
// enforces the same floor, this is just the matching UI.
function OverridableBreakdownLine({
  icon, label, line, value, liveValue, isOverridden,
  editingLine, setEditingLine, lineValue, setLineValue, lineError, setLineError, saving, onSave,
}: {
  icon: string
  label: string
  line: OverridableLine
  value: number
  liveValue: number
  isOverridden: boolean
  editingLine: OverridableLine | null
  setEditingLine: (l: OverridableLine | null) => void
  lineValue: string
  setLineValue: (v: string) => void
  lineError: string | null
  setLineError: (e: string | null) => void
  saving: boolean
  onSave: (line: OverridableLine, value: number | null) => void
}) {
  const isEditing = editingLine === line
  return (
    <div>
      <div className="flex justify-between items-center">
        <span className="text-secondary">
          {icon} {label}
          {isOverridden && <span className="ml-1 text-amber-600 dark:text-amber-400" title={`System-computed: ${fmt(liveValue)}`}>✏️</span>}
        </span>
        {!isEditing && (
          <span className="flex items-center gap-1.5">
            <span className="text-primary">{fmt(value)}</span>
            <button
              type="button"
              onClick={() => { setEditingLine(line); setLineValue(String(value)); setLineError(null) }}
              className="text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
            >
              {isOverridden ? 'Edit' : 'Override'}
            </button>
          </span>
        )}
      </div>
      {isEditing && (
        <div className="mt-1 pb-1">
          <div className="flex items-center gap-1.5">
            <input type="number" step="0.01" min="0" value={lineValue} onChange={(e) => setLineValue(e.target.value)} className={smallInputCls} autoFocus />
            <button type="button" disabled={saving} onClick={() => onSave(line, parseFloat(lineValue) || 0)} className="btn-primary text-[11px] px-2 py-1">Save</button>
            {isOverridden && (
              <button type="button" disabled={saving} onClick={() => onSave(line, null)} className="text-red-600 dark:text-red-400 text-[11px]">Reset to system value</button>
            )}
            <button type="button" onClick={() => { setEditingLine(null); setLineError(null) }} className="text-secondary text-[11px]">Cancel</button>
          </div>
          <p className="text-[10px] text-secondary mt-0.5">System-computed: {fmt(liveValue)} — can't go below this</p>
          {lineError && <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{lineError}</p>}
        </div>
      )}
    </div>
  )
}

export function SalesTargetManageModal({
  businessId,
  businessName,
  onSuccess,
  onClose,
}: {
  businessId: string
  businessName: string
  onSuccess: () => void
  onClose: () => void
}) {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [bufferType, setBufferType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [bufferValue, setBufferValue] = useState('10')
  const [targetOverride, setTargetOverride] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState<'LOAN_REPAYMENT' | 'OTHER'>('OTHER')

  const [editingLine, setEditingLine] = useState<OverridableLine | null>(null)
  const [lineValue, setLineValue] = useState('')
  const [lineError, setLineError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/business-targets/${businessId}`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const data: ConfigData = json.data
        setConfig(data)
        if (data.bufferType) setBufferType(data.bufferType)
        if (data.bufferValue !== undefined) setBufferValue(String(data.bufferValue))
        if (data.approvedMonthlyTarget) setTargetOverride(String(data.approvedMonthlyTarget))
      }
    } catch {
      setError('Failed to load sales target configuration')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  const handleToggleEnabled = async (nextEnabled: boolean) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/business-targets/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: nextEnabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      // First time enabling — kick off a calculation immediately so there's
      // something to show rather than a blank breakdown until the nightly job runs.
      if (nextEnabled) {
        await fetch(`/api/business-targets/${businessId}/recalculate`, { method: 'POST' }).catch(() => {})
      }
      await load()
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBuffer = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/business-targets/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bufferType, bufferValue: parseFloat(bufferValue) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update buffer')
      await fetch(`/api/business-targets/${businessId}/recalculate`, { method: 'POST' }).catch(() => {})
      setSuccess('Buffer updated')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTarget = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/business-targets/${businessId}/target`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyTarget: parseFloat(targetOverride) || 0, reason: overrideReason.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to set target')
      setSuccess('Monthly target updated')
      setOverrideReason('')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRecalculate = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/business-targets/${businessId}/recalculate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to recalculate')
      setSuccess('Recalculated')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLineOverride = async (line: OverridableLine, value: number | null) => {
    setSaving(true)
    setLineError(null)
    try {
      const res = await fetch(`/api/business-targets/${businessId}/line-overrides`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line, value }),
      })
      const data = await res.json()
      if (!res.ok) { setLineError(data.error || 'Failed to update'); return }
      setEditingLine(null)
      await fetch(`/api/business-targets/${businessId}/recalculate`, { method: 'POST' }).catch(() => {})
      await load()
    } catch (err: any) {
      setLineError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddCommitment = async () => {
    if (!newLabel.trim() || !newAmount) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/business-targets/${businessId}/commitments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory, label: newLabel.trim(), monthlyAmount: parseFloat(newAmount) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add commitment')
      setNewLabel('')
      setNewAmount('')
      await fetch(`/api/business-targets/${businessId}/recalculate`, { method: 'POST' }).catch(() => {})
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveCommitment = async (commitmentId: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/business-targets/${businessId}/commitments/${commitmentId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove commitment')
      await fetch(`/api/business-targets/${businessId}/recalculate`, { method: 'POST' }).catch(() => {})
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const minimum = config?.minimumRequiredMonthlyTarget ?? 0
  const recommended = config?.recommendedMonthlyTarget ?? 0
  const overrideAmount = parseFloat(targetOverride) || 0
  const isBelowMinimum = config?.isEnabled && overrideAmount > 0 && overrideAmount < minimum
  const isAboveRecommendation = config?.isEnabled && overrideAmount > recommended + 0.005

  // Portal straight to <body> (same helper other modals in this app already
  // use) — see target-expanded-modal.tsx for why: an ancestor with
  // `transform`/`filter`/`will-change` (common in the POS pages this opens
  // from) silently hijacks `position: fixed`'s containing block, making the
  // modal scroll away with its ancestor instead of staying pinned to the
  // viewport.
  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg md:max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-primary">🎯 Manage Sales Targets</h2>
            <p className="text-xs text-secondary mt-0.5">{businessName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-secondary">Loading...</div>
        ) : (
          <div className="p-5 space-y-4 overflow-y-auto min-h-0">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-700 dark:text-red-300">{error}</div>
            )}
            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md text-sm text-green-700 dark:text-green-300">✓ {success}</div>
            )}

            {/* Enable toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <div>
                <p className="text-sm font-medium text-primary">Enable Sales Target Tracking</p>
                <p className="text-xs text-secondary">Shows a daily target progress widget at the POS and calculates a monthly target covering this business's obligations.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleEnabled(!config?.isEnabled)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-3 ${config?.isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config?.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {config?.isEnabled && (
              <>
                {/* Target summary */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[11px] text-secondary uppercase tracking-wide">Minimum</p>
                      <p className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(minimum)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-secondary uppercase tracking-wide">Recommended</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmt(recommended)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-secondary uppercase tracking-wide">Approved</p>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(config?.approvedMonthlyTarget ?? 0)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleRecalculate} disabled={saving} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    🔄 Recalculate now
                  </button>
                </div>

                {/* Breakdown */}
                {config.breakdown && (
                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md text-xs space-y-1">
                    <p className="font-medium text-secondary mb-1">Minimum target breakdown</p>
                    <OverridableBreakdownLine
                      icon="🏠" label="Rent" line="RENT"
                      value={config.breakdown.rentMonthly} liveValue={config.breakdown.rentMonthlyLive} isOverridden={config.breakdown.rentMonthlyIsOverridden}
                      editingLine={editingLine} setEditingLine={setEditingLine} lineValue={lineValue} setLineValue={setLineValue}
                      lineError={lineError} setLineError={setLineError} saving={saving} onSave={handleSaveLineOverride}
                    />
                    <OverridableBreakdownLine
                      icon="👥" label="Payroll" line="PAYROLL"
                      value={config.breakdown.payrollMonthly} liveValue={config.breakdown.payrollMonthlyLive} isOverridden={config.breakdown.payrollMonthlyIsOverridden}
                      editingLine={editingLine} setEditingLine={setEditingLine} lineValue={lineValue} setLineValue={setLineValue}
                      lineError={lineError} setLineError={setLineError} saving={saving} onSave={handleSaveLineOverride}
                    />
                    <OverridableBreakdownLine
                      icon="🔁" label="Recurring commitments" line="RECURRING_COMMITMENTS"
                      value={config.breakdown.recurringCommitmentsMonthly} liveValue={config.breakdown.recurringCommitmentsMonthlyLive} isOverridden={config.breakdown.recurringCommitmentsMonthlyIsOverridden}
                      editingLine={editingLine} setEditingLine={setEditingLine} lineValue={lineValue} setLineValue={setLineValue}
                      lineError={lineError} setLineError={setLineError} saving={saving} onSave={handleSaveLineOverride}
                    />
                    <div className="flex justify-between"><span className="text-secondary">🏦 Loan repayments</span><span className="text-primary">{fmt(config.breakdown.loanRepaymentMonthly)}</span></div>
                    <div className="flex justify-between"><span className="text-secondary">➕ Other commitments</span><span className="text-primary">{fmt(config.breakdown.otherCommitmentsMonthly)}</span></div>
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1"><span className="text-secondary">🛡️ Buffer</span><span className="text-primary">{fmt(config.breakdown.buffer)}</span></div>
                  </div>
                )}

                {/* Buffer config */}
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Buffer Type</label>
                    <select value={bufferType} onChange={(e) => setBufferType(e.target.value as any)} className={inputCls}>
                      <option value="PERCENT">Percentage (%)</option>
                      <option value="FIXED">Fixed ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Buffer Value</label>
                    <input type="number" step="0.01" min="0" value={bufferValue} onChange={(e) => setBufferValue(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <button type="button" onClick={handleSaveBuffer} disabled={saving} className="btn-secondary text-xs px-3 py-1.5">Save Buffer</button>

                {/* Commitments */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-primary mb-2">Loan repayments & other commitments</p>
                  {(config.commitments ?? []).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-100 dark:border-gray-800">
                      <span className="text-primary">{c.category === 'LOAN_REPAYMENT' ? '🏦' : '➕'} {c.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-secondary">{fmt(c.monthlyAmount)}/mo</span>
                        <button type="button" onClick={() => handleRemoveCommitment(c.id)} disabled={saving} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 mt-2">
                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as any)} className={inputCls}>
                      <option value="LOAN_REPAYMENT">Loan repayment</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <input placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className={inputCls} />
                    <input type="number" step="0.01" min="0" placeholder="$/mo" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className={inputCls} />
                    <button type="button" onClick={handleAddCommitment} disabled={saving || !newLabel.trim() || !newAmount} className="btn-secondary text-xs px-3">+ Add</button>
                  </div>
                </div>

                {/* Override target */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-primary mb-2">Set approved monthly target</p>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" min="0" value={targetOverride} onChange={(e) => setTargetOverride(e.target.value)} className={inputCls} />
                    <button type="button" onClick={handleSaveTarget} disabled={saving || isBelowMinimum} className="btn-primary text-sm px-4 disabled:opacity-50 shrink-0">Save</button>
                  </div>
                  {isBelowMinimum && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      The target cannot be lower than the minimum required monthly amount ({fmt(minimum)}) because it would not cover rent, salaries, loan repayments, recurring commitments, and the required buffer.
                    </p>
                  )}
                  {isAboveRecommendation && !isBelowMinimum && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                        This is above the recommended target ({fmt(recommended)}) — a reason is required
                      </label>
                      <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Why does this business need a higher target?" className={inputCls} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3 shrink-0">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}
