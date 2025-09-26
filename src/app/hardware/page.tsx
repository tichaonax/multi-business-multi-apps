'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider, useBusinessContext } from '@/components/universal'
import Link from 'next/link'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'hardware-demo-business'

function HardwareContent() {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Daily Sales', value: '$8,420', icon: '💰', color: 'text-green-600' },
          { label: 'Orders Today', value: '34', icon: '📦', color: 'text-blue-600' },
          { label: 'Inventory Value', value: '$125,340', icon: '🏪', color: 'text-purple-600' },
          { label: 'Low Stock Items', value: '12', icon: '⚠️', color: 'text-red-600' },
          { label: 'Cut-to-Size Orders', value: '8', icon: '✂️', color: 'text-orange-600' }
        ].map((metric, index) => (
          <div key={index} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary">{metric.label}</p>
                <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
              </div>
              <div className="text-2xl">{metric.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Hardware Store Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Point of Sale', href: '/hardware/pos', icon: '🛒', description: 'Process customer sales with barcode scanner' },
            { label: 'Inventory', href: '/hardware/inventory', icon: '📦', description: 'Manage stock levels and bulk orders' },
            { label: 'Cut-to-Size', href: '/hardware/cut-to-size', icon: '✂️', description: 'Custom cutting and measurement orders' },
            { label: 'Suppliers', href: '/hardware/suppliers', icon: '🚛', description: 'Manage vendor relationships and orders' },
            { label: 'Projects', href: '/hardware/projects', icon: '🏗️', description: 'Track contractor and bulk projects' },
            { label: 'Tools & Equipment', href: '/hardware/tools', icon: '🔧', description: 'Tool rentals and equipment sales' },
            { label: 'Employee Management', href: '/hardware/employees', icon: '👥', description: 'Manage hardware store staff and schedules' }
          ].map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group card"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {action.label}
                  </h3>
                  <p className="text-sm text-secondary mt-1">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Hardware-Specific Features */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 dark:border-orange-800 rounded-lg p-6">
        <h3 className="font-semibold text-orange-900 dark:text-orange-100 dark:text-orange-100 mb-4">🔧 Hardware Store Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">✂️ Cut-to-Size Service</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Custom cutting for lumber, pipes, and materials with precision measurements and waste tracking.
            </p>
          </div>
          <div className="card p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🏗️ Contractor Accounts</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Bulk pricing, credit accounts, and project-based ordering for professional contractors.
            </p>
          </div>
          <div className="card p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🔧 Tool Rental</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Power tools and equipment rental with maintenance tracking and availability calendar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HardwarePage() {
  return (
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="hardware">
        <ContentLayout
          title="🔧 Hardware Store Dashboard"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Hardware Store', isActive: true }
          ]}
        >
          <HardwareContent />
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}
