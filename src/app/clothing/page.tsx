'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'

export default function ClothingPage() {
  return (
    <BusinessTypeRoute requiredBusinessType="clothing">
      <ContentLayout
        title="👕 Clothing Outlet Management"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clothing', isActive: true }
        ]}
      >
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/clothing/pos" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👕</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Point of Sale</h3>
              <p className="text-secondary">Fashion POS with size/color variants</p>
            </div>
          </Link>
          
          <Link href="/clothing/inventory" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👗</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Inventory</h3>
              <p className="text-secondary">Size/color matrix inventory</p>
            </div>
          </Link>
          
          <Link href="/clothing/customers" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👤</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Customers</h3>
              <p className="text-secondary">Customer accounts and loyalty</p>
            </div>
          </Link>
          
          <Link href="/clothing/discounts" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🏷️</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Discounts</h3>
              <p className="text-secondary">Manage pricing and promotions</p>
            </div>
          </Link>
          
          <Link href="/clothing/employees" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Employees</h3>
              <p className="text-secondary">Staff and commission tracking</p>
            </div>
          </Link>
          
          <Link href="/clothing/reports" className="block">
            <div className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Reports</h3>
              <p className="text-secondary">Sales analytics and trends</p>
            </div>
          </Link>
        </div>
      </ContentLayout>
    </BusinessTypeRoute>
  )
}