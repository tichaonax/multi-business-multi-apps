'use client'

import { useState } from 'react'

interface PayrollReportsPanelProps {
  periodId: string
  periodName: string
}

type ReportType = 'paye' | 'nssa' | 'nec' | 'payroll-register'

interface ReportRow {
  employeeName: string
  employeeNumber: string
  nationalId: string
  [key: string]: string | number | null | undefined
}

interface ReportData {
  period: { year: number; month: number; businessName: string }
  rows: ReportRow[]
  totals: Record<string, number>
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return v.toFixed(2)
}

const REPORT_CONFIG: Record<ReportType, { label: string; columns: { key: string; label: string }[] }> = {
  paye: {
    label: 'PAYE Return',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'employeeNumber', label: 'Emp No' },
      { key: 'nationalId', label: 'National ID' },
      { key: 'totalEarnings', label: 'Total Earnings' },
      { key: 'payeTax', label: 'PAYE Tax' },
      { key: 'aidsLevy', label: 'Aids Levy' },
    ],
  },
  nssa: {
    label: 'NSSA Return',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'employeeNumber', label: 'Emp No' },
      { key: 'nationalId', label: 'National ID' },
      { key: 'totalEarnings', label: 'Total Earnings' },
      { key: 'nssaEmployee', label: 'NSSA Employee' },
      { key: 'nssaEmployer', label: 'NSSA Employer' },
    ],
  },
  nec: {
    label: 'NEC Return',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'employeeNumber', label: 'Emp No' },
      { key: 'nationalId', label: 'National ID' },
      { key: 'totalEarnings', label: 'Total Earnings' },
      { key: 'necEmployee', label: 'NEC Employee' },
      { key: 'necCompanyContrib', label: 'NEC Company' },
    ],
  },
  'payroll-register': {
    label: 'Payroll Register',
    columns: [
      { key: 'employeeName', label: 'Employee' },
      { key: 'employeeNumber', label: 'Emp No' },
      { key: 'totalEarnings', label: 'Total Earnings' },
      { key: 'payeTax', label: 'PAYE' },
      { key: 'aidsLevy', label: 'Aids Levy' },
      { key: 'nssaEmployee', label: 'NSSA' },
      { key: 'necEmployee', label: 'NEC Emp' },
      { key: 'loanDeductions', label: 'Loan Recovery' },
      { key: 'advanceDeductions', label: 'Advance' },
      { key: 'miscDeductions', label: 'Other Ded.' },
      { key: 'totalDeductions', label: 'Total Ded.' },
      { key: 'nettPay', label: 'Nett Pay' },
      { key: 'wcif', label: 'WCIF' },
      { key: 'necCompanyContrib', label: 'NEC Co.' },
      { key: 'leaveDaysDue', label: 'Leave Days' },
    ],
  },
}

export function PayrollReportsPanel({ periodId, periodName }: PayrollReportsPanelProps) {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadReport(type: ReportType) {
    setActiveReport(type)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/payroll/periods/${periodId}/reports/${type}`)
      const data = await res.json()
      if (data.success) {
        setReportData(data)
      } else {
        setError(data.error || 'Failed to load report')
        setReportData(null)
      }
    } catch {
      setError('Failed to load report')
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    if (!reportData || !activeReport) return
    const config = REPORT_CONFIG[activeReport]
    const headers = config.columns.map((c) => c.label)
    const rows = reportData.rows.map((r) =>
      config.columns.map((c) => {
        const v = r[c.key]
        return typeof v === 'number' ? v.toFixed(2) : (v ?? '')
      })
    )
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeReport}-${periodName.replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const periodLabel = reportData
    ? `${MONTH_NAMES[reportData.period.month]} ${reportData.period.year}`
    : periodName

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-4">
      <h3 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">Payroll Reports</h3>

      {/* Report selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.entries(REPORT_CONFIG) as [ReportType, { label: string }][]).map(([type, cfg]) => (
          <button
            key={type}
            onClick={() => loadReport(type)}
            className={`px-3 py-1.5 text-xs rounded-lg border ${
              activeReport === type
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">Loading report…</div>}
      {error && <div className="text-center py-4 text-red-500 text-sm">{error}</div>}

      {!loading && reportData && activeReport && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {REPORT_CONFIG[activeReport].label} — {periodLabel} — {reportData.period.businessName}
            </p>
            <button
              onClick={exportCsv}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {REPORT_CONFIG[activeReport].columns.map((col) => (
                    <th key={col.key} className="px-2 py-1.5 text-left border-b border-gray-200 dark:border-gray-700 font-medium text-gray-600 dark:text-gray-300">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {reportData.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-900 dark:text-gray-100">
                    {REPORT_CONFIG[activeReport].columns.map((col) => (
                      <td key={col.key} className="px-2 py-1">
                        {typeof row[col.key] === 'number'
                          ? fmt(row[col.key] as number)
                          : (row[col.key] as string) || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                  {REPORT_CONFIG[activeReport].columns.map((col, i) => (
                    <td key={col.key} className="px-2 py-1.5">
                      {i === 0
                        ? 'TOTALS'
                        : reportData.totals[col.key] != null
                        ? fmt(reportData.totals[col.key])
                        : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          {reportData.rows.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
              No captured payslips found for this period. Capture payslips first.
            </p>
          )}
        </>
      )}
    </div>
  )
}
