'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/format-currency'

interface PaymentMethodData {
  paymentMethod: string
  count: number
  totalAmount: number
}

interface PaymentMethodsChartProps {
  data: PaymentMethodData[]
}

const COLORS: Record<string, string> = {
  CASH: '#10b981', // Green
  CARD: '#3b82f6', // Blue
  MOBILE: '#8b5cf6', // Purple
  GCASH: '#0066cc', // GCash Blue
  PAYMAYA: '#00a74f', // PayMaya Green
  FREE: '#f59e0b', // Amber for free tokens
  OTHER: '#6b7280', // Gray
}

const METHOD_LABELS: Record<string, string> = {
  CASH: '💵 Cash',
  CARD: '💳 Card',
  MOBILE: '📱 Mobile',
  GCASH: '📱 GCash',
  PAYMAYA: '📱 PayMaya',
  FREE: '🎁 Free',
  OTHER: '🔖 Other',
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No payment data available
      </div>
    )
  }

  // Calculate total revenue
  const totalRevenue = data.reduce((sum, item) => sum + item.totalAmount, 0)

  // Format data for pie chart
  const chartData = data.map(item => ({
    name: METHOD_LABELS[item.paymentMethod] || item.paymentMethod,
    value: item.totalAmount,
    count: item.count,
    percentage: ((item.totalAmount / totalRevenue) * 100).toFixed(1),
    method: item.paymentMethod,
  }))

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage}%`
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
        💳 Payment Methods Breakdown
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
            {chartData.map((entry, index) => {
              const color = COLORS[entry.method] || COLORS.OTHER
              return <Cell key={`cell-${index}`} fill={color} />
            })}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              formatCurrency(value),
              `${name} (${props.payload.count} sales)`
            ]}
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
              return `${value}: ${formatCurrency(item?.value || 0)} (${item?.count} sales)`
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
          Total Revenue: <span className="font-bold text-gray-900">{formatCurrency(totalRevenue)}</span>
        </p>
      </div>
    </div>
  )
}
