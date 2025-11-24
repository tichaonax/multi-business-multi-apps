'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

interface ProductBreakdown {
  productName: string
  emoji: string
  revenue: number
  percentage: number
}

interface CategoryBreakdown {
  categoryPath: string
  emoji: string
  revenue: number
  percentage: number
}

interface SalesRepBreakdown {
  employeeName: string
  revenue: number
  percentage: number
}

interface SalesBreakdownChartsProps {
  productBreakdown: ProductBreakdown[]
  categoryBreakdown: CategoryBreakdown[]
  salesRepBreakdown: SalesRepBreakdown[]
}

const COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
]

export function SalesBreakdownCharts({
  productBreakdown,
  categoryBreakdown,
  salesRepBreakdown
}: SalesBreakdownChartsProps) {
  // Format product data for bar chart
  const productData = productBreakdown.map(p => ({
    name: `${p.emoji} ${p.productName}`,
    value: p.revenue
  }))

  // Format category data for bar chart
  const categoryData = categoryBreakdown.map(c => ({
    name: `${c.emoji} ${c.categoryPath}`,
    value: c.revenue
  }))

  // Format sales rep data for pie chart
  const salesRepData = salesRepBreakdown.map(s => ({
    name: s.employeeName,
    value: s.revenue,
    percentage: s.percentage
  }))

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Sales by Product - Bar Chart */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300 mb-4">
          Sales by Product
        </h3>
        {productData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
              <XAxis
                type="category"
                dataKey="name"
                className="text-xs fill-gray-600 dark:fill-gray-400"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis type="number" className="text-xs fill-gray-600 dark:fill-gray-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                labelStyle={{ color: '#000' }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} minPointSize={2}>
                {productData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-purple-600 dark:text-purple-400">
            No product data available
          </div>
        )}
      </div>

      {/* Sales by Category - Bar Chart */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-4">
          Sales by Category
        </h3>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
              <XAxis
                type="category"
                dataKey="name"
                className="text-xs fill-gray-600 dark:fill-gray-400"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis type="number" className="text-xs fill-gray-600 dark:fill-gray-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                labelStyle={{ color: '#000' }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} minPointSize={2}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-blue-600 dark:text-blue-400">
            No category data available
          </div>
        )}
      </div>

      {/* Sales by Rep - Pie Chart */}
      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-4">
          Sales by Rep
        </h3>
        {salesRepData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={salesRepData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => percentage > 5 ? `${name} ${percentage}%` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                minAngle={5} // Minimum angle for small slices
              >
                {salesRepData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                labelStyle={{ color: '#000' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => `${entry.payload.name}: $${entry.payload.value.toFixed(2)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-green-600 dark:text-green-400">
            No sales rep data available
          </div>
        )}
      </div>
    </div>
  )
}
