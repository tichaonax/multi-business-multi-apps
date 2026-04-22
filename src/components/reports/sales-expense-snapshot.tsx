'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getLocalDateString } from '@/lib/utils'
import Link from 'next/link'

interface DayData {
  date: string
  dateFormatted: string
  sales: number
  expenses: number
}

interface SummaryData {
  totalSales: number
  totalExpenses: number
  grossMargin: number
  totalOrders: number
}

interface SalesExpenseSnapshotProps {
  businessId: string
  businessType: string
}

type Period = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Returns colour + short label that explains what the margin band means */
function marginMeta(margin: number, hasSales: boolean) {
  if (!hasSales) return { color: 'text-gray-500 dark:text-gray-400', label: '' }
  if (margin < 0)  return { color: 'text-red-600 dark:text-red-400',    label: 'Loss' }
  if (margin < 20) return { color: 'text-orange-500 dark:text-orange-400', label: 'Low' }
  if (margin < 50) return { color: 'text-yellow-600 dark:text-yellow-400', label: 'OK' }
  return            { color: 'text-green-600 dark:text-green-400',      label: 'Good' }
}

function MiniTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const sales: number    = payload.find((p: any) => p.dataKey === 'sales')?.value ?? 0
  const expenses: number = payload.find((p: any) => p.dataKey === 'expenses')?.value ?? 0
  const margin = sales > 0 ? (((sales - expenses) / sales) * 100) : null
  const meta = margin !== null ? marginMeta(margin, true) : null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow p-2 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{label}</p>
      <p className="text-purple-600 dark:text-purple-400">Sales: {fmt(sales)}</p>
      <p className="text-red-500 dark:text-red-400">Expenses: {fmt(expenses)}</p>
      {meta && margin !== null && (
        <p className={`font-bold ${meta.color}`} title={
          margin < 0
            ? 'Expenses exceed sales — operating at a loss for this day'
            : margin < 20
            ? 'Low margin: profitable but expenses are eating most of revenue'
            : margin < 50
            ? 'Healthy margin'
            : 'Strong margin'
        }>
          Margin: {fmt(sales - expenses)}{' '}
          <span className="font-normal">({margin.toFixed(1)}%</span>
          {meta.label ? <span className="font-normal opacity-75">, {meta.label}</span> : null}
          <span className="font-normal">)</span>
        </p>
      )}
    </div>
  )
}

