'use client'

import { useState, useEffect } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { usePrompt } from '@/components/ui/input-modal'

interface PayrollEntry {
  id: string
  employeeNumber: string
  employeeName: string
  nationalId: string
  workDays: number
  expectedWorkDays?: number
  sickDays: number
  leaveDays: number
  absenceDays: number
  overtimeHours: number
  baseSalary: number
  commission: number
  livingAllowance: number
  vehicleAllowance: number
  travelAllowance: number
  overtimePay: number
  benefitsTotal: number
  benefitsBreakdown: any
  advanceDeductions: number
  advanceBreakdown: any[]
  loanDeductions: number
  loanBreakdown: any[]
  miscDeductions: number
  grossPay: number
  totalDeductions: number
  netPay: number
  notes: string
  payrollEntryBenefits?: any[]
  contract?: any
  payrollAdjustments?: PayrollAdjustment[]
}

interface PayrollAdjustment {
  id: string
  type: string
  category: string
  amount: number
  isAddition: boolean
  description: string
  createdAt: string
}

interface PayrollBenefit {
  id: string
  benefitTypeId: string
  benefitName: string
  amount: number
  isActive: boolean
  deactivatedReason?: string
  source: string // 'contract' | 'manual'
  benefitType?: {
    id: string
    name: string
  }
}

interface PayrollEntryDetailModalProps {
  isOpen: boolean
  onClose: () => void
  entryId: string
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

export function PayrollEntryDetailModal({
  isOpen,
  onClose,
  entryId,
  onSuccess,
  onError
}: PayrollEntryDetailModalProps) {
  const [entry, setEntry] = useState<PayrollEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddAdjustment, setShowAddAdjustment] = useState(false)
  const [benefits, setBenefits] = useState<PayrollBenefit[]>([])
  const [showAddBenefit, setShowAddBenefit] = useState(false)
  const [benefitTypes, setBenefitTypes] = useState<any[]>([])
  const [deactivatingBenefit, setDeactivatingBenefit] = useState<PayrollBenefit | null>(null)
  const [editingAdjustment, setEditingAdjustment] = useState<PayrollAdjustment | null>(null)
  const [editAdjustmentForm, setEditAdjustmentForm] = useState({
    type: 'bonus',
    amount: 0,
    isAddition: true,
    description: ''
  })

  const showPrompt = usePrompt()

