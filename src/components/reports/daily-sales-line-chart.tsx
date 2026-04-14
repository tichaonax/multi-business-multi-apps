'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface DailySalesData {
  date: string
  sales: number
  orderCount: number
  expenses?: number
}

interface DailySalesLineChartProps {
  data: DailySalesData[]
  onDotClick?: (date: string) => void
}

// Custom tooltip that shows sales, expenses and margin for the hovered day
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const salesEntry = payload.find((p: any) => p.dataKey === 'sales')
  const expensesEntry = payload.find((p: any) => p.dataKey === 'expenses')
  const sales: number = salesEntry?.value ?? 0
  const expenses: number = expensesEntry?.value ?? 0
  const margin = sales > 0 ? (((sales - expenses) / sales) * 100).toFixed(1) : null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{label}</p>
      <p className="text-purple-600 dark:text-purple-400">Sales: ${sales.toFixed(2)}</p>
      {expensesEntry && (
        <p className="text-red-500 dark:text-red-400">Expenses: ${expenses.toFixed(2)}</p>
      )}
      {margin !== null && expensesEntry && (
        <p className={`font-semibold ${Number(margin) >= 50 ? 'text-green-600 dark:text-green-400' : Number(margin) >= 20 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
          Margin: {margin}%
        </p>
      )}
    </div>
  )
}

export function DailySalesLineChart({ data, onDotClick }: DailySalesLineChartProps) {
  const dateFormat = useDateFormat()

  // Determine whether any expense data was supplied
  const hasExpenses = data.some(d => (d.expenses ?? 0) > 0)

  // Format data for chart with proper date formatting
  const formattedData = data.map(item => ({
    ...item,
    dateFormatted: formatDateByFormat(item.date, dateFormat.format)
  }))

  // Period totals for the summary bar
  const totalSales = data.reduce((s, d) => s + d.sales, 0)
  const totalExpenses = data.reduce((s, d) => s + (d.expenses ?? 0), 0)
  const periodMargin = totalSales > 0 ? (((totalSales - totalExpenses) / totalSales) * 100).toFixed(1) : null

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No sales data available for this period
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Daily Sales for Period
        </h3>
        {hasExpenses && periodMargin !== null && (
          <div className="flex gap-4 text-sm">
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              Sales: ${totalSales.toFixed(2)}
            </span>
            <span className="text-red-500 dark:text-red-400 font-medium">
              Expenses: ${totalExpenses.toFixed(2)}
            </span>
            <span className={`font-bold ${Number(periodMargin) >= 50 ? 'text-green-600 dark:text-green-400' : Number(periodMargin) >= 20 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
              Margin: {periodMargin}%
            </span>
          </div>
        )}
      </div>

      {onDotClick && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
          Click any dot to see that day&apos;s detail
        </p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
          <XAxis
            dataKey="dateFormatted"
            angle={-45}
            textAnchor="end"
            height={80}
            className="text-xs fill-gray-600 dark:fill-gray-400"
          />
          <YAxis className="text-xs fill-gray-600 dark:fill-gray-400" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={onDotClick
              ? (props: any) => {
                  const { cx, cy, payload } = props
                  return (
                    <circle
                      key={`sales-${payload.date}`}
                      cx={cx} cy={cy} r={5}
                      fill="#8b5cf6"
                      stroke="#fff"
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); onDotClick(payload.date) }}
                    />
                  )
                }
              : { fill: '#8b5cf6', r: 4 }
            }
            activeDot={onDotClick
              ? (props: any) => {
                  const { cx, cy, payload } = props
                  return (
                    <circle
                      key={`sales-active-${payload.date}`}
                      cx={cx} cy={cy} r={7}
                      fill="#8b5cf6"
                      stroke="#fff"
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); onDotClick(payload.date) }}
                    />
                  )
                }
              : { r: 6 }
            }
            name="Daily Sales ($)"
          />
          {hasExpenses && (
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={2}
              dot={onDotClick
                ? (props: any) => {
                    const { cx, cy, payload } = props
                    return (
                      <circle
                        key={`exp-${payload.date}`}
                        cx={cx} cy={cy} r={4}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={1}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); onDotClick(payload.date) }}
                      />
                    )
                  }
                : { fill: '#ef4444', r: 3 }
              }
              activeDot={onDotClick
                ? (props: any) => {
                    const { cx, cy, payload } = props
                    return (
                      <circle
                        key={`exp-active-${payload.date}`}
                        cx={cx} cy={cy} r={6}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={2}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); onDotClick(payload.date) }}
                      />
                    )
                  }
                : { r: 5 }
              }
              strokeDasharray="4 2"
              name="Daily Expenses ($)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
