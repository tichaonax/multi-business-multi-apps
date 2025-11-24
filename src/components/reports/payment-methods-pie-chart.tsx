'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface PaymentMethod {
  method: string
  value: number
  percentage: number
}

interface PaymentMethodsPieChartProps {
  data: PaymentMethod[]
  totalAmount: number
}

const COLORS = {
  CASH: '#10b981', // Green
  CARD: '#3b82f6', // Blue
  MOBILE: '#8b5cf6', // Purple
  OTHER: '#6b7280', // Gray
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  MOBILE: 'Mobile',
  OTHER: 'Other',
}

export function PaymentMethodsPieChart({ data, totalAmount }: PaymentMethodsPieChartProps) {
  // Format data for pie chart
  const chartData = data.map(item => ({
    name: METHOD_LABELS[item.method] || item.method,
    value: item.value,
    percentage: item.percentage,
  }))

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage.toFixed(1)}%`
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">
        💳 Payment Methods Breakdown
      </h2>

      <ResponsiveContainer width="100%" height={350}>
        <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={90}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => {
              const method = data[index].method
              const color = COLORS[method as keyof typeof COLORS] || COLORS.OTHER
              return <Cell key={`cell-${index}`} fill={color} />
            })}
          </Pie>
          <Tooltip
            formatter={(value: number) => `$${value.toFixed(2)}`}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '10px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => {
              const item = chartData.find(d => d.name === value)
              return `${value}: $${item?.value.toFixed(2)}`
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total Collected: <span className="font-bold text-gray-900 dark:text-gray-100">${totalAmount.toFixed(2)}</span>
        </p>
      </div>
    </div>
  )
}
