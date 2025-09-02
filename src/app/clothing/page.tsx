'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import Link from 'next/link'

export default function ClothingPage() {
  return (
    <ProtectedRoute module="clothing">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Clothing Outlet Management</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/clothing/pos" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👕</div>
              <h3 className="text-lg font-semibold mb-2">Point of Sale</h3>
              <p className="text-gray-600">Fashion POS with size/color variants</p>
            </div>
          </Link>
          
          <Link href="/clothing/inventory" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👗</div>
              <h3 className="text-lg font-semibold mb-2">Inventory</h3>
              <p className="text-gray-600">Size/color matrix inventory</p>
            </div>
          </Link>
          
          <Link href="/clothing/customers" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👤</div>
              <h3 className="text-lg font-semibold mb-2">Customers</h3>
              <p className="text-gray-600">Customer accounts and loyalty</p>
            </div>
          </Link>
          
          <Link href="/clothing/discounts" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🏷️</div>
              <h3 className="text-lg font-semibold mb-2">Discounts</h3>
              <p className="text-gray-600">Manage pricing and promotions</p>
            </div>
          </Link>
          
          <Link href="/clothing/employees" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">Employees</h3>
              <p className="text-gray-600">Staff and commission tracking</p>
            </div>
          </Link>
          
          <Link href="/clothing/reports" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">Reports</h3>
              <p className="text-gray-600">Sales analytics and trends</p>
            </div>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  )
}