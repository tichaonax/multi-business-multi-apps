'use client'

import React, { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { UniversalSupplierGrid, UniversalSupplierForm } from '@/components/universal/supplier'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function HardwareSuppliersPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'deliveries' | 'orders' | 'performance'>('suppliers')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()
  const customAlert = useAlert()
  const confirm = useConfirm()

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
          <p className="text-gray-600">You need to be logged in to use the supplier management system.</p>
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
            Please select one from the sidebar to use the supplier management system.
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
            The Hardware Supplier Management is only available for hardware businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
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
            You don't have access to any hardware businesses. The Hardware Supplier Management system requires access to at least one hardware business.
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

  // Load suppliers from API
  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/suppliers?businessId=${businessId}&businessType=hardware`)
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers || [])
      }
    } catch (error) {
      console.error('Error loading suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load suppliers on component mount
  React.useEffect(() => {
    loadSuppliers()
  }, [])

  const tabs = [
    { id: 'suppliers', label: 'Supplier Directory', icon: '🏢', description: 'Manage your suppliers and vendors' },
    { id: 'deliveries', label: 'Deliveries', icon: '🚚', description: 'Track incoming deliveries' },
    { id: 'orders', label: 'Purchase Orders', icon: '📋', description: 'Create and manage orders' },
    { id: 'performance', label: 'Analytics', icon: '📊', description: 'Supplier performance metrics' }
  ]

  const handleSupplierEdit = (supplier: any) => {
    setSelectedSupplier(supplier)
    setShowAddForm(true)
  }

  const handleSupplierView = (supplier: any) => {
    setSelectedSupplier(supplier)
    console.log('Viewing supplier:', supplier)
  }

  const handleSupplierDelete = async (supplier: any) => {
    const ok = await confirm({ title: 'Delete supplier', description: `Are you sure you want to delete ${supplier.name}?`, confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return

    try {
      const response = await fetch(`/api/suppliers/${supplier.id}?businessId=${businessId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        await loadSuppliers() // Reload suppliers
        await customAlert({ title: 'Supplier deleted', description: 'Supplier deleted successfully' })
      } else {
        throw new Error('Failed to delete supplier')
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      await customAlert({ title: 'Delete failed', description: 'Error deleting supplier' })
    }
  }

  const handleSupplierSubmit = async (supplierData: any) => {
    setLoading(true)
    try {
      const url = selectedSupplier
        ? `/api/suppliers/${selectedSupplier.id}`
        : '/api/suppliers'
      const method = selectedSupplier ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(supplierData)
      })

      if (response.ok) {
        await loadSuppliers() // Reload suppliers
  setShowAddForm(false)
  setSelectedSupplier(null)
  await customAlert({ title: 'Supplier saved', description: `Supplier ${selectedSupplier ? 'updated' : 'created'} successfully` })
      } else {
        throw new Error(`Failed to ${selectedSupplier ? 'update' : 'create'} supplier`)
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
      await customAlert({ title: 'Save failed', description: `Error ${selectedSupplier ? 'updating' : 'creating'} supplier` })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = (supplier: any) => {
    console.log('Creating order for supplier:', supplier)
    void customAlert({ title: 'Coming soon', description: `Creating purchase order for ${supplier.name} - Feature coming soon!` })
  }

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="hardware">
        <ContentLayout
          title="Hardware Supplier Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Hardware', href: '/hardware' },
            { label: 'Suppliers', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Hardware Store Specific Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Active Suppliers</p>
                    <p className="text-2xl font-bold text-orange-600">12</p>
                  </div>
                  <div className="text-2xl">🏢</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Pending Deliveries</p>
                    <p className="text-2xl font-bold text-blue-600">5</p>
                  </div>
                  <div className="text-2xl">🚚</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Bulk Orders</p>
                    <p className="text-2xl font-bold text-green-600">8</p>
                  </div>
                  <div className="text-2xl">📦</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Lead Time Avg</p>
                    <p className="text-2xl font-bold text-purple-600">4.2d</p>
                  </div>
                  <div className="text-2xl">⏱️</div>
                </div>
              </div>
            </div>

            {/* Hardware-Specific Features Banner */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-orange-900 mb-3">
                🔧 Hardware Store Supplier Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-3 border border-orange-200 dark:border-orange-800">
                  <div className="text-orange-700 font-medium text-sm">🚛 Bulk Ordering</div>
                  <div className="text-xs text-orange-600">Volume discounts & contractor pricing</div>
                </div>
                <div className="card p-3 border border-orange-200 dark:border-orange-800">
                  <div className="text-orange-700 font-medium text-sm">📏 Cut-to-Size</div>
                  <div className="text-xs text-orange-600">Custom lumber & material cutting</div>
                </div>
                <div className="card p-3 border border-orange-200 dark:border-orange-800">
                  <div className="text-orange-700 font-medium text-sm">⚡ Seasonal Stocking</div>
                  <div className="text-xs text-orange-600">Weather-based supplier planning</div>
                </div>
                <div className="card p-3 border border-orange-200 dark:border-orange-800">
                  <div className="text-orange-700 font-medium text-sm">🔨 Material Categories</div>
                  <div className="text-xs text-orange-600">Lumber, fasteners, tools & more</div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="card">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <div className="text-left">
                        <div>{tab.label}</div>
                        <div className="text-xs text-secondary font-normal">{tab.description}</div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Suppliers Tab */}
                {activeTab === 'suppliers' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">Hardware Suppliers</h3>
                        <p className="text-sm text-secondary">Manage lumber suppliers, tool vendors, and material distributors</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSupplier(null)
                          setShowAddForm(true)
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Add Supplier
                      </button>
                    </div>

                    <UniversalSupplierGrid
                      businessId={businessId}
                      businessType="hardware"
                      suppliers={suppliers}
                      loading={loading}
                      onSupplierEdit={handleSupplierEdit}
                      onSupplierView={handleSupplierView}
                      onSupplierDelete={handleSupplierDelete}
                      onCreateOrder={handleCreateOrder}
                      showActions={true}
                      layout="table"
                      allowSearch={true}
                      allowFiltering={true}
                      allowSorting={true}
                      showBusinessSpecificFields={true}
                    />
                  </div>
                )}

                {/* Deliveries Tab */}
                {activeTab === 'deliveries' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Delivery Tracking</h3>
                      <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                        Schedule Delivery
                      </button>
                    </div>

                    {/* Sample delivery cards */}
                    <div className="space-y-4">
                      {[
                        {
                          supplier: 'Pacific Lumber Supply Co.',
                          order: 'PO-HW-2024-089',
                          status: 'In Transit',
                          items: ['2x4 Lumber (50 pcs)', 'Wood Screws (5 boxes)', 'Sandpaper (assorted)'],
                          scheduled: 'Today 10:00 AM',
                          driver: 'Mike Johnson',
                          truck: 'PL-102',
                          value: 2847.50
                        },
                        {
                          supplier: 'Industrial Fasteners Inc.',
                          order: 'PO-HW-2024-090',
                          status: 'Scheduled',
                          items: ['Hex Bolts (bulk)', 'Washers (assorted)', 'Nuts (bulk)'],
                          scheduled: 'Tomorrow 8:30 AM',
                          value: 1234.75
                        }
                      ].map((delivery, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold">{delivery.supplier}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  delivery.status === 'In Transit' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {delivery.status}
                                </span>
                              </div>
                              <div className="text-sm text-secondary">
                                Order: {delivery.order} • Scheduled: {delivery.scheduled}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                ${delivery.value.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {delivery.driver && (
                            <div className="flex items-center gap-4 mb-3 text-sm text-secondary">
                              <span>Driver: {delivery.driver}</span>
                              <span>Truck: {delivery.truck}</span>
                            </div>
                          )}

                          <div className="space-y-2 mb-4">
                            <h5 className="font-medium text-primary">Items:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {delivery.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="card p-2 border text-sm">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t">
                            <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                              Track
                            </button>
                            <button className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">
                              Update
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-medium text-primary mb-2">Purchase Order Management</h3>
                    <p className="text-secondary mb-6">Create and track hardware store purchase orders</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <button className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100">
                        <div className="text-2xl mb-2">📝</div>
                        <div className="font-medium">Create Bulk Order</div>
                        <div className="text-xs text-secondary">Contractor discounts</div>
                      </button>
                      <button className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100">
                        <div className="text-2xl mb-2">✂️</div>
                        <div className="font-medium">Cut-to-Size Order</div>
                        <div className="text-xs text-secondary">Custom lumber cutting</div>
                      </button>
                      <button className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100">
                        <div className="text-2xl mb-2">📊</div>
                        <div className="font-medium">Order History</div>
                        <div className="text-xs text-secondary">Track past orders</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Performance Tab */}
                {activeTab === 'performance' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Hardware Supplier Performance</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="card border rounded-lg p-4">
                        <h4 className="font-semibold text-primary mb-4">Delivery Performance</h4>
                        <div className="space-y-3">
                          {[
                            { name: 'Pacific Lumber Supply', performance: 96.2, color: 'bg-green-500' },
                            { name: 'Industrial Fasteners', performance: 94.8, color: 'bg-green-500' },
                            { name: 'Professional Paint & Tools', performance: 89.3, color: 'bg-yellow-500' }
                          ].map((supplier, index) => (
                            <div key={index}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">{supplier.name}</span>
                                <span className="text-sm font-semibold text-green-600">{supplier.performance}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${supplier.color}`}
                                  style={{ width: `${supplier.performance}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="card border rounded-lg p-4">
                        <h4 className="font-semibold text-primary mb-4">Cost Performance</h4>
                        <div className="space-y-3">
                          {[
                            { category: 'Lumber & Materials', savings: 12.3, amount: 45820 },
                            { category: 'Fasteners & Hardware', savings: 8.7, amount: 23150 },
                            { category: 'Tools & Equipment', savings: 15.2, amount: 18940 }
                          ].map((category, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{category.category}</span>
                                <span className="text-green-600 font-bold">${category.amount.toLocaleString()}</span>
                              </div>
                              <div className="text-sm text-secondary">
                                Cost savings: {category.savings}% this quarter
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-900 mb-3">🔧 Hardware Store Insights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-orange-800 mb-2">Seasonal Trends</h5>
                          <ul className="text-orange-700 space-y-1">
                            <li>• Spring rush drives lumber demand</li>
                            <li>• Winter tool sales peak in December</li>
                            <li>• Summer = paint & outdoor supplies</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-orange-800 mb-2">Bulk Order Benefits</h5>
                          <ul className="text-orange-700 space-y-1">
                            <li>• 15% average contractor discount</li>
                            <li>• Direct job-site delivery available</li>
                            <li>• Extended payment terms for volume</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-orange-800 mb-2">Action Items</h5>
                          <ul className="text-orange-700 space-y-1">
                            <li>• Negotiate Q4 lumber pricing</li>
                            <li>• Expand cut-to-size services</li>
                            <li>• Review paint supplier terms</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add/Edit Supplier Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="w-full flex items-start justify-center pt-8">
                <UniversalSupplierForm
                  businessId={businessId}
                  businessType="hardware"
                  supplier={selectedSupplier}
                  onSubmit={handleSupplierSubmit}
                  onCancel={() => {
                    setShowAddForm(false)
                    setSelectedSupplier(null)
                  }}
                  loading={loading}
                />
              </div>
            </div>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}