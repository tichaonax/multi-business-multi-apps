'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ListSearchFilterBar } from '@/components/ui/list-search-filter-bar'
import { getPresetDateRange, type DatePreset } from '@/lib/date-presets'

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type Tab = 'pending-submissions' | 'pending-payments' | 'overdue'

const TAB_LABELS: Record<Tab, string> = {
  'pending-submissions': '📋 Pending Submissions',
  'pending-payments': '💰 Pending Payments',
  overdue: '⚠️ Overdue',
}

export default function ContractorPaymentsReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { currentBusinessId } = useBusinessPermissionsContext()

  const [tab, setTab] = useState<Tab>('pending-submissions')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset | undefined>(undefined)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  const formatDate = (d: string) => new Date(d).toLocaleDateString()

  const fetchReport = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId, tab })
      if (search) params.set('search', search)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const res = await fetch(`/api/vehicle-service/contractors/payments-report?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load report')
      setItems(data.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, tab, search, dateFrom, dateTo])

  useEffect(() => { fetchReport() }, [fetchReport])

  const applyPreset = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const range = getPresetDateRange(preset)
    setDateFrom(range.from)
    setDateTo(range.to)
    setDatePreset(preset)
  }

  const clearDates = () => {
    setDateFrom('')
    setDateTo('')
    setDatePreset(undefined)
  }

  const exportCsv = () => {
    if (tab === 'pending-payments') {
      const csv = toCsv(
        ['Contractor', 'Voucher', 'Jobs', 'Amount', 'Created', 'Due Date', 'Days Overdue', 'Status'],
        items.map(i => [i.contractorName, i.voucherNumber, i.taskCount, i.amount.toFixed(2), formatDate(i.createdAt), formatDate(i.dueDate), Math.max(0, i.daysOverdue), i.paymentStatus])
      )
      downloadCsv('contractor-pending-payments.csv', csv)
    } else if (tab === 'pending-submissions') {
      const csv = toCsv(
        ['Contractor', 'Order', 'Vehicle', 'Service', 'Amount', 'Completed', 'Due Date', 'Days Overdue'],
        items.map(i => [i.contractorName, i.orderNumber, i.vehicle || '', i.serviceName, i.amount.toFixed(2), formatDate(i.completedAt), formatDate(i.dueDate), Math.max(0, i.daysOverdue)])
      )
      downloadCsv('contractor-pending-submissions.csv', csv)
    } else {
      const csv = toCsv(
        ['Type', 'Contractor', 'Reference', 'Amount', 'Due Date', 'Days Overdue'],
        items.map(i => [
          i.type === 'payment' ? 'Payment' : 'Submission',
          i.contractorName,
          i.type === 'payment' ? i.voucherNumber : `${i.orderNumber} — ${i.serviceName}`,
          i.amount.toFixed(2),
          formatDate(i.dueDate),
          Math.max(0, i.daysOverdue),
        ])
      )
      downloadCsv('contractor-overdue-payments.csv', csv)
    }
  }

  const totalAmount = items.reduce((sum, i) => sum + Number(i.amount), 0)
  const overdueCount = items.filter(i => i.isOverdue).length

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Loading...</div>
  }
  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <ContentLayout title="Contractor Payments Report" subtitle="Pending submissions, pending payments, and overdue contractor work">
      <div className="max-w-6xl mx-auto print:max-w-full">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Link href="/vehicle-service/contractors" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">← Back to Contractors</Link>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              📊 CSV Export
            </button>
            <button onClick={() => window.print()} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 print:hidden">
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border ${tab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="mb-4 print:hidden">
          <ListSearchFilterBar
            onSearchChange={setSearch}
            searchPlaceholder="Search by contractor, vehicle, order, or voucher..."
            dateFrom={dateFrom}
            dateTo={dateTo}
            datePreset={datePreset}
            onPresetClick={applyPreset}
            onFromChange={v => { setDateFrom(v); setDatePreset('custom') }}
            onToChange={v => { setDateTo(v); setDatePreset('custom') }}
            onClearDates={clearDates}
          />
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">{error}</div>}
        {loading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}

        {!loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-3 text-center">
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{items.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tab === 'pending-payments' ? 'Vouchers' : 'Jobs'}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-3 text-center">
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-3 text-center">
                <p className={`text-xl font-semibold ${overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{overdueCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Overdue</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {(tab === 'pending-payments'
                      ? ['Contractor', 'Voucher', 'Jobs', 'Amount', 'Created', 'Due Date', 'Status']
                      : tab === 'overdue'
                      ? ['Type', 'Contractor', 'Reference', 'Amount', 'Due Date', 'Days Overdue']
                      : ['Contractor', 'Order', 'Vehicle', 'Service', 'Amount', 'Completed', 'Due Date']
                    ).map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((i, idx) => (
                    <tr key={idx} className={i.isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : undefined}>
                      {tab === 'pending-payments' && (
                        <>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{i.contractorName}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 font-mono">{i.voucherNumber}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i.taskCount}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{formatCurrency(i.amount)}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{formatDate(i.createdAt)}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{formatDate(i.dueDate)}</td>
                          <td className="px-3 py-2">
                            {i.isOverdue ? (
                              <span className="text-red-600 dark:text-red-400 font-medium">{i.daysOverdue}d overdue</span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">{i.paymentStatus}</span>
                            )}
                          </td>
                        </>
                      )}
                      {tab === 'pending-submissions' && (
                        <>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{i.contractorName}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 font-mono">{i.orderNumber}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i.vehicle || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i.serviceName}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{formatCurrency(i.amount)}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{formatDate(i.completedAt)}</td>
                          <td className="px-3 py-2">
                            {i.isOverdue ? (
                              <span className="text-red-600 dark:text-red-400 font-medium">{formatDate(i.dueDate)}</span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">{formatDate(i.dueDate)}</span>
                            )}
                          </td>
                        </>
                      )}
                      {tab === 'overdue' && (
                        <>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i.type === 'payment' ? 'Payment' : 'Submission'}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{i.contractorName}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{i.type === 'payment' ? i.voucherNumber : `${i.orderNumber} — ${i.serviceName}`}</td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{formatCurrency(i.amount)}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{formatDate(i.dueDate)}</td>
                          <td className="px-3 py-2 text-red-600 dark:text-red-400 font-medium">{i.daysOverdue}d</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">Nothing to show.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  )
}
