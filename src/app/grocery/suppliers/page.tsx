"use client"

import React, { useState, useEffect } from 'react'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { UniversalSupplierGrid, UniversalSupplierForm } from '@/components/universal/supplier'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

export default function GrocerySuppliersPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'deliveries' | 'orders' | 'performance'>('suppliers')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const { data: session, status } = useSession()
  const router = useRouter()
  const customAlert = useAlert()
  const confirm = useConfirm()

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  // If session is loading, don't render yet
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to manage suppliers.</p>
        </div>
      </div>
    )
  }

  // If user has grocery businesses but hasn't selected one yet, prompt selection
  const groceryBusinesses = businesses.filter((b: any) => b.businessType === 'grocery' && b.isActive)
  const hasGroceryBusinesses = groceryBusinesses.length > 0

  if (!currentBusiness && hasGroceryBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Grocery Business</h2>
          <p className="text-gray-600 mb-4">
            You have access to {groceryBusinesses.length} grocery business{groceryBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to manage suppliers.
          </p>
          <div className="space-y-2">
            {groceryBusinesses.slice(0, 3).map((business: any) => (
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

  if (currentBusiness && currentBusiness.businessType !== 'grocery') {
    return <BusinessTypeRedirect />
  }

  // At this point we have a valid business selected
  const businessId = currentBusinessId!

  // Load suppliers from API
  const loadSuppliers = async () => {
    setLoading(true)
    try {
  const response = await fetch(`/api/suppliers?businessId=${businessId}&businessType=grocery`)
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
    { id: 'suppliers', label: 'Supplier Directory', icon: '🏢', description: 'Manage your food suppliers' },
    { id: 'deliveries', label: 'Deliveries', icon: '🚚', description: 'Cold chain & delivery tracking' },
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
      <BusinessTypeRoute requiredBusinessType="grocery">
        <ContentLayout
          title="Grocery Supplier Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Grocery', href: '/grocery' },
            { label: 'Suppliers', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Grocery Store Specific Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Suppliers</p>
                    <p className="text-2xl font-bold text-green-600">8</p>
                  </div>
                  <div className="text-2xl">🏢</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Cold Chain Items</p>
                    <p className="text-2xl font-bold text-cyan-600">3</p>
                  </div>
                  <div className="text-2xl">❄️</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Organic Suppliers</p>
                    <p className="text-2xl font-bold text-green-600">5</p>
                  </div>
                  <div className="text-2xl">🌱</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Food Safety Score</p>
                    <p className="text-2xl font-bold text-blue-600">98.2</p>
                  </div>
                  <div className="text-2xl">🛡️</div>
                </div>
              </div>
            </div>

            {/* Grocery-Specific Features Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">
                🛒 Grocery Store Supplier Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-3 border border-green-200 dark:border-green-800">
                  <div className="text-green-700 font-medium text-sm">❄️ Cold Chain Tracking</div>
                  <div className="text-xs text-green-600">Temperature monitoring & compliance</div>
                </div>
                <div className="card p-3 border border-green-200 dark:border-green-800">
                  <div className="text-green-700 font-medium text-sm">🌱 Organic Sourcing</div>
                  <div className="text-xs text-green-600">Certified organic & local suppliers</div>
                </div>
                <div className="card p-3 border border-green-200 dark:border-green-800">
                  <div className="text-green-700 font-medium text-sm">🛡️ Food Safety</div>
                  <div className="text-xs text-green-600">HACCP, SQF & compliance tracking</div>
                </div>
                <div className="card p-3 border border-green-200 dark:border-green-800">
                  <div className="text-green-700 font-medium text-sm">📅 FIFO Management</div>
                  <div className="text-xs text-green-600">First-in-first-out rotation</div>
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
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <div className="text-left">
                        <div>{tab.label}</div>
                        <div className="text-xs text-gray-400 font-normal">{tab.description}</div>
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
                        <h3 className="text-lg font-semibold">Grocery Suppliers</h3>
                        <p className="text-sm text-gray-600">Manage produce suppliers, dairy vendors, and food distributors</p>
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
                      businessType="grocery"
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
                      <h3 className="text-lg font-semibold">Cold Chain & Delivery Tracking</h3>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Schedule Delivery
                      </button>
                    </div>

                    {/* Sample delivery cards */}
                    <div className="space-y-4">
                      {[
                        {
                          supplier: 'Fresh Farms Co-op',
                          order: 'PO-GR-2024-089',
                          status: 'In Transit',
                          items: ['Organic Bananas (120 lbs)', 'Mixed Greens (24 cases)', 'Organic Apples (80 lbs)'],
                          scheduled: 'Today 8:00 AM',
                          driver: 'Carlos Martinez',
                          truck: 'FF-102',
                          value: 890.50,
                          coldChain: true,
                          temp: '35°F'
                        },
                        {
                          supplier: 'Dairy Dreams Inc.',
                          order: 'PO-GR-2024-090',
                          status: 'Scheduled',
                          items: ['Whole Milk (48 gallons)', 'Grade AA Eggs (12 cases)', 'Organic Yogurt (36 units)'],
                          scheduled: 'Today 10:30 AM',
                          value: 1245.75,
                          coldChain: true,
                          temp: '38°F'
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
                                {delivery.coldChain && (
                                  <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded-full">
                                    ❄️ Cold Chain
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Order: {delivery.order} • Scheduled: {delivery.scheduled}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                ${delivery.value.toLocaleString()}
                              </div>
                              {delivery.temp && (
                                <div className="text-sm text-cyan-600">
                                  Temp: {delivery.temp}
                                </div>
                              )}
                            </div>
                          </div>

                          {delivery.driver && (
                            <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                              <span>Driver: {delivery.driver}</span>
                              <span>Truck: {delivery.truck}</span>
                            </div>
                          )}

                          <div className="space-y-2 mb-4">
                            <h5 className="font-medium text-gray-900">Items:</h5>
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
                              Track Temperature
                            </button>
                            <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                              Update Status
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase Order Management</h3>
                    <p className="text-gray-600 mb-6">Create and track grocery store purchase orders</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">
                        <div className="text-2xl mb-2">🌱</div>
                        <div className="font-medium">Organic Orders</div>
                        <div className="text-xs text-gray-600">Certified organic suppliers</div>
                      </button>
                      <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">
                        <div className="text-2xl mb-2">❄️</div>
                        <div className="font-medium">Cold Chain Orders</div>
                        <div className="text-xs text-gray-600">Temperature controlled</div>
                      </button>
                      <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">
                        <div className="text-2xl mb-2">📊</div>
                        <div className="font-medium">Order History</div>
                        <div className="text-xs text-gray-600">Track past orders</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Performance Tab */}
                {activeTab === 'performance' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Grocery Supplier Performance</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Food Safety Compliance</h4>
                        <div className="space-y-3">
                          {[
                            { name: 'Fresh Farms Co-op', score: 98.2, color: 'bg-green-500' },
                            { name: 'Dairy Dreams Inc.', score: 97.8, color: 'bg-green-500' },
                            { name: 'Ocean Fresh Seafood', score: 94.5, color: 'bg-yellow-500' }
                          ].map((supplier, index) => (
                            <div key={index}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">{supplier.name}</span>
                                <span className="text-sm font-semibold text-green-600">{supplier.score}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${supplier.color}`}
                                  style={{ width: `${supplier.score}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Cold Chain Performance</h4>
                        <div className="space-y-3">
                          {[
                            { category: 'Dairy Products', compliance: 99.1, deliveries: 48 },
                            { category: 'Fresh Produce', compliance: 97.8, deliveries: 72 },
                            { category: 'Frozen Foods', compliance: 98.9, deliveries: 24 }
                          ].map((category, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{category.category}</span>
                                <span className="text-cyan-600 font-bold">{category.compliance}%</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {category.deliveries} deliveries this month
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3">🛒 Grocery Store Insights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-green-800 mb-2">Top Performers</h5>
                          <ul className="text-green-700 space-y-1">
                            <li>• Fresh Farms: 98.2% compliance</li>
                            <li>• Dairy Dreams: 97.8% on-time</li>
                            <li>• All organic certifications current</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-green-800 mb-2">Cold Chain Excellence</h5>
                          <ul className="text-green-700 space-y-1">
                            <li>• 99.1% temperature compliance</li>
                            <li>• Zero cold chain breaks this month</li>
                            <li>• All HACCP audits passed</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-green-800 mb-2">Action Items</h5>
                          <ul className="text-green-700 space-y-1">
                            <li>• Review seafood supplier terms</li>
                            <li>• Expand organic produce offerings</li>
                            <li>• Schedule quarterly safety audits</li>
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
                  businessType="grocery"
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