'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { DateRangeSelector, type DateRange } from './date-range-selector'
import { getLocalDateString } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'success' | 'warning' | 'danger' | 'info'

interface Insight {
  severity: Severity
  icon: string
  title: string
  detail: string
  metric?: string
  action?: string
}

interface SalesPayload {
  success: boolean
  summary: {
    totalSales: number
    totalExpenses: number
    grossMargin: number
    totalOrders: number
    averageOrderValue: number
  }
  topProducts: {
    byRevenue: Array<{ productName: string; emoji: string; revenue: number }>
    byUnits:   Array<{ productName: string; emoji: string; unitsSold: number }>
  }
  topCategories: Array<{ categoryPath: string; emoji: string; revenue: number }>
  dailySales: Array<{ date: string; sales: number; orderCount: number; expenses?: number }>
  productBreakdown:  Array<{ productName: string; emoji: string; revenue: number; percentage: number }>
  categoryBreakdown: Array<{ categoryPath: string; emoji: string; revenue: number; percentage: number }>
}

export interface FinancialInsightsReportProps {
  businessId: string
  businessType: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}
function fmtShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return fmt(n)
}
function pct(n: number) { return `${n.toFixed(1)}%` }

const COLOURS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#ec4899']
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function healthScore(margin: number) { return Math.max(0, Math.min(100, Math.round(margin * 2))) }

function dayOfWeekStats(daily: SalesPayload['dailySales']) {
  const agg: Record<number, { sales: number; orders: number; count: number }> = {}
  daily.forEach(d => {
    const idx = new Date(d.date + 'T00:00:00').getDay()
    if (!agg[idx]) agg[idx] = { sales: 0, orders: 0, count: 0 }
    agg[idx].sales  += d.sales
    agg[idx].orders += d.orderCount
    agg[idx].count  += 1
  })
  return DOW_LABELS.map((label, i) => ({
    day:       label,
    avgSales:  agg[i] ? Number((agg[i].sales  / agg[i].count).toFixed(2)) : 0,
    avgOrders: agg[i] ? Number((agg[i].orders / agg[i].count).toFixed(1)) : 0,
    hasDays:   !!agg[i],
  }))
}

