'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import Link from 'next/link'

interface RemittanceRow {
  id: string
  periodId: string
  year: number
  month: number
  periodStatus: string
  businessName: string
  employeeCount: number
  totalRemuneration: number
  grossPaye: number
  aidsLevy: number
  totalTaxDue: number
  levyRate: number
  manualOverride: boolean
  status: string
  levyProcessedAt: string | null
  levyProcessedBy: string | null
  submittedAt: string | null
  submittedBy: string | null
  paymentReference: string | null
}

interface Totals {
  totalGrossPaye: number
  totalAidsLevy: number
  totalTaxDue: number
  submittedTaxDue: number
  pendingCount: number
  levyProcessedCount: number
  submittedCount: number
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function periodLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    PENDING:        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    LEVY_PROCESSED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    SUBMITTED:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  }
  const label: Record<string, string> = {
    PENDING: 'Pending', LEVY_PROCESSED: 'Levy Processed', SUBMITTED: 'Submitted',
  }
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${cfg[status] || 'bg-gray-100 text-gray-700'}`}>
      {label[status] || status}
    </span>
  )
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtShort = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

export default function ZimraRemittancesPage() {
  const { status } = useSession()
  const router = useRouter()

  const [rows, setRows] = useState<RemittanceRow[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payroll/zimra', { credentials: 'include' })
      if (res.ok) {
        const d = await res.json()
        setRows(d.data || [])
        setTotals(d.totals || null)
      }
    } finally {
      setLoading(false)
    }
  }

  const filtered = statusFilter === 'ALL' ? rows : rows.filter(r => r.status === statusFilter)

  if (status === 'loading') return null

  return (
    <ContentLayout title="🏛️ ZIMRA Remittances" subtitle="P2 AIDS Levy and PAYE submission status across all payroll periods">
      <div className="space-y-6">

        <Link href="/payroll/account/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports Hub
        </Link>

        {/* KPI Cards */}
        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Gross PAYE</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{fmtShort(totals.totalGrossPaye)}</p>
              <p className="text-xs text-gray-400 mt-1">all periods</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-orange-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total AIDS Levy</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{fmtShort(totals.totalAidsLevy)}</p>
              <p className="text-xs text-gray-400 mt-1">employer cost</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Tax Due</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{fmtShort(totals.totalTaxDue)}</p>
              <p className="text-xs text-gray-400 mt-1">PAYE + Levy</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 dark:text-gray-400">Submitted to ZIMRA</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{fmtShort(totals.submittedTaxDue)}</p>
              <p className="text-xs text-gray-400 mt-1">{totals.submittedCount} period{totals.submittedCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        {/* Status filter + pending alert */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-wrap items-center gap-3">
          {(['ALL','PENDING','LEVY_PROCESSED','SUBMITTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {s === 'ALL' ? 'All Periods' : s === 'LEVY_PROCESSED' ? 'Levy Processed' : s.charAt(0) + s.slice(1).toLowerCase()}
              {totals && s === 'PENDING' && totals.pendingCount > 0 && (
                <span className="ml-1.5 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {totals.pendingCount}
                </span>
              )}
            </button>
          ))}

          {totals && totals.pendingCount > 0 && (
            <div className="ml-auto flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-1.5">
              <span>⚠</span>
              <span>{totals.pendingCount} period{totals.pendingCount !== 1 ? 's' : ''} pending submission</span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {rows.length === 0
                ? 'No ZIMRA remittances found. Open a payroll period and capture payslips to generate a ZIMRA record.'
                : 'No periods match the selected filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    {['Period', 'Employees', 'Total Remuneration', 'Gross PAYE', 'AIDS Levy', 'Total Tax Due', 'Status', 'Reference', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{periodLabel(row.year, row.month)}</p>
                        {row.businessName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{row.businessName}</p>
                        )}
                        {row.manualOverride && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">manual override</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.employeeCount}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmt(row.totalRemuneration)}</td>
                      <td className="px-4 py-3 text-red-700 dark:text-red-400 font-medium">{fmt(row.grossPaye)}</td>
                      <td className="px-4 py-3 text-orange-700 dark:text-orange-400">
                        {fmt(row.aidsLevy)}
                        <span className="ml-1 text-xs text-gray-400">({(row.levyRate * 100).toFixed(0)}%)</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{fmt(row.totalTaxDue)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                        {row.submittedAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(row.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {row.levyProcessedAt && row.status === 'LEVY_PROCESSED' && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(row.levyProcessedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {row.paymentReference || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/payroll/${row.periodId}`}
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                        >
                          Open Period →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filtered.length > 1 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-500">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100" colSpan={2}>Totals ({filtered.length} periods)</td>
                      <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">{fmt(filtered.reduce((s, r) => s + r.totalRemuneration, 0))}</td>
                      <td className="px-4 py-3 font-bold text-red-700 dark:text-red-400">{fmt(filtered.reduce((s, r) => s + r.grossPaye, 0))}</td>
                      <td className="px-4 py-3 font-bold text-orange-700 dark:text-orange-400">{fmt(filtered.reduce((s, r) => s + r.aidsLevy, 0))}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{fmt(filtered.reduce((s, r) => s + r.totalTaxDue, 0))}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* Help note */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-1">💡 How to process ZIMRA P2</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Open a payroll period and capture all employee payslips</li>
            <li>Go to the <strong>ZIMRA</strong> tab in the period — figures auto-calculate from captured slips</li>
            <li>Review and adjust the levy rate or override figures if needed</li>
            <li>Click <strong>Process AIDS Levy</strong> to debit the employer levy from the payroll account</li>
            <li>Submit the P2 form to ZIMRA and record the payment reference</li>
          </ol>
        </div>

      </div>
    </ContentLayout>
  )
}
