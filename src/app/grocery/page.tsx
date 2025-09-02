'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import Link from 'next/link'

export default function GroceryPage() {
  return (
    <ProtectedRoute module="grocery">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Grocery Shop Management</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/grocery/pos" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold mb-2">Point of Sale</h3>
              <p className="text-gray-600">Process sales with barcode scanning</p>
            </div>
          </Link>
          
          <Link href="/grocery/inventory" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold mb-2">Inventory</h3>
              <p className="text-gray-600">Stock management with expiry tracking</p>
            </div>
          </Link>
          
          <Link href="/grocery/suppliers" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-lg font-semibold mb-2">Suppliers</h3>
              <p className="text-gray-600">Manage supplier relationships</p>
            </div>
          </Link>
          
          <Link href="/grocery/employees" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">Employees</h3>
              <p className="text-gray-600">Staff and payroll management</p>
            </div>
          </Link>
          
          <Link href="/grocery/reports" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-lg font-semibold mb-2">Reports</h3>
              <p className="text-gray-600">Sales and shrinkage reports</p>
            </div>
          </Link>
          
          <Link href="/grocery/alerts" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">Stock Alerts</h3>
              <p className="text-gray-600">Low stock and expiry alerts</p>
            </div>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  )
}