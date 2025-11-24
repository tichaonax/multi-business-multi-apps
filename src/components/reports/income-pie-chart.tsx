'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { getCategoryEmoji } from '@/lib/category-emojis'

interface IncomePieChartProps {
  data: Array<{
    name: string
    value: number
    percentage: number
  }>
  totalIncome: number
}

// Colors matching Excel pastel palette
const COLORS = [
  '#D4C5B9', // Beige (largest slice)
  '#C9B5D6', // Light purple
  '#A8BCC9', // Light blue-gray
  '#D5A5B8', // Light pink
  '#B8C9A8', // Light green
  '#F4C2A0', // Light peach
  '#FFB5A0', // Light coral
  '#A5D5C9', // Light teal
]

export function IncomePieChart({ data, totalIncome }: IncomePieChartProps) {
  // Take top 8 categories, combine rest into "Other"
  const processedData = [...data]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    // Only show percentage if slice is large enough (> 5%)
    if (percent < 0.05) return null

    return (
      <text
        x={x}
        y={y}
        fill="#000000"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-bold drop-shadow-sm"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(255,255,255,0.8))' }}
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    )
  }

  const renderLegend = (props: any) => {
    const { payload } = props

    return (
      <div className="flex flex-col gap-2 mt-6 px-2">
        {payload.map((entry: any, index: number) => {
          const emoji = getCategoryEmoji(entry.value)
          return (
            <div
              key={`legend-${index}`}
              className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800/50 rounded px-2 py-1"
            >
              <div
                className="w-4 h-4 rounded-sm flex-shrink-0 border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-base">{emoji}</span>
              <span className="text-gray-900 dark:text-gray-100 truncate flex-1">
                {entry.value}
              </span>
              <span className="text-gray-700 dark:text-gray-300 ml-auto text-xs font-semibold">
                {entry.payload.percentage.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const emoji = getCategoryEmoji(data.name)

      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{emoji}</span>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {data.name}
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Amount: <span className="font-bold">${data.value.toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Percentage: <span className="font-bold">{data.payload.percentage.toFixed(1)}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <div className="text-center mb-2">
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">
          Top Income Sources
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total Income: <span className="font-bold text-base">${totalIncome.toFixed(2)}</span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={450}>
        <PieChart margin={{ top: 40, right: 20, bottom: 80, left: 20 }}>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {processedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