  const [formData, setFormData] = useState({
    workDays: 0,
    sickDays: 0,
    leaveDays: 0,
    absenceDays: 0,
    overtimeHours: 0,
    commission: 0,
    notes: ''
  })

  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'bonus',
    amount: 0,
    isAddition: true,
    description: ''
  })

  const [benefitForm, setBenefitForm] = useState({
    benefitTypeId: '',
    amount: 0
  })

  const [deactivationReason, setDeactivationReason] = useState('')
  const confirm = useConfirm()

  useEffect(() => {
    if (isOpen && entryId) {
      loadEntry()
      loadBenefitTypes()
    }
  }, [isOpen, entryId])

  const loadEntry = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payroll/entries/${entryId}`)
      if (response.ok) {
        const data = await response.json()

        // Build benefits list by starting from server-provided mergedBenefits (authoritative effective view)
        // then overlay persisted payrollEntryBenefits so overrides and deactivations are reflected.
        const benefitsMap = new Map<string, PayrollBenefit>()

        const normalizeName = (s?: string | null) => {
          if (!s) return ''
          try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
        }

        const keyFor = (obj: any) => {
          if (!obj) return ''
          if (obj.benefitType && obj.benefitType.id) return String(obj.benefitType.id)
          if (obj.benefitTypeId) return String(obj.benefitTypeId)
          const n = normalizeName(obj.benefitName || obj.name || obj.benefitType?.name || obj.benefitName)
          return n || ''
        }

        // Seed from mergedBenefits (server effective list) when available
        if (Array.isArray(data.mergedBenefits) && data.mergedBenefits.length > 0) {
          for (const mb of data.mergedBenefits) {
            const k = keyFor(mb) || `merged-${Math.random().toString(36).slice(2,9)}`
            const id = mb.id || mb.benefitType?.id || mb.benefitTypeId || k
            const name = mb.benefitType?.name || mb.benefitName || mb.name || k
            // Treat merged/contract benefits as not active by default. Persisted overrides
            // (overlayed later) will mark them active if an override exists.
            benefitsMap.set(k, {
              id,
              benefitTypeId: mb.benefitType?.id || mb.benefitTypeId || '',
              benefitName: name,
              amount: Number(mb.amount || 0),
              isActive: mb.source && String(mb.source).toLowerCase().includes('manual') ? (mb.isActive !== false) : false,
              deactivatedReason: mb.deactivatedReason || undefined,
              source: mb.source || 'merged',
              benefitType: mb.benefitType || undefined
            })
          }
        }

        // Overlay persisted benefits so overrides (and deactivations) take precedence
        if (Array.isArray(data.payrollEntryBenefits) && data.payrollEntryBenefits.length > 0) {
          for (const b of data.payrollEntryBenefits) {
            const k = keyFor(b) || String(b.id)
            const name = b.benefitName || b.name || (b.benefitType && b.benefitType.name) || `Benefit-${b.id}`
            const existing = benefitsMap.get(k)
            const payload: PayrollBenefit = {
              id: b.id || existing?.id || k,
              benefitTypeId: b.benefitTypeId || (b.benefitType && b.benefitType.id) || existing?.benefitTypeId || '',
              benefitName: name,
              amount: Number(b.amount ?? b.value ?? existing?.amount ?? 0),
              isActive: b.isActive !== false,
              deactivatedReason: b.deactivatedReason || existing?.deactivatedReason,
              source: b.source || 'manual',
              benefitType: b.benefitType || existing?.benefitType
            }
            benefitsMap.set(k, payload)
          }
        }

        // If there were no mergedBenefits and no persisted benefits, fall back to contract pdfGenerationData
        if (benefitsMap.size === 0 && data.contract && data.contract.pdfGenerationData && Array.isArray(data.contract.pdfGenerationData.benefits)) {
          for (const cb of data.contract.pdfGenerationData.benefits) {
            const k = keyFor(cb) || `contract-${Math.random().toString(36).slice(2,9)}`
            const id = cb.benefitTypeId || k
            const name = cb.name || cb.benefitType?.name || `Benefit-${id}`
            benefitsMap.set(k, {
              id,
              benefitTypeId: cb.benefitTypeId || '',
              benefitName: name,
              amount: Number(cb.amount || 0),
              isActive: true,
              deactivatedReason: undefined,
              source: 'contract-inferred',
              benefitType: undefined
            })
          }
        }

        const benefitsList: PayrollBenefit[] = Array.from(benefitsMap.values())

        const serverBenefitsTotalRaw = data.totalBenefitsAmount ?? data.benefitsTotal
        const serverBenefitsTotal = serverBenefitsTotalRaw !== undefined && serverBenefitsTotalRaw !== null ? Number(serverBenefitsTotalRaw) : undefined
        const computedBenefitsTotal = benefitsList.reduce((s, b) => s + (b.isActive ? Number(b.amount || 0) : 0), 0)
        // If server provided a total (including 0) prefer it. Otherwise fall back to computed total.
        const benefitsTotalToUse = Number.isFinite(serverBenefitsTotal as number) ? (serverBenefitsTotal as number) : computedBenefitsTotal

        // Normalize adjustments: server stores signed amounts; derive isAddition and absolute amount for UI
        const payrollAdjustments = (data.payrollAdjustments || []).map((a: any) => ({
          ...a,
          isAddition: Number(a.amount || 0) >= 0,
          amount: Math.abs(Number(a.amount || 0)),
          description: a.reason ?? a.description ?? '',
          type: a.adjustmentType ?? a.type
        }))

        setEntry({ ...data, benefitsTotal: benefitsTotalToUse, payrollAdjustments })
        setFormData({
          workDays: data.workDays || 0,
          sickDays: data.sickDays,
          leaveDays: data.leaveDays,
          absenceDays: data.absenceDays,
          overtimeHours: data.overtimeHours,
          commission: data.commission,
          notes: data.notes || ''
        })
        setBenefits(benefitsList)
      }
    } catch (error) {
      console.error('Failed to load entry:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBenefits = async () => {
    try {
      const response = await fetch(`/api/payroll/entries/${entryId}/benefits`)
      if (response.ok) {
        const data = await response.json()
        // API now returns { persisted, inferred, combined }
        if (data && typeof data === 'object') {
          const persisted = Array.isArray(data.persisted) ? data.persisted : []
          const inferred = Array.isArray(data.inferred) ? data.inferred : []
          const combined = Array.isArray(data.combined) ? data.combined : [...persisted, ...inferred]
          // Build a normalized list similar to loadEntry expects (persisted overrides overlay inferred)
          const mergedMap = new Map<string, any>()
          const normalizeName = (s?: string | null) => {
            if (!s) return ''
            try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
          }
          const keyFor = (obj: any) => {
            if (!obj) return ''
            if (obj.benefitType && obj.benefitType.id) return String(obj.benefitType.id)
            if (obj.benefitTypeId) return String(obj.benefitTypeId)
            const n = normalizeName(obj.benefitName || obj.name || obj.benefitType?.name || obj.benefitName)
            return n || ''
          }

          for (const inf of inferred) {
            const k = keyFor(inf) || `inf-${Math.random().toString(36).slice(2,9)}`
            mergedMap.set(k, { ...inf, source: inf.source || 'contract-inferred' })
          }
          for (const p of persisted) {
            const k = keyFor(p) || String(p.id)
            mergedMap.set(k, { ...p, source: p.source || 'manual' })
          }

          const mergedList = Array.from(mergedMap.values())
          setBenefits(mergedList)
        } else {
          setBenefits([])
        }
      }
    } catch (error) {
      console.error('Failed to load benefits:', error)
    }
  }

  const loadBenefitTypes = async () => {
    try {
      const response = await fetch('/api/benefit-types')
      if (response.ok) {
        const data = await response.json()
        setBenefitTypes(data.filter((bt: any) => bt.type === 'benefit' || bt.type === 'allowance'))
      }
    } catch (error) {
      console.error('Failed to load benefit types:', error)
    }
  }

  // Available benefit types for the +Add Benefit dropdown.
  // Exclude benefit types that are already present either as persisted payrollEntryBenefits
  // or as contract-inferred benefits so users can't add duplicates.
  const availableBenefitTypes = benefitTypes.filter((bt: any) => {
    try {
      if (!bt || !bt.id) return true
      const id = String(bt.id)
      if (entry?.payrollEntryBenefits && entry.payrollEntryBenefits.some((b: any) => b.benefitTypeId && String(b.benefitTypeId) === id)) return false
      if (entry?.contract?.pdfGenerationData?.benefits && entry.contract.pdfGenerationData.benefits.some((cb: any) => cb.benefitTypeId && String(cb.benefitTypeId) === id)) return false
      return true
    } catch (e) {
      return true
    }
  })

  // If the currently selected benefitTypeId is no longer available (e.g. after loading
  // the entry which contains that type), reset the add-benefit form selection to avoid
  // a controlled <select> value mismatch and to prevent adding duplicates.
  useEffect(() => {
    if (benefitForm.benefitTypeId) {
      const stillAvailable = availableBenefitTypes.some((bt: any) => String(bt.id) === String(benefitForm.benefitTypeId))
      if (!stillAvailable) {
        setBenefitForm({ ...benefitForm, benefitTypeId: '' })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, benefitTypes])

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/payroll/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess('Payroll entry updated successfully')
        loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to update entry')
      }
    } catch (error) {
      onError('Failed to update entry')
    } finally {
      setSaving(false)
    }
  }

  const handleAddAdjustment = async () => {
    try {
      const response = await fetch('/api/payroll/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollEntryId: entryId,
          ...adjustmentForm
        })
      })

      if (response.ok) {
        onSuccess('Adjustment added successfully')
        setShowAddAdjustment(false)
        setAdjustmentForm({
          type: 'bonus',
          amount: 0,
          isAddition: true,
          description: ''
        })
        loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to add adjustment')
      }
    } catch (error) {
      onError('Failed to add adjustment')
    }
  }

  const handleEditAdjustment = async (adjustmentId: string, patch: any) => {
    try {
      const response = await fetch('/api/payroll/adjustments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: adjustmentId, ...patch })
      })

      if (response.ok) {
        onSuccess('Adjustment updated')
        loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to update adjustment')
      }
    } catch (err) {
      onError('Failed to update adjustment')
    }
  }

  const handleDeleteAdjustment = async (adjustmentId: string) => {
    try {
      const ok = await confirm({ title: 'Delete adjustment', description: 'Are you sure you want to delete this adjustment?', confirmText: 'Delete', cancelText: 'Cancel' })
      if (!ok) return
      const response = await fetch(`/api/payroll/adjustments?adjustmentId=${adjustmentId}`, { method: 'DELETE' })
      if (response.ok) {
        onSuccess('Adjustment deleted')
        loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to delete adjustment')
      }
    } catch (err) {
      onError('Failed to delete adjustment')
    }
  }

  const handleAddBenefit = async () => {
    try {
      if (!benefitForm.benefitTypeId || benefitForm.amount <= 0) {
        onError('Please select a benefit type and enter a valid amount')
        return
      }

      const response = await fetch(`/api/payroll/entries/${entryId}/benefits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(benefitForm)
      })

      if (response.ok) {
        onSuccess('Benefit added successfully')
        setShowAddBenefit(false)
        setBenefitForm({ benefitTypeId: '', amount: 0 })
        await loadBenefits()
        await loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to add benefit')
      }
    } catch (error) {
      onError('Failed to add benefit')
    }
  }

  const handleToggleBenefit = async (benefit: PayrollBenefit) => {
    try {
      if (benefit.isActive) {
        // Show deactivation modal
        setDeactivatingBenefit(benefit)
        return
      }

      // Reactivate benefit
      const response = await fetch(`/api/payroll/entries/${entryId}/benefits/${benefit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true, deactivatedReason: null })
      })

      if (response.ok) {
        onSuccess('Benefit reactivated')
        await loadBenefits()
        await loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to update benefit')
      }
    } catch (error) {
      onError('Failed to update benefit')
    }
  }

  const handleDeactivateBenefit = async () => {
    try {
      if (!deactivatingBenefit) return
      // If this benefit is not persisted (contract-inferred without an id or without a persisted id),
      // create a persisted inactive override via POST so the contract benefit is effectively removed for this entry.
      if (!deactivatingBenefit.id || deactivatingBenefit.source === 'contract-inferred') {
        // include benefitName when benefitTypeId is missing so server can create a standalone override
        const payload: any = {
          benefitTypeId: deactivatingBenefit.benefitTypeId || '',
          benefitName: deactivatingBenefit.benefitName,
          amount: deactivatingBenefit.amount,
          isActive: false,
          deactivatedReason: deactivationReason
        }

        const response = await fetch(`/api/payroll/entries/${entryId}/benefits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          onSuccess('Contract benefit removed for this entry')
          setDeactivatingBenefit(null)
          setDeactivationReason('')
          await loadBenefits()
          await loadEntry()
        } else {
          const error = await response.json()
          onError(error.error || 'Failed to remove contract benefit')
        }
        return
      }

      // Otherwise update the persisted benefit
      const response = await fetch(`/api/payroll/entries/${entryId}/benefits/${deactivatingBenefit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: false,
          deactivatedReason: deactivationReason
        })
      })

      if (response.ok) {
        onSuccess('Benefit deactivated')
        setDeactivatingBenefit(null)
        setDeactivationReason('')
        await loadBenefits()
        await loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to deactivate benefit')
      }
    } catch (error) {
      onError('Failed to deactivate benefit')
    }
  }

  const handleUpdateBenefit = async (benefitId: string, patch: any) => {
    try {
      const response = await fetch(`/api/payroll/entries/${entryId}/benefits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: benefitId, ...patch })
      })
      if (response.ok) {
        onSuccess('Benefit updated')
        await loadBenefits()
        await loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to update benefit')
      }
    } catch (err) {
      onError('Failed to update benefit')
    }
  }

  const handleResetContractBenefit = async (benefit: Partial<PayrollBenefit> & { benefitTypeId?: string, amount?: number }) => {
    // Persist a benefit override matching the contract-inferred benefit
    try {
      const response = await fetch(`/api/payroll/entries/${entryId}/benefits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benefitTypeId: benefit.benefitTypeId, amount: benefit.amount })
      })
      if (response.ok) {
        onSuccess('Benefit override saved')
        loadBenefits()
        loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to persist benefit')
      }
    } catch (err) {
      onError('Failed to persist benefit')
    }
  }

  const handleDeleteBenefit = async (benefitId: string) => {
    try {
      const ok = await confirm({ title: 'Delete benefit', description: 'Are you sure you want to delete this benefit?', confirmText: 'Delete', cancelText: 'Cancel' })
      if (!ok) return

      const response = await fetch(`/api/payroll/entries/${entryId}/benefits/${benefitId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onSuccess('Benefit deleted successfully')
        await loadBenefits()
        await loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to delete benefit')
      }
    } catch (error) {
      onError('Failed to delete benefit')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">Payroll Entry Details</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-secondary">Loading...</div>
          </div>
        ) : entry ? (
          <div className="space-y-6">
            {/* Employee Info */}
            <div className="bg-muted p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-primary mb-2">Employee Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-secondary">Employee:</span>
                  <span className="ml-2 text-primary font-medium">{entry.employeeNumber} - {entry.employeeName}</span>
                </div>
                <div>
                  <span className="text-secondary">National ID:</span>
                  <span className="ml-2 text-primary">{entry.nationalId}</span>
                </div>
              </div>
            </div>

            {/* Attendance */}
            <div>
              <h3 className="font-semibold text-primary mb-3">Attendance & Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Work Days</label>
                  <input
                    type="number"
                    value={formData.workDays}
                    onChange={(e) => setFormData({ ...formData, workDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="31"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Sick Days</label>
                  <input
                    type="number"
                    value={formData.sickDays}
                    onChange={(e) => setFormData({ ...formData, sickDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="31"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Leave Days</label>
                  <input
                    type="number"
                    value={formData.leaveDays}
                    onChange={(e) => setFormData({ ...formData, leaveDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="31"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Absence Days</label>
                  <input
                    type="number"
                    value={formData.absenceDays}
                    onChange={(e) => setFormData({ ...formData, absenceDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="31"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.overtimeHours}
                    onChange={(e) => setFormData({ ...formData, overtimeHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">Commission</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Compensation Breakdown */}
            <div>
              <h3 className="font-semibold text-primary mb-3">Compensation Breakdown</h3>
              <div className="bg-muted p-4 rounded-lg border border-border space-y-2 text-sm">
                {entry.baseSalary > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Base Salary:</span>
                    <span className="text-primary font-medium">{formatCurrency(entry.baseSalary)}</span>
                  </div>
                )}
                {formData.commission > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Commission:</span>
                    <span className="text-primary font-medium">{formatCurrency(formData.commission)}</span>
                  </div>
                )}
                {entry.livingAllowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Living Allowance:</span>
                    <span className="text-primary">{formatCurrency(entry.livingAllowance)}</span>
                  </div>
                )}
                {entry.vehicleAllowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Vehicle Allowance:</span>
                    <span className="text-primary">{formatCurrency(entry.vehicleAllowance)}</span>
                  </div>
                )}
                {entry.travelAllowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Travel Allowance:</span>
                    <span className="text-primary">{formatCurrency(entry.travelAllowance)}</span>
                  </div>
                )}
                {entry.overtimePay > 0 && (
                  <div className="flex justify-between">
                    <span className="text-secondary">Overtime Pay:</span>
                    <span className="text-primary">{formatCurrency(entry.overtimePay)}</span>
                  </div>
                )}
                {benefits.length > 0 ? (
                  <div>
                    <div className="font-medium text-secondary mb-1">Benefits:</div>
                    {/* Exclude contract-based or merged contract rows from the combined benefits display
                        Contract benefits are shown separately/handled in contract section and must not
                        duplicate here. Persisted/manual overrides remain visible. */}
                    {(() => {
                      const displayed = benefits.filter(b => b.isActive && !(String(b.source || '').toLowerCase().startsWith('contract') || String(b.source || '').toLowerCase() === 'merged'))
                      return (
                        <>
                          {displayed.map((benefit) => (
                            <div key={benefit.id || benefit.benefitTypeId} className="flex justify-between ml-4 text-xs">
                              <span className="text-secondary">
                                {benefit.benefitName}
                                {benefit.source === 'contract-inferred' && (
                                  <span className="ml-1 text-blue-600 dark:text-blue-400">(from contract)</span>
                                )}
                              </span>
                              <span className="text-primary">{formatCurrency(benefit.amount)}</span>
                            </div>
                          ))}

                          <div className="flex justify-between font-medium">
                            <span className="text-secondary">Total Benefits:</span>
                            <span className="text-primary">
                              {formatCurrency(displayed.reduce((sum, b) => sum + Number(b.amount || 0), 0))}
                            </span>
                          </div>
                        </>
                      )
                    })()}

                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-secondary">Benefits:</span>
                    <span className="text-primary">{formatCurrency(0)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span className="text-primary">Gross Pay:</span>
                  <span className="text-primary">{formatCurrency(Number(entry.grossPay))}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="font-semibold text-primary mb-3">Deductions</h3>
              <div className="bg-muted p-4 rounded-lg border border-border space-y-2 text-sm">
                {entry.advanceBreakdown && entry.advanceBreakdown.length > 0 && (
                  <div>
                    <div className="font-medium text-secondary mb-1">Advances:</div>
                    {entry.advanceBreakdown.map((adv: any, index: number) => (
                      <div key={index} className="flex justify-between ml-4 text-xs">
                        <span className="text-secondary">{adv.description}</span>
                        <span className="text-red-600">{formatCurrency(adv.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium">
                      <span className="text-secondary">Total Advances:</span>
                      <span className="text-red-600">{formatCurrency(entry.advanceDeductions)}</span>
                    </div>
                  </div>
                )}
                {entry.loanBreakdown && entry.loanBreakdown.length > 0 && (
                  <div>
                    <div className="font-medium text-secondary mb-1">Loans:</div>
                    {entry.loanBreakdown.map((loan: any, index: number) => (
                      <div key={index} className="flex justify-between ml-4 text-xs">
                        <span className="text-secondary">{loan.description}</span>
                        <span className="text-red-600">{formatCurrency(loan.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium">
                      <span className="text-secondary">Total Loans:</span>
                      <span className="text-red-600">{formatCurrency(entry.loanDeductions)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-secondary">Misc Deductions:</span>
                  <span className="text-red-600">{formatCurrency(entry.miscDeductions)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span className="text-primary">Total Deductions:</span>
                  <span className="text-red-600">{formatCurrency(entry.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Adjustments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-primary">Adjustments</h3>
                <button
                  onClick={() => setShowAddAdjustment(!showAddAdjustment)}
                  className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  {showAddAdjustment ? 'Cancel' : '+ Add Adjustment'}
                </button>
              </div>

              {showAddAdjustment && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4 border border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Type</label>
                      <select
                        value={adjustmentForm.type}
                        onChange={(e) => {
                          const newType = e.target.value
                          setAdjustmentForm({ ...adjustmentForm, type: newType, isAddition: newType === 'penalty' ? false : adjustmentForm.isAddition })
                        }}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="bonus">Bonus</option>
                        <option value="penalty">Penalty</option>
                        <option value="correction">Correction</option>
                        <option value="overtime">Overtime</option>
                        <option value="allowance">Allowance</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={adjustmentForm.amount}
                        onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-secondary mb-1">Description</label>
                      <input
                        type="text"
                        value={adjustmentForm.description}
                        onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Reason for adjustment"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={adjustmentForm.isAddition}
                          onChange={(e) => setAdjustmentForm({ ...adjustmentForm, isAddition: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm text-secondary">Addition (uncheck for deduction)</span>
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={handleAddAdjustment}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Add Adjustment
                  </button>
                </div>
              )}

              {entry.payrollAdjustments && entry.payrollAdjustments.length > 0 ? (
                <div className="space-y-2">
                  {entry.payrollAdjustments.map((adj) => (
                    <div key={adj.id} className="bg-muted p-3 rounded border border-border flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-primary">{adj.description}</div>
                        <div className="text-xs text-secondary">{adj.type} • {new Date(adj.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-sm font-medium ${adj.isAddition ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {adj.isAddition ? '+' : '-'}{formatCurrency(adj.amount)}
                        </div>
                        <button onClick={() => {
                          setEditingAdjustment(adj)
                          setEditAdjustmentForm({
                            type: adj.type,
                            amount: adj.amount,
                            isAddition: adj.isAddition,
                            description: adj.description
                          })
                        }} className="text-sm text-blue-600">Edit</button>
                        <button onClick={() => handleDeleteAdjustment(adj.id)} className="text-sm text-red-600">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary text-center py-4">No adjustments</p>
              )}
            </div>

            {/* Benefits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-primary">Benefits</h3>
                <button
                  onClick={() => setShowAddBenefit(!showAddBenefit)}
                  className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  {showAddBenefit ? 'Cancel' : '+ Add Benefit'}
                </button>
              </div>

              {showAddBenefit && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4 border border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Benefit Type</label>
                      <select
                        value={benefitForm.benefitTypeId}
                        onChange={(e) => setBenefitForm({ ...benefitForm, benefitTypeId: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select benefit type</option>
                        {availableBenefitTypes.length === 0 ? (
                          <option value="" disabled>No benefit types available</option>
                        ) : (
                          availableBenefitTypes.map((bt) => (
                            <option key={bt.id} value={bt.id}>{bt.name}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={benefitForm.amount}
                        onChange={(e) => setBenefitForm({ ...benefitForm, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddBenefit}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Add Benefit
                  </button>
                </div>
              )}

              {/* Manual / persisted benefits section */}
              <div className="mb-4">
                <div className="font-medium text-secondary mb-2">Manual Benefits (added during payroll)</div>
                {entry?.payrollEntryBenefits && entry.payrollEntryBenefits.filter((b:any) => Number(b.amount || 0) !== 0).length > 0 ? (
                  <div className="space-y-2">
                    {(() => {
                      // Filter out persisted overrides that correspond to contract benefits so they appear
                      // under the Contract section instead of Manual.
                      const normalize = (s?: string | null) => {
                        if (!s) return ''
                        try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
                      }

                      const contractBenefits = (entry?.contract?.pdfGenerationData?.benefits || []).map((cb: any) => ({
                        benefitTypeId: cb.benefitTypeId || null,
                        nameKey: normalize(cb.name || cb.benefitType?.name || '')
                      }))

                      const isContractOverride = (pb: any) => {
                        if (!pb) return false
                        if (pb.benefitTypeId && contractBenefits.some((c: any) => c.benefitTypeId && String(c.benefitTypeId) === String(pb.benefitTypeId))) return true
                        const n = normalize(pb.benefitName || pb.benefitType?.name || '')
                        if (n && contractBenefits.some((c: any) => c.nameKey && c.nameKey === n)) return true
                        return false
                      }

                      return entry!.payrollEntryBenefits.filter((b:any) => Number(b.amount || 0) !== 0 && !isContractOverride(b)).map((b:any) => (
                        <div key={b.id} className="p-3 rounded bg-muted border border-border flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-primary">{b.benefitName} <span className="ml-2 text-xs text-blue-600">(Manual)</span></div>
                            {!b.isActive && b.deactivatedReason && <div className="text-xs text-red-600 mt-1">Deactivated: {b.deactivatedReason}</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-primary font-medium">{formatCurrency(Number(b.amount || 0))}</span>
                            <button onClick={async () => {
                              const newAmt = await showPrompt({ title: `Edit ${b.benefitName}`, description: 'Enter new amount', defaultValue: String(b.amount) })
                              if (newAmt === null) return
                              const amount = parseFloat(newAmt)
                              if (isNaN(amount)) return
                              // Update local state immediately
                              const updatedBenefits = (entry!.payrollEntryBenefits || []).map((benefit: any) =>
                                benefit.id === b.id ? { ...benefit, amount } : benefit
                              )
                              setEntry({ ...entry!, payrollEntryBenefits: updatedBenefits })
                              // Make API call in background
                              try {
                                const response = await fetch(`/api/payroll/entries/${entryId}/benefits`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: b.id, amount })
                                })
                                if (response.ok) {
                                  onSuccess('Benefit updated')
                                } else {
                                  const error = await response.json()
                                  onError(error.error || 'Failed to update benefit')
                                  // Revert on error
                                  await loadEntry()
                                }
                              } catch (err) {
                                onError('Failed to update benefit')
                                await loadEntry()
                              }
                            }} className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
                            <button onClick={() => handleDeleteBenefit(b.id)} className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                ) : (
                  <div className="text-sm text-secondary">No manual benefits</div>
                )}
              </div>

              {/* Contract-inferred benefits section */}
              <div>
                <div className="font-medium text-secondary mb-2">Contract Benefits (from contract PDF)</div>
                {entry?.contract?.pdfGenerationData?.benefits && entry.contract.pdfGenerationData.benefits.filter((cb:any) => Number(cb.amount || 0) !== 0 && cb.name).length > 0 ? (
                  <div className="space-y-2">
                    {entry!.contract.pdfGenerationData.benefits.filter((cb:any) => Number(cb.amount || 0) !== 0 && cb.name).map((cb:any) => {
                      // Find any persisted override matching this contract benefit by type or name
                      const override = entry!.payrollEntryBenefits?.find((pb:any) => (pb.benefitTypeId && cb.benefitTypeId && String(pb.benefitTypeId) === String(cb.benefitTypeId)) || (pb.benefitName && String(pb.benefitName).toLowerCase() === String(cb.name).toLowerCase()))
                      if (override) {
                        // Show the persisted override in the Contract section with a toggle, Edit and Delete
                        return (
                          <div key={override.id} className="p-3 rounded border bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm text-primary">{override.benefitName} <span className="ml-2 text-xs text-blue-600">(From Contract)</span></div>
                              {!override.isActive && override.deactivatedReason && <div className="text-xs text-red-600 mt-1">Deactivated: {override.deactivatedReason}</div>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-primary font-medium">{formatCurrency(Number(override.amount || 0))}</span>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={override.isActive}
                                  onChange={async (e) => {
                                    const wantActive = e.target.checked
                                    if (wantActive) {
                                      // Activate override: update persisted benefit to active and clear deactivation reason
                                      await handleUpdateBenefit(override.id, { isActive: true, deactivatedReason: null })
                                    } else {
                                      // Deactivating: require a reason — open deactivation modal
                                      setDeactivatingBenefit(override)
                                      setDeactivationReason('')
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-xs text-secondary">Active</span>
                              </label>
                              <button className="text-sm text-blue-600" onClick={async () => {
                                const newAmt = await showPrompt({ title: 'New amount', defaultValue: String(override.amount) })
                                if (newAmt === null) return
                                const reason = await showPrompt({ title: 'Reason for edit (optional)', defaultValue: '' })
                                await handleUpdateBenefit(override.id, { amount: parseFloat(newAmt), deactivatedReason: reason || override.deactivatedReason })
                              }}>Edit</button>
                              <button className="text-sm text-red-600" onClick={async () => {
                                const ok = await confirm({ title: 'Delete override', description: 'Delete this override and revert to contract default?', confirmText: 'Delete' })
                                if (!ok) return
                                await handleDeleteBenefit(override.id)
                              }}>Delete</button>
                            </div>
                          </div>
                        )
                      }

                      // No override: show inferred contract benefit with Persist and Remove
                      return (
                        <div key={cb.benefitTypeId || cb.name} className="p-3 rounded border bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-primary">{cb.name} <span className="ml-2 text-xs text-blue-600">(From Contract)</span></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-primary font-medium">{formatCurrency(Number(cb.amount || 0))}</span>
                            <button onClick={() => handleResetContractBenefit({ benefitTypeId: cb.benefitTypeId, amount: cb.amount })} className="text-sm text-blue-600">Persist</button>
                            <button onClick={() => { setDeactivatingBenefit({ id: cb.benefitTypeId || `contract-${cb.name}`, benefitTypeId: cb.benefitTypeId || '', benefitName: cb.name, amount: Number(cb.amount || 0), isActive: false, source: 'contract-inferred' } as any); setDeactivationReason('') }} className="text-sm text-red-600">Remove</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-secondary">No contract benefits</div>
                )}
              </div>
            </div>

            {/* Deactivation Modal */}
            {deactivatingBenefit && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-primary mb-4">Deactivate Benefit: {deactivatingBenefit.benefitName}</h3>
                  <p className="text-sm text-secondary mb-4">Please provide a reason for deactivating this benefit:</p>
                  <textarea
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                    rows={3}
                    placeholder="e.g., Employee on unpaid leave"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setDeactivatingBenefit(null)
                        setDeactivationReason('')
                      }}
                      className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeactivateBenefit}
                      disabled={!deactivationReason.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Adjustment Modal */}
            {editingAdjustment && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-primary mb-4">Edit Adjustment: {editingAdjustment.description}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Type</label>
                      <select
                        value={editAdjustmentForm.type}
                        onChange={(e) => setEditAdjustmentForm({ ...editAdjustmentForm, type: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="bonus">Bonus</option>
                        <option value="penalty">Penalty</option>
                        <option value="correction">Correction</option>
                        <option value="overtime">Overtime</option>
                        <option value="allowance">Allowance</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Description</label>
                      <input
                        type="text"
                        value={editAdjustmentForm.description}
                        onChange={(e) => setEditAdjustmentForm({ ...editAdjustmentForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Reason for adjustment"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editAdjustmentForm.amount}
                        onChange={(e) => setEditAdjustmentForm({ ...editAdjustmentForm, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editAdjustmentForm.isAddition}
                          onChange={(e) => setEditAdjustmentForm({ ...editAdjustmentForm, isAddition: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm text-secondary">Addition (uncheck for deduction)</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setEditingAdjustment(null)
                        setEditAdjustmentForm({ type: 'bonus', amount: 0, isAddition: true, description: '' })
                      }}
                      className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await handleEditAdjustment(editingAdjustment.id, editAdjustmentForm)
                        setEditingAdjustment(null)
                        setEditAdjustmentForm({ type: 'bonus', amount: 0, isAddition: true, description: '' })
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Net Pay */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-primary">Net Pay:</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(entry.netPay)}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Additional notes"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-secondary">Entry not found</p>
          </div>
        )}
      </div>
    </div>
  )
}
