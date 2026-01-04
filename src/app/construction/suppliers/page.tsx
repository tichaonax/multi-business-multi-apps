'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import React, { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { UniversalSupplierGrid, UniversalSupplierForm } from '@/components/universal/supplier'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'construction-demo-business'

export default function ConstructionSuppliersPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'deliveries' | 'orders' | 'performance'>('suppliers')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const customAlert = useAlert()
  const confirm = useConfirm()

  // Load suppliers from API
  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/suppliers?businessId=${BUSINESS_ID}&businessType=construction`)
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
    { id: 'suppliers', label: 'Supplier Directory', icon: '🏢', description: 'Manage construction suppliers' },
    { id: 'deliveries', label: 'Job Site Deliveries', icon: '🚚', description: 'Project-based delivery tracking' },
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
      const response = await fetch(`/api/suppliers/${supplier.id}?businessId=${BUSINESS_ID}`, {
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
      await customAlert({ title: 'Error', description: 'Error deleting supplier' })
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
  await customAlert({ title: 'Error', description: `Error ${selectedSupplier ? 'updating' : 'creating'} supplier` })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = (supplier: any) => {
    console.log('Creating order for supplier:', supplier)
  void customAlert({ title: 'Coming soon', description: `Creating purchase order for ${supplier.name} - Feature coming soon!` })
  }

  return (
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="construction">
        <ContentLayout
          title="Construction Supplier Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Construction', href: '/construction' },
            { label: 'Suppliers', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Construction Specific Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Suppliers</p>
                    <p className="text-2xl font-bold text-blue-600">14</p>
                  </div>
                  <div className="text-2xl">🏢</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Projects</p>
                    <p className="text-2xl font-bold text-orange-600">7</p>
                  </div>
                  <div className="text-2xl">🏗️</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Equipment Rentals</p>
                    <p className="text-2xl font-bold text-yellow-600">12</p>
                  </div>
                  <div className="text-2xl">🚛</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Spend</p>
                    <p className="text-2xl font-bold text-green-600">$485K</p>
                  </div>
                  <div className="text-2xl">💰</div>
                </div>
              </div>
            </div>

            {/* Construction-Specific Features Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                🏗️ Construction Supplier Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="text-blue-700 font-medium text-sm">🚛 Equipment Rental</div>
                  <div className="text-xs text-blue-600">Heavy machinery & tools</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="text-blue-700 font-medium text-sm">🏗️ Project-Based</div>
                  <div className="text-xs text-blue-600">Job site delivery coordination</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="text-blue-700 font-medium text-sm">📋 Material Tracking</div>
                  <div className="text-xs text-blue-600">Concrete, steel, lumber tracking</div>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <div className="text-blue-700 font-medium text-sm">⚡ Emergency Supply</div>
                  <div className="text-xs text-blue-600">24/7 emergency suppliers</div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
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
                        <h3 className="text-lg font-semibold">Construction Suppliers</h3>
                        <p className="text-sm text-gray-600">Manage material suppliers, equipment rentals, and subcontractors</p>
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
                      businessId={BUSINESS_ID}
                      businessType="construction"
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
                      <h3 className="text-lg font-semibold">Job Site Delivery Coordination</h3>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Schedule Delivery
                      </button>
                    </div>

                    {/* Sample delivery cards for construction */}
                    <div className="space-y-4">
                      {[
                        {
                          supplier: 'Heavy Equipment Rentals',
                          order: 'PO-CON-2024-089',
                          project: 'Downtown Office Complex',
                          status: 'Delivered',
                          items: ['Excavator CAT 320 (1 unit)', 'Crane 50-ton (1 unit)', 'Concrete Mixer (2 units)'],
                          scheduled: 'Today 6:00 AM',
                          driver: 'Mike Rodriguez',
                          truck: 'HER-501',
                          value: 15750.00,
                          jobSite: '123 Main St, Downtown',
                          emergency: false
                        },
                        {
                          supplier: 'Steel & Concrete Supply',
                          order: 'PO-CON-2024-090',
                          project: 'Residential Complex Phase 2',
                          status: 'In Transit',
                          items: ['Rebar Grade 60 (2 tons)', 'Ready-Mix Concrete (15 yards)', 'Steel Beams I-20 (12 units)'],
                          scheduled: 'Today 8:00 AM',
                          driver: 'Carlos Martinez',
                          truck: 'SCS-204',
                          value: 28450.75,
                          jobSite: '456 Oak Ave, Westside',
                          emergency: false
                        },
                        {
                          supplier: '24/7 Emergency Supply',
                          order: 'PO-CON-2024-091',
                          project: 'Highway Bridge Repair',
                          status: 'Urgent',
                          items: ['Emergency Concrete Patch (500 lbs)', 'Steel Plates (8 units)', 'Hydraulic Jack (1 unit)'],
                          scheduled: 'Today 2:00 PM',
                          value: 8750.00,
                          jobSite: 'Highway 101, Mile Marker 15',
                          emergency: true
                        }
                      ].map((delivery, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold">{delivery.supplier}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  delivery.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                  delivery.status === 'In Transit' ? 'bg-yellow-100 text-yellow-800' :
                                  delivery.status === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {delivery.status}
                                </span>
                                {delivery.emergency && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                    ⚡ Emergency
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>Order: {delivery.order} • Project: {delivery.project}</div>
                                <div>Scheduled: {delivery.scheduled} • Job Site: {delivery.jobSite}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600">
                                ${delivery.value.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {delivery.driver && (
                            <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                              <span>Driver: {delivery.driver}</span>
                              <span>Truck: {delivery.truck}</span>
                            </div>
                          )}

                          <div className="space-y-2 mb-4">
                            <h5 className="font-medium text-gray-900">Equipment & Materials:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {delivery.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="bg-white p-2 rounded border text-sm">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t">
                            <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                              Site Coordination
                            </button>
                            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
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
                    <p className="text-gray-600 mb-6">Create and track construction purchase orders</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                        <div className="text-2xl mb-2">🚛</div>
                        <div className="font-medium">Equipment Rental</div>
                        <div className="text-xs text-gray-600">Heavy machinery orders</div>
                      </button>
                      <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                        <div className="text-2xl mb-2">🏗️</div>
                        <div className="font-medium">Project Materials</div>
                        <div className="text-xs text-gray-600">Job-specific ordering</div>
                      </button>
                      <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
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
                    <h3 className="text-lg font-semibold">Construction Supplier Performance</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Delivery Reliability</h4>
                        <div className="space-y-3">
                          {[
                            { name: 'Heavy Equipment Rentals', score: 88.9, color: 'bg-yellow-500' },
                            { name: 'Steel & Concrete Supply', score: 94.2, color: 'bg-green-500' },
                            { name: '24/7 Emergency Supply', score: 96.7, color: 'bg-green-500' }
                          ].map((supplier, index) => (
                            <div key={index}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">{supplier.name}</span>
                                <span className="text-sm font-semibold text-blue-600">{supplier.score}%</span>
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
                        <h4 className="font-semibold text-gray-900 mb-4">Project Impact</h4>
                        <div className="space-y-3">
                          {[
                            { project: 'Downtown Office Complex', suppliers: 8, onTime: 92.5, budget: 485000 },
                            { project: 'Residential Phase 2', suppliers: 6, onTime: 89.1, budget: 325000 },
                            { project: 'Highway Bridge Repair', suppliers: 4, onTime: 95.8, budget: 165000 }
                          ].map((project, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{project.project}</span>
                                <span className="text-blue-600 font-bold">${project.budget.toLocaleString()}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {project.suppliers} suppliers • {project.onTime}% on-time delivery
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3">🏗️ Construction Insights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-blue-800 mb-2">Reliability Champions</h5>
                          <ul className="text-blue-700 space-y-1">
                            <li>• Emergency Supply: 96.7% reliability</li>
                            <li>• Steel & Concrete: consistent quality</li>
                            <li>• Equipment rentals improving</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-blue-800 mb-2">Project Performance</h5>
                          <ul className="text-blue-700 space-y-1">
                            <li>• Highway project: 95.8% on-time</li>
                            <li>• Emergency response excellent</li>
                            <li>• Cost overruns minimized</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-blue-800 mb-2">Action Items</h5>
                          <ul className="text-blue-700 space-y-1">
                            <li>• Improve equipment delivery times</li>
                            <li>• Expand emergency supplier network</li>
                            <li>• Review concrete supplier quality</li>
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
                  businessId={BUSINESS_ID}
                  businessType="construction"
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