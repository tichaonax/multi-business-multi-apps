'use client'

import { useState, useEffect, useMemo } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { PayrollEntryForm } from '@/components/payroll/payroll-entry-form'
import { PayrollEntryDetailModal } from '@/components/payroll/payroll-entry-detail-modal'
import { PayrollExportPreviewModal } from '@/components/payroll/payroll-export-preview-modal'
import { hasPermission, isSystemAdmin, getUserRoleInBusiness, canDeletePayroll } from '@/lib/permission-utils'

interface PayrollPeriod {
  id: string
  year: number
  month: number
  periodStart: string
  periodEnd: string
  status: string
  totalEmployees: number
  totalGrossPay: number
  totalDeductions: number
  totalNetPay: number
  business: {
    id: string
    name: string
  }
  payrollEntries: PayrollEntry[]
  benefitLoadError?: string
  hint?: string
}

interface PayrollEntryBenefit {
  id: string
  benefitTypeId: string
  benefitName: string
  amount: number
  isActive: boolean
}

interface PayrollEntry {
  id: string
  employeeNumber: string
  employeeName: string
  nationalId: string
  dateOfBirth: string | null
  hireDate: string
  terminationDate: string | null
  workDays: number
  sickDays: number
  leaveDays: number
  baseSalary: number
  commission: number
  overtimePay: number
  advanceDeductions: number
  loanDeductions: number
  miscDeductions: number
  grossPay: number
  totalDeductions: number
  netPay: number
  payrollEntryBenefits?: PayrollEntryBenefit[]
  // Contract tracking fields
  contractId?: string | null
  contractNumber?: string | null
  contractStartDate?: string | Date | null
  contractEndDate?: string | Date | null
  isProrated?: boolean
  // Optional data provided by server or merged in the UI
  mergedBenefits?: Array<any>
  contract?: {
    pdfGenerationData?: {
      benefits?: Array<any>
    }
  }
  employee?: {
    jobTitles?: {
      title?: string
    }
  }
  employeeId?: string
  benefitsTotal?: number
  // Optional explicit fields provided by the API
  employeeFirstName?: string | null
  employeeLastName?: string | null
  employeeDateOfBirth?: string | null
  employeeHireDate?: string | null
}

