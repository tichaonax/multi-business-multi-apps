'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ContentLayout } from '@/components/layout/content-layout'
import { DateInput } from '@/components/ui/date-input'

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const sampleRevenueData = [
    { date: '2024-01-01', revenue: 1200 },
    { date: '2024-01-02', revenue: 1800 },
    { date: '2024-01-03', revenue: 1500 },
    { date: '2024-01-04', revenue: 2200 },
    { date: '2024-01-05', revenue: 1900 },
  ]

  const sampleExpenseData = [
    { category: 'Materials', amount: 5000 },
    { category: 'Labor', amount: 3500 },
    { category: 'Equipment', amount: 2000 },
    { category: 'Other', amount: 800 },
  ]

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  return (
    <ProtectedRoute>
      <ContentLayout
        title="📊 Reports & Analytics"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', isActive: true }
        ]}
        headerActions={
          <div className="flex space-x-4">
            <DateInput
              value={dateRange.start}
              onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
              label="Start Date"
              compact
            />
            <DateInput
              value={dateRange.end}
              onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
              label="End Date"
              compact
            />
          </div>
        }
      >

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-primary">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sampleRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 text-primary">Expenses by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sampleExpenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {sampleExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2 text-primary">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">$12,400</p>
            <p className="text-sm text-gray-500">Last 30 days</p>
          </div>
          
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2 text-primary">Total Expenses</h3>
            <p className="text-3xl font-bold text-red-600">$8,300</p>
            <p className="text-sm text-gray-500">Last 30 days</p>
          </div>
          
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2 text-primary">Net Profit</h3>
            <p className="text-3xl font-bold text-blue-600">$4,100</p>
            <p className="text-sm text-gray-500">Last 30 days</p>
          </div>
        </div>

        {/* Report Hubs */}
        <div className="mt-6">
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">Report Hubs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/expense-accounts/reports"
              className="block bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💳</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Expense Account Reports</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Accounts overview, loans, transfers, lending and spending trends.</p>
                </div>
              </div>
            </a>
            <a href="/payroll/account/reports"
              className="block bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-teal-500 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💼</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Payroll Reports</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Payment register, per-employee totals, payment type breakdown, and monthly trends.</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}