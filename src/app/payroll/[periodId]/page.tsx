'use client'

import { useState, useEffect } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { PayrollEntryForm } from '@/components/payroll/payroll-entry-form'
import { PayrollEntryDetailModal } from '@/components/payroll/payroll-entry-detail-modal'
import { PayrollExportPreviewModal } from '@/components/payroll/payroll-export-preview-modal'
import { hasPermission } from '@/lib/permission-utils'

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
  benefitsTotal?: number
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
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [syncingBenefits, setSyncingBenefits] = useState(false)

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

  const loadPeriod = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payroll/periods/${periodId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded period data:', data)
        console.log('First entry payrollEntryBenefits:', data.payrollEntries?.[0]?.payrollEntryBenefits)
        console.log('First entry mergedBenefits:', data.payrollEntries?.[0]?.mergedBenefits)
        console.log('All entries mergedBenefits:', data.payrollEntries?.map((e: any) => ({
          employee: e.employeeName,
          mergedBenefits: e.mergedBenefits
        })))
        setPeriod(data)
      }
    } catch (error) {
      console.error('Failed to load payroll period:', error)
    } finally {
      setLoading(false)
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
      const response = await fetch('/api/payroll/entries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollPeriodId: period.id,
          businessId: period.business.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        showNotification('success', `Successfully added ${result.count} employees to payroll`)
        loadPeriod()
      } else {
        const error = await response.json()
        showNotification('error', error.error || 'Failed to add employees')
      }
    } catch (error) {
      showNotification('error', 'Failed to add employees')
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
      title: 'Export payroll',
      description:
        '⚠️ IMPORTANT: Once exported, this payroll period will be LOCKED and no further changes can be made. Continue with export?',
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
          businessId: period.business.id,
          generationType: 'single_month'
        })
      })

      if (response.ok) {
        const data = await response.json()
        showNotification('success', 'Excel file generated successfully. Payroll period is now locked.')

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

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  // Get unique benefits from contract data (only show columns with at least one non-zero value)
  const getUniqueBenefits = () => {
    if (!period) return []
    const uniqueBenefitsMap = new Map<string, { id: string, name: string }>()

    console.log('=== getUniqueBenefits called ===')

    period.payrollEntries.forEach(entry => {
      // Prefer server-merged benefits when present
      const merged = entry.mergedBenefits || []
      const contractBenefits = entry.contract?.pdfGenerationData?.benefits || []
      const entryBenefits = entry.payrollEntryBenefits || []

      // Use mergedBenefits to decide columns (they represent the effective, merged view)
      merged.forEach((mb: any) => {
        if (!mb) return
        if (mb.isActive === false) return
        const name = mb.benefitType?.name || mb.benefitName || mb.key || mb.name || ''
        const amount = Number(mb.amount || 0)
        if (amount <= 0) return
        const benefitId = String(mb.benefitType?.id || mb.benefitTypeId || name)
        uniqueBenefitsMap.set(benefitId, { id: benefitId, name })
      })

      // If mergedBenefits missing for this entry, fall back to contract and persisted entry benefits
      if (!merged || merged.length === 0) {
        contractBenefits.forEach((cb: any) => {
          const contractAmount = Number(cb.amount || 0)
          // Check for any override (active or inactive)
          const override = entry.payrollEntryBenefits?.find((pb: any) => pb.benefitName === cb.name)
          if (override && override.isActive === false) return
          let effectiveAmount = contractAmount
          if (override && override.isActive === true) effectiveAmount = Number(override.amount || 0)
          if (effectiveAmount > 0) {
            const benefitId = cb.benefitTypeId || cb.name
            uniqueBenefitsMap.set(benefitId, { id: benefitId, name: cb.name })
          }
        })

        entry.payrollEntryBenefits?.forEach((benefit: any) => {
          if (!benefit.isActive) return
          const amount = Number(benefit.amount || 0)
          if (amount <= 0) return
          const inContract = contractBenefits.some((cb: any) => cb.name === benefit.benefitName)
          if (!inContract) {
            const benefitId = benefit.benefitTypeId || benefit.benefitName
            uniqueBenefitsMap.set(benefitId, { id: benefitId, name: benefit.benefitName })
          }
        })
      }
    })

    const result = Array.from(uniqueBenefitsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(b => ({ benefitTypeId: b.id, benefitName: b.name }))

    console.log('Final unique benefits for columns:', result)
    return result
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  // Resolve benefits total for an entry - prefer server-provided totals but fall back to merged/contract/entry calculations
  const resolveBenefitsTotal = (entry: PayrollEntry) => {
    const serverTotal = Number((entry as any).totalBenefitsAmount ?? (entry as any).benefitsTotal ?? 0)
    if (serverTotal && serverTotal > 0) return serverTotal

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
      let totalDeductions = Number(entry.totalDeductions || 0)
      if (!totalDeductions || totalDeductions === 0) {
        totalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0)
      }
      return { benefitsTotal, grossInclBenefits: storedGross, netInclBenefits: storedNet, totalDeductions }
    }

    const baseSalary = Number(entry.baseSalary || 0)
    const commission = Number(entry.commission || 0)
    const overtime = Number(entry.overtimePay || 0)
    const adjustments = Number((entry as any).adjustmentsTotal || 0)

    const grossInclBenefits = baseSalary + commission + overtime + benefitsTotal + adjustments

    let totalDeductions = Number(entry.totalDeductions || 0)
    if (!totalDeductions || totalDeductions === 0) {
      totalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0)
    }

    const netInclBenefits = grossInclBenefits - totalDeductions

    return { benefitsTotal, grossInclBenefits, netInclBenefits, totalDeductions }
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

  return (
    <ContentLayout
      title={`${getMonthName(period.month)} ${period.year} Payroll`}
      subtitle={period.business.name}
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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {showAddEntry ? 'Cancel' : 'Add Employee'}
              </button>
              <button
                onClick={handleAddAllEmployees}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Add All Employees
              </button>
              <button
                onClick={handleDeletePeriod}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
              >
                Delete Period
              </button>
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
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export to Excel'}
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
            onSuccess={(message) => {
              showNotification('success', message)
              setShowAddEntry(false)
              loadPeriod()
            }}
            onError={(error) => showNotification('error', error)}
            onCancel={() => setShowAddEntry(false)}
          />
        </div>
      )}

      {/* Period Summary - Calculate from entries to include contract benefits */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-secondary">Employees</p>
          <p className="text-2xl font-bold text-primary">{period.payrollEntries.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary">Gross Pay</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(period.payrollEntries.reduce((sum, e) => sum + computeEntryTotals(e).grossInclBenefits, 0))}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary">Deductions</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number(e.totalDeductions || 0), 0))}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary">Net Pay</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(period.payrollEntries.reduce((sum, e) => sum + computeEntryTotals(e).netInclBenefits, 0))}
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Employee</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Job Title</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">ID Number</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Days</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Sick Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Leave Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Absence Total</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Base Salary</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Commission</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Overtime</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Adjustments</th>
                  {getUniqueBenefits().map(benefit => (
                    <th key={benefit.benefitTypeId} className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">
                      {benefit.benefitName}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Gross Pay</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Deductions</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Net Pay</th>
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
                    <td
                      className="px-3 py-2 text-sm text-primary cursor-pointer"
                      onClick={() => setSelectedEntryId(entry.id)}
                    >
                      {entry.employeeNumber} - {entry.employeeName}
                    </td>
                    <td className="px-3 py-2 text-sm text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{entry.employee?.jobTitles?.title || ''}</td>
                    <td className="px-3 py-2 text-sm text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{entry.nationalId}</td>
                    <td className="px-3 py-2 text-sm text-right text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{entry.workDays}</td>
                    <td className="px-3 py-2 text-sm text-right text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).cumulativeSickDays || 0}</td>
                    <td className="px-3 py-2 text-sm text-right text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).cumulativeLeaveDays || 0}</td>
                    <td className="px-3 py-2 text-sm text-right text-secondary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{(entry as any).cumulativeAbsenceDays || 0}</td>
                    <td className="px-3 py-2 text-sm text-right text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(entry.baseSalary)}</td>
                    <td className="px-3 py-2 text-sm text-right text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(entry.commission)}</td>
                    <td className="px-3 py-2 text-sm text-right text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(entry.overtimePay)}</td>
                    <td className="px-3 py-2 text-sm text-right text-primary cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency((entry as any).adjustmentsTotal || 0)}</td>
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
                      return (
                        <>
                          <td className="px-3 py-2 text-sm text-right text-primary font-medium cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(totals.grossInclBenefits)}</td>
                          <td className="px-3 py-2 text-sm text-right text-red-600 dark:text-red-400 cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(totals.totalDeductions)}</td>
                          <td className="px-3 py-2 text-sm text-right text-green-600 dark:text-green-400 font-medium cursor-pointer" onClick={() => setSelectedEntryId(entry.id)}>{formatCurrency(totals.netInclBenefits)}</td>
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
          onSuccess={(message) => {
            showNotification('success', message)
            loadPeriod()
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
