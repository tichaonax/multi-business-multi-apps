'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/format-currency'

interface DailyTrend {
  date: string
  tokensCreated: number
  salesCount: number
  revenue: number
}

interface RevenueTrendsChartProps {
  data: DailyTrend[]
}

export function RevenueTrendsChart({ data }: RevenueTrendsChartProps) {
  // Format data for chart
  const formattedData = data.map(item => ({
    ...item,
    dateFormatted: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No revenue data available for this period
      </div>
    )
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        📈 Revenue Trends (Last 7 Days)
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300" />
          <XAxis
            dataKey="dateFormatted"
            angle={-45}
            textAnchor="end"
            height={80}
            className="text-xs fill-gray-600"
          />
          <YAxis
            className="text-xs fill-gray-600"
            tickFormatter={(value) => `₱${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '10px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'Revenue') return [formatCurrency(value), name]
              return [value, name]
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 5 }}
            activeDot={{ r: 7 }}
            name="Revenue"
          />
          <Line
            type="monotone"
            dataKey="salesCount"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Sales Count"
          />
          <Line
            type="monotone"
            dataKey="tokensCreated"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Tokens Created"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
