"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import type { OnSuccessArg } from '@/types/ui'
import { useConfirm } from '@/components/ui/confirm-modal'
import { usePrompt } from '@/components/ui/input-modal'
import { hasPermission } from '@/lib/permission-utils'
import { generatePayrollEntryPDF, generatePayrollEntryFileName, PayrollEntryData } from '@/lib/pdf-utils'
import { calculateTotalOvertimePay, deriveHourlyRateFromMonthlySalary } from '@/lib/payroll/overtime-utils'

interface PayrollEntryBenefit {
  id: string
  benefitTypeId?: string
  benefitName?: string
  amount?: number
  isActive?: boolean
  deactivatedReason?: string | null
  source?: string
  benefitType?: any
}

interface PayrollAdjustment {
  id: string
  type?: string
  amount?: number
  isAddition?: boolean
  description?: string
  createdAt?: string
}

interface PayrollEntry {
  id: string
  employeeNumber?: string
  employeeName?: string
  nationalId?: string
  dateOfBirth?: string | null
  hireDate?: string | null
  terminationDate?: string | null
  workDays?: number
  sickDays?: number
  leaveDays?: number
  baseSalary?: number
  commission?: number
  overtimePay?: number
  advanceDeductions?: number
  loanDeductions?: number
  miscDeductions?: number
  grossPay?: number
  totalDeductions?: number
  netPay?: number
  payrollEntryBenefits?: PayrollEntryBenefit[]
  mergedBenefits?: any[]
  contract?: { pdfGenerationData?: { benefits?: any[] } }
  payrollAdjustments?: PayrollAdjustment[]
  benefitsTotal?: number
  totalBenefitsAmount?: number
}

interface PayrollEntryDetailModalProps {
  isOpen: boolean
  onClose: () => void
  entryId: string
  onSuccess: (payload: OnSuccessArg) => void
  onError: (msg: string) => void
}

// Standardized payload for onSuccess callbacks used across modals.


