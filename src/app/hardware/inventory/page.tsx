'use client'

import React, { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import {
  UniversalInventoryGrid,
  UniversalInventoryForm,
  UniversalStockMovements,
  UniversalLowStockAlerts,
  UniversalInventoryStats
} from '@/components/universal/inventory'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function HardwareInventoryPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'movements' | 'alerts' | 'reports'>('overview')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const { data: session, status } = useSession()
  const router = useRouter()

  // Use the business permissions context for proper business management
  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  // Check if current business is a hardware business
  const isHardwareBusiness = currentBusiness?.businessType === 'hardware'

  // Redirect to signin if not authenticated
  React.useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Show loading while session or business context is loading
  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Don't render if no session or no business access
  if (!session || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to use the inventory management system.</p>
        </div>
      </div>
    )
  }

  // Check if user has any hardware businesses
  const hardwareBusinesses = businesses.filter(b => b.businessType === 'hardware' && b.isActive)
  const hasHardwareBusinesses = hardwareBusinesses.length > 0

  // If no current business selected and user has hardware businesses, show selection prompt
  if (!currentBusiness && hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Hardware Business</h2>
          <p className="text-gray-600 mb-4">
            You have access to {hardwareBusinesses.length} hardware business{hardwareBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to use the inventory management system.
          </p>
          <div className="space-y-2">
            {hardwareBusinesses.slice(0, 3).map(business => (
              <div key={business.businessId} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{business.businessName}</p>
                <p className="text-sm text-gray-600">Role: {business.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // If current business is not hardware, show error
  if (currentBusiness && !isHardwareBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 mb-4">
            The Hardware Inventory Management is only available for hardware businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
          </p>
          <p className="text-sm text-gray-500">
            Please select a hardware business from the sidebar to use this system.
          </p>
        </div>
      </div>
    )
  }

  // If no hardware businesses at all, show message
  if (!hasHardwareBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Hardware Businesses</h2>
          <p className="text-gray-600 mb-4">
            You don't have access to any hardware businesses. The Hardware Inventory Management system requires access to at least one hardware business.
          </p>
          <p className="text-sm text-gray-500">
            Contact your administrator if you need access to hardware businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid hardware business selected
  const businessId = currentBusinessId!

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'inventory', label: 'Items', icon: '🔧' },
    { id: 'movements', label: 'Stock Movements', icon: '🔄' },
    { id: 'alerts', label: 'Alerts & Reorders', icon: '⚠️' },
    { id: 'reports', label: 'Analytics', icon: '📈' }
  ]

  const handleItemEdit = (item: any) => {
    setSelectedItem(item)
    setShowAddForm(true)
  }

  const handleItemView = (item: any) => {
    setSelectedItem(item)
    console.log('Viewing item:', item)
  }

  const handleItemDelete = async (item: any) => {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        const response = await fetch(`/api/inventory/${businessId}/items/${item.id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
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
        ? `/api/inventory/${businessId}/items/${selectedItem.id}`
        : `/api/inventory/${businessId}/items`

      const method = selectedItem ? 'PUT' : 'POST'

      // Transform form data to include hardware-specific attributes
      const hardwareFormData = {
        ...formData,
        businessId: businessId,
        businessType: 'hardware',
        attributes: {
          ...formData.attributes,
          // Hardware-specific attributes
          measurements: {
            length: formData.length,
            width: formData.width,
            height: formData.height,
            weight: formData.weight,
            unit: formData.measurementUnit
          },
          material: formData.material,
          finish: formData.finish,
          grade: formData.grade,
          brand: formData.brand,
          supplier: formData.supplier,
          supplierSku: formData.supplierSku,
          bulkPricing: {
            enabled: formData.bulkPricingEnabled || false,
            minimumQuantity: formData.bulkMinQuantity,
            bulkPrice: formData.bulkPrice
          },
          installation: {
            required: formData.installationRequired || false,
            complexity: formData.installationComplexity || 'easy',
            estimatedTime: formData.installationTime
          },
          warranty: {
            period: formData.warrantyPeriod,
            type: formData.warrantyType || 'manufacturer'
          },
          seasonality: formData.seasonality || 'year-round',
          hazardous: formData.hazardous || false,
          returnPolicy: formData.returnPolicy || 'standard'
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hardwareFormData)
      })

      if (response.ok) {
        setShowAddForm(false)
        setSelectedItem(null)
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
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="hardware">
        <ContentLayout
          title="🔧 Hardware Inventory Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Hardware', href: '/hardware' },
            { label: 'Inventory', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="card">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-2 sm:space-x-8 px-3 sm:px-6 overflow-x-auto" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 min-w-0 ${
                        activeTab === tab.id
                          ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="text-lg sm:text-base">{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-3 sm:p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Hardware-specific banner */}
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-6">
                      <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-3">
                        🔧 Hardware Store Inventory Features
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-3 border border-orange-200 dark:border-orange-800">
                          <div className="text-orange-700 dark:text-orange-300 font-medium text-sm">📏 Measurement Units</div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">Custom units & bulk quantities</div>
                        </div>
                        <div className="card p-3 border border-orange-200 dark:border-orange-800">
                          <div className="text-orange-700 dark:text-orange-300 font-medium text-sm">🚛 Bulk Pricing</div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">Contractor & volume discounts</div>
                        </div>
                        <div className="card p-3 border border-orange-200 dark:border-orange-800">
                          <div className="text-orange-700 dark:text-orange-300 font-medium text-sm">🔨 Installation Tracking</div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">Service requirements & complexity</div>
                        </div>
                        <div className="card p-3 border border-orange-200 dark:border-orange-800">
                          <div className="text-orange-700 dark:text-orange-300 font-medium text-sm">⚡ Seasonal Management</div>
                          <div className="text-xs text-orange-600 dark:text-orange-400">Weather-based stock planning</div>
                        </div>
                      </div>
                    </div>

                    {/* Universal Inventory Stats */}
                    <UniversalInventoryStats
                      businessId={businessId}
                      businessType="hardware"
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="text-lg font-semibold">Inventory Items</h3>
                      <button
                        onClick={() => {
                          setSelectedItem(null)
                          setShowAddForm(true)
                        }}
                        className="btn-primary bg-orange-600 hover:bg-orange-700"
                      >
                        ➕ Add Hardware Item
                      </button>
                    </div>

                    <UniversalInventoryGrid
                      businessId={businessId}
                      businessType="hardware"
                      onItemEdit={handleItemEdit}
                      onItemView={handleItemView}
                      onItemDelete={handleItemDelete}
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
                      businessId={businessId}
                      showFilters={true}
                      maxItems={100}
                      layout="full"
                    />
                  </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Inventory Alerts & Reorder Management</h3>

                    {/* Hardware-specific alert info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔧 Hardware Store Alert Types</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Seasonal Alerts</div>
                          <div className="text-blue-700 dark:text-blue-300">Weather-based restocking</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Bulk Order Alerts</div>
                          <div className="text-blue-700 dark:text-blue-300">Contractor volume pricing</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Supplier Issues</div>
                          <div className="text-blue-700 dark:text-blue-300">Lead time changes</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Installation Service</div>
                          <div className="text-blue-700 dark:text-blue-300">Service availability tracking</div>
                        </div>
                      </div>
                    </div>

                    <UniversalLowStockAlerts
                      businessId={businessId}
                      businessType="hardware"
                      alertTypes={['low_stock', 'out_of_stock', 'seasonal_reorder', 'supplier_delayed']}
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
                    <h3 className="text-lg font-semibold">Hardware Analytics & Reports</h3>

                    {/* Hardware-specific report types */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">📊</div>
                        <h4 className="font-semibold mb-2">Seasonal Analysis</h4>
                        <p className="text-sm text-secondary">Track seasonal demand patterns and stock planning</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">🚛</div>
                        <h4 className="font-semibold mb-2">Bulk Order Report</h4>
                        <p className="text-sm text-secondary">Contractor discounts and volume pricing</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">🔨</div>
                        <h4 className="font-semibold mb-2">Installation Services</h4>
                        <p className="text-sm text-secondary">Service requirements and scheduling</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">📏</div>
                        <h4 className="font-semibold mb-2">Material Usage</h4>
                        <p className="text-sm text-secondary">Lumber, fasteners, and material tracking</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">⚡</div>
                        <h4 className="font-semibold mb-2">Supplier Performance</h4>
                        <p className="text-sm text-secondary">Lead times, quality, and reliability metrics</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">📈</div>
                        <h4 className="font-semibold mb-2">Category Analysis</h4>
                        <p className="text-sm text-secondary">Performance by department and product type</p>
                      </div>
                    </div>

                    {/* Universal stats with hardware focus */}
                    <UniversalInventoryStats
                      businessId={businessId}
                      businessType="hardware"
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
          <UniversalInventoryForm
            businessId={businessId}
            businessType="hardware"
            item={selectedItem}
            onSave={handleFormSubmit}
            onCancel={() => {
              setShowAddForm(false)
              setSelectedItem(null)
            }}
            isOpen={showAddForm}
            mode={selectedItem ? 'edit' : 'create'}
          />
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}
