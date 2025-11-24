'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface DailyTrendsChartProps {
  data: Array<{
    date: string
    income: number
    expense: number
    savings: number
  }>
}

export function DailyTrendsChart({ data }: DailyTrendsChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: <span className="font-bold">${entry.value.toFixed(2)}</span>
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-1">
          Daily Income, Expenses, & Savings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Last {data.length} days
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 11 }}
            stroke="#666"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#666"
            label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
            iconType="rect"
          />
          <ReferenceLine y={0} stroke="#000" strokeWidth={1} />

          {/* Income Bar - Green */}
          <Bar
            dataKey="income"
            name="Income"
            fill="#87B5A5"
            radius={[4, 4, 0, 0]}
          />

          {/* Expense Bar - Red/Coral */}
          <Bar
            dataKey="expense"
            name="Expense"
            fill="#E8A5A5"
            radius={[4, 4, 0, 0]}
          />

          {/* Savings Bar - Blue */}
          <Bar
            dataKey="savings"
            name="Savings"
            fill="#A5B5D6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>* Positive values shown above the line, negative values below</p>
      </div>
    </div>
  )
}
