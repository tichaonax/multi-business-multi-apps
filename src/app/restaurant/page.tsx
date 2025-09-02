'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import Link from 'next/link'

export default function RestaurantPage() {
  return (
    <ProtectedRoute module="restaurant">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Restaurant Management</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/restaurant/pos" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="text-lg font-semibold mb-2">Point of Sale</h3>
              <p className="text-gray-600">Process orders and payments</p>
            </div>
          </Link>
          
          <Link href="/restaurant/menu" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">Menu Management</h3>
              <p className="text-gray-600">Manage menu items and pricing</p>
            </div>
          </Link>
          
          <Link href="/restaurant/orders" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold mb-2">Orders</h3>
              <p className="text-gray-600">View and manage orders</p>
            </div>
          </Link>
          
          <Link href="/restaurant/inventory" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">Inventory</h3>
              <p className="text-gray-600">Stock management</p>
            </div>
          </Link>
          
          <Link href="/restaurant/employees" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">Employees</h3>
              <p className="text-gray-600">Staff management</p>
            </div>
          </Link>
          
          <Link href="/restaurant/reports" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-lg font-semibold mb-2">Reports</h3>
              <p className="text-gray-600">Sales and financial reports</p>
            </div>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  )
}