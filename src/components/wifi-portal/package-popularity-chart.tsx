'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface TokensByConfig {
  tokenConfig: {
    id: string
    name: string
    basePrice: number
  }
  count: number
}

interface PackagePopularityChartProps {
  data: TokensByConfig[]
}

const COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Indigo
]

export function PackagePopularityChart({ data }: PackagePopularityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No package data available
      </div>
    )
  }

  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.count, 0)

  const chartData = data.map((item, index) => ({
    name: item.tokenConfig.name,
    value: item.count,
    percentage: ((item.count / total) * 100).toFixed(1),
    color: COLORS[index % COLORS.length],
  }))

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage}%`
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
        🎫 Package Popularity
      </h3>

      <ResponsiveContainer width="100%" height={350}>
        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} tokens`, name]}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '10px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={60}
            formatter={(value, entry: any) => {
              const item = chartData.find(d => d.name === value)
              return `${value}: ${item?.value} tokens (${item?.percentage}%)`
            }}
            wrapperStyle={{
              fontSize: '12px',
              paddingTop: '10px'
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Total Tokens: <span className="font-bold text-gray-900">{total}</span>
        </p>
      </div>
    </div>
  )
}
