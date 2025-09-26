'use client'

import { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { ClothingCustomerStats } from './components/customer-stats'
import { ClothingCustomerList } from './components/customer-list'
import { ClothingCustomerSegmentation } from './components/customer-segmentation'
import { ClothingCustomerAnalytics } from './components/customer-analytics'

// This would typically come from session/auth
const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'cmfj6cfvz00001pgg2rn9710e'

export default function ClothingCustomersPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'segmentation' | 'analytics'>('customers')
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)

  const tabs = [
    {
      id: 'customers',
      label: 'Customer Directory',
      icon: '👥',
      description: 'Manage customer profiles and history'
    },
    {
      id: 'segmentation',
      label: 'Segmentation',
      icon: '🎯',
      description: 'Price, Quality, Style, Conspicuous segments'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊',
      description: 'Customer insights and behavior'
    }
  ]

  const handleCustomerView = (customerId: string) => {
    window.location.href = `/clothing/customers/${customerId}`
  }

  const handleCustomerEdit = (customerId: string) => {
    window.location.href = `/clothing/customers/${customerId}/edit`
  }

  const handleCreateCustomer = () => {
    window.location.href = '/clothing/customers/new'
  }

  return (
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="clothing">
        <ContentLayout
          title="Customer Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clothing', href: '/clothing' },
            { label: 'Customers', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Customer Overview Stats */}
            <ClothingCustomerStats businessId={BUSINESS_ID} />

            {/* Tab Navigation */}
            <div className="card">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-2 sm:space-x-8 px-3 sm:px-6 overflow-x-auto" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`
                        py-4 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap
                        ${activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <span className="text-lg sm:text-base">{tab.icon}</span>
                      <div className="text-left hidden sm:block">
                        <div>{tab.label}</div>
                        <div className="text-xs text-secondary font-normal hidden md:block">{tab.description}</div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-3 sm:p-6">
                {activeTab === 'customers' && (
                  <div className="space-y-6">
                    {/* Actions Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        {selectedSegment && (
                          <div className="text-sm text-secondary">
                            Filtered by: <span className="font-medium capitalize">{selectedSegment}</span>
                            <button
                              onClick={() => setSelectedSegment(null)}
                              className="ml-2 text-red-600 hover:text-red-700"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleCreateCustomer}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <span>➕</span>
                        Add Customer
                      </button>
                    </div>

                    <ClothingCustomerList
                      businessId={BUSINESS_ID}
                      selectedSegment={selectedSegment}
                      onCustomerView={handleCustomerView}
                      onCustomerEdit={handleCustomerEdit}
                    />
                  </div>
                )}

                {activeTab === 'segmentation' && (
                  <ClothingCustomerSegmentation
                    businessId={BUSINESS_ID}
                    onSegmentSelect={setSelectedSegment}
                    onViewSegment={(segment) => {
                      setSelectedSegment(segment)
                      setActiveTab('customers')
                    }}
                  />
                )}

                {activeTab === 'analytics' && (
                  <ClothingCustomerAnalytics businessId={BUSINESS_ID} />
                )}
              </div>
            </div>

            {/* Clothing-specific Customer Features */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-6">
              <h2 className="text-lg font-semibold text-green-900 dark:text-green-100 dark:text-green-100 mb-4">
                👔 Clothing Customer Management Features
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🎯 Smart Segmentation</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Automatic customer segmentation based on Price, Quality, Style, and Conspicuous consumption preferences.
                  </p>
                </div>

                <div className="card p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">📐 Size Preferences</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Track customer size preferences and fit history to improve recommendations and reduce returns.
                  </p>
                </div>

                <div className="card p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🌟 Style Profiles</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Build detailed style profiles including color preferences, brand affinity, and seasonal trends.
                  </p>
                </div>

                <div className="card p-4 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">💳 Purchase Patterns</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Analyze buying patterns, return behavior, and lifetime value for targeted marketing campaigns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}