function buildInsights(cur: SalesPayload, prev: SalesPayload | null): Insight[] {
  const ins: Insight[] = []
  const { totalSales, totalExpenses, grossMargin, totalOrders, averageOrderValue } = cur.summary
  const hasSales = totalSales > 0

  // ── 1. Margin health ──
  if (!hasSales) {
    ins.push({ severity: 'danger', icon: '⚠️', title: 'No sales recorded', detail: 'No revenue captured in this period. Verify POS is recording orders correctly.', action: 'Check POS configuration and test order flow' })
  } else if (grossMargin >= 50) {
    ins.push({ severity: 'success', icon: '🏆', title: 'Excellent profit margin', detail: `${pct(grossMargin)} margin means you keep over half of every dollar earned. Industry average for restaurants is 3–15%.`, metric: pct(grossMargin), action: 'Reinvest surplus into staff training or marketing to compound growth' })
  } else if (grossMargin >= 30) {
    ins.push({ severity: 'success', icon: '💚', title: 'Healthy profit margin', detail: `${pct(grossMargin)} margin is solid. You keep ${fmt(totalSales - totalExpenses)} from ${fmt(totalSales)} revenue.`, metric: pct(grossMargin), action: 'Look for opportunities to push to 40%+ by trimming discretionary spending' })
  } else if (grossMargin >= 15) {
    ins.push({ severity: 'warning', icon: '⚠️', title: 'Below-average margin', detail: `${pct(grossMargin)} margin means costs consume ${pct(100 - grossMargin)} of revenue. Targeted cost reduction is needed.`, metric: pct(grossMargin), action: 'Audit your top 3 expense categories and target a combined 10% reduction' })
  } else {
    ins.push({ severity: 'danger', icon: '🔴', title: 'Critical: very thin margin', detail: `${pct(grossMargin)} margin — every $1 of revenue leaves only ${(grossMargin / 100).toFixed(2)}¢ profit. Immediate expense review required.`, metric: pct(grossMargin), action: 'Identify and eliminate the single largest unnecessary cost item this week' })
  }

  // ── 2. Period-over-period ──
  if (prev && prev.summary.totalSales > 0) {
    const sGrowth = ((totalSales   - prev.summary.totalSales)   / prev.summary.totalSales)   * 100
    const eGrowth = prev.summary.totalExpenses > 0
      ? ((totalExpenses - prev.summary.totalExpenses) / prev.summary.totalExpenses) * 100
      : null
    const mDelta = grossMargin - prev.summary.grossMargin

    if (sGrowth > 5)
      ins.push({ severity: 'success', icon: '📈', title: 'Revenue growing', detail: `Sales up ${pct(sGrowth)} vs the previous period. Momentum is building.`, metric: `+${pct(sGrowth)}`, action: 'Identify what drove the increase and double down on it' })
    else if (sGrowth < -5)
      ins.push({ severity: 'danger', icon: '📉', title: 'Revenue declining', detail: `Sales fell ${pct(Math.abs(sGrowth))} vs previous period. Review menu mix, pricing and promotions.`, metric: pct(sGrowth), action: 'Run a limited-time promotion or loyalty incentive to recover volume' })

    if (eGrowth !== null && eGrowth > 10)
      ins.push({ severity: 'warning', icon: '💸', title: 'Expenses accelerating', detail: `Costs grew ${pct(eGrowth)} vs previous period — faster than revenue (${sGrowth >= 0 ? '+' : ''}${pct(sGrowth)}).`, metric: `+${pct(eGrowth)}`, action: 'Review new or increased expense items from the last period' })
    else if (eGrowth !== null && eGrowth < -5)
      ins.push({ severity: 'success', icon: '✂️', title: 'Cost reduction achieved', detail: `Expenses down ${pct(Math.abs(eGrowth))} vs previous period — excellent cost discipline.`, metric: pct(eGrowth) })

    if (mDelta > 3)
      ins.push({ severity: 'success', icon: '📊', title: 'Margin improving', detail: `Profit margin improved ${mDelta.toFixed(1)} percentage points vs the previous period.`, metric: `+${mDelta.toFixed(1)}pp` })
    else if (mDelta < -3)
      ins.push({ severity: 'warning', icon: '📊', title: 'Margin compressing', detail: `Margin fell ${Math.abs(mDelta).toFixed(1)} points vs previous period — costs growing faster than revenue.`, metric: `${mDelta.toFixed(1)}pp`, action: 'Review cost increases and consider menu price adjustments' })
  }

  // ── 3. Pareto analysis ──
  if (cur.productBreakdown.length >= 3) {
    const sorted = [...cur.productBreakdown].sort((a, b) => b.revenue - a.revenue)
    let cumRevenue = 0; let top80Count = 0
    for (const p of sorted) { cumRevenue += p.revenue; top80Count++; if (cumRevenue >= totalSales * 0.8) break }
    const focusItems = sorted.slice(0, Math.min(3, top80Count))
    ins.push({
      severity: 'info', icon: '🎯',
      title: `${top80Count} item${top80Count > 1 ? 's' : ''} drive 80% of revenue`,
      detail: `Your key sellers: ${focusItems.map(p => `${p.emoji} ${p.productName}`).join(', ')}.`,
      action: `Ensure ${focusItems[0]?.productName ?? 'top item'} is always in stock and prominently featured on menus`,
    })
    const lowItems = sorted.filter(p => p.percentage < 2)
    if (lowItems.length >= 3) {
      const lowTotal = lowItems.reduce((s, p) => s + p.percentage, 0)
      ins.push({
        severity: 'warning', icon: '🪦',
        title: `${lowItems.length} items below 2% of revenue each`,
        detail: `${lowItems.slice(0, 3).map(p => `${p.emoji} ${p.productName}`).join(', ')} together contribute only ${lowTotal.toFixed(0)}%. They tie up prep time and stock.`,
        action: 'Review low-performers: reprice, bundle with bestsellers, or remove from menu',
      })
    }
  }

  // ── 4. Average order value ──
  if (prev && prev.summary.averageOrderValue > 0 && averageOrderValue > 0) {
    const aovDelta = ((averageOrderValue - prev.summary.averageOrderValue) / prev.summary.averageOrderValue) * 100
    if (aovDelta > 5)
      ins.push({ severity: 'success', icon: '🛒', title: 'Customers spending more per order', detail: `Average order value up ${pct(aovDelta)} to ${fmt(averageOrderValue)}. Upselling is working.`, metric: fmt(averageOrderValue) })
    else if (aovDelta < -5)
      ins.push({ severity: 'warning', icon: '🛒', title: 'Average order value declining', detail: `Customers spending ${pct(Math.abs(aovDelta))} less per visit. Consider meal bundles or upsell prompts at checkout.`, metric: fmt(averageOrderValue), action: 'Add a "popular add-on" suggestion at POS checkout' })
  }

  return ins.slice(0, 8)
}

