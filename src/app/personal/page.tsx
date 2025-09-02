'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  tags: string
}

export default function PersonalPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [totalThisMonth, setTotalThisMonth] = useState(0)

  useEffect(() => {
    setExpenses([
      { id: '1', category: 'Food', description: 'Grocery shopping', amount: 150.00, date: '2024-01-15', tags: 'weekly' },
      { id: '2', category: 'Transport', description: 'Gas station', amount: 65.00, date: '2024-01-14', tags: 'fuel' },
      { id: '3', category: 'Utilities', description: 'Electricity bill', amount: 120.00, date: '2024-01-12', tags: 'monthly' },
    ])
    setTotalThisMonth(335.00)
    setLoading(false)
  }, [])

  return (
    <ProtectedRoute module="personal">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Personal Expenses</h1>
          <Link
            href="/personal/new"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add Expense
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">This Month</h3>
            <p className="text-3xl font-bold text-red-600">${totalThisMonth.toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Categories</h3>
            <Link href="/personal/categories" className="text-blue-600 hover:text-blue-500">
              Manage Categories
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Reports</h3>
            <Link href="/personal/reports" className="text-blue-600 hover:text-blue-500">
              View Reports
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Expenses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      ${expense.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{expense.tags}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}