export default function PayrollPeriodDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const periodId = params.periodId as string

  const confirm = useConfirm()

  const [period, setPeriod] = useState<PayrollPeriod | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [includePastPeriods, setIncludePastPeriods] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [syncingBenefits, setSyncingBenefits] = useState(false)
  const [addingAllEmployees, setAddingAllEmployees] = useState(false)
  const [availableEmployeesCount, setAvailableEmployeesCount] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (periodId) {
      loadPeriod()
    }
  }, [periodId])

  useEffect(() => {
    if (period?.businesses?.id) {
      loadAvailableEmployeesCount()
    }
  }, [period?.businesses?.id])

  const loadPeriod = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payroll/periods/${periodId}`)
      if (response.ok) {
        const data = await response.json()
        // Normalize payrollAdjustments on each entry so UI reflects signed amounts correctly
        try {
          const deductionTypes = new Set(['penalty', 'loan', 'loan_payment', 'loan payment', 'advance', 'advance_payment', 'advance payment', 'loanpayment'])
          if (Array.isArray(data.payrollEntries)) {
            data.payrollEntries = data.payrollEntries.map((e: any) => {
              try {
                if (!Array.isArray(e.payrollAdjustments)) return e
                e.payrollAdjustments = e.payrollAdjustments.map((a: any) => {
                  const rawType = String(a.adjustmentType || a.type || '').toLowerCase()
                  const isDeductionType = deductionTypes.has(rawType)
                  // prefer storedAmount when server exposes it (signed DB value); fallback to amount
                  const signedAmount = Number(a.storedAmount ?? a.amount ?? 0)
                  return {
                    ...a,
                    isAddition: isDeductionType ? false : (signedAmount >= 0),
                    // keep UI-facing absolute amount
                    amount: Math.abs(signedAmount),
                    storedAmount: signedAmount,
                    type: a.adjustmentType ?? a.type,
                    description: a.reason ?? a.description ?? ''
                  }
                })
              } catch (e) { /* ignore */ }
              return e
            })
          }
        } catch (e) { /* ignore */ }
        // Loaded period data; UI will consume server-provided mergedBenefits and totals.
        setPeriod(data)
      }
    } catch (error) {
      console.error('Failed to load payroll period:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableEmployeesCount = async () => {
    if (!period?.businesses?.id) return
    try {
      const response = await fetch(`/api/employees?businessId=${period.businesses.id}`)
      if (response.ok) {
        const employees = await response.json()
        setAvailableEmployeesCount(Array.isArray(employees) ? employees.length : 0)
      }
    } catch (error) {
      console.error('Failed to load available employees count:', error)
    }
  }

  const handleAddAllEmployees = async () => {
    if (!period) return
    const ok = await confirm({
      title: 'Add all employees',
      description: 'This will add all active employees to this payroll period. Continue?',
      confirmText: 'Add all'
    })

    if (!ok) return

    try {
      setAddingAllEmployees(true)
      const response = await fetch('/api/payroll/entries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollPeriodId: period.id,
          businessId: period.businesses.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        showNotification('success', `Successfully added ${result.count} employees to payroll`)
        loadPeriod()
        loadAvailableEmployeesCount()
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Failed to add employees')
      }
    } catch (error) {
      showNotification('error', 'Failed to add employees')
    } finally {
      setAddingAllEmployees(false)
    }
  }

  const handleApprove = async () => {
    if (!period) return

    try {
      const response = await fetch(`/api/payroll/periods/${period.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      })

      if (response.ok) {
        showNotification('success', 'Payroll period approved')
        loadPeriod()
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Failed to approve period')
      }
    } catch (error) {
      showNotification('error', 'Failed to approve period')
    }
  }

  const handleClearAllEntries = async () => {
    if (!period) return
    const ok = await confirm({
      title: 'Clear all payroll entries',
      description:
        '⚠️ WARNING: This will delete ALL employees from this payroll period and reset it to draft status. This action cannot be undone. Are you sure?',
      confirmText: 'Delete all',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/payroll/periods/${period.id}/clear`, {
        method: 'POST'
      })

      if (response.ok) {
        showNotification('success', 'All payroll entries cleared successfully')
        loadPeriod()
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Failed to clear payroll entries')
      }
    } catch (error) {
      showNotification('error', 'Failed to clear payroll entries')
    }
  }

  const handleSubmitForReview = async () => {
    if (!period) return

    if (period.payrollEntries.length === 0) {
      showNotification('error', 'Cannot submit an empty payroll period for review')
      return
    }

    const ok = await confirm({
      title: 'Submit for review',
      description: 'Submit this payroll period for review? You can still make changes after submission.',
      confirmText: 'Submit'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/payroll/periods/${period.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'review' })
      })

      if (response.ok) {
        showNotification('success', 'Payroll period submitted for review')
        loadPeriod()
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Failed to submit for review')
      }
    } catch (error) {
      showNotification('error', 'Failed to submit for review')
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    const ok = await confirm({
      title: 'Remove employee',
      description: 'Are you sure you want to remove this employee from the payroll period?',
      confirmText: 'Remove'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/payroll/entries/${entryId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showNotification('success', 'Employee removed from payroll')
        loadPeriod()
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Failed to remove employee')
      }
    } catch (error) {
      showNotification('error', 'Failed to remove employee')
    }
  }

  const handleDeletePeriod = async () => {
    if (!period) return

    const ok = await confirm({
      title: 'Delete payroll period',
      description: `⚠️ This will permanently delete this ${period.status} payroll period and all its entries. This cannot be undone. Continue?`,
      confirmText: 'Delete Period'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/payroll/periods/${period.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showNotification('success', 'Payroll period deleted')
        router.push('/payroll')
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Failed to delete period')
      }
    } catch (error) {
      showNotification('error', 'Failed to delete period')
    }
  }

  const handleExport = async () => {
    if (!period) return
    const ok = await confirm({
      title: includePastPeriods ? 'Export Year-to-Date payroll' : 'Export payroll',
      description: includePastPeriods
        ? '⚠️ IMPORTANT: This will export all approved periods for this year up to and including this month. Once exported, this payroll period will be LOCKED and no further changes can be made. Continue with export?'
        : '⚠️ IMPORTANT: Once exported, this payroll period will be LOCKED and no further changes can be made. Continue with export?',
      confirmText: 'Export'
    })

    if (!ok) return

    try {
      setExporting(true)
      const response = await fetch('/api/payroll/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollPeriodId: period.id,
          businessId: period.businesses.id,
          generationType: includePastPeriods ? 'year_to_date' : 'single_month',
          includePastPeriods
        })
      })

      if (response.ok) {
        const data = await response.json()
        const successMessage = includePastPeriods
          ? 'Year-to-Date Excel file generated successfully. Payroll period is now locked.'
          : 'Excel file generated successfully. Payroll period is now locked.'
        showNotification('success', successMessage)

        // Download the file
        window.open(data.fileUrl, '_blank')

        loadPeriod()
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Failed to export payroll')
      }
    } catch (error) {
      showNotification('error', 'Failed to export payroll')
    } finally {
      setExporting(false)
    }
  }

  const showNotification = (type: 'success' | 'error', message: any) => {
    const msg = typeof message === 'string' ? message : (message && (message as any).message) || String(message || '')
    setNotification({ type, message: msg })
    setTimeout(() => setNotification(null), 5000)
  }

  // Get unique benefits from contract data (only show columns with at least one non-zero value)
  const getUniqueBenefits = () => {
    if (!period) return []
    const uniqueBenefitsMap = new Map<string, { id: string, name: string }>()


    period.payrollEntries.forEach(entry => {
      // Prefer server-merged benefits when present
      const merged = entry.mergedBenefits || []
      const contractBenefits = entry.contract?.pdfGenerationData?.benefits || []
      const entryBenefits = entry.payrollEntryBenefits || []

      // Use mergedBenefits to decide columns (they represent the effective, merged view)
      // Prefer server-provided merged benefits even when amount is zero so preview and
      // export remain consistent with server authority.
      merged.forEach((mb: any) => {
        if (!mb) return
        if (mb.isActive === false) return
        const name = mb.benefitType?.name || mb.benefitName || mb.key || mb.name || ''
        if (!name) return
        const benefitId = String(mb.benefitType?.id || mb.benefitTypeId || name)
        if (!uniqueBenefitsMap.has(benefitId)) uniqueBenefitsMap.set(benefitId, { id: benefitId, name })
      })

      // Regardless of mergedBenefits presence, include contract-inferred benefits and persisted payrollEntryBenefits
      // mergedBenefits represent an authoritative merged view but might not list all contract benefits (or may be empty for some entries).
      // We therefore union merged, contract and persisted manual benefits, preferring merged amounts and honoring persisted overrides.
      const unioned: Map<string, { id: string, name: string }> = new Map()

      // Start from merged (authoritative) when present
      if (Array.isArray(merged) && merged.length > 0) {
        merged.forEach((mb: any) => {
          if (!mb) return
          if (mb.isActive === false) return
          const name = mb.benefitType?.name || mb.benefitName || mb.key || mb.name || ''
          const amount = Number(mb.amount || 0)
          if (amount <= 0) return
          const benefitId = String(mb.benefitType?.id || mb.benefitTypeId || name)
          unioned.set(benefitId, { id: benefitId, name })
        })
      }

      // Ensure contract-inferred benefits are included (they may be missing from merged for some entries)
      contractBenefits.forEach((cb: any) => {
        const contractAmount = Number(cb.amount || 0)
        // Check for any override (active or inactive)
        const override = entry.payrollEntryBenefits?.find((pb: any) => (pb.benefitTypeId && String(pb.benefitTypeId) === String(cb.benefitTypeId)) || pb.benefitName === cb.name)
        if (override && override.isActive === false) return
        let effectiveAmount = contractAmount
        if (override && override.isActive === true) effectiveAmount = Number(override.amount || 0)
        if (effectiveAmount > 0) {
          const benefitId = String(cb.benefitTypeId || cb.name)
          if (!unioned.has(benefitId)) unioned.set(benefitId, { id: benefitId, name: cb.name })
        }
      })

      // Include any manual persisted payrollEntryBenefits not covered above
      entry.payrollEntryBenefits?.forEach((benefit: any) => {
        if (!benefit.isActive) return
        const amount = Number(benefit.amount || 0)
        if (amount <= 0) return
        const benefitId = String(benefit.benefitTypeId || benefit.benefitName)
        if (!unioned.has(benefitId)) unioned.set(benefitId, { id: benefitId, name: benefit.benefitName })
      })

      // Merge unioned into uniqueBenefitsMap
      unioned.forEach((v, k) => uniqueBenefitsMap.set(k, v))
    })

    const result = Array.from(uniqueBenefitsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(b => ({ benefitTypeId: b.id, benefitName: b.name }))

  // Final unique benefits for columns computed from server mergedBenefits and contract/manual fallbacks.
    return result
  }

  // Memoize unique benefits so we don't recalculate on every render
  const uniqueBenefits = useMemo(() => {
    return getUniqueBenefits()
  }, [period])

  // instrumentation removed

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const makeShortCompanyLabel = (name?: string | null) => {
    if (!name) return ''
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const acronym = parts.map(p => p[0]).join('').toUpperCase()
      return acronym.slice(0, 4)
    }
    const trimmed = name.replace(/\s+/g, '').toUpperCase()
    return trimmed.slice(0, 4)
  }

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  // Count working days (Mon-Sat) for a given year/month (month 1-12) - client copy of server helper
  const getWorkingDaysInMonthClient = (year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate()
    let count = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month - 1, d)
      const day = dt.getDay()
      // Count Monday-Saturday as working days (exclude Sundays only)
      if (day !== 0) count++
    }
    return count
  }

  // Helper to format contract date range for display
  const formatContractDateRange = (entry: PayrollEntry) => {
    if (!entry.contractStartDate || !entry.contractEndDate) return null

    const startDate = new Date(entry.contractStartDate)
    const endDate = new Date(entry.contractEndDate)

    const formatDate = (date: Date) => {
      return `${date.getDate()}/${date.getMonth() + 1}`
    }

    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  // Group entries by employee to detect multi-contract scenarios
  const getEntriesByEmployee = () => {
    const employeeMap = new Map<string, PayrollEntry[]>()

    period?.payrollEntries.forEach(entry => {
      const empId = entry.employeeId || entry.id
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, [])
      }
      employeeMap.get(empId)!.push(entry)
    })

    return employeeMap
  }

  // Check if employee has multiple contracts in this period
  const hasMultipleContracts = (employeeId: string) => {
    const entries = getEntriesByEmployee().get(employeeId) || []
    return entries.length > 1
  }

  // Compute overtime pay on the client when entry.overtimePay is not present.
  // Rules: overtimePay = overtimeHours * hourlyRate * 1.5
  // hourlyRate fallbacks: entry.hourlyRate > employee.hourlyRate > contract.pdfGenerationData.basicSalary (when compensationType indicates hourly) > derived from baseSalary using work days * 8
  const computeOvertimeForEntry = (entry: PayrollEntry) => {
    try {
      const overtimeHours = Number((entry as any).overtimeHours ?? 0)
      const persistedOvertimePay = Number((entry as any).overtimePay ?? 0)
      if (persistedOvertimePay && persistedOvertimePay > 0) return persistedOvertimePay

      if (!overtimeHours || overtimeHours === 0) return 0

      let hourlyRate = Number((entry as any).hourlyRate ?? 0)
      if ((!hourlyRate || hourlyRate === 0) && (entry as any).employee && (entry as any).employee.hourlyRate) {
        hourlyRate = Number((entry as any).employee.hourlyRate || 0)
      }

      if ((!hourlyRate || hourlyRate === 0) && entry.contract) {
        try {
          const compType = (entry.contract as any).pdfGenerationData?.compensationType || ''
          const basic = Number((entry.contract as any).pdfGenerationData?.basicSalary || 0)
          // Only treat contract basicSalary as hourly if compensationType indicates hourly AND the value is plausibly hourly (<= 200)
          if (typeof compType === 'string' && compType.toLowerCase().includes('hour') && basic > 0 && basic <= 200) {
            hourlyRate = basic
          }
        } catch (e) {
          // ignore
        }
      }

      const baseSalary = Number(entry.baseSalary || 0)
      // Fallback: derive hourly rate from monthly baseSalary by annualizing then
      // dividing by total working hours per year. Business rule: 6 days/week × 9 hours/day × 52 weeks.
      if ((!hourlyRate || hourlyRate === 0) && baseSalary) {
        try {
          const annualSalary = Number(baseSalary) * 12
          const hoursPerYear = 6 * 9 * 52 // 2808
          hourlyRate = annualSalary / Math.max(1, hoursPerYear)
        } catch (e) {
          // ignore
        }
      }

      if (!hourlyRate || hourlyRate === 0) return 0
      return Number(overtimeHours * hourlyRate * 1.5)
    } catch (e) {
      return 0
    }
  }

  // Resolve absence deduction value for an entry.
  // Prefer a value computed/stored by the payroll entry detail modal (entry.absenceDeduction or entry.absenceAmount).
  // If absent, fall back to a per-day pro-rated computation based on cumulativeAbsenceDays.
  const resolveAbsenceDeduction = (entry: PayrollEntry) => {
    try {
      const stored = Number((entry as any).absenceDeduction ?? (entry as any).absenceAmount ?? 0)
      if (stored && stored !== 0) return stored

      // Fallback: compute from cumulativeAbsenceDays using client-side pro-rating
      const absenceDays = Number((entry as any).cumulativeAbsenceDays || 0)
      if (!absenceDays || absenceDays <= 0) return 0
      const baseSalary = Number(entry.baseSalary || 0)
      const workingDays = period ? getWorkingDaysInMonthClient(period.year, period.month) : 22
      const perDay = workingDays > 0 ? (baseSalary / workingDays) : 0
      const deduction = perDay * absenceDays
      return Number(deduction || 0)
    } catch (e) {
      return 0
    }
  }

  // Resolve benefits total for an entry - prefer server-provided totals but fall back to merged/contract/entry calculations
  const resolveBenefitsTotal = (entry: PayrollEntry) => {
    // Prefer explicit API-provided totals when present (including zero).
    const serverTotalRaw = (entry as any).totalBenefitsAmount ?? (entry as any).benefitsTotal
    if (serverTotalRaw !== undefined && serverTotalRaw !== null) return Number(serverTotalRaw)

    const merged = (entry as any).mergedBenefits
    if (Array.isArray(merged) && merged.length > 0) {
      return merged.filter((mb: any) => mb.isActive !== false).reduce((s: number, b: any) => s + Number(b.amount || 0), 0)
    }

    if (Array.isArray(entry.payrollEntryBenefits) && entry.payrollEntryBenefits.length > 0) {
      return entry.payrollEntryBenefits.filter(b => b.isActive).reduce((s, b) => s + Number(b.amount || 0), 0)
    }

    const contractBenefits = entry.contract?.pdfGenerationData?.benefits || []
    if (Array.isArray(contractBenefits) && contractBenefits.length > 0) {
      return contractBenefits.reduce((s: number, b: any) => s + Number(b.amount || 0), 0)
    }

    return 0
  }

  const computeEntryTotals = (entry: PayrollEntry) => {
    const benefitsTotal = resolveBenefitsTotal(entry)

    const storedGross = Number(entry.grossPay || 0)
    const storedNet = Number(entry.netPay || 0)
    if (storedGross && storedNet) {
      // Prefer persisted totals on the entry - server already has absence subtracted
      // Build derived adjustments excluding explicit 'absence' adjustments so list matches modal
      const fallbackDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0)
      let derivedAdjDeductions = Number((entry as any).adjustmentsAsDeductions || 0)
      try {
        const adjustmentsList = (entry as any).payrollAdjustments || []
        if (Array.isArray(adjustmentsList) && adjustmentsList.length > 0) {
          const derivedDeductions = adjustmentsList.reduce((s: number, a: any) => {
            try {
              const rawType = String(a.adjustmentType || a.type || '').toLowerCase()
              if (rawType === 'absence') return s
              const amt = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
              const isAdd = typeof a.isAddition === 'boolean' ? a.isAddition : amt >= 0
              return s + (!isAdd ? Math.abs(amt) : 0)
            } catch (e) { return s }
          }, 0)
          derivedAdjDeductions = derivedDeductions
        }
      } catch (e) {
        // ignore and use server-provided adjustmentsAsDeductions when present
      }
      const derivedTotal = fallbackDeductions + derivedAdjDeductions
      // Prefer the derived total (which excludes absence) for list display so it matches modal
      const totalDeductions = derivedTotal

      // Server-provided gross already has absence subtracted - don't subtract again
      const adjustedGross = Number(storedGross)
      const adjustedNet = Number(adjustedGross)

      return { benefitsTotal, grossInclBenefits: adjustedGross, netInclBenefits: adjustedNet, totalDeductions }
    }

    const baseSalary = Number(entry.baseSalary || 0)
    const commission = Number(entry.commission || 0)
    const overtime = computeOvertimeForEntry(entry)
    // Prefer server-provided aggregated fields, but derive from payrollAdjustments when missing
    let additions = Number((entry as any).adjustmentsTotal || 0)
    let adjAsDeductions = Number((entry as any).adjustmentsAsDeductions || 0)
    if ((!additions || additions === 0) || (!adjAsDeductions || adjAsDeductions === 0)) {
      const adjustmentsList = (entry as any).payrollAdjustments || []
      if (Array.isArray(adjustmentsList) && adjustmentsList.length > 0) {
        const derivedAdditions = adjustmentsList.reduce((s: number, a: any) => {
          const amt = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
          const isAdd = typeof a.isAddition === 'boolean' ? a.isAddition : amt >= 0
          return s + (isAdd ? Math.abs(amt) : 0)
        }, 0)
        const derivedDeductions = adjustmentsList.reduce((s: number, a: any) => {
          try {
            const rawType = String(a.adjustmentType || a.type || '').toLowerCase()
            if (rawType === 'absence') return s
            const amt = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
            const isAdd = typeof a.isAddition === 'boolean' ? a.isAddition : amt >= 0
            return s + (!isAdd ? Math.abs(amt) : 0)
          } catch (e) { return s }
        }, 0)
        if (!additions || additions === 0) additions = derivedAdditions
        if (!adjAsDeductions || adjAsDeductions === 0) adjAsDeductions = derivedDeductions
      }
    }

    // No further action here; we'll compute absence and subtract it from gross below.

    // Add positive adjustments to gross; negative adjustments are treated as deductions applied after taxes
    const absenceDeduction = resolveAbsenceDeduction(entry)
    const grossInclBenefits = baseSalary + commission + overtime + benefitsTotal + additions - (absenceDeduction || 0)

    // Build derived totalDeductions excluding absence (so list matches modal)
    const derivedTotalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0) + adjAsDeductions
    const totalDeductions = derivedTotalDeductions

    const netInclBenefits = grossInclBenefits - totalDeductions

    return { benefitsTotal, grossInclBenefits, netInclBenefits, totalDeductions }
  }

  // Align with server semantics: positive adjustments increase gross (adjustmentsTotal),
  // negative adjustments are treated as deductions (adjustmentsAsDeductions). Use this
  // helper to ensure table and summary use the same rule as the modal and server.
  const computeEntryTotalsAligned = (entry: PayrollEntry) => {
    const benefitsTotal = resolveBenefitsTotal(entry)
    const baseSalary = Number(entry.baseSalary || 0)
    const commission = Number(entry.commission || 0)
    const overtime = computeOvertimeForEntry(entry)

    let additions = Number((entry as any).adjustmentsTotal || 0)
    let adjAsDeductions = Number((entry as any).adjustmentsAsDeductions || 0)
    if ((!additions || additions === 0) || (!adjAsDeductions || adjAsDeductions === 0)) {
      const adjustmentsList = (entry as any).payrollAdjustments || []
      if (Array.isArray(adjustmentsList) && adjustmentsList.length > 0) {
        const derivedAdditions = adjustmentsList.reduce((s: number, a: any) => {
          const amt = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
          const isAdd = typeof a.isAddition === 'boolean' ? a.isAddition : amt >= 0
          return s + (isAdd ? Math.abs(amt) : 0)
        }, 0)
        const derivedDeductions = adjustmentsList.reduce((s: number, a: any) => {
          try {
            const rawType = String(a.adjustmentType || a.type || '').toLowerCase()
            if (rawType === 'absence') return s
            const amt = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
            const isAdd = typeof a.isAddition === 'boolean' ? a.isAddition : amt >= 0
            return s + (!isAdd ? Math.abs(amt) : 0)
          } catch (e) { return s }
        }, 0)
        if (!additions || additions === 0) additions = derivedAdditions
        if (!adjAsDeductions || adjAsDeductions === 0) adjAsDeductions = derivedDeductions
      }
    }

    const absenceDeduction = resolveAbsenceDeduction(entry)
    const gross = baseSalary + commission + overtime + benefitsTotal + additions - absenceDeduction

    const serverTotalDeductions = Number(entry.totalDeductions ?? 0)
    const derivedTotalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0) + adjAsDeductions
    // Prefer the derived total which excludes explicit 'absence' adjustments so the list
    // and modal remain consistent and absence is shown separately.
    const totalDeductions = serverTotalDeductions !== derivedTotalDeductions ? derivedTotalDeductions : serverTotalDeductions

  // Net = Gross (deductions shown separately)
  const net = gross
  return { benefitsTotal, gross, totalDeductions, net }
  }

  if (loading) {
    return (
      <ContentLayout title="Payroll Period">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading...</div>
        </div>
      </ContentLayout>
    )
  }

  if (!period) {
    return (
      <ContentLayout title="Payroll Period">
        <div className="card text-center py-12">
          <p className="text-secondary">Payroll period not found</p>
        </div>
      </ContentLayout>
    )
  }

  const canEditEntry = hasPermission(session?.user, 'canEditPayrollEntry')
  const canApprove = hasPermission(session?.user, 'canApprovePayroll')
  const canExport = hasPermission(session?.user, 'canExportPayroll')
  const canResetExported = isSystemAdmin(session?.user) || hasPermission(session?.user, 'canResetExportedPayrollToPreview', period.businesses.id)

  // Diagnostic code removed: rely on server-provided totals (mergedBenefits / totalBenefitsAmount)

  // Use the new canDeletePayroll helper function which checks both business-level and business-agnostic permissions
  const canDeletePeriodButton = canDeletePayroll(session?.user, period.businesses.id)

  return (
    <ContentLayout
      title={`${getMonthName(period.month)} ${period.year} Payroll`}
      subtitle={period.businesses.name}
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Payroll', href: '/payroll' },
        { label: `${getMonthName(period.month)} ${period.year}`, isActive: true }
      ]}
      headerActions={
        <div className="flex gap-2 flex-wrap">
          {canEditEntry && ['draft', 'in_progress'].includes(period.status) && (
            <>
              <button
                onClick={() => setShowAddEntry(!showAddEntry)}
                disabled={availableEmployeesCount !== null && period.payrollEntries.length >= availableEmployeesCount}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${availableEmployeesCount !== null && period.payrollEntries.length >= availableEmployeesCount ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                title={availableEmployeesCount !== null && period.payrollEntries.length >= availableEmployeesCount ? 'All available employees have been added' : ''}
              >
                {showAddEntry ? 'Cancel' : 'Add Employee'}
              </button>
              {/* Hide "Add All Employees" when period already has entries to prevent duplicate employee errors
                  (period creation with targetAllEmployees already adds all employees) */}
              {period.payrollEntries.length === 0 && (
                <button
                  onClick={handleAddAllEmployees}
                  disabled={addingAllEmployees || (availableEmployeesCount !== null && availableEmployeesCount === 0)}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${addingAllEmployees || (availableEmployeesCount !== null && availableEmployeesCount === 0) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                  title={availableEmployeesCount !== null && availableEmployeesCount === 0 ? 'No employees available to add' : ''}
                >
                  {addingAllEmployees ? 'Adding...' : 'Add All Employees'}
                </button>
              )}
              {period.payrollEntries.length > 0 && (
                <>
                  <button
                    onClick={handleClearAllEntries}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleSubmitForReview}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    Submit for Review
                  </button>
                </>
              )}
            </>
          )}

          {/* Delete Period button: show when period is not locked (exported/closed). If user cannot delete, show disabled button with tooltip explaining why. */}
          {canEditEntry && !['exported', 'closed'].includes(period.status) && (
            (() => {
              // Compute a friendly disabled reason if deletion is not allowed.
              let disabledReason: string | null = null
              if (!session?.user) {
                disabledReason = 'Sign in to delete payroll periods'
              } else if (isSystemAdmin(session.user)) {
                disabledReason = null
              } else {
                const role = getUserRoleInBusiness(session.user, period.businesses.id)
                if (!role || (role !== 'business-owner' && role !== 'business-manager')) {
                  disabledReason = 'Only business owners or managers can delete payroll periods'
                } else if (period.status === 'approved') {
                  const approvedAt = (period as any).approvedAt ? new Date((period as any).approvedAt) : null
                  if (approvedAt) {
                    const msSince = Date.now() - approvedAt.getTime()
                    const sevenDays = 7 * 24 * 60 * 60 * 1000
                    if (msSince > sevenDays) disabledReason = 'Payroll period cannot be deleted more than 7 days after approval'
                  }
                }
              }

              const isDisabled = !canDeletePeriodButton

              // If the period is exported/closed we already don't render this block per above.
              return (
                <div className="inline-flex items-start gap-2">
                  <button
                    onClick={handleDeletePeriod}
                    disabled={isDisabled}
                    className={`px-4 py-2 text-sm font-medium text-white ${isDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'} rounded-md`}
                  >
                    Delete Period
                  </button>
                  {isDisabled && disabledReason && (
                    <div className="text-xs text-secondary max-w-xs">
                      {disabledReason}
                    </div>
                  )}
                </div>
              )
            })()
          )}
          {canEditEntry && period.status === 'review' && period.payrollEntries.length > 0 && (
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Preview Export
            </button>
          )}
          {canApprove && period.status === 'review' && (
            <button
              onClick={handleApprove}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Approve
            </button>
          )}
          {canExport && period.status === 'approved' && (
            <>
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Preview Export
              </button>
              <label className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePastPeriods}
                  onChange={(e) => setIncludePastPeriods(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-secondary">
                  Include past periods (Year-to-Date)
                </span>
              </label>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : includePastPeriods ? 'Export YTD' : 'Export to Excel'}
              </button>
            </>
          )}
          {canExport && period.status === 'exported' && (
            <>
              {canResetExported && (
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Reset exported payroll to preview',
                      description:
                        'This will reset the exported payroll period back to preview mode so changes can be made and re-submitted. This is allowed only within 7 days of export and requires administrator privileges or the explicit manager permission. Continue?',
                      confirmText: 'Reset to Preview',
                      cancelText: 'Cancel'
                    })

                    if (!ok) return

                    try {
                      setResetting(true)
                      const res = await fetch(`/api/payroll/periods/${period.id}/reset-to-preview`, { method: 'PUT' })
                      if (res.ok) {
                        showNotification('success', 'Payroll period reset to preview')
                        await loadPeriod()
                      } else {
                        const err = await res.json().catch(() => null)
                        showNotification('error', err?.error || 'Failed to reset payroll period')
                      }
                    } catch (e) {
                      showNotification('error', 'Failed to reset payroll period')
                    } finally {
                      setResetting(false)
                    }
                  }}
                  disabled={resetting}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Reset to Preview'}
                </button>
              )}

              <button
                onClick={async () => {
                  try {
                    setExporting(true)
                    const res = await fetch('/api/payroll/exports/regenerate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ payrollPeriodId: period.id })
                    })
                    if (res.ok) {
                      const data = await res.json()
                      window.open(data.fileUrl, '_blank')
                      showNotification('success', 'Export regenerated')
                      await loadPeriod()
                    } else {
                      const err = await res.json().catch(() => null)
                      showNotification('error', err?.error || 'Failed to regenerate export')
                    }
                  } catch (e) {
                    showNotification('error', 'Failed to regenerate export')
                  } finally {
                    setExporting(false)
                  }
                }}
                disabled={exporting}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {exporting ? 'Regenerating...' : 'Regenerate Export'}
              </button>
            </>
          )}
        </div>
      }
    >
      {/* Notification */}
      {notification && (
        <div
          className={`mb-4 p-4 rounded-md ${notification.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
            }`}
        >
          {notification.message}
        </div>
      )}

      {/* Benefit load error / sync helper */}
      {period?.benefitLoadError && (
        <div className="mb-4 p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold">Payroll benefits could not be loaded</div>
              <div className="text-sm mt-1">{period.benefitLoadError}</div>
              {period.hint && <div className="text-xs mt-1 text-secondary">Hint: {period.hint}</div>}
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={async () => {
                  if (!period) return
                  setSyncingBenefits(true)
                  try {
                    const res = await fetch(`/api/payroll/periods/${period.id}/sync-benefits`, { method: 'POST' })
                    if (res.ok) {
                      const data = await res.json()
                      showNotification('success', data.message || 'Benefits synced successfully')
                      await loadPeriod()
                    } else {
                      const err = await res.json()
                      showNotification('error', err.error || 'Failed to sync benefits')
                    }
                  } catch (err) {
                    console.error('Sync benefits failed', err)
                    showNotification('error', 'Failed to sync benefits')
                  } finally {
                    setSyncingBenefits(false)
                  }
                }}
                disabled={syncingBenefits}
                className="px-3 py-1 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-50"
              >
                {syncingBenefits ? 'Syncing...' : 'Persist Contract Benefits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Form */}
      {showAddEntry && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Add Employee to Payroll</h3>
          <PayrollEntryForm
            payrollPeriodId={period.id}
            onSuccess={(payload) => {
              const msg = typeof payload === 'string' ? payload : (payload && (payload as any).message) || ''
              showNotification('success', msg)
              setShowAddEntry(false)
              loadPeriod()
              loadAvailableEmployeesCount()
            }}
            onError={(error) => {
              const msg = typeof error === 'string' ? error : (error && (error as any).message) || 'An error occurred'
              showNotification('error', msg)
            }}
            onCancel={() => setShowAddEntry(false)}
          />
        </div>
      )}

      {/* Period Summary - Use API-provided stored values to match preview exactly */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-secondary">Employees</p>
          <p className="text-2xl font-bold text-primary">{period.payrollEntries.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary">Gross Pay</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number(e.grossPay || 0), 0))}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary">Deductions</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number(e.totalDeductions || 0), 0))}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary">Net Gross</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number(e.netPay || 0), 0))}
          </p>
        </div>
      </div>

      {/* Entries Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-primary mb-4">Payroll Entries</h3>
        {period.payrollEntries.length === 0 ? (
          <p className="text-secondary text-center py-12">No employees added to this payroll period yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Company</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Employee ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">ID Number</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">DOB</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Surname</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">First Names</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Job Title</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Contract Period</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Days</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Sick Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Leave Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Absence Total</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Date Engaged</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Date Dismissed</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Base Salary</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Commission</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Overtime</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Adjustments</th>
                  {getUniqueBenefits().map(benefit => (
                    <th key={benefit.benefitTypeId} className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">
                      {benefit.benefitName}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Absence (unearned)</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Deductions</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Gross Pay</th>
                  {canEditEntry && ['draft', 'in_progress'].includes(period.status) && (
                    <th className="px-3 py-2 text-center text-xs font-medium text-secondary uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {period.payrollEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-muted transition-colors"
                  >
                    <td className="px-3 py-2 text-sm text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{makeShortCompanyLabel((entry as any).primaryBusiness?.name || (entry as any).employee?.primaryBusiness?.name)}</td>
                    <td className="px-3 py-2 text-sm text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).employeeNumber || ''}</td>
                    <td className="px-3 py-2 text-sm text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{entry.nationalId}</td>
                    <td className="px-3 py-2 text-sm text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).employeeDateOfBirth ? new Date((entry as any).employeeDateOfBirth).toLocaleDateString() : (entry.dateOfBirth ? new Date(entry.dateOfBirth).toLocaleDateString() : '')}</td>
                    <td className="px-3 py-2 text-sm text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).employeeLastName || (() => { const name = entry.employeeName || ''; const parts = name ? name.split(' ') : []; return parts.slice(-1)[0] || '' })()}</td>
                    <td className="px-3 py-2 text-sm text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).employeeFirstName || (() => { const name = entry.employeeName || ''; const parts = name ? name.split(' ') : []; return parts.slice(0, -1).join(' ') || '' })()}</td>
                    <td className="px-3 py-2 text-sm text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{entry.employee?.jobTitles?.title || ''}</td>
                    <td className="px-3 py-2 text-sm cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>
                      {formatContractDateRange(entry) ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={entry.isProrated ? 'text-orange-600 dark:text-orange-400 font-medium text-xs' : 'text-secondary text-xs'}>
                            {formatContractDateRange(entry)}
                          </span>
                          {entry.isProrated && (
                            <span className="text-[10px] bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-1 py-0.5 rounded font-medium" title="Prorated salary">
                              PRO
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-secondary text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{entry.workDays}</td>
                    <td className="px-3 py-2 text-sm text-right text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).cumulativeSickDays ?? (entry as any).sickDays ?? 0}</td>
                    <td className="px-3 py-2 text-sm text-right text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).cumulativeLeaveDays ?? (entry as any).leaveDays ?? 0}</td>
                    <td className="px-3 py-2 text-sm text-right text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).cumulativeAbsenceDays ?? (entry as any).absenceDays ?? 0}</td>
                    <td className="px-3 py-2 text-sm text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).employeeHireDate ? new Date((entry as any).employeeHireDate).toLocaleDateString() : (entry.hireDate ? new Date(entry.hireDate).toLocaleDateString() : '')}</td>
                    <td className="px-3 py-2 text-sm text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{entry.terminationDate ? new Date(entry.terminationDate).toLocaleDateString() : ''}</td>
                    <td className="px-3 py-2 text-sm text-right text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(Number(entry.baseSalary || 0))}</td>
                    <td className="px-3 py-2 text-sm text-right text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(Number(entry.commission || 0))}</td>
                    <td className="px-3 py-2 text-sm text-right text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(Number(computeOvertimeForEntry(entry) || 0))}</td>
                    <td className="px-3 py-2 text-sm text-right text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>
                      {(() => {
                        // Prefer server-provided aggregated additions when present and non-zero
                        let additions = Number((entry as any).adjustmentsTotal || 0)
                        let deductions = Number((entry as any).adjustmentsAsDeductions || 0)
                        const adjustmentsList = (entry as any).payrollAdjustments || []
                        if ((!additions || additions === 0) || (!deductions || deductions === 0)) {
                          if (Array.isArray(adjustmentsList) && adjustmentsList.length > 0) {
                            const derivedAdditions = adjustmentsList.reduce((s: number, a: any) => {
                              const amt = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
                              const isAdd = typeof a.isAddition === 'boolean' ? a.isAddition : amt >= 0
                              return s + (isAdd ? Math.abs(amt) : 0)
                            }, 0)
                            const derivedDeductions = adjustmentsList.reduce((s: number, a: any) => {
                              const amt = Number((a.storedAmount !== undefined && a.storedAmount !== null) ? a.storedAmount : (a.amount ?? 0))
                              const isAdd = typeof a.isAddition === 'boolean' ? a.isAddition : amt >= 0
                              return s + (!isAdd ? Math.abs(amt) : 0)
                            }, 0)
                            if (!additions || additions === 0) additions = derivedAdditions
                            if (!deductions || deductions === 0) deductions = derivedDeductions
                          }
                        }

                        // Show positive additions in this column. Negative adjustments will appear under Deductions.
                        if (additions && additions !== 0) return `+${formatCurrency(additions)}`
                        return formatCurrency(0)
                      })()}
                    </td>
                    {getUniqueBenefits().map(uniqueBenefit => {
                      // Prefer mergedBenefits (server) for display
                      const merged = (entry as any).mergedBenefits || []
                      const mb = merged.find((m: any) => {
                        const id = m?.benefitType?.id || m?.benefitTypeId || m?.key || String(m?.benefitTypeId || '')
                        return String(id) === String(uniqueBenefit.benefitTypeId)
                      })

                      // fallbacks
                      const contractVal = entry.contract?.pdfGenerationData?.benefits?.find((cb: any) => {
                        return String(cb.benefitTypeId || cb.name) === String(uniqueBenefit.benefitTypeId)
                      })

                      const entryBenefit = entry.payrollEntryBenefits?.find(
                        b => b.benefitTypeId === uniqueBenefit.benefitTypeId && b.isActive
                      )

                      const amount = mb?.amount ?? contractVal?.amount ?? entryBenefit?.amount

                      return (
                        <td
                          key={uniqueBenefit.benefitTypeId}
                          className="px-3 py-2 text-sm text-right text-primary cursor-pointer"
                          onClick={() => setSelectedEntryId(entry.id)}
                        >
                          {typeof amount === 'number' ? formatCurrency(amount) : ''}
                        </td>
                      )
                    })}
                    {(() => {
                      const totals = computeEntryTotals(entry)
                      const absenceAmt = resolveAbsenceDeduction(entry)
                      return (
                        <>
                          <td className="px-3 py-2 text-sm text-right text-red-600 dark:text-red-400 cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{absenceAmt && absenceAmt !== 0 ? `-${formatCurrency(Math.abs(absenceAmt))}` : formatCurrency(0)}</td>
                          <td className="px-3 py-2 text-sm text-right text-red-600 dark:text-red-400 cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(totals.totalDeductions)}</td>
                          <td className="px-3 py-2 text-sm text-right text-green-600 dark:text-green-400 font-medium cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(totals.grossInclBenefits)}</td>
                        </>
                      )
                    })()}
                    {canEditEntry && ['draft', 'in_progress'].includes(period.status) && (
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteEntry(entry.id)
                          }}
                          className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entry Detail Modal */}
      {selectedEntryId && (
        <PayrollEntryDetailModal
          isOpen={!!selectedEntryId}
          onClose={() => setSelectedEntryId(null)}
          entryId={selectedEntryId}
          onSuccess={(payload) => {
            const p: any = payload
            const message = typeof p === 'string' ? p : (p && p.message) || ''
            // Default to not refreshing the whole period unless explicitly requested
            const shouldRefresh = typeof p === 'object' ? Boolean(p.refresh) : false
            // Only show notification if there's an actual message (autosave sends empty messages)
            if (message && message.trim()) {
              showNotification('success', message)
            }
            // If the modal provided an updatedEntry object, merge it into the period entries to avoid a full reload
            if (p && typeof p === 'object' && p.updatedEntry && period) {
              try {
                const updated: any = p.updatedEntry
                // CRITICAL: Validate that the updated entry has a valid ID before attempting merge
                if (!updated || !updated.id) {
                  if (shouldRefresh) loadPeriod()
                  return
                }

                setPeriod((prev) => {
                  if (!prev) return prev
                  const entries = Array.isArray(prev.payrollEntries) ? prev.payrollEntries.slice() : []
                  const idx = entries.findIndex((e: any) => String(e.id) === String(updated.id))
                  if (idx >= 0) {
                    // Found existing entry - merge the update by creating a completely new object
                    // to ensure React detects the change
                    const oldEntry = entries[idx]
                    entries[idx] = { ...oldEntry, ...updated }
                  } else {
                    // CRITICAL FIX: If entry not found, DO NOT push a new entry (this causes phantom rows).
                    // Instead, reload period to ensure data consistency.
                    setTimeout(() => loadPeriod(), 0)
                    return prev  // Return unchanged state, reload will happen async
                  }
                  return { ...prev, payrollEntries: entries }
                })
              } catch (e) {
                console.error('[payroll] Error merging updatedEntry:', e)
                // fallback to reload if merge fails
                if (shouldRefresh) loadPeriod()
              }
              return
            }
            if (shouldRefresh) loadPeriod()
          }}
          onError={(error) => showNotification('error', error)}
        />
      )}

      {/* Export Preview Modal */}
      <PayrollExportPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        periodId={periodId}
      />
    </ContentLayout>
  )
}