function buildWhatIf(cur: SalesPayload) {
  const { totalSales, totalExpenses, grossMargin } = cur.summary
  if (totalSales === 0) return []
  const profit = totalSales - totalExpenses
  return [
    { scenario: 'Cut expenses 5%',       newSales: totalSales,       newExp: totalExpenses * 0.95 },
    { scenario: 'Cut expenses 10%',      newSales: totalSales,       newExp: totalExpenses * 0.90 },
    { scenario: 'Grow revenue 10%',      newSales: totalSales * 1.10, newExp: totalExpenses },
    { scenario: 'Grow revenue 20%',      newSales: totalSales * 1.20, newExp: totalExpenses },
    { scenario: 'Cut 5% + grow 10%',     newSales: totalSales * 1.10, newExp: totalExpenses * 0.95 },
  ].map(w => {
    const newProfit = w.newSales - w.newExp
    const newMargin = w.newSales > 0 ? (newProfit / w.newSales * 100) : 0
    return { scenario: w.scenario, newMargin: newMargin.toFixed(1), newProfit, profitDelta: newProfit - profit }
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinancialInsightsReport({ businessId, businessType }: FinancialInsightsReportProps) {
  const router = useRouter()
  const [range, setRange] = useState<DateRange>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 29)
    return { start, end }
  })
  const [targetMargin, setTargetMargin] = useState(40)
  const [cur,     setCur]     = useState<SalesPayload | null>(null)
  const [prev,    setPrev]    = useState<SalesPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fetchPeriod = useCallback(async (startDate: string, endDate: string): Promise<SalesPayload | null> => {
    const tz  = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)
    const res = await fetch(`/api/business/${businessId}/sales-analytics?startDate=${startDate}&endDate=${endDate}&timezone=${tz}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.success ? data : null
  }, [businessId])

  useEffect(() => {
    if (!businessId) return
    let cancelled = false
    setLoading(true); setError(null)
    const startStr = getLocalDateString(range.start)
    const endStr   = getLocalDateString(range.end)
    const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000)) + 1
    const prevEnd   = new Date(range.start.getTime() - 86400000)
    const prevStart = new Date(prevEnd.getTime()  - (days - 1) * 86400000)
    Promise.all([
      fetchPeriod(startStr, endStr),
      fetchPeriod(getLocalDateString(prevStart), getLocalDateString(prevEnd)),
    ]).then(([c, p]) => {
      if (cancelled) return
      setCur(c); setPrev(p)
      if (!c) setError('No data returned for this period. Check that orders have been recorded.')
    }).catch(() => { if (!cancelled) setError('Failed to load analytics data.') })
    .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [businessId, range, fetchPeriod])

  // ── Derived values ──
  const insights   = cur ? buildInsights(cur, prev) : []
  const whatIf     = cur ? buildWhatIf(cur)         : []
  const score      = cur ? healthScore(cur.summary.grossMargin) : null
  const dowData    = cur ? dayOfWeekStats(cur.dailySales)        : []
  const topProds   = cur ? cur.productBreakdown.slice(0, 8)     : []

  const urgentIns  = insights.filter(i => i.severity === 'danger')
  const warningIns = insights.filter(i => i.severity === 'warning')
  const goodIns    = insights.filter(i => i.severity === 'success')

  const hasDowData = dowData.some(d => d.avgSales > 0)
  const bestDay    = [...dowData].sort((a, b) => b.avgSales - a.avgSales)[0]
  const worstDay   = [...dowData].filter(d => d.avgSales > 0).sort((a, b) => a.avgSales - b.avgSales)[0]

  const scoreColor = !score ? 'text-gray-500' : score >= 75 ? 'text-green-600 dark:text-green-400' : score >= 50 ? 'text-yellow-500 dark:text-yellow-400' : score >= 25 ? 'text-orange-500 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
  const scoreRing  = !score ? 'border-gray-300' : score >= 75 ? 'border-green-400' : score >= 50 ? 'border-yellow-400' : score >= 25 ? 'border-orange-400' : 'border-red-400'
  const scoreLabel = !score ? '' : score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Fair' : 'Critical'

  const sGrowth = cur && prev && prev.summary.totalSales   > 0 ? ((cur.summary.totalSales   - prev.summary.totalSales)   / prev.summary.totalSales)   * 100 : null
  const eGrowth = cur && prev && prev.summary.totalExpenses > 0 ? ((cur.summary.totalExpenses - prev.summary.totalExpenses) / prev.summary.totalExpenses) * 100 : null
  const mDelta  = cur && prev ? cur.summary.grossMargin - prev.summary.grossMargin : null

  const prevPeriodLabel = (() => {
    if (!cur) return ''
    const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000)) + 1
    const prevEnd   = new Date(range.start.getTime() - 86400000)
    const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000)
    return `${getLocalDateString(prevStart)} → ${getLocalDateString(prevEnd)}`
  })()

  // Break-even / target margin calculations
  const breakEvenRevenue  = cur ? cur.summary.totalExpenses : 0
  const revenueFor30      = cur ? cur.summary.totalExpenses / (1 - 0.30) : 0
  const expensesFor30     = cur ? cur.summary.totalSales * 0.70 : 0
  const revenueForTarget  = cur ? cur.summary.totalExpenses / (1 - targetMargin / 100) : 0
  const expensesForTarget = cur ? cur.summary.totalSales * (1 - targetMargin / 100) : 0

  const insightBg: Record<Severity, string> = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700',
    danger:  'bg-red-50   dark:bg-red-900/20   border-red-300   dark:border-red-700',
    info:    'bg-blue-50  dark:bg-blue-900/20  border-blue-300  dark:border-blue-700',
  }
  const insightText: Record<Severity, string> = {
    success: 'text-green-800 dark:text-green-300',
    warning: 'text-yellow-800 dark:text-yellow-300',
    danger:  'text-red-800 dark:text-red-300',
    info:    'text-blue-800 dark:text-blue-300',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* ── Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">← Back</button>
          <Link href={`/${businessType}/reports`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">← All Reports</Link>
        </div>
        <button onClick={() => window.print()} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">🖨️ Print Report</button>
      </div>

      {/* ── Title ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📊 Financial Insights Report</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Auto-generated analysis with actionable profit improvement opportunities — compares current period against the equivalent prior period.</p>
      </div>

      {/* ── Date Range ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Analysis Period</p>
        <DateRangeSelector value={range} onChange={setRange} />
        {prev && <p className="text-xs text-gray-400 mt-2">↕ Comparing to previous period: {prevPeriodLabel}</p>}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Crunching the numbers…</p>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-700 dark:text-red-300 font-medium">⚠️ {error}</p>
        </div>
      )}

      {/* ── Main Content ── */}
      {!loading && cur && (
        <>
          {/* ── Section 1: Health Score + P&L Summary ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

            {/* Health Score */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center gap-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Health Score</p>
              <div className={`w-28 h-28 rounded-full border-8 ${scoreRing} flex flex-col items-center justify-center`}>
                <span className={`text-4xl font-black leading-none ${scoreColor}`}>{score}</span>
                <span className={`text-[10px] font-bold ${scoreColor} uppercase tracking-widest mt-0.5`}>{scoreLabel}</span>
              </div>
              <p className="text-xs text-gray-400 text-center leading-tight">Based on your<br />{cur.summary.grossMargin.toFixed(1)}% profit margin</p>
            </div>

            {/* P&L metrics */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">P&amp;L Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {([
                  { label: 'Total Revenue',    value: fmt(cur.summary.totalSales),                       grow: sGrowth,  inverse: false, isMoney: true },
                  { label: 'Total Expenses',   value: fmt(cur.summary.totalExpenses),                    grow: eGrowth,  inverse: true,  isMoney: true },
                  { label: 'Net Profit',       value: fmt(cur.summary.totalSales - cur.summary.totalExpenses), grow: mDelta,  inverse: false, isDelta: true },
                  { label: 'Profit Margin',    value: `${cur.summary.grossMargin.toFixed(1)}%`,           grow: mDelta,   inverse: false, isDelta: true },
                  { label: 'Total Orders',     value: cur.summary.totalOrders.toLocaleString(),           grow: null },
                  { label: 'Avg Order Value',  value: fmt(cur.summary.averageOrderValue),                 grow: null },
                ] as Array<{ label: string; value: string; grow: number | null; inverse?: boolean; isDelta?: boolean; isMoney?: boolean }>).map(item => (
                  <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{item.label}</p>
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">{item.value}</p>
                    {item.grow !== null && item.grow !== undefined && (
                      <p className={`text-xs font-medium mt-0.5 ${
                        item.isDelta
                          ? (item.grow > 0 ? 'text-green-600' : item.grow < 0 ? 'text-red-500' : 'text-gray-400')
                          : (item.inverse ? (item.grow > 0 ? 'text-red-500' : 'text-green-600') : (item.grow > 0 ? 'text-green-600' : 'text-red-500'))
                      }`}>
                        {item.isDelta
                          ? `${item.grow > 0 ? '+' : ''}${item.grow.toFixed(1)}pp vs prev`
                          : `${item.grow > 0 ? '↑' : '↓'}${Math.abs(item.grow).toFixed(1)}% vs prev`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section 2: Auto-Generated Insights ── */}
          {insights.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                💡 {insights.length} Insight{insights.length > 1 ? 's' : ''} for this period
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((ins, i) => (
                  <div key={i} className={`border rounded-lg p-3 ${insightBg[ins.severity]}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5 shrink-0">{ins.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`font-semibold text-sm ${insightText[ins.severity]}`}>{ins.title}</p>
                          {ins.metric && <span className={`text-xs font-bold ${insightText[ins.severity]} shrink-0`}>{ins.metric}</span>}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">{ins.detail}</p>
                        {ins.action && <p className={`text-xs font-semibold mt-1.5 ${insightText[ins.severity]}`}>→ {ins.action}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section 3: Revenue Drivers ── */}
          {topProds.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                🍽️ Revenue Drivers — Top {topProds.length} Items
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={Math.max(180, topProds.length * 32)}>
                  <BarChart data={topProds} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => fmtShort(v)} />
                    <YAxis type="category" dataKey="productName" width={115} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v} />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((v: number) => [fmt(v), 'Revenue']) as any}
                      contentStyle={{ fontSize: 12, background: '#1f2937', border: 'none', color: '#f9fafb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {topProds.map((_, idx) => <Cell key={idx} fill={COLOURS[idx % COLOURS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 overflow-y-auto max-h-72">
                  {topProds.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLOURS[i % COLOURS.length] }} />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{p.emoji} {p.productName}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0">{fmt(p.revenue)}</span>
                      <span className="text-xs text-gray-400 w-12 text-right shrink-0">{p.percentage.toFixed(1)}%</span>
                      <div className="w-14 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 shrink-0">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, p.percentage)}%`, background: COLOURS[i % COLOURS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Section 4: Daily Revenue & Expense Trend ── */}
          {cur.dailySales.length >= 2 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">📅 Daily Revenue &amp; Expense Trend</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={cur.dailySales.map(d => ({
                  date: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                  sales: d.sales, expenses: d.expenses ?? 0,
                }))} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={v => fmtShort(v)} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((v: number, name: string) => [fmt(v), name === 'sales' ? 'Revenue' : 'Expenses']) as any}
                    contentStyle={{ fontSize: 12, background: '#1f2937', border: 'none', color: '#f9fafb', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="sales"    stroke="#8b5cf6" strokeWidth={2}   dot={false} name="sales" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="expenses" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-purple-500 rounded" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-red-400 rounded border-dashed" /> Expenses</span>
              </div>
            </div>
          )}

          {/* ── Section 5: Day-of-Week Performance ── */}
          {hasDowData && cur.dailySales.length >= 7 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">📆 Average Revenue by Day of Week</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  {bestDay  && <span className="text-green-600 dark:text-green-400 font-medium">🏆 Best: {bestDay.day} ({fmt(bestDay.avgSales)})</span>}
                  {worstDay && bestDay?.day !== worstDay.day && <span className="text-red-500 dark:text-red-400 font-medium">📉 Weakest: {worstDay.day} ({fmt(worstDay.avgSales)})</span>}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dowData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={v => fmtShort(v)} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip formatter={((v: number) => [fmt(v), 'Avg Revenue']) as any} contentStyle={{ fontSize: 12, background: '#1f2937', border: 'none', color: '#f9fafb', borderRadius: '8px' }} />
                  <Bar dataKey="avgSales" radius={[4, 4, 0, 0]}>
                    {dowData.map((d, i) => (
                      <Cell key={i} fill={d.day === bestDay?.day ? '#10b981' : d.day === worstDay?.day ? '#ef4444' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {bestDay && worstDay && bestDay.day !== worstDay.day && (
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p>💡 Staff up on <strong>{bestDay.day}s</strong> — your busiest trading day.</p>
                  <p>🎯 Consider a {worstDay.day} promotion (e.g. happy hour, special) to lift your weakest day.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Section 6: What-If Scenarios ── */}
          {whatIf.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">🔮 What-If Profit Scenarios</p>
              <p className="text-xs text-gray-400 mb-4">
                Baseline: {fmt(cur.summary.totalSales)} revenue · {fmt(cur.summary.totalExpenses)} expenses · {cur.summary.grossMargin.toFixed(1)}% margin · {fmt(cur.summary.totalSales - cur.summary.totalExpenses)} profit
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                      <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Scenario</th>
                      <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">New Margin</th>
                      <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">New Profit</th>
                      <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Profit Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatIf.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                        <td className="py-2.5 font-medium text-gray-800 dark:text-gray-200">{row.scenario}</td>
                        <td className={`py-2.5 text-right font-bold ${parseFloat(row.newMargin) > cur.summary.grossMargin ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{row.newMargin}%</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300">{fmt(row.newProfit)}</td>
                        <td className={`py-2.5 text-right font-semibold ${row.profitDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          {row.profitDelta >= 0 ? '+' : ''}{fmt(row.profitDelta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Section 7: Break-Even & Target Margin ── */}
          {cur.summary.totalSales > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">⚖️ Break-Even &amp; Target Margin Calculator</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Target margin:</label>
                  <select
                    value={targetMargin}
                    onChange={e => setTargetMargin(Number(e.target.value))}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {[15, 20, 25, 30, 35, 40, 45, 50].map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Break-even Revenue</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(breakEvenRevenue)}</p>
                  <p className="text-xs text-gray-400 mt-1">Min revenue to cover all expenses</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenue for {targetMargin}% margin</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(revenueForTarget)}</p>
                  <p className="text-xs text-gray-400 mt-1">Keep expenses flat, grow revenue here</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expenses for {targetMargin}% margin</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmt(expensesForTarget)}</p>
                  <p className="text-xs text-gray-400 mt-1">Keep revenue flat, cut expenses here</p>
                </div>
                <div className={`rounded-lg p-4 ${cur.summary.grossMargin >= targetMargin ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gap to {targetMargin}% target</p>
                  {cur.summary.grossMargin >= targetMargin ? (
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">✅ On target!</p>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{(targetMargin - cur.summary.grossMargin).toFixed(1)}pp short</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Need {fmt(revenueForTarget - cur.summary.totalSales)} more revenue<br />
                        OR cut {fmt(cur.summary.totalExpenses - expensesForTarget)} in expenses
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Section 8: Action Plan ── */}
          {(urgentIns.length > 0 || warningIns.length > 0 || goodIns.length > 0) && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">📋 Prioritised Action Plan</p>
              <div className="space-y-5">
                {urgentIns.length > 0 && urgentIns.some(i => i.action) && (
                  <div>
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-2">🔴 Immediate — this week</p>
                    <ul className="space-y-2">
                      {urgentIns.filter(i => i.action).map((ins, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-red-500 shrink-0 mt-0.5">•</span><span>{ins.action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {warningIns.length > 0 && warningIns.some(i => i.action) && (
                  <div>
                    <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase mb-2">🟡 This month</p>
                    <ul className="space-y-2">
                      {warningIns.filter(i => i.action).map((ins, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-yellow-500 shrink-0 mt-0.5">•</span><span>{ins.action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {goodIns.length > 0 && goodIns.some(i => i.action) && (
                  <div>
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-2">🟢 Strategic — keep doing</p>
                    <ul className="space-y-2">
                      {goodIns.filter(i => i.action).slice(0, 3).map((ins, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-green-500 shrink-0 mt-0.5">•</span><span>{ins.action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