export function SalesExpenseSnapshot({ businessId, businessType }: SalesExpenseSnapshotProps) {
  const today     = getLocalDateString(new Date())
  const yesterday = getLocalDateString(new Date(Date.now() - 1  * 86400000))
  const minus7    = getLocalDateString(new Date(Date.now() - 6  * 86400000))
  const minus30   = getLocalDateString(new Date(Date.now() - 29 * 86400000))

  const [period,           setPeriod]           = useState<Period>('30d')
  const [customStart,      setCustomStart]      = useState(minus30)
  const [customEnd,        setCustomEnd]        = useState(today)
  const [chartData,        setChartData]        = useState<DayData[]>([])
  const [summary,          setSummary]          = useState<SummaryData | null>(null)
  const [loading,          setLoading]          = useState(true)
  const [expenseAccountId, setExpenseAccountId] = useState<string | null>(null)

  /** Derive start/end strings from the current period selection */
  const getRange = useCallback((): { startDate: string; endDate: string } => {
    if (period === 'today')     return { startDate: today,     endDate: today }
    if (period === 'yesterday') return { startDate: yesterday, endDate: yesterday }
    if (period === '7d')        return { startDate: minus7,    endDate: today }
    if (period === '30d')       return { startDate: minus30,   endDate: today }
    return { startDate: customStart, endDate: customEnd }
  }, [period, customStart, customEnd, today, yesterday, minus7, minus30])

  useEffect(() => {
    if (!businessId) return
    // Don't fetch for custom range until both dates are set and start ≤ end
    if (period === 'custom' && (!customStart || !customEnd || customStart > customEnd)) return

    let cancelled = false
    setLoading(true)

    const { startDate, endDate } = getRange()
    const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)

    fetch(`/api/business/${businessId}/sales-analytics?startDate=${startDate}&endDate=${endDate}&timezone=${tz}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.success) return
        if (data.expenseAccountId) setExpenseAccountId(data.expenseAccountId)
        const days: DayData[] = (data.dailySales ?? []).map((d: any) => ({
          date: d.date,
          dateFormatted: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, {
            month: 'short', day: 'numeric',
          }),
          sales:    d.sales    ?? 0,
          expenses: d.expenses ?? 0,
        }))
        setChartData(days)
        setSummary({
          totalSales:    data.summary?.totalSales    ?? 0,
          totalExpenses: data.summary?.totalExpenses ?? 0,
          grossMargin:   data.summary?.grossMargin   ?? 0,
          totalOrders:   data.summary?.totalOrders   ?? 0,
        })
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [businessId, period, customStart, customEnd])

  const hasExpenses = chartData.some((d) => d.expenses > 0)
  const meta = marginMeta(summary?.grossMargin ?? 0, (summary?.totalSales ?? 0) > 0)

  const { startDate: rangeStart, endDate: rangeEnd } = getRange()
  const salesLink    = `/${businessType}/reports/sales-analytics?startDate=${rangeStart}&endDate=${rangeEnd}`
  const expensesLink = expenseAccountId
    ? `/expense-accounts/${expenseAccountId}?tab=transactions&type=PAYMENT&startDate=${rangeStart}&endDate=${rangeEnd}`
    : `/expense-accounts?businessId=${businessId}`

  const periodLabel =
    period === 'today'     ? 'Today' :
    period === 'yesterday' ? 'Yesterday' :
    period === '7d'        ? 'Last 7 Days' :
    period === '30d'       ? 'Last 30 Days' :
    `${customStart} → ${customEnd}`

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
            Sales &amp; Expenses — {periodLabel}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/${businessType}/reports/financial-insights`}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium"
            title="Open financial insights & profit analysis"
          >
            📊 Insights →
          </Link>
          <Link
            href={`/${businessType}/reports/sales-analytics`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Full report →
          </Link>
        </div>
      </div>

      {/* Period toggle */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {([
          { key: 'today',     label: 'Today' },
          { key: 'yesterday', label: 'Yesterday' },
          { key: '7d',        label: '7 Days' },
          { key: '30d',       label: '30 Days' },
          { key: 'custom',    label: 'Custom' },
        ] as { key: Period; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              period === key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}

        {period === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={today}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            />
          </div>
        )}
      </div>

      {/* Summary chips */}
      {loading ? (
        <div className="flex gap-3 mb-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28" />
          ))}
        </div>
      ) : summary ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-sm items-center">
          <Link
            href={salesLink}
            className="text-purple-600 dark:text-purple-400 font-medium hover:underline"
            title="Click to view full sales report for this period"
          >
            Sales: {fmt(summary.totalSales)}
          </Link>
          {hasExpenses && (
            <Link
              href={expensesLink}
              className="text-red-500 dark:text-red-400 font-medium hover:underline"
              title="Click to view expense accounts overview for this period"
            >
              Expenses: {fmt(summary.totalExpenses)}
            </Link>
          )}
          {hasExpenses && summary.totalSales > 0 && (
            <Link
              href={salesLink}
              className={`font-bold ${meta.color} hover:underline`}
              title={
                summary.grossMargin < 0
                  ? 'Loss: total expenses exceed total sales for this period — click to drill down'
                  : summary.grossMargin < 20
                  ? 'Low margin: profitable but less than 20¢ kept per $1 of sales — click to drill down'
                  : summary.grossMargin < 50
                  ? 'Healthy margin (20–49%) — click to drill down'
                  : 'Strong margin (≥50%) — click to drill down'
              }
            >
              Margin: {fmt(summary.totalSales - summary.totalExpenses)}{' '}
              <span className="text-xs font-normal">({summary.grossMargin}%</span>
              <span className="text-xs font-normal opacity-75">, {meta.label}</span>
              <span className="text-xs font-normal">)</span>
            </Link>
          )}
          <span className="text-gray-500 dark:text-gray-400 text-xs">
            {summary.totalOrders} orders
          </span>
        </div>
      ) : null}

      {/* Margin legend — always visible so users understand the colour scale */}
      <div className="flex gap-3 mb-2 text-xs text-gray-400 dark:text-gray-500">
        <span className="text-green-600 dark:text-green-400">● Good ≥50%</span>
        <span className="text-yellow-600 dark:text-yellow-400">● OK 20–49%</span>
        <span className="text-orange-500 dark:text-orange-400">● Low &lt;20%</span>
        <span className="text-red-600 dark:text-red-400">● Loss &lt;0%</span>
      </div>

      {/* Sparkline */}
      {!loading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<MiniTooltip />} />
            <Line type="monotone" dataKey="sales"    stroke="#8b5cf6" strokeWidth={2}   dot={false} name="Sales" />
            {hasExpenses && (
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Expenses" />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {!loading && chartData.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">
          No data for this period
        </p>
      )}
    </div>
  )
}
