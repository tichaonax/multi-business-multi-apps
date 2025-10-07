'use client'

import { useEffect, useState } from 'react'

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
  mergedBenefits?: Array<any>
  contract?: { pdfGenerationData?: { benefits?: Array<any> } }
  benefitsTotal?: number
}

interface PayrollPeriod {
  id: string
  year: number
  month: number
  periodStart: string
  periodEnd: string
  business: {
    name: string
  }
  totalEmployees: number
  totalGrossPay: number
  totalDeductions: number
  totalNetPay: number
  payrollEntries: PayrollEntry[]
}

interface PayrollExportPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  periodId: string
}

export function PayrollExportPreviewModal({
  isOpen,
  onClose,
  periodId
}: PayrollExportPreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PayrollPeriod | null>(null)

  useEffect(() => {
    if (isOpen && periodId) {
      loadPeriod()
    }
  }, [isOpen, periodId])

  const loadPeriod = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payroll/periods/${periodId}`)
      if (response.ok) {
        const data = await response.json()
        setPeriod(data)
      }
    } catch (error) {
      console.error('Failed to load period:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique active benefits across all entries
  const getUniqueBenefits = () => {
    if (!period) return []
    // Use normalized name as the dedupe key so differently-typed benefits with the same
    // visible name are combined into a single column.
    const normalizeName = (s?: string) => (s || '').normalize?.('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
    const uniqueBenefitsMap = new Map<string, { benefitTypeId: string; benefitName: string }>()

    period.payrollEntries.forEach(entry => {
      // mergedBenefits from server (preferred) - only consider active merged benefits
      entry.mergedBenefits?.forEach((mb: any) => {
        if (!mb) return
        if (mb.isActive === false) return
        const name = mb.benefitType?.name || mb.benefitName || mb.key || mb.name || ''
        const key = normalizeName(name)
        if (!key) return
        if (!uniqueBenefitsMap.has(key)) {
          uniqueBenefitsMap.set(key, { benefitTypeId: String(mb.benefitType?.id || mb.benefitTypeId || ''), benefitName: name })
        }
      })

      // contract pdfGenerationData fallback
      const contractBenefits = entry.contract?.pdfGenerationData?.benefits || []
      contractBenefits.forEach((cb: any) => {
        const name = cb.name || ''
        const key = normalizeName(name)
        if (!key) return
        if (!uniqueBenefitsMap.has(key)) {
          uniqueBenefitsMap.set(key, { benefitTypeId: String(cb.benefitTypeId || cb.name || ''), benefitName: name })
        }
      })

      // persisted payroll entry benefits
      entry.payrollEntryBenefits?.forEach(benefit => {
        if (!benefit.isActive) return
        const name = benefit.benefitName || ''
        const key = normalizeName(name)
        if (!key) return
        if (!uniqueBenefitsMap.has(key)) {
          uniqueBenefitsMap.set(key, { benefitTypeId: String(benefit.benefitTypeId || benefit.benefitName || ''), benefitName: name })
        }
      })
    })

    return Array.from(uniqueBenefitsMap.values())
      .sort((a, b) => (a.benefitName || '').localeCompare(b.benefitName || ''))
  }

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

  // Compute canonical benefits total for an entry. Prefer server-provided totals but fall back
  // to mergedBenefits / payrollEntryBenefits / contract pdfGenerationData calculations.
  const resolveBenefitsTotal = (entry: PayrollEntry) => {
    const serverTotal = Number((entry as any).totalBenefitsAmount ?? (entry as any).benefitsTotal ?? 0)
    if (serverTotal && serverTotal > 0) return serverTotal

    // Try mergedBenefits first
    const merged = (entry as any).mergedBenefits
    if (Array.isArray(merged) && merged.length > 0) {
      return merged.filter((mb: any) => mb.isActive !== false).reduce((s: number, b: any) => s + Number(b.amount || 0), 0)
    }

    // Fallback to entry.payrollEntryBenefits
    if (Array.isArray(entry.payrollEntryBenefits) && entry.payrollEntryBenefits.length > 0) {
      return entry.payrollEntryBenefits.filter(b => b.isActive).reduce((s, b) => s + Number(b.amount || 0), 0)
    }

    // Contract-pdf generation fallback
    const contractBenefits = (entry as any).contract?.pdfGenerationData?.benefits || []
    if (Array.isArray(contractBenefits) && contractBenefits.length > 0) {
      return contractBenefits.reduce((s: number, b: any) => s + Number(b.amount || 0), 0)
    }

    return 0
  }

  const computeEntryTotals = (entry: PayrollEntry) => {
    const benefitsTotal = resolveBenefitsTotal(entry)

    // If the server already computed grossPay/netPay for the entry, prefer those stored values
    const storedGross = Number(entry.grossPay || 0)
    const storedNet = Number(entry.netPay || 0)
    if (storedGross && storedNet) {
      // Prefer stored totals but guard against missing/negative stored totalDeductions.
      const serverTotalDeductions = Number(entry.totalDeductions ?? 0)
      const derivedTotal = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0)
      const totalDeductions = (typeof serverTotalDeductions === 'number' && serverTotalDeductions > 0) ? serverTotalDeductions : derivedTotal

      return { benefitsTotal, grossInclBenefits: storedGross, netInclBenefits: storedNet, totalDeductions }
    }

    const baseSalary = Number(entry.baseSalary || 0)
    const commission = Number(entry.commission || 0)
    const overtime = Number(entry.overtimePay || 0)
    const adjustments = Number((entry as any).adjustmentsTotal || 0)

    const grossInclBenefits = baseSalary + commission + overtime + benefitsTotal + adjustments

    // Prefer stored totalDeductions if present, otherwise compute from deduction fields
    let totalDeductions = Number(entry.totalDeductions || 0)
    if (!totalDeductions || totalDeductions === 0) {
      totalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0)
    }

    const netInclBenefits = grossInclBenefits - totalDeductions

    return { benefitsTotal, grossInclBenefits, netInclBenefits, totalDeductions }
  }

  // Aligned totals: use adjustmentsTotal as additions, adjustmentsAsDeductions as deductions
  const computeEntryTotalsAligned = (entry: PayrollEntry) => {
    const benefitsTotal = resolveBenefitsTotal(entry)
    const baseSalary = Number(entry.baseSalary || 0)
    const commission = Number(entry.commission || 0)
    const overtime = Number(entry.overtimePay || 0)
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

    const gross = baseSalary + commission + overtime + benefitsTotal + additions
  const serverTotalDeductions = Number(entry.totalDeductions ?? 0)
  const derivedTotalDeductions = Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0) + Number(entry.miscDeductions || 0) + adjAsDeductions
  // Prefer the derived total which excludes explicit 'absence' adjustments so exports
  // align with the modal/list display.
  const totalDeductions = serverTotalDeductions !== derivedTotalDeductions ? derivedTotalDeductions : serverTotalDeductions
    const net = gross - totalDeductions
    return { benefitsTotal, gross, totalDeductions, net }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">Payroll Export Preview</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-secondary">Loading preview...</div>
          </div>
        ) : period ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-primary mb-2">
                {period.business.name} - {getMonthName(period.month)} {period.year}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-secondary">Period:</span>
                  <div className="font-medium text-primary">
                    {new Date(period.periodStart).toLocaleDateString()} - {new Date(period.periodEnd).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-secondary">Employees:</span>
                  <div className="font-medium text-primary">{period.totalEmployees}</div>
                </div>
                <div>
                  <span className="text-secondary">Total Gross Pay (incl Benefits):</span>
                  <div className="font-medium text-primary">{formatCurrency(Number(period.totalGrossPay ?? period.payrollEntries.reduce((s, e) => s + computeEntryTotals(e).grossInclBenefits, 0)))}</div>
                </div>
                <div>
                  <span className="text-secondary">Total Net Pay (incl Benefits):</span>
                  <div className="font-medium text-green-600 dark:text-green-400">{formatCurrency(Number(period.totalNetPay ?? period.payrollEntries.reduce((s, e) => s + computeEntryTotals(e).netInclBenefits, 0)))}</div>
                </div>
              </div>
            </div>

            {/* Preview Message */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Preview:</strong> This shows exactly how the data will appear in the exported Excel file.
                Review all entries carefully before exporting. Once exported, the payroll period will be locked.
              </p>
            </div>

            {/* Employee Entries Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Company</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Employee ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">DOB</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Surname</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">First Names</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Days</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Sick Total</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Leave Total</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Absence Total</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Date Engaged</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-secondary uppercase">Date Dismissed</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Basic Salary</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Commission</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Overtime</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Adjustments</th>
                      {getUniqueBenefits().map(benefit => (
                        <th key={benefit.benefitTypeId} className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">
                          {benefit.benefitName}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Misc Reimbursement</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Advances Loans</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Misc Deductions</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Benefits Total</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Gross (incl Benefits)</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-secondary uppercase">Net (incl Benefits)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-background">
                    {period.payrollEntries.map((entry) => {
                      // Prefer explicit firstName/lastName if provided by the API, otherwise fallback to splitting employeeName
                      const firstName = (entry as any).employeeFirstName || (() => {
                        const nameParts = entry.employeeName ? entry.employeeName.split(' ') : []
                        return nameParts.slice(0, -1).join(' ') || ''
                      })()
                      const surname = (entry as any).employeeLastName || (() => {
                        const nameParts = entry.employeeName ? entry.employeeName.split(' ') : []
                        return nameParts.slice(-1)[0] || ''
                      })()

                      return (
                        <tr key={entry.id} className="hover:bg-muted">
                          <td className="px-3 py-2 text-sm text-primary">{makeShortCompanyLabel((entry as any).primaryBusiness?.name || (entry as any).employee?.primaryBusiness?.name)}</td>
                          <td className="px-3 py-2 text-sm text-primary">{(entry as any).employeeNumber || ''}</td>
                          <td className="px-3 py-2 text-sm text-primary">{entry.nationalId}</td>
                          <td className="px-3 py-2 text-sm text-secondary">{(entry as any).employeeDateOfBirth ? new Date((entry as any).employeeDateOfBirth).toLocaleDateString() : (entry.dateOfBirth ? new Date(entry.dateOfBirth).toLocaleDateString() : '')}</td>
                          <td className="px-3 py-2 text-sm text-primary">{surname}</td>
                          <td className="px-3 py-2 text-sm text-primary">{firstName}</td>
                          <td className="px-3 py-2 text-sm text-right text-secondary">{entry.workDays}</td>
                          <td className="px-3 py-2 text-sm text-right text-secondary">{(entry as any).cumulativeSickDays || 0}</td>
                          <td className="px-3 py-2 text-sm text-right text-secondary">{(entry as any).cumulativeLeaveDays || 0}</td>
                          <td className="px-3 py-2 text-sm text-right text-secondary">{(entry as any).cumulativeAbsenceDays || 0}</td>
                          <td className="px-3 py-2 text-sm text-secondary">{(entry as any).employeeHireDate ? new Date((entry as any).employeeHireDate).toLocaleDateString() : (entry.hireDate ? new Date(entry.hireDate).toLocaleDateString() : '')}</td>
                          <td className="px-3 py-2 text-sm text-secondary">{entry.terminationDate ? new Date(entry.terminationDate).toLocaleDateString() : ''}</td>
                          <td className="px-3 py-2 text-sm text-right text-primary">{formatCurrency(Number(entry.baseSalary || 0))}</td>
                          <td className="px-3 py-2 text-sm text-right text-primary">{formatCurrency(Number(entry.commission || 0))}</td>
                          <td className="px-3 py-2 text-sm text-right text-primary">{formatCurrency(Number(entry.overtimePay || 0))}</td>
                          <td className="px-3 py-2 text-sm text-right text-primary">{formatCurrency(Number((entry as any).adjustmentsTotal || 0))}</td>
                          {getUniqueBenefits().map(uniqueBenefit => {
                            const merged = entry.mergedBenefits?.find((mb: any) => {
                              const id = mb?.benefitType?.id || mb?.benefitTypeId || mb?.key || String(mb?.benefitTypeId || '')
                              return String(id) === String(uniqueBenefit.benefitTypeId)
                            })

                            const contractVal = entry.contract?.pdfGenerationData?.benefits?.find((cb: any) => {
                              return String(cb.benefitTypeId || cb.name) === String(uniqueBenefit.benefitTypeId)
                            })

                            const entryBenefit = entry.payrollEntryBenefits?.find(
                              b => b.benefitTypeId === uniqueBenefit.benefitTypeId && b.isActive
                            )

                            const amount = merged?.amount ?? contractVal?.amount ?? entryBenefit?.amount

                            return (
                              <td key={uniqueBenefit.benefitTypeId} className="px-3 py-2 text-sm text-right text-primary">
                                {typeof amount === 'number' ? formatCurrency(amount) : ''}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 text-sm text-right text-primary">{formatCurrency(0)}</td>
                          <td className="px-3 py-2 text-sm text-right text-red-600 dark:text-red-400">{formatCurrency(Number(entry.advanceDeductions || 0) + Number(entry.loanDeductions || 0))}</td>
                          <td className="px-3 py-2 text-sm text-right text-red-600 dark:text-red-400">{formatCurrency(Number(entry.miscDeductions || 0))}</td>
                          <td className="px-3 py-2 text-sm text-right text-primary">{formatCurrency(computeEntryTotalsAligned(entry).benefitsTotal)}</td>
                          <td className="px-3 py-2 text-sm text-right text-primary">{formatCurrency(computeEntryTotalsAligned(entry).gross)}</td>
                          <td className="px-3 py-2 text-sm text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(computeEntryTotalsAligned(entry).net)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      {/* There is now an extra Company column before ID, so increase colSpan by 1 */}
                      <td colSpan={12} className="px-3 py-2 text-sm font-bold text-right text-primary">TOTALS:</td>
                      <td className="px-3 py-2 text-sm text-right font-bold text-primary">{formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number(e.baseSalary), 0))}</td>
                      <td className="px-3 py-2 text-sm text-right font-bold text-primary">{formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number(e.commission), 0))}</td>
                      <td className="px-3 py-2 text-sm text-right font-bold text-primary">{formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number(e.overtimePay), 0))}</td>
                      {/* Add Adjustments total (this column existed in the header but was missing from totals) */}
                      <td className="px-3 py-2 text-sm text-right font-bold text-primary">{formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number((e as any).adjustmentsTotal || 0), 0))}</td>
                      {getUniqueBenefits().map(uniqueBenefit => {
                        const total = period.payrollEntries.reduce((sum, entry) => {
                          // Look through mergedBenefits first
                          const merged = (entry as any).mergedBenefits || []
                          let found = 0
                          for (const mb of merged) {
                            if (!mb) continue
                            if (mb.isActive === false) continue
                            const id = mb?.benefitType?.id || mb?.key || mb?.benefitName || String(mb?.benefitTypeId || '')
                            if (String(id) === String(uniqueBenefit.benefitTypeId)) {
                              found += Number(mb.amount || 0)
                            }
                          }

                          if (found > 0) return sum + found

                          // fallback to payrollEntryBenefits
                          const benefit = entry.payrollEntryBenefits?.find((b: any) => String(b.benefitTypeId) === String(uniqueBenefit.benefitTypeId) && b.isActive)
                          if (benefit) return sum + Number(benefit.amount || 0)

                          // fallback to contract pdfGenerationData
                          const contractVal = (entry as any).contract?.pdfGenerationData?.benefits?.find((cb: any) => String(cb.benefitTypeId || cb.name) === String(uniqueBenefit.benefitTypeId))
                          return sum + (contractVal ? Number(contractVal.amount || 0) : 0)
                        }, 0)
                        return (
                          <td key={uniqueBenefit.benefitTypeId} className="px-3 py-2 text-sm text-right font-bold text-primary">
                            {formatCurrency(total)}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-sm text-right font-bold text-primary">{formatCurrency(0)}</td>
                      <td className="px-3 py-2 text-sm text-right font-bold text-red-600 dark:text-red-400">{formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number(e.advanceDeductions || 0) + Number(e.loanDeductions || 0), 0))}</td>
                      <td className="px-3 py-2 text-sm text-right font-bold text-red-600 dark:text-red-400">{formatCurrency(period.payrollEntries.reduce((sum, e) => sum + Number(e.miscDeductions || 0), 0))}</td>
                      <td className="px-3 py-2 text-sm text-right font-bold text-primary">{formatCurrency(period.payrollEntries.reduce((sum, e) => sum + computeEntryTotalsAligned(e).benefitsTotal, 0))}</td>
                      <td className="px-3 py-2 text-sm text-right font-bold text-primary">{formatCurrency(period.payrollEntries.reduce((sum, e) => sum + computeEntryTotalsAligned(e).gross, 0))}</td>
                      <td className="px-3 py-2 text-sm text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(period.payrollEntries.reduce((sum, e) => sum + computeEntryTotalsAligned(e).net, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-secondary bg-background border border-border rounded-md hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-secondary">Failed to load preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
