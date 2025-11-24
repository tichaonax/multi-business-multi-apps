'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface DailySalesData {
  date: string
  sales: number
  orderCount: number
}

interface DailySalesLineChartProps {
  data: DailySalesData[]
}

export function DailySalesLineChart({ data }: DailySalesLineChartProps) {
  const dateFormat = useDateFormat()

  // Format data for chart with proper date formatting
  const formattedData = data.map(item => ({
    ...item,
    dateFormatted: formatDateByFormat(item.date, dateFormat)
  }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No sales data available for this period
      </div>
    )
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
        Daily Sales for Period
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
          <XAxis
            dataKey="dateFormatted"
            angle={-45}
            textAnchor="end"
            height={80}
            className="text-xs fill-gray-600 dark:fill-gray-400"
          />
          <YAxis className="text-xs fill-gray-600 dark:fill-gray-400" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Sales']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Daily Sales ($)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
