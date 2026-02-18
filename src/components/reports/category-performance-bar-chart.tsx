'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface CategoryData {
  name: string
  sales: number
  orders: number
}

interface CategoryPerformanceBarChartProps {
  data: CategoryData[]
  topN?: number
}

const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
]

export function CategoryPerformanceBarChart({ data, topN = 10 }: CategoryPerformanceBarChartProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const tickColor = isDark ? '#9ca3af' : '#6b7280'
  const gridColor = isDark ? '#374151' : '#e5e7eb'

  // Sort by sales and take top N
  const sortedData = [...data]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, topN)

  // Format data for bar chart
  const chartData = sortedData.map(item => ({
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    fullName: item.name,
    sales: item.sales,
    orders: item.orders,
  }))

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">
        📊 Top {topN} Categories by Sales
      </h2>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            tick={{ fill: tickColor, fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: tickColor }}
            tickFormatter={(value: number) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : 'rgba(255, 255, 255, 0.95)',
              border: isDark ? '1px solid #374151' : '1px solid #ccc',
              borderRadius: '8px',
              padding: '10px',
              color: isDark ? '#f9fafb' : '#111827',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'sales') return [`$${value.toFixed(2)}`, 'Sales']
              if (name === 'orders') return [value, 'Orders']
              return [value, name]
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload.length > 0) {
                return payload[0].payload.fullName
              }
              return label
            }}
          />
          <Bar dataKey="sales" name="sales" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
        {sortedData.slice(0, 5).map((item, index) => (
          <div key={index} className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={item.name}>
              {index + 1}. {item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name}
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
              ${item.sales.toFixed(0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
