'use client'

import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDate } from '@/lib/date-format'
import { ModalPortal } from '@/components/ui/modal-portal'
import type { DailySalesData } from './daily-sales-widget'

type ReportView = 'today' | 'yesterday' | 'dayBefore' | 'comparison'

interface SalesComparisonReportModalProps {
  isOpen: boolean
  onClose: () => void
  initialView: ReportView
  dailySales: DailySalesData | null
  yesterdaySales?: any
  dayBeforeYesterdaySales?: any
  businessType?: string
}

const DAY_COLORS: Record<'today' | 'yesterday' | 'dayBefore', string> = {
  today: '#8b5cf6',
  yesterday: '#3b82f6',
  dayBefore: '#f59e0b',
}

function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12} ${period}`
}

function buildComparisonData(today: any, yesterday: any, dayBefore: any) {
  const hours = new Set<number>()
  ;[today, yesterday, dayBefore].forEach(d => {
    (d?.hourlyBreakdown || []).forEach((h: any) => hours.add(h.hour))
  })
  if (hours.size === 0) return []

  const min = Math.min(...Array.from(hours))
  const max = Math.max(...Array.from(hours))
  const todayMap = new Map((today?.hourlyBreakdown || []).map((h: any) => [h.hour, h]))
  const yMap = new Map((yesterday?.hourlyBreakdown || []).map((h: any) => [h.hour, h]))
  const dbMap = new Map((dayBefore?.hourlyBreakdown || []).map((h: any) => [h.hour, h]))

  const rows = []
  for (let h = min; h <= max; h++) {
    rows.push({
      hour: h,
      hourLabel: formatHour(h),
      today: (todayMap.get(h) as any)?.sales ?? 0,
      yesterday: (yMap.get(h) as any)?.sales ?? 0,
      dayBefore: (dbMap.get(h) as any)?.sales ?? 0,
      todayOrders: (todayMap.get(h) as any)?.orders ?? 0,
      yesterdayOrders: (yMap.get(h) as any)?.orders ?? 0,
      dayBeforeOrders: (dbMap.get(h) as any)?.orders ?? 0,
    })
  }
  return rows
}

function buildSingleDayHourly(data: any) {
  return (data?.hourlyBreakdown || [])
    .slice()
    .sort((a: any, b: any) => a.hour - b.hour)
    .map((h: any) => ({ hour: h.hour, hourLabel: formatHour(h.hour), sales: h.sales, orders: h.orders }))
}

function ComparisonTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {metric === 'sales' ? `$${Number(p.value).toFixed(2)}` : p.value}
        </p>
      ))}
    </div>
  )
}

function SummaryCards({ data }: { data: any }) {
  const s = data?.summary
  if (!s) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Sales</div>
        <div className="text-lg font-bold text-green-600 dark:text-green-400">${Number(s.totalSales || 0).toFixed(2)}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Orders</div>
        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{s.totalOrders}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Order</div>
        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">${Number(s.averageOrderValue || 0).toFixed(2)}</div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tax / Discount</div>
        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">${Number(s.totalTax || 0).toFixed(2)} / ${Number(s.totalDiscount || 0).toFixed(2)}</div>
      </div>
    </div>
  )
}

function BreakdownTables({ data }: { data: any }) {
  const paymentMethods = data?.paymentMethods || {}
  const categoryBreakdown = data?.categoryBreakdown || []
  const employeeSales = data?.employeeSales || []

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Payment Methods</h4>
        <div className="space-y-1">
          {Object.entries(paymentMethods).length === 0 && <p className="text-xs text-gray-400">No data</p>}
          {Object.entries(paymentMethods).map(([method, v]: [string, any]) => (
            <div key={method} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{method} ({v.count})</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">${Number(v.total).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Top Categories</h4>
        <div className="space-y-1">
          {categoryBreakdown.length === 0 && <p className="text-xs text-gray-400">No data</p>}
          {categoryBreakdown.slice(0, 5).map((c: any) => (
            <div key={c.name} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{c.name}</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">${Number(c.totalSales).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Top Salespeople</h4>
        <div className="space-y-1">
          {employeeSales.length === 0 && <p className="text-xs text-gray-400">No data</p>}
          {employeeSales.slice(0, 5).map((e: any) => (
            <div key={e.name + e.employeeNumber} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">{e.name}</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">${Number(e.sales).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SalesComparisonReportModal({
  isOpen,
  onClose,
  initialView,
  dailySales,
  yesterdaySales,
  dayBeforeYesterdaySales,
}: SalesComparisonReportModalProps) {
  const [view, setView] = useState<ReportView>(initialView)
  const [metric, setMetric] = useState<'sales' | 'orders'>('sales')

  if (!isOpen) return null

  const dayData: Record<'today' | 'yesterday' | 'dayBefore', any> = {
    today: dailySales,
    yesterday: yesterdaySales,
    dayBefore: dayBeforeYesterdaySales,
  }

  const navButtons: Array<{ key: ReportView; label: string; disabled: boolean }> = [
    { key: 'today', label: 'Today', disabled: !dailySales },
    { key: 'yesterday', label: 'Yesterday', disabled: !yesterdaySales },
    { key: 'dayBefore', label: '2 Days Ago', disabled: !dayBeforeYesterdaySales },
    { key: 'comparison', label: '📊 Superimposition', disabled: !dailySales },
  ]

  const comparisonData = view === 'comparison' ? buildComparisonData(dailySales, yesterdaySales, dayBeforeYesterdaySales) : []

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">📈 Sales Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {navButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => !btn.disabled && setView(btn.key)}
              disabled={btn.disabled}
              title={btn.disabled ? 'No data available' : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                view === btn.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : btn.disabled
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {view === 'comparison' ? (
            <>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Today vs Yesterday vs 2 Days Ago — by hour
                </h3>
                <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
                  <button
                    onClick={() => setMetric('sales')}
                    className={`px-3 py-1.5 transition-colors ${metric === 'sales' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                  >
                    Sales ($)
                  </button>
                  <button
                    onClick={() => setMetric('orders')}
                    className={`px-3 py-1.5 transition-colors ${metric === 'orders' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                  >
                    Orders
                  </button>
                </div>
              </div>

              {comparisonData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                  No hourly sales data available to compare
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={comparisonData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                    <XAxis dataKey="hourLabel" className="text-xs fill-gray-600 dark:fill-gray-400" />
                    <YAxis className="text-xs fill-gray-600 dark:fill-gray-400" tickFormatter={(v) => metric === 'sales' ? `$${v}` : v} />
                    <Tooltip content={<ComparisonTooltip metric={metric} />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={metric === 'sales' ? 'today' : 'todayOrders'}
                      stroke={DAY_COLORS.today}
                      strokeWidth={2}
                      dot={{ fill: DAY_COLORS.today, r: 3 }}
                      name={`Today (${dailySales ? formatDate(dailySales.businessDay.start) : ''})`}
                    />
                    <Line
                      type="monotone"
                      dataKey={metric === 'sales' ? 'yesterday' : 'yesterdayOrders'}
                      stroke={DAY_COLORS.yesterday}
                      strokeWidth={2}
                      dot={{ fill: DAY_COLORS.yesterday, r: 3 }}
                      name={`Yesterday (${yesterdaySales ? formatDate(yesterdaySales.businessDay.start) : ''})`}
                    />
                    <Line
                      type="monotone"
                      dataKey={metric === 'sales' ? 'dayBefore' : 'dayBeforeOrders'}
                      stroke={DAY_COLORS.dayBefore}
                      strokeWidth={2}
                      dot={{ fill: DAY_COLORS.dayBefore, r: 3 }}
                      name={`2 Days Ago (${dayBeforeYesterdaySales ? formatDate(dayBeforeYesterdaySales.businessDay.start) : ''})`}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {dayData[view]?.businessDay ? formatDate(dayData[view].businessDay.start) : navButtons.find(b => b.key === view)?.label}
              </h3>
              {!dayData[view] ? (
                <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                  No sales data available for this day
                </div>
              ) : (
                <>
                  <SummaryCards data={dayData[view]} />
                  {buildSingleDayHourly(dayData[view]).length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Sales by Hour</h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={buildSingleDayHourly(dayData[view])} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                          <XAxis dataKey="hourLabel" className="text-xs fill-gray-600 dark:fill-gray-400" />
                          <YAxis className="text-xs fill-gray-600 dark:fill-gray-400" tickFormatter={(v) => `$${v}`} />
                          <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
                          <Bar dataKey="sales" fill={DAY_COLORS[view as 'today' | 'yesterday' | 'dayBefore']} radius={[4, 4, 0, 0]} name="Sales ($)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <BreakdownTables data={dayData[view]} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}
