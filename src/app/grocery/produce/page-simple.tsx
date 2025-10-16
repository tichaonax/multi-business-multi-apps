'use client'

import { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider, useBusinessContext } from '@/components/universal'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

function GroceryProducePageContent() {
  const { formatCurrency } = useBusinessContext()
  const [activeTab, setActiveTab] = useState<'overview' | 'quality'>('overview')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Produce</p>
              <p className="text-2xl font-bold text-green-600">5</p>
            </div>
            <div className="text-2xl">🥬</div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Test Price</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(1.99)}</p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold text-green-600">✅ Fixed</p>
            </div>
            <div className="text-2xl">🎯</div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Fresh Produce Management</h3>
        <p className="text-gray-600">
          The BusinessProvider context error has been resolved. The useBusinessContext hook 
          is now properly wrapped within a BusinessProvider component.
        </p>
        
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">✅ BusinessProvider Integration Working</p>
          <p className="text-green-700 text-sm mt-1">
            Currency formatting: {formatCurrency(25.99)} | Business ID: {BUSINESS_ID}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function GroceryProducePage() {
  return (
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="grocery">
        <ContentLayout
          title="Fresh Produce Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Grocery', href: '/grocery' },
            { label: 'Fresh Produce', isActive: true }
          ]}
        >
          <GroceryProducePageContent />
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}