'use client'

import { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import Link from 'next/link'
import { BusinessProvider } from '@/components/universal'
import {
  UniversalInventoryGrid,
  UniversalInventoryForm,
  UniversalStockMovements,
  UniversalLowStockAlerts,
  UniversalInventoryStats
} from '@/components/universal/inventory'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'grocery-demo-business'

export default function GroceryInventoryPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'movements' | 'alerts' | 'reports'>('overview')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'inventory', label: 'Items', icon: '📦' },
    { id: 'movements', label: 'Stock Movements', icon: '🔄' },
    { id: 'alerts', label: 'Alerts & Expiration', icon: '⚠️' },
    { id: 'reports', label: 'Analytics', icon: '📈' }
  ]

  const handleItemEdit = (item: any) => {
    setSelectedItem(item)
    setShowAddForm(true)
  }

  const handleItemView = (item: any) => {
    setSelectedItem(item)
    // Could open a detailed view modal
    console.log('Viewing item:', item)
  }

  const handleItemDelete = async (item: any) => {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        const response = await fetch(`/api/inventory/${BUSINESS_ID}/items/${item.id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          // Refresh the grid - the UniversalInventoryGrid will handle this
          window.location.reload()
        } else {
          alert('Failed to delete item')
        }
      } catch (error) {
        alert('Error deleting item')
      }
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = selectedItem
        ? `/api/inventory/${BUSINESS_ID}/items/${selectedItem.id}`
        : `/api/inventory/${BUSINESS_ID}/items`

      const method = selectedItem ? 'PUT' : 'POST'

      // Transform form data to include grocery-specific attributes
      const groceryFormData = {
        ...formData,
        businessId: BUSINESS_ID,
        businessType: 'grocery',
        attributes: {
          ...formData.attributes,
          // Grocery-specific attributes
          pluCode: formData.pluCode,
          department: formData.department || 'General',
          temperatureZone: formData.temperatureZone || 'ambient',
          organicCertified: formData.organicCertified || false,
          allergens: formData.allergens || [],
          expirationDays: formData.expirationDays,
          batchTracking: formData.batchTracking || false,
          weightBased: formData.unitType === 'weight'
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groceryFormData)
      })

      if (response.ok) {
        setShowAddForm(false)
        setSelectedItem(null)
        // Refresh will be handled by the components
        window.location.reload()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to save item')
      }
    } catch (error) {
      alert('Error saving item')
      console.error('Save error:', error)
    }
  }

  return (
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="grocery">
        <ContentLayout
          title="Grocery Inventory Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Grocery', href: '/grocery' },
            { label: 'Inventory', isActive: true }
          ]}
          
        >
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="card overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="overflow-x-auto" aria-label="Tabs">
                  <div className="flex min-w-max px-2 py-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-2 px-3 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                          activeTab === tab.id
                            ? 'border-green-500 text-green-600 dark:text-green-400'
                            : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-base">{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Grocery-specific banner */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 sm:p-6">
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
                        🛒 Grocery Store Inventory Features
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="card p-3 border border-green-200 dark:border-green-800">
                          <div className="text-green-700 dark:text-green-300 font-medium text-sm break-words">📅 Expiration Tracking</div>
                          <div className="text-xs text-green-600 dark:text-green-400 break-words">FIFO rotation & automatic alerts</div>
                        </div>
                        <div className="card p-3 border border-green-200 dark:border-green-800">
                          <div className="text-green-700 dark:text-green-300 font-medium text-sm break-words">🏷️ PLU Code Management</div>
                          <div className="text-xs text-green-600 dark:text-green-400 break-words">Produce codes & weight-based pricing</div>
                        </div>
                        <div className="card p-3 border border-green-200 dark:border-green-800">
                          <div className="text-green-700 dark:text-green-300 font-medium text-sm break-words">🌡️ Temperature Zones</div>
                          <div className="text-xs text-green-600 dark:text-green-400 break-words">Cold chain monitoring</div>
                        </div>
                        <div className="card p-3 border border-green-200 dark:border-green-800">
                          <div className="text-green-700 dark:text-green-300 font-medium text-sm break-words">🌱 Organic Tracking</div>
                          <div className="text-xs text-green-600 dark:text-green-400 break-words">Certification & compliance</div>
                        </div>
                      </div>
                    </div>

                    {/* Universal Inventory Stats */}
                    <UniversalInventoryStats
                      businessId={BUSINESS_ID}
                      businessType="grocery"
                      showTrends={true}
                      showBusinessSpecific={true}
                      showCharts={false}
                      layout="detailed"
                    />
                  </div>
                )}

                {/* Inventory Items Tab */}
                {activeTab === 'inventory' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Inventory Items</h3>
                    </div>

                    <UniversalInventoryGrid
                      businessId={BUSINESS_ID}
                      businessType="grocery"
                      onItemEdit={handleItemEdit}
                      onItemView={handleItemView}
                      onItemDelete={handleItemDelete}
                      headerActions={(
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(null)
                              setShowAddForm(true)
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            Add New Item
                          </button>
                        </div>
                      )}
                      showActions={true}
                      layout="table"
                      allowSearch={true}
                      allowFiltering={true}
                      allowSorting={true}
                      showBusinessSpecificFields={true}
                    />
                  </div>
                )}

                {/* Stock Movements Tab */}
                {activeTab === 'movements' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Stock Movements</h3>

                    <UniversalStockMovements
                      businessId={BUSINESS_ID}
                      showFilters={true}
                      maxItems={100}
                      layout="full"
                    />
                  </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Inventory Alerts & Expiration Management</h3>

                    {/* Grocery-specific alert info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🛒 Grocery Store Alert Types</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-300 break-words">Expiration Alerts</div>
                          <div className="text-blue-700 dark:text-blue-400 break-words">FIFO rotation reminders</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-300 break-words">Temperature Alerts</div>
                          <div className="text-blue-700 dark:text-blue-400 break-words">Cold chain monitoring</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-300 break-words">PLU Code Issues</div>
                          <div className="text-blue-700 dark:text-blue-400 break-words">Produce pricing problems</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-300 break-words">Organic Certification</div>
                          <div className="text-blue-700 dark:text-blue-400 break-words">Compliance tracking</div>
                        </div>
                      </div>
                    </div>

                    <UniversalLowStockAlerts
                      businessId={BUSINESS_ID}
                      businessType="grocery"
                      alertTypes={['low_stock', 'out_of_stock', 'expiring_soon', 'expired']}
                      showFilters={true}
                      showSummary={true}
                      layout="full"
                      autoRefresh={true}
                      refreshInterval={60000}
                    />
                  </div>
                )}

                {/* Reports Tab */}
                {activeTab === 'reports' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Grocery Analytics & Reports</h3>

                    {/* Grocery-specific report types */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="card p-4 hover:shadow-lg cursor-pointer transition-shadow">
                        <div className="text-2xl mb-2">📊</div>
                        <h4 className="font-semibold mb-2 text-primary break-words">Expiration Report</h4>
                        <p className="text-sm text-secondary break-words">Track FIFO rotation and expiring items</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer transition-shadow">
                        <div className="text-2xl mb-2">🌡️</div>
                        <h4 className="font-semibold mb-2 text-primary break-words">Cold Chain Report</h4>
                        <p className="text-sm text-secondary break-words">Temperature compliance and monitoring</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer transition-shadow">
                        <div className="text-2xl mb-2">🌱</div>
                        <h4 className="font-semibold mb-2 text-primary break-words">Organic Tracking</h4>
                        <p className="text-sm text-secondary break-words">Organic vs conventional analysis</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer transition-shadow">
                        <div className="text-2xl mb-2">🏷️</div>
                        <h4 className="font-semibold mb-2 text-primary break-words">PLU Code Report</h4>
                        <p className="text-sm text-secondary break-words">Produce pricing and weight analysis</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer transition-shadow">
                        <div className="text-2xl mb-2">🗑️</div>
                        <h4 className="font-semibold mb-2 text-primary break-words">Waste Analysis</h4>
                        <p className="text-sm text-secondary break-words">Track shrinkage and donation opportunities</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer transition-shadow">
                        <div className="text-2xl mb-2">📈</div>
                        <h4 className="font-semibold mb-2 text-primary break-words">Turnover Analysis</h4>
                        <p className="text-sm text-secondary break-words">Department performance and efficiency</p>
                      </div>
                    </div>

                    {/* Universal stats with grocery focus */}
                    <UniversalInventoryStats
                      businessId={BUSINESS_ID}
                      businessType="grocery"
                      showTrends={true}
                      showBusinessSpecific={true}
                      layout="dashboard"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add/Edit Item Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-primary break-words">
                      {selectedItem ? 'Edit' : 'Add'} Grocery Item
                    </h3>
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        setSelectedItem(null)
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 flex-shrink-0 ml-4"
                    >
                      ✕
                    </button>
                  </div>

                  <UniversalInventoryForm
                    businessId={BUSINESS_ID}
                    businessType="grocery"
                    item={selectedItem}
                    onSubmit={handleFormSubmit}
                    onCancel={() => {
                      setShowAddForm(false)
                      setSelectedItem(null)
                    }}
                    renderMode="inline"
                    customFields={[
                      {
                        name: 'pluCode',
                        label: 'PLU Code',
                        type: 'text',
                        placeholder: 'e.g., 4011 for bananas',
                        section: 'grocery'
                      },
                      {
                        name: 'department',
                        label: 'Department',
                        type: 'select',
                        options: [
                          { value: 'produce', label: 'Produce' },
                          { value: 'dairy', label: 'Dairy & Eggs' },
                          { value: 'meat', label: 'Fresh Meat' },
                          { value: 'frozen', label: 'Frozen Foods' },
                          { value: 'bakery', label: 'Fresh Bakery' },
                          { value: 'deli', label: 'Deli Counter' },
                          { value: 'grocery', label: 'Grocery' },
                          { value: 'health', label: 'Health & Beauty' }
                        ],
                        section: 'grocery'
                      },
                      {
                        name: 'temperatureZone',
                        label: 'Temperature Zone',
                        type: 'select',
                        options: [
                          { value: 'ambient', label: 'Ambient (Room Temperature)' },
                          { value: 'refrigerated', label: 'Refrigerated (32°F - 40°F)' },
                          { value: 'frozen', label: 'Frozen (-10°F - 0°F)' }
                        ],
                        section: 'grocery'
                      },
                      {
                        name: 'organicCertified',
                        label: 'Organic Certified',
                        type: 'checkbox',
                        section: 'grocery'
                      },
                      {
                        name: 'allergens',
                        label: 'Allergens',
                        type: 'multiselect',
                        options: [
                          { value: 'milk', label: 'Milk' },
                          { value: 'eggs', label: 'Eggs' },
                          { value: 'fish', label: 'Fish' },
                          { value: 'shellfish', label: 'Shellfish' },
                          { value: 'nuts', label: 'Tree Nuts' },
                          { value: 'peanuts', label: 'Peanuts' },
                          { value: 'wheat', label: 'Wheat' },
                          { value: 'soy', label: 'Soy' }
                        ],
                        section: 'grocery'
                      },
                      {
                        name: 'expirationDays',
                        label: 'Shelf Life (Days)',
                        type: 'number',
                        placeholder: 'Average days until expiration',
                        section: 'grocery'
                      },
                      {
                        name: 'batchTracking',
                        label: 'Batch Tracking Required',
                        type: 'checkbox',
                        section: 'grocery'
                      }
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}