export function PayrollEntryDetailModal({
  isOpen,
  onClose,
  entryId,
  onSuccess,
  onError
}: PayrollEntryDetailModalProps) {
  const [entry, setEntry] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddAdjustment, setShowAddAdjustment] = useState(false)
  const [benefits, setBenefits] = useState<any[]>([])
  const [showAddBenefit, setShowAddBenefit] = useState(false)
  const [benefitTypes, setBenefitTypes] = useState<any[]>([])
  const [deactivatingBenefit, setDeactivatingBenefit] = useState<any | null>(null)
  const [editingAdjustment, setEditingAdjustment] = useState<any | null>(null)
  const [editAdjustmentForm, setEditAdjustmentForm] = useState({
    type: 'bonus',
    amount: 0,
    isAddition: true,
    description: ''
  })

  const showPrompt = usePrompt()
  const { data: session } = useSession()
  const modalContentRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    workDays: 0,
    sickDays: 0,
    leaveDays: 0,
    absenceDays: 0,
    overtimeHours: 0,
    standardOvertimeHours: 0,
    doubleTimeOvertimeHours: 0,
    commission: 0,
    miscDeductions: 0,
    absenceFraction: '0',
    notes: ''
  })

  // Autosave refs/state: debounce timer and in-progress flag
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [autosaveInProgress, setAutosaveInProgress] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  const [benefitSearch, setBenefitSearch] = useState('')
  const [addingBenefit, setAddingBenefit] = useState(false)

  const [deactivationReason, setDeactivationReason] = useState('')
  const confirm = useConfirm()

  useEffect(() => {
    if (isOpen && entryId) {
      loadEntry()
      loadBenefitTypes()
    }
  }, [isOpen, entryId])

  const loadEntry = async () => {
    let loadedData: any = null
    try {
      setLoading(true)
      const response = await fetch(`/api/payroll/entries/${entryId}`)
      if (response.ok) {
        const data = await response.json()

        // Build benefits list by starting from server-provided mergedBenefits (authoritative effective view)
        // then overlay persisted payrollEntryBenefits so overrides and deactivations are reflected.
        const benefitsMap = new Map<string, any>()

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
            const k = keyFor(mb) || `merged-${Math.random().toString(36).slice(2, 9)}`
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
            const payload: any = {
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
            const k = keyFor(cb) || `contract-${Math.random().toString(36).slice(2, 9)}`
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

        let benefitsList: any[] = Array.from(benefitsMap.values())

        // Ensure contract-inferred benefits are included as separate line items under Compensation Breakdown
        if (data.contract && data.contract.pdfGenerationData && Array.isArray(data.contract.pdfGenerationData.benefits)) {
          for (const cb of data.contract.pdfGenerationData.benefits) {
            try {
              const name = cb.name || (cb.benefitType && cb.benefitType.name) || ''
              const id = cb.benefitTypeId || name || `contract-${Math.random().toString(36).slice(2, 9)}`
              const key = String(id)
              // If not already present in benefitsList (by benefitTypeId or normalized name), add it
              const exists = benefitsList.some((b: any) => (b.benefitTypeId && cb.benefitTypeId && String(b.benefitTypeId) === String(cb.benefitTypeId)) || (String((b.benefitName || b.name || '')).toLowerCase() === String(name || '').toLowerCase()))
              if (!exists) {
                benefitsList.push({
                  id: id,
                  benefitTypeId: cb.benefitTypeId || '',
                  benefitName: name,
                  amount: Number(cb.amount || 0),
                  isActive: true,
                  source: 'contract-inferred',
                  benefitType: cb.benefitType || undefined
                })
              }
            } catch (e) {
              // ignore malformed contract benefit entries
            }
          }
        }

        const serverBenefitsTotalRaw = data.totalBenefitsAmount ?? data.benefitsTotal
        const serverBenefitsTotal = serverBenefitsTotalRaw !== undefined && serverBenefitsTotalRaw !== null ? Number(serverBenefitsTotalRaw) : undefined
        const computedBenefitsTotal = benefitsList.reduce((s, b) => s + (b.isActive ? Number(b.amount || 0) : 0), 0)
        // If server provided a total (including 0) prefer it. Otherwise fall back to computed total.
        const benefitsTotalToUse = Number.isFinite(serverBenefitsTotal as number) ? (serverBenefitsTotal as number) : computedBenefitsTotal

        // Normalize adjustments: server stores signed amounts; derive isAddition and absolute amount for UI.
        // Important: certain types (penalty, loan, advance, payments) should always be treated as deductions
        // regardless of stored sign (historical data may be inconsistent). Treat other types by sign.
        const deductionTypes = new Set(['penalty', 'loan', 'loan_payment', 'loan payment', 'advance', 'advance_payment', 'advance payment', 'loanpayment'])
        const payrollAdjustments = (data.payrollAdjustments || []).map((a: any) => {
          const rawType = String(a.adjustmentType || a.type || '').toLowerCase()
          const isDeductionType = deductionTypes.has(rawType)
          // Prefer the server-provided signed value (storedAmount) when present; fall back to amount
          const signedAmount = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
          return {
            ...a,
            // Expose the original signed DB value so other consumers can rely on the sign
            storedAmount: signedAmount,
            // Force deduction for known deduction types, otherwise use sign (>=0 => addition)
            isAddition: isDeductionType ? false : (signedAmount >= 0),
            // Keep amount as the UI-friendly absolute value
            amount: Math.abs(signedAmount),
            description: a.reason ?? a.description ?? '',
            type: a.adjustmentType ?? a.type
          }
        })

        // Deduplicate persisted payrollEntryBenefits to avoid showing duplicates in Manual Benefits
        const normalizeNameForKey = (s?: string | null) => {
          if (!s) return ''
          try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
        }

        let dedupedPayrollEntryBenefits: any[] = []
        if (Array.isArray(data.payrollEntryBenefits) && data.payrollEntryBenefits.length > 0) {
          const seen = new Map<string, any>()
          for (const b of data.payrollEntryBenefits) {
            const key = b && (b.benefitTypeId ? String(b.benefitTypeId) : normalizeNameForKey(b.benefitName || b.benefitType?.name || ''))
            if (!key) continue
            if (!seen.has(key)) {
              seen.set(key, b)
            } else {
              // prefer active ones or keep the first; if duplicate found and current is active while stored is not, replace
              const existing = seen.get(key)
              if ((b.isActive && !existing.isActive) || (!existing.isActive && b.isActive)) {
                seen.set(key, b)
              }
            }
          }
          dedupedPayrollEntryBenefits = Array.from(seen.values())
        }

        // Recompute negative adjustments (deductions) from the normalized payrollAdjustments list
        // Exclude explicit 'absence' adjustments from the computed deductions so they are not double-counted
        const adjAsDeductionsFromList = payrollAdjustments.filter((a: any) => !a.isAddition && String((a.adjustmentType || a.type || '').toLowerCase()) !== 'absence').reduce((s: number, a: any) => s + Math.abs(Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : a.amount || 0)), 0)
        const advances = Number(data.advanceDeductions || 0)
        const loans = Number(data.loanDeductions || 0)
        const misc = Number(data.miscDeductions || 0)
        const derivedTotalDeductions = advances + loans + misc + adjAsDeductionsFromList

        // If server-supplied totalDeductions differs from our derived total, prefer the derived total
        const serverTotalDeductions = Number(data.totalDeductions || 0)
        const totalDeductionsToUse = serverTotalDeductions !== derivedTotalDeductions ? derivedTotalDeductions : serverTotalDeductions

        setEntry({
          ...data,
          benefitsTotal: benefitsTotalToUse,
          payrollAdjustments,
          payrollEntryBenefits: dedupedPayrollEntryBenefits.length > 0 ? dedupedPayrollEntryBenefits : data.payrollEntryBenefits,
          totalDeductions: totalDeductionsToUse
        })
        loadedData = {
          ...data,
          benefitsTotal: benefitsTotalToUse,
          payrollAdjustments,
          payrollEntryBenefits: dedupedPayrollEntryBenefits.length > 0 ? dedupedPayrollEntryBenefits : data.payrollEntryBenefits,
          totalDeductions: totalDeductionsToUse
        }
        // Recover implied overtime hours when overtimePay exists but overtimeHours was not persisted
        let impliedOvertimeHours: number | null = null
        try {
          const persistedHours = data.overtimeHours !== undefined && data.overtimeHours !== null ? Number(data.overtimeHours) : null
          if ((persistedHours === null || persistedHours === 0) && data.overtimePay && Number(data.overtimePay) > 0) {
            // Derive an hourly rate using the same fallbacks as computeHourlyRateForEntry
            let hourlyRate = Number(data.hourlyRate ?? 0)
            if ((!hourlyRate || hourlyRate === 0) && data.employee && (data.employee as any).hourlyRate) {
              hourlyRate = Number((data.employee as any).hourlyRate || 0)
            }
            if ((!hourlyRate || hourlyRate === 0) && data.contract) {
              try {
                const compType = (data.contract as any).pdfGenerationData?.compensationType || ''
                const contractBasic = Number((data.contract as any).pdfGenerationData?.basicSalary || 0)
                if (typeof compType === 'string' && compType.toLowerCase().includes('hour') && contractBasic > 0 && contractBasic <= 200) {
                  hourlyRate = contractBasic
                }
              } catch (e) {
                // ignore
              }
            }
            if ((!hourlyRate || hourlyRate === 0) && data.baseSalary) {
              try {
                const annualSalary = Number(data.baseSalary) * 12
                const hoursPerYear = 6 * 9 * 52 // 2808
                hourlyRate = annualSalary / Math.max(1, hoursPerYear)
              } catch (e) {
                // ignore
              }
            }

            if (hourlyRate && hourlyRate > 0) {
              impliedOvertimeHours = Math.round((Number(data.overtimePay) / (hourlyRate * 1.5)) * 100) / 100
            }
          }
          const finalOvertimeHours = impliedOvertimeHours !== null ? impliedOvertimeHours : (data.overtimeHours ?? 0)

          setFormData({
            workDays: data.workDays || 0,
            sickDays: data.sickDays,
            leaveDays: data.leaveDays,
            absenceDays: data.absenceDays,
            absenceFraction: String(data.absenceFraction ?? '0'),
            overtimeHours: finalOvertimeHours,
            standardOvertimeHours: Number(data.standardOvertimeHours || 0),
            doubleTimeOvertimeHours: Number(data.doubleTimeOvertimeHours || 0),
            commission: data.commission,
            miscDeductions: Number(data.miscDeductions || 0),
            notes: data.notes || ''
          })
          // If we derived implied overtime hours (i.e. server had overtimePay but no hours),
          // persist the inferred hours so the authoritative entry stores them too.
          if (impliedOvertimeHours !== null) {
            // small delay to avoid interfering with other load logic
            setTimeout(() => {
              try { persistFormData().catch(() => {/* swallow */ }) } catch (e) { /* ignore */ }
            }, 250)
          }
        } catch (e) {
          // Fallback to original behaviour on any unexpected error
          setFormData({
            workDays: data.workDays || 0,
            sickDays: data.sickDays,
            leaveDays: data.leaveDays,
            absenceDays: data.absenceDays,
            absenceFraction: String(data.absenceFraction ?? '0'),
            overtimeHours: data.overtimeHours,
            standardOvertimeHours: Number(data.standardOvertimeHours || 0),
            doubleTimeOvertimeHours: Number(data.doubleTimeOvertimeHours || 0),
            commission: data.commission,
            miscDeductions: Number(data.miscDeductions || 0),
            notes: data.notes || ''
          })
        }
        setBenefits(benefitsList)
        // return loaded data to callers so they can opt-in to receive updatedEntry without forcing a full refresh
        return loadedData
      }
    } catch (error) {
      console.error('Failed to load entry:', error)
    } finally {
      setLoading(false)
    }
    return loadedData
  }

  // Compute overtime for modal (available to render and totals)
  const computeOvertimeForModal = (en: any) => {
    try {
      // Get standard and double-time hours from form data or entry
      const standardHours = Number(formData.standardOvertimeHours ?? en.standardOvertimeHours ?? 0)
      const doubleTimeHours = Number(formData.doubleTimeOvertimeHours ?? en.doubleTimeOvertimeHours ?? 0)

      const persistedOvertimePay = Number(en.overtimePay ?? 0)

      // If no form data but persisted pay exists, return persisted
      if ((formData.standardOvertimeHours === undefined || formData.standardOvertimeHours === null) &&
          (formData.doubleTimeOvertimeHours === undefined || formData.doubleTimeOvertimeHours === null) &&
          persistedOvertimePay && persistedOvertimePay > 0) {
        return persistedOvertimePay
      }

      // If no overtime hours, return 0
      if (!standardHours && !doubleTimeHours) return 0

      // Derive hourly rate using existing fallback logic
      let hourlyRate = Number(en.hourlyRate ?? 0)
      if ((!hourlyRate || hourlyRate === 0) && en.employee && (en.employee as any).hourlyRate) {
        hourlyRate = Number((en.employee as any).hourlyRate || 0)
      }

      if ((!hourlyRate || hourlyRate === 0) && en.contract) {
        try {
          const compType = (en.contract as any).pdfGenerationData?.compensationType || ''
          const contractBasic = Number((en.contract as any).pdfGenerationData?.basicSalary || 0)
          if (typeof compType === 'string' && compType.toLowerCase().includes('hour') && contractBasic > 0 && contractBasic <= 200) {
            hourlyRate = contractBasic
          }
        } catch (e) {
          // ignore
        }
      }

      const baseSalary = Number(en.baseSalary || 0)
      if ((!hourlyRate || hourlyRate === 0) && baseSalary) {
        hourlyRate = deriveHourlyRateFromMonthlySalary(baseSalary)
      }

      if (!hourlyRate || hourlyRate === 0) return 0

      // Calculate total overtime pay using utility function
      return calculateTotalOvertimePay(standardHours, doubleTimeHours, hourlyRate)
    } catch (e) {
      return 0
    }
  }

  // Compute an hourly rate for the given entry using the same fallbacks as overtime
  const computeHourlyRateForEntry = (en: any) => {
    try {
      let hourlyRate = Number(en.hourlyRate ?? 0)
      if ((!hourlyRate || hourlyRate === 0) && en.employee && (en.employee as any).hourlyRate) {
        hourlyRate = Number((en.employee as any).hourlyRate || 0)
      }

      if ((!hourlyRate || hourlyRate === 0) && en.contract) {
        try {
          const compType = (en.contract as any).pdfGenerationData?.compensationType || ''
          const contractBasic = Number((en.contract as any).pdfGenerationData?.basicSalary || 0)
          if (typeof compType === 'string' && compType.toLowerCase().includes('hour') && contractBasic > 0 && contractBasic <= 200) {
            hourlyRate = contractBasic
          }
        } catch (e) {
          // ignore
        }
      }

      const baseSalary = Number(en.baseSalary || 0)
      if ((!hourlyRate || hourlyRate === 0) && baseSalary) {
        const annualSalary = Number(baseSalary) * 12
        const hoursPerYear = 6 * 9 * 52 // 2808
        hourlyRate = annualSalary / Math.max(1, hoursPerYear)
      }

      return Number(hourlyRate || 0)
    } catch (e) {
      return 0
    }
  }

  // Compute totals locally for display to ensure adjustments (positive vs negative) are applied correctly
  const computeEntryTotalsLocal = (entry: any, payrollAdjustments: any[], benefitsList: any[]) => {
    const benefitsTotal = Number(entry.benefitsTotal ?? entry.totalBenefitsAmount ?? 0) ||
      (Array.isArray(benefitsList) ? benefitsList.filter(b => b.isActive !== false).reduce((s, b) => s + Number(b.amount || 0), 0) : 0)

    const baseSalary = Number(entry.baseSalary || 0)
    // Prefer the live form value for commission so changes are reflected immediately
    const commission = typeof formData.commission === 'number' ? Number(formData.commission) : Number(entry.commission || 0)
    // Use the top-level computeOvertimeForModal so UI reflects live formData changes.
    // ...existing code relies on the outer computeOvertimeForModal which reads `formData`.

    const overtime = computeOvertimeForModal(entry)

    // additions: positive adjustments (either from server additionsTotal or derived from payrollAdjustments)
    const additionsFromServer = Number((entry as any).adjustmentsTotal || 0)
    const additionsFromList = payrollAdjustments.filter(a => a.isAddition).reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
    const additions = additionsFromServer && additionsFromServer !== 0 ? additionsFromServer : additionsFromList

    // negative adjustments treated as deductions applied after taxes
    const adjAsDeductionsFromServer = Number((entry as any).adjustmentsAsDeductions || 0)
    // Exclude explicit 'absence' adjustments from adjustmentsAsDeductions so they are not double-counted
    const adjAsDeductionsFromList = payrollAdjustments.filter(a => !a.isAddition && String((a.adjustmentType || a.type || '').toLowerCase()) !== 'absence').reduce((s: number, a: any) => s + Math.abs(Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : a.amount || 0)), 0)
    const adjAsDeductions = adjAsDeductionsFromServer && adjAsDeductionsFromServer !== 0 ? adjAsDeductionsFromServer : adjAsDeductionsFromList

    // Compute absence deduction: combine whole days + fraction and convert to hours
    const fraction = parseFloat(String(formData.absenceFraction || '0')) || 0
    const totalAbsentDays = (Number(formData.absenceDays ?? entry.absenceDays ?? 0) || 0) + fraction
    const hoursPerDay = 9
    const hourlyRate = computeHourlyRateForEntry(entry)
    const absenceHours = totalAbsentDays * hoursPerDay
    const absenceDeduction = Math.round(absenceHours * hourlyRate * 100) / 100

    const gross = baseSalary + commission + overtime + benefitsTotal + additions - absenceDeduction

    // Prefer live misc value from the form while editing so UI shows immediate effect
    const miscVal = typeof formData.miscDeductions === 'number' ? Number(formData.miscDeductions) : Number(entry.miscDeductions || 0)

    // Build a derived total from visible deduction components (excluding absence)
    // Always prefer the derived total for UI display so Total Deductions equals the sum
    // of the visible Other Deductions (advances, loans, misc, and non-absence adjustments).
    const totalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + miscVal + adjAsDeductions

    const net = gross - totalDeductions
    return { benefitsTotal, gross, totalDeductions, net, absenceDeduction, overtimePay: overtime }
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
            const k = keyFor(inf) || `inf-${Math.random().toString(36).slice(2, 9)}`
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

  // Helper function to strip leading zeros from number inputs and return as string
  // This removes leading zeros as the user types (e.g., "03" becomes "3")
  const stripLeadingZeros = (value: string): string => {
    // Handle empty string
    if (!value || value === '') {
      return ''
    }
    // Remove leading zeros but keep single "0"
    const cleaned = value.replace(/^0+/, '') || '0'
    return cleaned
  }

  // Helper to handle number input changes with leading zero stripping
  const handleNumberInput = (value: string, fieldName: keyof typeof formData) => {
    // If the value is empty, set to 0
    if (value === '' || value === null || value === undefined) {
      setFormData({ ...formData, [fieldName]: 0 })
      return
    }
    // Strip leading zeros immediately as user types
    const cleaned = value.replace(/^0+/, '') || '0'
    // Update formData with the parsed number (this removes the leading zero from display)
    const numValue = parseInt(cleaned, 10) || 0
    setFormData({ ...formData, [fieldName]: numValue })
  }

  const loadBenefitTypes = async () => {
    try {
      // Cache-bust to ensure we get latest results after on-the-fly creates
      const response = await fetch(`/api/benefit-types?_=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        // Load the full set of benefit types so the user can search across all types.
        // Filtering for which types are appropriate to add is handled in the UI below
        setBenefitTypes(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load benefit types:', error)
    }
  }

  // Helper: safely parse JSON responses (fall back to text when JSON parse fails)
  const parseJsonSafe = async (resp: Response) => {
    try {
      const txt = await resp.text()
      if (!txt) return null
      try {
        return JSON.parse(txt)
      } catch (e) {
        return { text: txt }
      }
    } catch (e) {
      return null
    }
  }

  // Persist only changed fields from formData to the server (debounced caller)
  const persistFormData = async () => {
    try {
      if (!entry) return
      // Build payload only with fields that differ from the loaded entry
      const payload: any = {}
      const mapKeys: Array<[string, string]> = [
        ['workDays', 'workDays'],
        ['sickDays', 'sickDays'],
        ['leaveDays', 'leaveDays'],
        ['absenceDays', 'absenceDays'],
        // Persist fractional absence so server and list stay in sync
        ['absenceFraction', 'absenceFraction'],
        ['overtimeHours', 'overtimeHours'],
        ['standardOvertimeHours', 'standardOvertimeHours'],
        ['doubleTimeOvertimeHours', 'doubleTimeOvertimeHours'],
        ['commission', 'commission'],
        ['miscDeductions', 'miscDeductions'],
        ['notes', 'notes']
      ]

      // Treat known numeric form fields as numbers and compare numerically to avoid
      // false-positives when server returns strings/Decimals.
      const numericKeys = new Set(['workDays', 'sickDays', 'leaveDays', 'absenceDays', 'absenceFraction', 'overtimeHours', 'standardOvertimeHours', 'doubleTimeOvertimeHours', 'commission', 'miscDeductions'])
      for (const [k, serverKey] of mapKeys) {
        const newVal = (formData as any)[k]
        const oldVal = (entry as any)[serverKey]
        let changed = false
        if (numericKeys.has(k)) {
          const nNew = Number(newVal ?? 0)
          const nOld = Number(oldVal ?? 0)
          changed = Number.isFinite(nNew) ? nNew !== nOld : String(newVal ?? '') !== String(oldVal ?? '')
          if (changed) payload[serverKey] = nNew
        } else {
          changed = String(newVal ?? '') !== String(oldVal ?? '')
          if (changed) payload[serverKey] = newVal
        }
      }

      if (Object.keys(payload).length === 0) return

      setAutosaveInProgress(true)
      const response = await fetch(`/api/payroll/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const data = await response.json()
        // Merge returned entry data into local entry state so future diffs compare correctly
        try { setEntry((prev: any) => ({ ...(prev || {}), ...(data || {}) })) } catch (e) { /* ignore */ }
        // Indicate a successful autosave locally (brief badge in UI)
        try {
          setSavedAt(Date.now())
          if (savedTimerRef.current) {
            clearTimeout(savedTimerRef.current)
            savedTimerRef.current = null
          }
          savedTimerRef.current = setTimeout(() => {
            try { setSavedAt(null) } catch (e) { /* ignore */ }
            if (savedTimerRef.current) {
              clearTimeout(savedTimerRef.current)
              savedTimerRef.current = null
            }
          }, 2000)
        } catch (e) { /* ignore */ }

        // Determine previous absence value (from the currently loaded entry) so we can decide whether
        // to request a parent refresh after upserting/deleting the absence adjustment.
        let previousAbsence = 0
        try {
          const prevList = entry?.payrollAdjustments || []
          const prevAdj = (prevList || []).find((a: any) => String((a.adjustmentType || a.type || '').toLowerCase()) === 'absence')
          if (prevAdj && (prevAdj.storedAmount !== undefined && prevAdj.storedAmount !== null)) previousAbsence = Math.abs(Number(prevAdj.storedAmount || 0))
          if (!previousAbsence) previousAbsence = Number(entry?.absenceDeduction ?? entry?.absenceAmount ?? 0)
        } catch (e) {
          previousAbsence = 0
        }

        // Upsert an 'absence' payrollAdjustment so the absence deduction is persisted and auditable
        let entryToReturn = data
        try {
          const totalsAfter = computeEntryTotalsLocal(data, data.payrollAdjustments || [], benefits)
          const absenceAmt = Number(totalsAfter.absenceDeduction || 0)
          // Look for existing absence adjustment in either returned data or current entry
          const existingAdj = (data.payrollAdjustments || entry?.payrollAdjustments || []).find((a: any) => String((a.adjustmentType || a.type || '').toLowerCase()) === 'absence')
          let adjustmentChanged = false
          if (absenceAmt > 0) {
            const payload = {
              payrollEntryId: entryId,
              type: 'absence',
              adjustmentType: 'absence',
              amount: -Math.abs(absenceAmt),
              description: 'Absence deduction',
              isAddition: false
            }
            if (existingAdj && existingAdj.id) {
              // update
              const res = await fetch('/api/payroll/adjustments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: existingAdj.id, ...payload }) })
              if (res.ok) adjustmentChanged = true
            } else {
              const res = await fetch('/api/payroll/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
              if (res.ok) adjustmentChanged = true
            }
          } else if (existingAdj && existingAdj.id) {
            // remove existing absence adjustment when deduction is zero
            const res = await fetch(`/api/payroll/adjustments?adjustmentId=${existingAdj.id}`, { method: 'DELETE' })
            if (res.ok) adjustmentChanged = true
          }

          // If the absence adjustment changed compared to previous, notify parent to refresh the period list
          // so the computed absence shows up immediately on the payroll list.
          // If an adjustment changed, re-fetch the entry so we return the authoritative updated entry
          // (including any newly created/updated/deleted adjustments) to the parent.
          if (adjustmentChanged) {
            try {
              const r2 = await fetch(`/api/payroll/entries/${entryId}`)
              if (r2.ok) {
                const refd = await r2.json()
                entryToReturn = refd
                try { setEntry((prev: any) => ({ ...(prev || {}), ...(refd || {}) })) } catch (e) { /* ignore */ }
              }
            } catch (e) {
              // ignore fetch failure and fall back to original data
            }
          }
        } catch (e) {
          // Don't block the main save on adjustment upsert errors; log for debugging but remain silent
          try { console.error('Failed to upsert absence adjustment', e) } catch (er) { /* ignore */ }
        }

        // CRITICAL: Silently notify parent to update the entry in the list (without showing notification or reloading).
        // This ensures ALL autosaved fields (sickDays, leaveDays, workDays, overtime, etc.) are immediately reflected in the payroll list.
        // This must be OUTSIDE the absence adjustment try-catch block so it runs for all autosaves.
        try {
          onSuccess({ message: '', refresh: false, updatedEntry: entryToReturn })
        } catch (e) {
          // Ignore onSuccess errors - parent might not be listening or modal might be closing
        }
      } else {
        // reload entry to avoid showing stale/optimistic state
        await loadEntry()
      }
    } catch (e) {
      await loadEntry()
    } finally {
      setAutosaveInProgress(false)
    }
  }

  // Clear saved timer on unmount
  useEffect(() => {
    return () => {
      try {
        if (savedTimerRef.current) {
          clearTimeout(savedTimerRef.current)
          savedTimerRef.current = null
        }
      } catch (e) { /* ignore */ }
    }
  }, [])

  // Immediately flush any pending autosave timer and persist now.
  const flushAutosave = async () => {
    try {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
      await persistFormData()
    } catch (e) {
      // ignore flush errors
    }
  }

  // Handle close button - flush autosave and pass current entry data to parent
  const handleClose = async () => {
    try {
      // Flush any pending autosave before closing
      await flushAutosave()

      // Reload the entry to get the latest data from the server
      const response = await fetch(`/api/payroll/entries/${entryId}`)
      if (response.ok) {
        const latestEntry = await response.json()
        // Pass the latest entry data to parent so it can update the list
        onSuccess({ message: '', refresh: false, updatedEntry: latestEntry })
      } else {
        // If fetch fails, pass current entry data
        onSuccess({ message: '', refresh: false, updatedEntry: entry })
      }
    } catch (e) {
      // On error, still try to pass current entry data
      try {
        onSuccess({ message: '', refresh: false, updatedEntry: entry })
      } catch (err) {
        // ignore
      }
    } finally {
      onClose()
    }
  }

  // Debounced autosave: whenever formData changes while modal is open, persist changes after short delay
  useEffect(() => {
    if (!isOpen || !entry) return
    // Clear any pending timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    // Schedule new autosave
    autosaveTimerRef.current = setTimeout(() => {
      persistFormData().catch(() => {/* swallow */ })
      autosaveTimerRef.current = null
    }, 1500)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, isOpen, entryId])

  // ...existing code...

  // Recompute derived totals locally after benefits change (optimistic UI updates)
  const recomputeTotalsAfterBenefitsChange = (benefitsList: any[]) => {
    try {
      if (!entry) return
      // Compute the new benefits total based on the same rule loadEntry uses: include active benefits
      const newBenefitsTotal = (benefitsList || []).reduce((s, b) => s + ((b && b.isActive) ? Number(b.amount || 0) : 0), 0)
      const oldBenefitsTotal = Number(entry.benefitsTotal ?? 0)
      const delta = Number(newBenefitsTotal) - Number(oldBenefitsTotal)

      // Update entry totals optimistically: adjust grossPay and netPay by the delta
      const newEntry = { ...entry }
      newEntry.benefitsTotal = newBenefitsTotal
      if (typeof newEntry.grossPay === 'number') newEntry.grossPay = Number(newEntry.grossPay || 0) + delta
      if (typeof newEntry.netPay === 'number') newEntry.netPay = Number(newEntry.netPay || 0) + delta
      setEntry(newEntry)
    } catch (e) {
      // ignore errors in optimistic recalculation
    }
  }

  // ...existing code...

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

  // Exact-match check: if user types a name that exactly matches an existing benefit type
  // then we should disable the Create & Add button to avoid creating duplicates. The
  // suggestion dropdown still shows available types (excluding already-added ones), but
  // the search will help users find the existing type instead of creating a new one.
  const normalize = (s?: string | null) => {
    if (!s) return ''
    try { return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() } catch (e) { return String(s).trim().replace(/\s+/g, ' ').toLowerCase() }
  }

  // Check if the typed search matches any benefit in the FULL benefitTypes list
  // (this matches what's actually shown in the dropdown, including "already added" items)
  // The key insight: if there are ANY matches showing in the dropdown (even if disabled),
  // the user should NOT be able to "Create & Add" because the benefit type already exists.
  const hasMatchesInDropdown = benefitSearch.trim().length > 0 &&
    (Array.isArray(benefitTypes) ? benefitTypes : [])
      .some((bt: any) => normalize(bt.name || '').includes(normalize(benefitSearch)))

  // Also disable when the typed name exactly matches an already-added benefit in the entry
  const exactTypedMatchInEntry = benefitSearch.trim().length > 0 &&
    Boolean((entry?.payrollEntryBenefits || []).some((b: any) =>
      normalize(b.benefitName || b.benefitType?.name || '') === normalize(benefitSearch)
    ))

  // CRITICAL: Disable "Create & Add" when a benefit type is selected from the dropdown
  // (benefitTypeId is set). This prevents the confusing state where both "Add Benefit"
  // and "Create & Add" are enabled after selecting from dropdown.
  const benefitTypeIsSelected = Boolean(benefitForm.benefitTypeId)

  // Legacy variables for compatibility (used in disable logic for "Create & Add" button)
  const exactTypedMatchIsAvailable = hasMatchesInDropdown || benefitTypeIsSelected
  const typedMatchesGlobalBenefit = hasMatchesInDropdown || benefitTypeIsSelected


  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/payroll/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json().catch(() => null)
        // Update parent with new entry but do not force a full page refresh; pass updatedEntry
        onSuccess({ message: 'Payroll entry updated successfully', refresh: false, updatedEntry: data })
        await loadEntry()
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

  const handlePrintPDF = async () => {
    try {
      if (!entry) {
        onError('Unable to generate PDF')
        return
      }

      // Extract data for PDF
      const employeeName = entry.employeeName || 'Unknown'
      const employeeNumber = entry.employeeNumber || 'Unknown'
      const nationalId = entry.nationalId || 'N/A'
      const year = (entry as any).payrollPeriod?.year || new Date().getFullYear()
      const month = (entry as any).payrollPeriod?.month || new Date().getMonth() + 1

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December']
      const periodMonth = monthNames[month - 1] || `Month ${month}`

      // Get totals
      const totals = computeEntryTotalsLocal(entry, entry.payrollAdjustments || [], benefits)

      // Get job title from employee or contract
      const jobTitle = (entry.employee as any)?.jobTitles?.title ||
                       (entry.contract as any)?.pdfGenerationData?.jobTitle ||
                       undefined

      // Get business name from payroll period
      const businessName = (entry as any).payrollPeriod?.business?.name || undefined

      // Get start date (contract start date / hire date)
      const startDate = entry.hireDate ? new Date(entry.hireDate).toLocaleDateString() : undefined

      // Prepare benefits data (include all benefits in PDF)
      const benefitsData: Array<{ name: string; amount: number }> = []
      if (entry.payrollEntryBenefits && entry.payrollEntryBenefits.length > 0) {
        entry.payrollEntryBenefits.forEach((benefit) => {
          benefitsData.push({
            name: benefit.benefitName + (benefit.source === 'contract-inferred' ? ' (from contract)' : ''),
            amount: Number(benefit.amount || 0)
          })
        })
      }

      // Add adjustments to benefits if positive
      const additionsFromServer = Number((entry as any).adjustmentsTotal || 0)
      const additionsFromList = (entry?.payrollAdjustments || [])
        .filter((a: any) => a.isAddition)
        .reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
      const additions = additionsFromServer && additionsFromServer !== 0 ? additionsFromServer : additionsFromList

      // Prepare advances data
      const advancesData: Array<{ description: string; amount: number }> = []
      if (entry.advanceBreakdown && entry.advanceBreakdown.length > 0) {
        entry.advanceBreakdown.forEach((adv: any) => {
          advancesData.push({
            description: adv.description || 'Advance',
            amount: Number(adv.amount || 0)
          })
        })
      }

      // Prepare loans data
      const loansData: Array<{ description: string; amount: number }> = []
      if (entry.loanBreakdown && entry.loanBreakdown.length > 0) {
        entry.loanBreakdown.forEach((loan: any) => {
          loansData.push({
            description: loan.description || 'Loan',
            amount: Number(loan.amount || 0)
          })
        })
      }

      // Prepare other deductions (negative adjustments excluding absence)
      const otherDeductionsData: Array<{ description: string; amount: number }> = []
      if (entry.payrollAdjustments && entry.payrollAdjustments.length > 0) {
        entry.payrollAdjustments
          .filter((a: any) => !a.isAddition && String((a.adjustmentType || a.type || '').toLowerCase()) !== 'absence')
          .forEach((adj: any) => {
            const type = (adj.adjustmentType || adj.type || 'other').replace(/_/g, ' ')
            const desc = adj.description || adj.reason
            const label = desc ? `${type} - ${desc}` : type
            otherDeductionsData.push({
              description: label.charAt(0).toUpperCase() + label.slice(1),
              amount: Number(adj.amount || 0)
            })
          })
      }

      const pdfData: PayrollEntryData = {
        employeeName,
        employeeNumber,
        nationalId,
        jobTitle,
        startDate,
        periodMonth,
        periodYear: year,
        businessName,

        // Earnings
        baseSalary: Number(entry.baseSalary || 0),
        commission: Number(entry.commission || 0),
        overtimePay: Number(totals.overtimePay || 0),
        standardOvertimeHours: Number(formData.standardOvertimeHours ?? entry.standardOvertimeHours ?? 0) || undefined,
        doubleTimeOvertimeHours: Number(formData.doubleTimeOvertimeHours ?? entry.doubleTimeOvertimeHours ?? 0) || undefined,
        benefits: benefitsData,
        adjustments: additions,
        absenceDeduction: totals.absenceDeduction || undefined,
        grossPay: totals.gross,

        // Deductions
        advances: advancesData,
        loans: loansData,
        otherDeductions: otherDeductionsData,
        miscDeductions: Number(formData.miscDeductions || entry.miscDeductions || 0),
        totalDeductions: totals.totalDeductions,

        // Work days
        workDays: formData.workDays ?? entry.workDays ?? 0,
        sickDays: formData.sickDays ?? entry.sickDays ?? 0,
        leaveDays: formData.leaveDays ?? entry.leaveDays ?? 0,
        absenceDays: formData.absenceDays ?? entry.absenceDays ?? 0,

        // Net
        netPay: totals.net
      }

      const fileName = generatePayrollEntryFileName(employeeName, employeeNumber, year, month)

      // Generate and download PDF
      await generatePayrollEntryPDF(pdfData, fileName)

      onSuccess({ message: 'PDF generated successfully', refresh: false, updatedEntry: null })
    } catch (error) {
      console.error('PDF generation error:', error)
      onError('Failed to generate PDF')
    }
  }

  const handleAddAdjustment = async () => {
    try {
      // Client-side validation
      const amountNum = Number(adjustmentForm.amount || 0)
      const selType = String(adjustmentForm.type || '').toLowerCase()
      const existingAdjustmentTypes = new Set(((entry?.payrollAdjustments || []) as any[]).map(a => String(a.adjustmentType || a.type || '').toLowerCase()))
      if (!adjustmentForm.type) {
        onError('Please select an adjustment type')
        return
      }
      if (isNaN(amountNum) || amountNum <= 0) {
        onError('Please enter an amount greater than zero')
        return
      }
      if (selType !== 'other' && existingAdjustmentTypes.has(selType)) {
        onError('An adjustment of this type already exists. Edit the existing adjustment instead.')
        return
      }

      // instrumentation removed

      // Ensure server receives a signed amount: negative for deductions
      const sendAmount = (adjustmentForm.isAddition === false) ? -Math.abs(amountNum) : Math.abs(amountNum)
      const payload: any = {
        payrollEntryId: entryId,
        // server expects `type`; include both for backward compatibility
        type: adjustmentForm.type,
        adjustmentType: adjustmentForm.type,
        amount: sendAmount,
        description: adjustmentForm.description,
        isAddition: adjustmentForm.isAddition
      }

      const response = await fetch('/api/payroll/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const parsed = await parseJsonSafe(response)

      if (response.ok) {
        const data = await response.json().catch(() => null)
        // Inform parent with updated entry data when available; do not force a full refresh
        onSuccess({ message: 'Adjustment added successfully', refresh: false, updatedEntry: data || null })
        setShowAddAdjustment(false)
        setAdjustmentForm({
          type: 'bonus',
          amount: 0,
          isAddition: true,
          description: ''
        })
        await loadEntry()
      } else {
        const error = parsed || (await response.json())
        onError(error?.error || error?.message || 'Failed to add adjustment')
      }
    } catch (error) {
      onError('Failed to add adjustment')
    }
  }

  const handleEditAdjustment = async (adjustmentId: string, patch: any) => {
    try {
      // Normalize patch: ensure amount sign matches isAddition flag and include adjustmentType
      const patchedAmount = (patch && patch.isAddition === false) ? -Math.abs(Number(patch.amount || 0)) : Math.abs(Number(patch.amount || 0))
      const sendPatch: any = { id: adjustmentId, ...patch, amount: patchedAmount }
      if (patch && patch.type) {
        sendPatch.type = patch.type
        sendPatch.adjustmentType = patch.type
      }

      const response = await fetch('/api/payroll/adjustments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendPatch)
      })

      if (response.ok) {
        const data = await response.json().catch(() => null)
        onSuccess({ message: 'Adjustment updated', refresh: false, updatedEntry: data || null })
        await loadEntry()
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
        const data = await response.json().catch(() => null)
        onSuccess({ message: 'Adjustment deleted', refresh: false, updatedEntry: data || null })
        await loadEntry()
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

      setAddingBenefit(true)

      const response = await fetch(`/api/payroll/entries/${entryId}/benefits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(benefitForm)
      })

      const parsed = await parseJsonSafe(response)
      if (response.ok) {
        const created = parsed || null
        // If server returned the created payrollEntryBenefit, merge it into local benefits list
        if (parsed) {
          try {
            // parsed is expected to be the created payrollEntryBenefit (with benefitType included)
            setBenefits((prev) => {
              try {
                // Build key similar to other logic
                const newKey = (parsed.benefitType && parsed.benefitType.id) || parsed.benefitTypeId || String(parsed.benefitName || parsed.benefitType?.name || `new-${Math.random().toString(36).slice(2, 9)}`)
                // Avoid duplicates
                const exists = prev.some((b: any) => (b.benefitTypeId && parsed.benefitTypeId && String(b.benefitTypeId) === String(parsed.benefitTypeId)) || (parsed.benefitType && b.benefitType && String(b.benefitType.id) === String(parsed.benefitType.id)) || (String(b.benefitName || '').toLowerCase() === String(parsed.benefitName || parsed.benefitType?.name || '').toLowerCase()))
                if (exists) return prev
                return [...prev, { ...parsed, source: parsed.source || 'manual' }]
              } catch (e) {
                return prev
              }
            })

            // Update entry.payrollEntryBenefits to show in Manual Benefits section immediately
            setEntry((prevEntry: any) => {
              if (!prevEntry) return prevEntry
              const updatedBenefits = [...(prevEntry.payrollEntryBenefits || []), parsed]
              return { ...prevEntry, payrollEntryBenefits: updatedBenefits }
            })
          } catch (e) {
            // ignore
          }
        }

        onSuccess({ message: 'Benefit added successfully', refresh: false, updatedEntry: created })
        // Collapse add form after success and reset selection
        setShowAddBenefit(false)
        setBenefitForm({ benefitTypeId: '', amount: 0 })
        setBenefitSearch('')
        await loadBenefits()
      } else {
        const msg = parsed?.error || parsed?.message || parsed?.text || `Failed to add benefit (${response.status})`
        onError(msg)
      }
    } catch (error) {
      onError('Failed to add benefit')
    } finally {
      setAddingBenefit(false)
    }
  }

  const handleToggleBenefit = async (benefit: any) => {
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
        const updated = await response.json().catch(() => null)
        onSuccess({ message: 'Benefit reactivated', refresh: false, updatedEntry: updated })
        await loadBenefits()
        await loadEntry()
      } else {
        const error = await response.json()
        onError(error.error || 'Failed to update benefit')
      }
    } catch (error) {
      // instrumentation removed
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
          const updated = await response.json().catch(() => null)
          onSuccess({ message: 'Contract benefit removed for this entry', refresh: false, updatedEntry: updated })
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
        const updated = await response.json().catch(() => null)
        onSuccess({ message: 'Benefit deactivated', refresh: false, updatedEntry: updated })
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
        const updated = await response.json().catch(() => null)
        onSuccess({ message: 'Benefit updated', refresh: false, updatedEntry: updated })
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

  const handleResetContractBenefit = async (benefit: Partial<any> & { benefitTypeId?: string, amount?: number }) => {
    // Persist a benefit override matching the contract-inferred benefit
    try {
      const response = await fetch(`/api/payroll/entries/${entryId}/benefits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benefitTypeId: benefit.benefitTypeId, amount: benefit.amount })
      })
      if (response.ok) {
        const updated = await response.json().catch(() => null)
        onSuccess({ message: 'Benefit override saved', refresh: false, updatedEntry: updated })
        await loadBenefits()
        await loadEntry()
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
        const updated = await response.json().catch(() => null)
        onSuccess({ message: 'Benefit deleted successfully', refresh: false, updatedEntry: updated })
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

  // Derive a benefit type label for display from benefit object or benefitTypes cache
  const getBenefitTypeLabel = (b: any) => {
    try {
      if (!b) return ''
      if (b.benefitType && b.benefitType.type) return b.benefitType.type
      if (b.type) return b.type
      if (b.benefitTypeId) {
        const found = benefitTypes.find((bt: any) => String(bt.id) === String(b.benefitTypeId))
        if (found && found.type) return found.type
      }
      // Try lookup by name (best-effort)
      if (b.benefitName) {
        const foundByName = benefitTypes.find((bt: any) => String(bt.name).toLowerCase() === String(b.benefitName).toLowerCase())
        if (foundByName && foundByName.type) return foundByName.type
      }
      return ''
    } catch (e) {
      return ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-primary">Payroll Entry Details</h2>
            {/* Autosave status indicator (subtle) */}
            <div className="text-sm text-secondary">
              {autosaveInProgress ? (
                <span className="text-xs inline-flex items-center gap-2">Saving...</span>
              ) : savedAt ? (
                <span className="text-xs text-green-600 inline-flex items-center gap-2">Saved</span>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={handleClose} className="text-secondary hover:text-primary transition-colors">
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
          <div ref={modalContentRef} className="space-y-6">
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
                    onChange={(e) => handleNumberInput(e.target.value, 'workDays')}
                    onBlur={() => flushAutosave()}
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
                    onChange={(e) => handleNumberInput(e.target.value, 'sickDays')}
                    onBlur={() => flushAutosave()}
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
                    onChange={(e) => handleNumberInput(e.target.value, 'leaveDays')}
                    onBlur={() => flushAutosave()}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="31"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-secondary mb-1">Absence Days</label>
                    <input
                      type="number"
                      value={formData.absenceDays}
                      onChange={(e) => handleNumberInput(e.target.value, 'absenceDays')}
                      onBlur={() => flushAutosave()}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="31"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-sm font-medium text-secondary mb-1">Fraction</label>
                    <select
                      value={formData.absenceFraction}
                      onChange={(e) => setFormData({ ...formData, absenceFraction: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="0">0</option>
                      <option value="0.25">1/4</option>
                      <option value="0.5">1/2</option>
                      <option value="0.75">3/4</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Standard Overtime Hours <span className="text-xs text-secondary">(1.5× rate)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.standardOvertimeHours}
                    onChange={(e) => setFormData({ ...formData, standardOvertimeHours: parseFloat(e.target.value) || 0 })}
                    onBlur={() => flushAutosave()}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Double-Time Overtime Hours <span className="text-xs text-secondary">(2.0× rate)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.doubleTimeOvertimeHours}
                    onChange={(e) => setFormData({ ...formData, doubleTimeOvertimeHours: parseFloat(e.target.value) || 0 })}
                    onBlur={() => flushAutosave()}
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
                    onBlur={() => flushAutosave()}
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
                {/* Show persisted overtimePay when present, otherwise show computed overtime line */}
                {(entry.overtimePay > 0) ? (
                  <div className="flex justify-between">
                    <span className="text-secondary">Overtime Pay:</span>
                    <span className="text-primary">
                      {formatCurrency(entry.overtimePay)}
                      {((formData.standardOvertimeHours > 0 || formData.doubleTimeOvertimeHours > 0)) && (
                        <span className="text-sm text-secondary ml-2">
                          ({formData.standardOvertimeHours > 0 && `${formData.standardOvertimeHours}h @1.5×`}
                          {formData.standardOvertimeHours > 0 && formData.doubleTimeOvertimeHours > 0 && ', '}
                          {formData.doubleTimeOvertimeHours > 0 && `${formData.doubleTimeOvertimeHours}h @2.0×`})
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  (() => {
                    const computed = computeOvertimeForModal(entry)
                    return computed > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-secondary">Overtime Pay (computed):</span>
                        <span className="text-primary">
                          {formatCurrency(computed)}
                          {((formData.standardOvertimeHours > 0 || formData.doubleTimeOvertimeHours > 0)) && (
                            <span className="text-sm text-secondary ml-2">
                              ({formData.standardOvertimeHours > 0 && `${formData.standardOvertimeHours}h @1.5×`}
                              {formData.standardOvertimeHours > 0 && formData.doubleTimeOvertimeHours > 0 && ', '}
                              {formData.doubleTimeOvertimeHours > 0 && `${formData.doubleTimeOvertimeHours}h @2.0×`})
                            </span>
                          )}
                        </span>
                      </div>
                    ) : null
                  })()
                )}
                {benefits.length > 0 ? (
                  <div>
                    <div className="font-medium text-secondary mb-1">Benefits:</div>
                    {/* Exclude contract-based or merged contract rows from the combined benefits display
                        Contract benefits are shown separately/handled in contract section and must not
                        duplicate here. Persisted/manual overrides remain visible. */}
                    {(() => {
                      // Exclude zero-amount benefits from the Compensation Breakdown display
                      // Ensure contract-inferred benefits are included individually as line items
                      const contractInferred = (entry?.contract?.pdfGenerationData?.benefits || []).filter((cb: any) => Number(cb.amount || 0) !== 0 && cb.name).map((cb: any) => ({ benefitName: cb.name, amount: Number(cb.amount || 0), source: 'contract-inferred', benefitTypeId: cb.benefitTypeId || null }))
                      // Merge persisted/manual benefits (from `benefits`) with contract-inferred, avoiding duplicates by benefitTypeId or name
                      const displayedMap = new Map<string, any>()
                      for (const b of (benefits || [])) {
                        try {
                          // Exclude explicitly deactivated persisted benefits from the Compensation Breakdown
                          if (!b || Number(b.amount || 0) === 0) continue
                          if (b.isActive === false) continue
                          const key = String(b.benefitTypeId || (b.benefitName || '').toLowerCase())
                          if (!displayedMap.has(key)) displayedMap.set(key, { benefitName: b.benefitName || b.name || key, amount: Number(b.amount || 0), source: b.source || 'manual', benefitTypeId: b.benefitTypeId || null })
                        } catch (e) { /* ignore */ }
                      }
                      for (const cb of contractInferred) {
                        try {
                          // If there's a persisted override for this contract benefit and it is explicitly deactivated,
                          // do not show the contract-inferred benefit (the persisted override intentionally hides it).
                          const override = (entry?.payrollEntryBenefits || []).find((pb: any) => (pb.benefitTypeId && cb.benefitTypeId && String(pb.benefitTypeId) === String(cb.benefitTypeId)) || (pb.benefitName && String(pb.benefitName).toLowerCase() === String(cb.benefitName).toLowerCase()))
                          if (override && override.isActive === false) continue
                          const key = String(cb.benefitTypeId || (cb.benefitName || '').toLowerCase())
                          if (!displayedMap.has(key)) displayedMap.set(key, cb)
                        } catch (e) { /* ignore */ }
                      }
                      const displayed = Array.from(displayedMap.values())
                      return (
                        <>
                          {displayed.map((benefit) => (
                            <div key={benefit.id || benefit.benefitTypeId} className="flex justify-between ml-4 text-xs">
                              <span className="text-secondary">{benefit.benefitName}{benefit.source === 'contract-inferred' && (<span className="ml-1 text-blue-600 dark:text-blue-400"> (from contract)</span>)}</span>
                              <span className="text-primary">{formatCurrency(benefit.amount)}</span>
                            </div>
                          ))}

                          {/* Show positive adjustments (single summed entry) */}
                          {(() => {
                            const additionsFromServer = Number((entry as any).adjustmentsTotal || 0)
                            const additionsFromList = (entry?.payrollAdjustments || []).filter((a: any) => a.isAddition).reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
                            const additions = additionsFromServer && additionsFromServer !== 0 ? additionsFromServer : additionsFromList
                            if (additions > 0) {
                              return (
                                <div className="flex justify-between ml-4 text-xs">
                                  <span className="text-secondary">Adjustments (Additions):</span>
                                  <span className="text-primary">+{formatCurrency(additions)}</span>
                                </div>
                              )
                            }
                            return null
                          })()}

                          <div className="flex justify-between font-medium">
                            <span className="text-secondary">Total Benefits:</span>
                            <span className="text-primary">
                              {formatCurrency(displayed.reduce((sum, b) => sum + Number(b.amount || 0), 0) + ((entry && Number((entry as any).adjustmentsTotal || 0)) ? Number((entry as any).adjustmentsTotal || 0) : (entry?.payrollAdjustments || []).filter((a: any) => a.isAddition).reduce((s: number, a: any) => s + Number(a.amount || 0), 0)))}
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
                {(() => {
                  const totals = computeEntryTotalsLocal(entry, entry.payrollAdjustments || [], benefits)
                  return (
                    <>
                      {totals.absenceDeduction && totals.absenceDeduction > 0 && (
                        <div className="flex justify-between ml-4 text-xs">
                          <span className="text-secondary">Absence (unearned):</span>
                          <span className="text-red-600">-{formatCurrency(totals.absenceDeduction)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span className="text-primary">Gross Pay:</span>
                        <span className="text-primary">{formatCurrency(totals.gross)}</span>
                      </div>
                    </>
                  )
                })()}
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
                <div className="flex justify-between items-center">
                  <div>
                    <label className="block text-sm font-medium text-secondary">Misc Deductions</label>
                    <div className="text-xs text-secondary">One-off/manual deductions (keeps an audit trail via adjustments).</div>
                  </div>
                  <div className="w-40">
                    <input
                      type="number"
                      step="0.01"
                      value={typeof formData.miscDeductions === 'number' ? formData.miscDeductions : Number(entry.miscDeductions || 0)}
                      onChange={(e) => setFormData({ ...formData, miscDeductions: parseFloat(e.target.value) || 0 })}
                      onBlur={() => flushAutosave()}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                </div>
                {/* Show payroll adjustments that are deductions as individual line items */}
                {entry.payrollAdjustments && entry.payrollAdjustments.filter((a: any) => !a.isAddition && String((a.adjustmentType || a.type || '').toLowerCase()) !== 'absence').length > 0 && (
                  <div>
                    <div className="font-medium text-secondary mb-1">Other Deductions:</div>
                    {entry.payrollAdjustments.filter((a: any) => !a.isAddition && String((a.adjustmentType || a.type || '').toLowerCase()) !== 'absence').map((adj: any) => (
                      <div key={adj.id} className="flex justify-between ml-4 text-xs items-center">
                        {/* Show type and description */}
                        <div className="text-secondary">
                          <span className="font-medium capitalize">{(adj.adjustmentType || adj.type || 'other').replace(/_/g, ' ')}</span>
                          {(adj.description || adj.reason) && <span className="ml-1">- {adj.description || adj.reason}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Always display a single properly-signed currency value. Use Math.abs to avoid double signs. */}
                          <span className="text-red-600">{formatCurrency(-Math.abs(Number(adj.amount || 0)))}</span>
                          <button type="button" onClick={async (e) => { e.stopPropagation(); setEditingAdjustment(adj); setEditAdjustmentForm({ type: adj.type, amount: adj.amount, isAddition: adj.isAddition, description: adj.description }); }} className="text-sm text-blue-600">Edit</button>
                          <button type="button" onClick={async (e) => { e.stopPropagation(); await handleDeleteAdjustment(adj.id); }} className="text-sm text-red-600">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(() => {
                  const totals = computeEntryTotalsLocal(entry, entry.payrollAdjustments || [], benefits)
                  return (
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span className="text-primary">Total Deductions:</span>
                      <span className="text-red-600">{formatCurrency(totals.totalDeductions)}</span>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Adjustments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-primary">Adjustments</h3>
                <button
                  type="button"
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
                      {/* Prevent adding duplicate adjustment types (except 'other') */}
                      {(() => {
                        const existingAdjustmentTypes = new Set(((entry?.payrollAdjustments || []) as any[]).map(a => String(a.adjustmentType || a.type || '').toLowerCase()))
                        const types = [
                          { key: 'bonus', label: 'Bonus' },
                          { key: 'penalty', label: 'Penalty' },
                          { key: 'correction', label: 'Correction' },
                          { key: 'overtime', label: 'Overtime' },
                          { key: 'allowance', label: 'Allowance' },
                          { key: 'other', label: 'Other' }
                        ]
                        return (
                          <>
                            <select
                              value={adjustmentForm.type}
                              onChange={(e) => {
                                const newType = e.target.value
                                setAdjustmentForm({ ...adjustmentForm, type: newType, isAddition: newType === 'penalty' ? false : adjustmentForm.isAddition })
                              }}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {types.map(t => {
                                const disabled = t.key !== 'other' && existingAdjustmentTypes.has(t.key)
                                return (
                                  <option key={t.key} value={t.key} disabled={disabled} className={disabled ? 'opacity-50' : ''}>
                                    {t.label}{disabled ? ' (already added)' : ''}
                                  </option>
                                )
                              })}
                            </select>
                            {/* Helpful hint when trying to add a duplicate */}
                            {adjustmentForm.type !== 'other' && existingAdjustmentTypes.has(String(adjustmentForm.type || '').toLowerCase()) && (
                              <div className="text-xs text-secondary mt-2">An adjustment of this type already exists for this employee. Edit the existing adjustment instead of adding a duplicate.</div>
                            )}
                          </>
                        )
                      })()}
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
                  {(() => {
                    const amountNum = Number(adjustmentForm.amount || 0)
                    const selType = String(adjustmentForm.type || '').toLowerCase()
                    const existingAdjustmentTypes = new Set(((entry?.payrollAdjustments || []) as any[]).map(a => String(a.adjustmentType || a.type || '').toLowerCase()))
                    const disabled = isNaN(amountNum) || amountNum <= 0 || (selType !== 'other' && existingAdjustmentTypes.has(selType))
                    const title = disabled ? (isNaN(amountNum) || amountNum <= 0 ? 'Enter an amount greater than zero' : 'An adjustment of this type already exists') : ''
                    return (
                      <button
                        type="button"
                        onClick={handleAddAdjustment}
                        disabled={disabled}
                        title={title}
                        className={`w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Add Adjustment
                      </button>
                    )
                  })()}
                </div>
              )}

              {entry.payrollAdjustments && entry.payrollAdjustments.filter((a: any) => a.isAddition).length > 0 ? (
                <div className="space-y-2">
                  {entry.payrollAdjustments.filter((a: any) => a.isAddition).map((adj: any) => (
                    <div key={adj.id} className="bg-muted p-3 rounded border border-border flex items-center justify-between">
                      <div>
                        {/* Prefer description, then reason, then type */}
                        <div className="font-medium text-sm text-primary">{adj.description || adj.reason || adj.type || 'Adjustment'}</div>
                        <div className="text-xs text-secondary">
                          <span className="font-medium capitalize">{(adj.adjustmentType || adj.type || 'other').replace(/_/g, ' ')}</span>
                          {' • '}
                          {new Date(adj.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-sm font-medium ${adj.isAddition ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {/* show signed currency consistently */}
                          {adj.isAddition ? formatCurrency(Math.abs(Number(adj.amount || 0))) : formatCurrency(-Math.abs(Number(adj.amount || 0)))}
                        </div>
                        <button type="button" onClick={() => {
                          setEditingAdjustment(adj)
                          setEditAdjustmentForm({
                            type: adj.type,
                            amount: adj.amount,
                            isAddition: adj.isAddition,
                            description: adj.description
                          })
                        }} className="text-sm text-blue-600">Edit</button>
                        <button type="button" onClick={() => handleDeleteAdjustment(adj.id)} className="text-sm text-red-600">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary text-center py-4">No additions</p>
              )}
            </div>

            {/* Benefits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-primary">Benefits</h3>
                <button
                  type="button"
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
                      {/* Searchable input with suggestions. If no suggestion matches, user can create-and-add on the fly. */}
                      <div className="relative">
                        <input
                          type="text"
                          value={benefitSearch || (benefitForm.benefitTypeId ? (benefitTypes.find(bt => bt.id === benefitForm.benefitTypeId)?.name || '') : '')}
                          onChange={(e) => {
                            setBenefitSearch(e.target.value)
                            // clear explicit selection when user types
                            if (benefitForm.benefitTypeId) setBenefitForm({ ...benefitForm, benefitTypeId: '' })
                          }}
                          onKeyDown={(e) => {
                            // Prevent Enter from submitting any surrounding forms / reloading page
                            if (e.key === 'Enter') {
                              e.preventDefault()
                            }
                          }}
                          placeholder="Search or type to add new benefit"
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        {/* Suggestion dropdown */}
                        {benefitSearch.trim().length > 0 && (
                          <div className="absolute z-10 left-0 right-0 bg-white dark:bg-gray-900 border border-border rounded mt-1 max-h-48 overflow-auto shadow">
                            {/* Show matches from the full global set so users can see existing types (disabled when already added for this entry) */}
                            {(Array.isArray(benefitTypes) ? benefitTypes : []).filter((bt: any) => (bt.name || '').toLowerCase().includes(benefitSearch.toLowerCase())).slice(0, 50).map((bt: any) => {
                              // Determine whether this type is already present for this payroll entry (either persisted manual or contract-inferred)
                              const id = bt && bt.id ? String(bt.id) : null
                              const used = Boolean(id && (
                                (entry?.payrollEntryBenefits || []).some((b: any) => b.benefitTypeId && String(b.benefitTypeId) === id) ||
                                (entry?.contract?.pdfGenerationData?.benefits || []).some((cb: any) => cb.benefitTypeId && String(cb.benefitTypeId) === id)
                              ))
                              const baseClass = used ? 'px-3 py-2 opacity-50 cursor-not-allowed' : 'px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
                              return (
                                <div
                                  key={bt.id}
                                  className={baseClass}
                                  onClick={() => {
                                    if (used) {
                                      // Don't select used types; make it clear why
                                      try { onError('This benefit type is already present for this payroll entry') } catch (e) { /* ignore */ }
                                      return
                                    }
                                    setBenefitForm({ ...benefitForm, benefitTypeId: bt.id, amount: bt.defaultAmount ?? benefitForm.amount })
                                    setBenefitSearch('')
                                  }}
                                >
                                  {bt.name} <span className="text-xs text-secondary">({bt.type})</span>
                                  {used && <span className="ml-2 text-xs text-secondary">(already added)</span>}
                                </div>
                              )
                            })}
                            {/* Show "No matches" only when the filtered results are empty */}
                            {(Array.isArray(benefitTypes) ? benefitTypes : []).filter((bt: any) => (bt.name || '').toLowerCase().includes(benefitSearch.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-secondary">
                                No matches found. {!exactTypedMatchInEntry ? 'Press "Create & Add" to add this benefit.' : 'This benefit is already added to this entry.'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={benefitForm.amount}
                        onChange={(e) => setBenefitForm({ ...benefitForm, amount: parseFloat(e.target.value) || 0 })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault()
                        }}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleAddBenefit}
                      disabled={addingBenefit || Number(benefitForm.amount || 0) <= 0 || !benefitForm.benefitTypeId}
                      className={`flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 ${addingBenefit || Number(benefitForm.amount || 0) <= 0 || !benefitForm.benefitTypeId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {addingBenefit ? 'Adding...' : 'Add Benefit'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const nameToCreate = benefitSearch.trim()
                        // If no name typed but a type is selected, fall back to regular Add
                        if (!nameToCreate) {
                          if (benefitForm.benefitTypeId) {
                            await handleAddBenefit()
                            return
                          }
                          onError('Type a name to create a new benefit')
                          return
                        }

                        // Prevent creating a payroll-entry benefit with zero amount on Create & Add
                        const amountToCreate = Number(benefitForm.amount || 0)
                        if (isNaN(amountToCreate) || amountToCreate <= 0) {
                          onError('Please enter an amount greater than zero before creating this benefit')
                          return
                        }

                        // Create-and-add via payroll entry benefits endpoint. This avoids requiring
                        // extra permissions to create global benefit types. The server will create
                        // a lightweight benefitType if needed and persist the payrollEntryBenefit.
                        try {
                          setAddingBenefit(true)
                          const payload = { benefitName: nameToCreate, amount: amountToCreate }
                          const resp = await fetch(`/api/payroll/entries/${entryId}/benefits`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                          })
                          const parsed = await parseJsonSafe(resp)
                          if (resp.ok) {
                            // If server included the created benefitType, ensure it exists in local cache
                            if (parsed && parsed.benefitType) {
                              setBenefitTypes((prev) => {
                                try {
                                  if (prev.some((bt: any) => String(bt.id) === String(parsed.benefitType.id))) return prev
                                  return [...prev, parsed.benefitType]
                                } catch (e) {
                                  return prev
                                }
                              })

                              // Pre-select the newly created benefit type so user can enter amount and Add
                              try {
                                setBenefitForm({ benefitTypeId: parsed.benefitType.id, amount: amountToCreate })
                              } catch (e) {
                                // ignore
                              }
                            }

                            // Update entry.payrollEntryBenefits to show in Manual Benefits section immediately
                            if (parsed) {
                              setEntry((prevEntry: any) => {
                                if (!prevEntry) return prevEntry
                                const updatedBenefits = [...(prevEntry.payrollEntryBenefits || []), parsed]
                                return { ...prevEntry, payrollEntryBenefits: updatedBenefits }
                              })
                            }

                            // Notify parent and instrument the moment — do not force full refresh; provide created item
                            onSuccess({ message: 'Benefit created and added', refresh: false, updatedEntry: parsed || null })
                            // Clear search, update local entry/benefits so Manual Benefits shows the new item,
                            // and close the add UI to avoid leaving a stale form open.
                            setBenefitSearch('')
                            // Ensure we reload both benefits and the full entry so manual section updates immediately
                            await loadBenefits()
                            await loadBenefitTypes()
                            setShowAddBenefit(false)
                            setBenefitForm({ benefitTypeId: '', amount: 0 })
                          } else {
                            const msg = parsed?.error || parsed?.message || parsed?.text || (resp.status === 409 ? 'Benefit already exists for this payroll entry' : `Failed to create benefit (${resp.status})`)
                            onError(msg)
                          }
                        } catch (err) {
                          onError('Failed to create benefit')
                        } finally {
                          setAddingBenefit(false)
                        }
                      }}
                      // Disable Create & Add when amount is invalid or when the typed name exactly matches
                      // an existing global benefit type (to avoid duplicate creation) or when it already exists
                      // as a persisted/manual benefit on this entry, or when currently adding a benefit.
                      disabled={addingBenefit || Number(benefitForm.amount || 0) <= 0 || exactTypedMatchIsAvailable || exactTypedMatchInEntry || typedMatchesGlobalBenefit}
                      className={`px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 ${addingBenefit || Number(benefitForm.amount || 0) <= 0 || exactTypedMatchIsAvailable || exactTypedMatchInEntry || typedMatchesGlobalBenefit ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {addingBenefit ? 'Creating...' : 'Create & Add'}
                    </button>
                  </div>
                </div>
              )}

              {/* Manual / persisted benefits section */}
              <div className="mb-4">
                <div className="font-medium text-secondary mb-2">Manual Benefits (added during payroll)</div>
                {entry?.payrollEntryBenefits && entry.payrollEntryBenefits.length > 0 ? (
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

                      // Include zero-amount persisted benefits here so users can edit or remove them.
                      return entry!.payrollEntryBenefits.filter((b: any) => !isContractOverride(b)).map((b: any) => (
                        <div key={b.id} className="p-3 rounded bg-muted border border-border flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-primary">
                              <span>{b.benefitName}</span>
                            </div>
                            {!b.isActive && b.deactivatedReason && <div className="text-xs text-red-600 mt-1">Deactivated: {b.deactivatedReason}</div>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-primary font-medium">{formatCurrency(Number(b.amount || 0))}</span>
                            <button type="button" onClick={async () => {
                              const newAmt = await showPrompt({ title: `Edit ${b.benefitName}`, description: 'Enter new amount', defaultValue: String(b.amount) })
                              if (newAmt === null) return
                              const amount = parseFloat(newAmt)
                              if (isNaN(amount)) return
                              // Update local state immediately (optimistic)
                              const updatedBenefits = (entry!.payrollEntryBenefits || []).map((benefit: any) =>
                                benefit.id === b.id ? { ...benefit, amount } : benefit
                              )
                              setEntry({ ...entry!, payrollEntryBenefits: updatedBenefits })
                              // Also update the `benefits` view used by other sections (Compensation Breakdown)
                              setBenefits(prev => prev.map((bb: any) => {
                                try {
                                  // Match by persisted id first, then benefitTypeId, then name fallback
                                  if (bb.id && b.id && String(bb.id) === String(b.id)) return { ...bb, amount }
                                  if (bb.benefitTypeId && b.benefitTypeId && String(bb.benefitTypeId) === String(b.benefitTypeId)) return { ...bb, amount }
                                  const nameA = String((bb.benefitName || bb.name || '')).toLowerCase()
                                  const nameB = String((b.benefitName || b.name || '')).toLowerCase()
                                  if (nameA && nameB && nameA === nameB) return { ...bb, amount }
                                } catch (e) {
                                  // ignore matching errors
                                }
                                return bb
                              }))
                              // Recompute totals optimistically so Net Gross / Gross Pay update immediately
                              try {
                                // Build the merged current benefits view used for calculations
                                const merged = (benefits || []).map((bb: any) => {
                                  try {
                                    if (bb.id && b.id && String(bb.id) === String(b.id)) return { ...bb, amount }
                                    if (bb.benefitTypeId && b.benefitTypeId && String(bb.benefitTypeId) === String(b.benefitTypeId)) return { ...bb, amount }
                                    const nameA = String((bb.benefitName || bb.name || '')).toLowerCase()
                                    const nameB = String((b.benefitName || b.name || '')).toLowerCase()
                                    if (nameA && nameB && nameA === nameB) return { ...bb, amount }
                                  } catch (e) {
                                    // ignore matching errors
                                  }
                                  return bb
                                })
                                recomputeTotalsAfterBenefitsChange(merged)
                              } catch (e) {
                                // ignore
                              }

                              // Make API call in background
                              try {
                                const response = await fetch(`/api/payroll/entries/${entryId}/benefits`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: b.id, amount })
                                })
                                if (response.ok) {
                                  const updated = await response.json().catch(() => null)
                                  onSuccess({ message: 'Benefit updated', refresh: false, updatedEntry: updated })
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
                            <button type="button" onClick={() => handleDeleteBenefit(b.id)} className="text-red-600 hover:text-red-700 text-sm">Remove</button>
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
                {entry?.contract?.pdfGenerationData?.benefits && entry.contract.pdfGenerationData.benefits.filter((cb: any) => Number(cb.amount || 0) !== 0 && cb.name).length > 0 ? (
                  <div className="space-y-2">
                    {entry!.contract.pdfGenerationData.benefits.filter((cb: any) => Number(cb.amount || 0) !== 0 && cb.name).map((cb: any) => {
                      // Find any persisted override matching this contract benefit by type or name
                      const override = entry!.payrollEntryBenefits?.find((pb: any) => (pb.benefitTypeId && cb.benefitTypeId && String(pb.benefitTypeId) === String(cb.benefitTypeId)) || (pb.benefitName && String(pb.benefitName).toLowerCase() === String(cb.name).toLowerCase()))
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
                              <button type="button" className="text-sm text-blue-600" onClick={async () => {
                                const newAmt = await showPrompt({ title: 'New amount', defaultValue: String(override.amount) })
                                if (newAmt === null) return
                                const reason = await showPrompt({ title: 'Reason for edit (optional)', defaultValue: '' })
                                await handleUpdateBenefit(override.id, { amount: parseFloat(newAmt), deactivatedReason: reason || override.deactivatedReason })
                              }}>Edit</button>
                              <button type="button" className="text-sm text-red-600" onClick={async () => {
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
                            <div className="font-medium text-sm text-primary">
                              <span>{cb.name} <span className="ml-2 text-xs text-blue-600">(From Contract)</span></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-primary font-medium">{formatCurrency(Number(cb.amount || 0))}</span>
                            <button type="button" onClick={() => handleResetContractBenefit({ benefitTypeId: cb.benefitTypeId, amount: cb.amount })} className="text-sm text-blue-600">Persist</button>
                            <button type="button" onClick={() => { setDeactivatingBenefit({ id: cb.benefitTypeId || `contract-${cb.name}`, benefitTypeId: cb.benefitTypeId || '', benefitName: cb.name, amount: Number(cb.amount || 0), isActive: false, source: 'contract-inferred' } as PayrollEntryBenefit); setDeactivationReason('') }} className="text-sm text-red-600">Remove</button>
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
                      type="button"
                      onClick={() => {
                        setDeactivatingBenefit(null)
                        setDeactivationReason('')
                      }}
                      className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
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
                      type="button"
                      onClick={() => {
                        setEditingAdjustment(null)
                        setEditAdjustmentForm({ type: 'bonus', amount: 0, isAddition: true, description: '' })
                      }}
                      className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
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

            {/* Net Gross */}
            {(() => {
              const totals = computeEntryTotalsLocal(entry, entry.payrollAdjustments || [], benefits)
              return (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-primary">Net Gross:</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totals.gross)}</span>
                  </div>
                </div>
              )
            })()}

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
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <div>
                {session?.user && hasPermission(session.user, 'canPrintPayrollEntryDetails') && (
                  <button
                    type="button"
                    onClick={handlePrintPDF}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print PDF
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
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
