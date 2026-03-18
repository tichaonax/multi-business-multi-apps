'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { generateCashAllocationPDF } from '@/lib/pdf-utils'

interface LineItem {
  id: string
  accountName: string
  sourceType: string
  reportedAmount: number | string
  actualAmount: number | string | null
  isChecked: boolean
  notes: string | null
}

interface Report {
  id: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'LOCKED'
  reportDate: string
  lockedAt: string | null
  lockedBy: string | null
  lockerName: string | null
  notes: string | null
}

interface DaySummary {
  date: string
  status: 'LOCKED' | 'IN_PROGRESS' | 'DRAFT' | 'NONE'
  totalReported: number
  totalActual: number
  ecocashBucket: number
}

interface Props {
  businessId: string
  businessType?: string           // e.g. 'restaurant' — used to build EOD report link
  lockedDate?: string | null      // passed from page — makes date read-only
  businessIdOverride?: string | null // passed from page — admin reconciling a specific business
}

const toNum = (v: number | string | null | undefined) =>
  v === null || v === undefined ? 0 : Number(v)

export function CashAllocationDailyReport({ businessId: propBusinessId, businessType, lockedDate, businessIdOverride }: Props) {
  const businessId = businessIdOverride || propBusinessId

  const today = new Date().toISOString().split('T')[0]
  // Default to yesterday — most likely to have completed EOD data
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const [date, setDate] = useState(lockedDate ?? yesterday)
  const [report, setReport] = useState<Report | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [allChecked, setAllChecked] = useState(false)
  const [readyToLock, setReadyToLock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locking, setLocking] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mismatches, setMismatches] = useState<string[]>([])
  const [confirmForceClose, setConfirmForceClose] = useState(false)
  // local edits: itemId → actualAmount string
  const [localAmounts, setLocalAmounts] = useState<Record<string, string>>({})

  const [canEdit, setCanEdit] = useState(false)
  useEffect(() => {
    fetch('/api/admin/pending-actions')
      .then(r => r.json())
      .then(d => setCanEdit(d.canApproveCashAlloc === true))
      .catch(() => setCanEdit(false))
  }, [])

  // Rent config — always shown as fixed read-only row so cashier knows how much to put in rent cash box
  const [rentConfig, setRentConfig] = useState<{ dailyTransferAmount: number; accountName: string } | null>(null)

  // Payroll auto-contribution for the selected date
  const [payrollContrib, setPayrollContrib] = useState<{ amount: number } | null>(null)

  // EOD report for this date — provides cashCounted (cash tendered to cashier) + link to reprint
  const [eodReport, setEodReport] = useState<{
    id: string
    cashCounted: number | null
    expectedCash: number | null
  } | null>(null)

  // Cash bucket summary (split by channel)
  const [bucketSummary, setBucketSummary] = useState<{ cashBalance: number; ecocashBalance: number; balance: number } | null>(null)
  useEffect(() => {
    if (!businessId) return
    fetch(`/api/cash-allocation/${businessId}/summary`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => d ? setBucketSummary({ cashBalance: d.cashBalance ?? d.balance, ecocashBalance: d.ecocashBalance ?? 0, balance: d.balance }) : null)
      .catch(() => {})
  }, [businessId])

  // 7-day overview state
  const [weekSummary, setWeekSummary] = useState<DaySummary[]>([])
  const [weekLoading, setWeekLoading] = useState(false)

  const isLocked = report?.status === 'LOCKED'

  // Build last-7-days date list (most recent first)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - i * 86400000)
    return d.toISOString().split('T')[0]
  })

  const loadReport = useCallback(async (d: string) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}?date=${d}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load')
      if (data.exists) {
        setReport(data.report)
        setLineItems(data.lineItems)
        setAllChecked(data.allChecked)
        setReadyToLock(data.readyToLock ?? data.allChecked)
        // Seed local amounts — use saved actualAmount if set, else default to reportedAmount
        const amounts: Record<string, string> = {}
        for (const li of data.lineItems as LineItem[]) {
          amounts[li.id] = li.actualAmount !== null ? String(li.actualAmount) : String(li.reportedAmount)
        }
        setLocalAmounts(amounts)
      } else {
        setReport(null)
        setLineItems([])
        setAllChecked(false)
        setLocalAmounts({})
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  // Fetch locked EOD report for the selected date to show cash tendered amount
  useEffect(() => {
    if (!businessId || !date) return
    setEodReport(null)
    fetch(`/api/reports/save?businessId=${businessId}&reportType=END_OF_DAY&reportDate=${date}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.existingReport) {
          setEodReport({
            id: d.existingReport.id,
            cashCounted: d.existingReport.cashCounted !== null ? Number(d.existingReport.cashCounted) : null,
            expectedCash: d.existingReport.expectedCash !== null ? Number(d.existingReport.expectedCash) : null,
          })
        }
      })
      .catch(() => {})
  }, [businessId, date])

  // Fetch rent config independently — shown as fixed read-only row so cashier knows cash box amount
  useEffect(() => {
    if (!businessId) return
    fetch(`/api/rent-account/${businessId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.hasRentAccount && d.config?.isActive) {
          setRentConfig({
            dailyTransferAmount: Number(d.config.dailyTransferAmount),
            accountName: d.account?.accountName ?? 'Rent Account',
          })
        } else {
          setRentConfig(null)
        }
      })
      .catch(() => {})
  }, [businessId])

  // Fetch cash bucket CASH/ECOCASH breakdown for the selected date
  const [dayBucket, setDayBucket] = useState<{ cashInflow: number; ecocashInflow: number } | null>(null)
  useEffect(() => {
    if (!businessId || !date) { setDayBucket(null); return }
    fetch(`/api/cash-bucket?businessId=${businessId}&date=${date}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setDayBucket({ cashInflow: Number(d.cashInflow ?? 0), ecocashInflow: Number(d.ecocashInflow ?? 0) })
        else setDayBucket(null)
      })
      .catch(() => setDayBucket(null))
  }, [businessId, date])

  // Fetch payroll auto-contribution for the selected date
  useEffect(() => {
    if (!businessId || !date) return
    setPayrollContrib(null)
    fetch(`/api/payroll/account/deposits?businessId=${businessId}&startDate=${date}T00:00:00Z&endDate=${date}T23:59:59Z&transactionType=EOD_AUTO_CONTRIBUTION&limit=1`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const deposit = d?.data?.deposits?.[0]
        if (deposit) setPayrollContrib({ amount: Number(deposit.amount) })
      })
      .catch(() => {})
  }, [businessId, date])

  // Auto-load 7-day overview on mount, then load yesterday's detail
  useEffect(() => {
    const loadWeek = async () => {
      setWeekLoading(true)
      try {
        const [results, bucketResults] = await Promise.all([
          Promise.all(last7Days.map(d => fetch(`/api/cash-allocation/${businessId}?date=${d}`).then(r => r.json()))),
          Promise.all(last7Days.map(d => fetch(`/api/cash-bucket?businessId=${businessId}&date=${d}`).then(r => r.ok ? r.json() : null).catch(() => null))),
        ])
        const summaries: DaySummary[] = results.map((data, i) => {
          const bucketData = bucketResults[i]
          const ecocashBucket = Number(bucketData?.ecocashInflow ?? 0)
          if (!data.exists) return { date: last7Days[i], status: 'NONE' as const, totalReported: 0, totalActual: 0, ecocashBucket }
          const items: LineItem[] = data.lineItems ?? []
          return {
            date: last7Days[i],
            status: data.report?.status ?? 'DRAFT',
            totalReported: items.reduce((s, li) => s + toNum(li.reportedAmount), 0),
            totalActual: items.reduce((s, li) => s + toNum(li.actualAmount), 0),
            ecocashBucket,
          }
        })
        setWeekSummary(summaries)
      } finally {
        setWeekLoading(false)
      }
    }
    loadWeek()
    loadReport(lockedDate ?? yesterday)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  // Refresh a single day in the 7-day overview after a change
  const refreshWeekRow = useCallback(async (d: string, items: LineItem[], status: Report['status']) => {
    setWeekSummary(prev => prev.map(row =>
      row.date === d ? {
        ...row,
        status,
        totalReported: items.reduce((s, li) => s + toNum(li.reportedAmount), 0),
        totalActual: items.reduce((s, li) => s + toNum(li.actualAmount), 0),
      } : row
    ))
  }, [])

  const generate = async () => {
    setError(null)
    setMismatches([])
    setLoading(true)
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate')
      setReport(data.report)
      setLineItems(data.lineItems)
      setAllChecked(data.allChecked)
        setReadyToLock(data.readyToLock ?? data.allChecked)
      const amounts: Record<string, string> = {}
      for (const li of data.lineItems as LineItem[]) {
        amounts[li.id] = li.actualAmount !== null ? String(li.actualAmount) : String(li.reportedAmount)
      }
      setLocalAmounts(amounts)
      refreshWeekRow(date, data.lineItems, data.report?.status ?? 'DRAFT')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const updateItem = async (itemId: string, isChecked: boolean, actualAmount: string | null, notes?: string) => {
    const parsed = actualAmount !== null && actualAmount !== '' ? parseFloat(actualAmount) : null
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked, actualAmount: parsed, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setLineItems(prev => prev.map(li => li.id === itemId ? { ...li, ...data.item } : li))
      setAllChecked(data.allChecked)
        setReadyToLock(data.readyToLock ?? data.allChecked)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const lockReport = async () => {
    if (!report) return
    setMismatches([])
    setLocking(true)
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}/${report.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.mismatches) setMismatches(data.mismatches)
        throw new Error(data.error ?? 'Failed to lock')
      }
      setReport(data.report)
      setLineItems(data.lineItems)
      refreshWeekRow(date, data.lineItems, data.report?.status ?? 'LOCKED')
      window.dispatchEvent(new CustomEvent('pending-actions:refresh'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLocking(false)
    }
  }

  const forceCloseReport = async () => {
    if (!report) return
    setConfirmForceClose(false)
    setLocking(true)
    try {
      const res = await fetch(`/api/cash-allocation/${businessId}/${report.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceClose: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to close')
      setReport(data.report)
      setLineItems(data.lineItems)
      refreshWeekRow(date, data.lineItems, data.report?.status ?? 'LOCKED')
      window.dispatchEvent(new CustomEvent('pending-actions:refresh'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLocking(false)
    }
  }

  const buildPDFData = () => ({
    reportDate: date,
    lockedAt: report?.lockedAt ?? undefined,
    lockerName: report?.lockerName ?? undefined,
    cashTendered,
    rentConfig,
    payrollContrib,
    lineItems: lineItems.map(li => ({
      accountName: li.accountName,
      sourceType: li.sourceType,
      reportedAmount: toNum(li.reportedAmount),
      actualAmount: li.actualAmount !== null ? toNum(li.actualAmount) : null,
    })),
    businessKeeps,
  })

  const handleExportPDF = (action: 'save' | 'print') => {
    if (!report) return
    setPdfGenerating(true)
    try {
      generateCashAllocationPDF(buildPDFData(), `CashAllocation_${date}.pdf`, action)
    } finally {
      setPdfGenerating(false)
    }
  }

  const sourceLabel = (t: string) =>
    t === 'EOD_RENT_TRANSFER' ? 'Rent Transfer' :
    t === 'EOD_AUTO_DEPOSIT' ? 'Auto Deposit' : t

  const rentAmount = rentConfig ? Number(rentConfig.dailyTransferAmount) : 0
  const payrollAmount = payrollContrib?.amount ?? 0
  const nonRentItems = lineItems.filter(li => li.sourceType !== 'EOD_RENT_TRANSFER')
  const totalReported = rentAmount + payrollAmount + nonRentItems.reduce((s, li) => s + toNum(li.reportedAmount), 0)
  const checkedDepositTotal = nonRentItems.reduce((s, li) =>
    li.isChecked ? s + toNum(localAmounts[li.id] !== '' ? parseFloat(localAmounts[li.id]) : li.actualAmount) : s, 0)
  const totalActual = rentAmount + payrollAmount + checkedDepositTotal

  // Cash distribution: cashTendered − rent − payroll − checked deposits = business keeps
  const cashTendered = eodReport?.cashCounted ?? null
  const businessKeeps = cashTendered !== null ? cashTendered - rentAmount - payrollAmount - checkedDepositTotal : null

  const statusBadge = (s: DaySummary['status']) => {
    const map = {
      LOCKED:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
      DRAFT:       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      NONE:        'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
    }
    const label = { LOCKED: '🔒 Locked', IN_PROGRESS: '⏳ In Progress', DRAFT: '📝 Draft', NONE: '— None' }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s]}`}>{label[s]}</span>
  }

  return (
    <div className="space-y-6">

      {/* 7-day overview */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Last 7 Days</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">Click a row to view · use date picker for older reports</span>
        </div>
        {weekLoading ? (
          <div className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500">Loading overview…</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
            <thead className="bg-white dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reported</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-teal-600 dark:text-teal-400 uppercase">📱 EcoCash</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
              {weekSummary.map(row => (
                <tr
                  key={row.date}
                  onClick={lockedDate ? undefined : () => { setDate(row.date); setReport(null); setLineItems([]); setError(null); loadReport(row.date) }}
                  className={`transition-colors ${!lockedDate ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10' : 'cursor-default'} ${date === row.date ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200">{row.date}</td>
                  <td className="px-4 py-2">{statusBadge(row.status)}</td>
                  <td className="px-4 py-2 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                    {row.totalReported > 0 ? `$${row.totalReported.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                    {row.totalActual > 0 ? `$${row.totalActual.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-mono text-teal-600 dark:text-teal-400">
                    {row.ecocashBucket > 0 ? `$${row.ecocashBucket.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Date picker + actions */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Report Date
          </label>
          <input
            type="date"
            value={date}
            max={today}
            readOnly={!!lockedDate}
            disabled={!!lockedDate}
            onChange={lockedDate ? undefined : e => {
              setDate(e.target.value)
              setReport(null)
              setLineItems([])
              setError(null)
            }}
            className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
              ${lockedDate
                ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}
          />
        </div>
        <button
          onClick={generate}
          disabled={loading || isLocked}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading…' : report ? 'Refresh Report' : 'Generate Report'}
        </button>
        {!report && !loading && (
          <button
            onClick={() => loadReport(date)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Load Existing
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {isLocked && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <span className="font-semibold">🔒 Report Locked</span>
              {report?.lockedAt && (
                <span className="text-gray-500 dark:text-gray-400">
                  — {new Date(report.lockedAt).toLocaleString()}
                  {report.lockerName && ` · by ${report.lockerName}`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {eodReport?.id && businessType && (
                <Link
                  href={`/${businessType}/reports/saved/${eodReport.id}`}
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  📋 View EOD Report
                </Link>
              )}
              <button
                onClick={() => handleExportPDF('print')}
                disabled={pdfGenerating}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-md text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
              >
                {pdfGenerating ? '⏳' : '🖨️'} Print
              </button>
              <button
                onClick={() => handleExportPDF('save')}
                disabled={pdfGenerating}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-md text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
              >
                {pdfGenerating ? '⏳' : '📄'} Save PDF
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            To reprint: click any date in the overview above to reload a past report, then use Print / Save PDF.
          </p>
        </div>
      )}

      {report && lineItems.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No EOD deposits found for {date}. Run EOD reports first, then generate this report.
        </p>
      )}

      {/* Cash distribution summary — shows cash tendered and where it all goes */}
      {(cashTendered !== null || rentConfig || lineItems.length > 0) && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cash Distribution</h3>
            {dayBucket !== null && (dayBucket.cashInflow > 0 || dayBucket.ecocashInflow > 0) && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500 dark:text-gray-400">🪣 Deposited {date}:</span>
                <span className="text-emerald-700 dark:text-emerald-300">💵 <span className="font-semibold">${dayBucket.cashInflow.toFixed(2)}</span></span>
                {dayBucket.ecocashInflow > 0 && (
                  <span className="text-teal-700 dark:text-teal-300">📱 EcoCash <span className="font-semibold">${dayBucket.ecocashInflow.toFixed(2)}</span></span>
                )}
                <span className="text-gray-500 dark:text-gray-400">= <span className="font-semibold text-gray-700 dark:text-gray-300">${(dayBucket.cashInflow + dayBucket.ecocashInflow).toFixed(2)}</span></span>
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
            {/* Cash tendered */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">💵 Cash Tendered (from EOD report)</span>
              <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                {cashTendered !== null ? `$${cashTendered.toFixed(2)}` : <span className="text-gray-400 italic">No EOD report locked for {date}</span>}
              </span>
            </div>
            {/* Rent deduction */}
            {rentConfig && (
              <div className="flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-orange-900/10">
                <span className="text-sm text-orange-700 dark:text-orange-300">🏠 Less: Rent Transfer ({rentConfig.accountName})</span>
                <span className="text-sm font-mono font-semibold text-orange-700 dark:text-orange-300">
                  −${rentAmount.toFixed(2)}
                </span>
              </div>
            )}
            {/* Payroll contribution deduction */}
            {payrollContrib && payrollContrib.amount > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/10">
                <span className="text-sm text-blue-700 dark:text-blue-300">💼 Less: Payroll Contribution</span>
                <span className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300">
                  −${payrollContrib.amount.toFixed(2)}
                </span>
              </div>
            )}
            {/* Auto-deposit deductions (only checked items) */}
            {nonRentItems.filter(li => li.isChecked).map(li => {
              const amt = localAmounts[li.id] !== '' ? parseFloat(localAmounts[li.id] || '0') : toNum(li.actualAmount)
              return (
                <div key={li.id} className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/10">
                  <span className="text-sm text-blue-700 dark:text-blue-300">🏦 Less: {li.accountName}</span>
                  <span className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300">
                    −${amt.toFixed(2)}
                  </span>
                </div>
              )
            })}
            {/* Divider + Business Keeps */}
            <div className={`flex items-center justify-between px-4 py-3 ${
              businessKeeps === null ? 'bg-gray-50 dark:bg-gray-800' :
              businessKeeps >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <span className={`text-sm font-semibold ${
                businessKeeps === null ? 'text-gray-500 dark:text-gray-400' :
                businessKeeps >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'
              }`}>
                {businessKeeps === null ? '= Business Keeps' : businessKeeps >= 0 ? '✅ Business Keeps' : '⚠ Business Keeps'}
              </span>
              <span className={`text-base font-mono font-bold ${
                businessKeeps === null ? 'text-gray-400' :
                businessKeeps >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'
              }`}>
                {businessKeeps !== null ? `$${businessKeeps.toFixed(2)}` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {nonRentItems.length > 0 && !isLocked && !allChecked && canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              const updates = nonRentItems
                .filter(li => !li.isChecked)
                .map(li => {
                  const rep = toNum(li.reportedAmount)
                  const amt = localAmounts[li.id] || String(rep)
                  setLocalAmounts(prev => ({ ...prev, [li.id]: amt }))
                  return updateItem(li.id, true, amt)
                })
              Promise.all(updates).catch(() => {})
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md"
          >
            ✅ Mark all amounts done
          </button>
        </div>
      )}

      {!canEdit && !isLocked && report && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          👁️ <span className="font-semibold">View only</span> — you do not have permission to confirm or lock this report.
        </div>
      )}

      {(lineItems.length > 0 || rentConfig) && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reported $</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Done</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actual $</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Rent row — always first, always read-only, tells cashier how much to move to rent cash box */}
              {rentConfig && (
                <tr className="bg-orange-50 dark:bg-orange-900/10">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {rentConfig.accountName}
                    <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 font-normal">🏠 move to rent cash box</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-orange-600 dark:text-orange-400">
                    Rent Transfer
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-orange-700 dark:text-orange-300">
                    ${Number(rentConfig.dailyTransferAmount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span title="Rent is a fixed physical cash move" className="text-orange-500 text-sm">🏠</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono font-semibold text-orange-700 dark:text-orange-300">
                      ${Number(rentConfig.dailyTransferAmount).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-orange-600 dark:text-orange-400">
                    Fixed — put in rent cash box
                  </td>
                </tr>
              )}
              {/* Payroll row — read-only, shows auto-contribution made during EOD */}
              {payrollContrib && payrollContrib.amount > 0 && (
                <tr className="bg-blue-50 dark:bg-blue-900/10">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    Payroll Account
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-normal">💼 transferred during EOD</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">Payroll Contribution</td>
                  <td className="px-4 py-3 text-sm text-right font-mono font-semibold text-blue-700 dark:text-blue-300">
                    ${payrollContrib.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span title="Payroll contribution is automatic" className="text-blue-500 text-sm">💼</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300">
                      ${payrollContrib.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-blue-600 dark:text-blue-400">Auto — transferred to payroll</td>
                </tr>
              )}
              {lineItems.filter(item => item.sourceType !== 'EOD_RENT_TRANSFER').map(item => {
                const isRent = item.sourceType === 'EOD_RENT_TRANSFER'
                const localAmt = localAmounts[item.id] ?? (item.actualAmount !== null ? String(item.actualAmount) : '')
                const parsedActual = localAmt !== '' ? parseFloat(localAmt) : null
                const reported = toNum(item.reportedAmount)
                const matches = parsedActual !== null && Math.abs(parsedActual - reported) <= 0.009
                const mismatch = parsedActual !== null && !matches

                return (
                  <tr key={item.id} className={isRent ? 'bg-orange-50 dark:bg-orange-900/10' : item.isChecked ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.accountName}
                      {isRent && <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 font-normal">🏠 cash box</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {sourceLabel(item.sourceType)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-900 dark:text-gray-100">
                      ${reported.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isRent ? (
                        <span title="Rent is pre-confirmed" className="text-orange-500 text-sm">🏠</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.isChecked}
                          disabled={isLocked || !canEdit}
                          onChange={e => {
                            if (!canEdit) return
                            const checked = e.target.checked
                            updateItem(item.id, checked, localAmt || null)
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isRent ? (
                        <span className="text-sm font-mono text-orange-700 dark:text-orange-300 font-semibold">
                          ${reported.toFixed(2)}
                        </span>
                      ) : isLocked || !canEdit ? (
                        <span className={`text-sm font-mono ${matches ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {parsedActual !== null ? `$${parsedActual.toFixed(2)}` : `$${reported.toFixed(2)}`}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={localAmt}
                          onChange={e => setLocalAmounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                          onBlur={() => {
                            if (localAmt !== (item.actualAmount !== null ? String(item.actualAmount) : '')) {
                              updateItem(item.id, item.isChecked, localAmt || null)
                            }
                          }}
                          placeholder={reported.toFixed(2)}
                          className={`w-28 border rounded px-2 py-1 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100
                            ${mismatch ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600' : ''}
                            ${matches ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : ''}
                            ${!mismatch && !matches ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700' : ''}
                          `}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {isRent ? <span className="text-orange-600 dark:text-orange-400 text-xs">Fixed — put in rent cash box</span> : (item.notes ?? '')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <td colSpan={2} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Total Withdrawn</td>
                <td className="px-4 py-2 text-right text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">${totalReported.toFixed(2)}</td>
                <td />
                <td className="px-4 py-2 text-right text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">${totalActual.toFixed(2)}</td>
                <td />
              </tr>
              {businessKeeps !== null && (
                <tr className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-300 dark:border-blue-700">
                  <td colSpan={2} className="px-4 py-3 text-sm font-bold text-blue-800 dark:text-blue-200">
                    🏦 Remains in Business Cash Drawer
                  </td>
                  <td />
                  <td />
                  <td className="px-4 py-3 text-right text-sm font-bold font-mono text-blue-800 dark:text-blue-200">
                    ${businessKeeps.toFixed(2)}
                  </td>
                  <td />
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}

      {mismatches.length > 0 && (
        <ul className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 p-3 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
          {mismatches.map((m, i) => <li key={i}>⚠ {m}</li>)}
        </ul>
      )}

      {report && !isLocked && canEdit && (
        <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
          {/* Close Without Deductions — only shown when NO deductions are confirmed yet */}
          {!readyToLock && (
            <div>
              {confirmForceClose ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    {lineItems.some(li => li.isChecked)
                      ? `${lineItems.filter(li => li.isChecked).length} confirmed deduction(s) totalling $${lineItems.filter(li => li.isChecked).reduce((s, li) => s + Number(li.actualAmount ?? li.reportedAmount), 0).toFixed(2)} will be IGNORED. Lock anyway?`
                      : 'No deductions confirmed — all cash stays in the drawer. Lock report?'}
                  </span>
                  <button
                    onClick={forceCloseReport}
                    disabled={locking}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded"
                  >
                    Yes, Lock Anyway
                  </button>
                  <button
                    onClick={() => setConfirmForceClose(false)}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmForceClose(true)}
                  disabled={locking}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-md"
                >
                  Close Without Deductions
                </button>
              )}
            </div>
          )}
          {readyToLock && (
            <div className="flex flex-col items-end gap-1">
              {!allChecked && lineItems.filter(li => li.sourceType !== 'EOD_RENT_TRANSFER' && !li.isChecked).length > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠ {lineItems.filter(li => li.sourceType !== 'EOD_RENT_TRANSFER' && !li.isChecked).length} unchecked item(s) will be skipped today
                </span>
              )}
              <button
                onClick={lockReport}
                disabled={locking}
                className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {locking ? 'Locking…' : '🔒 Lock Report for ' + date}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
