"use client"

import React, { useState, useEffect } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { UniversalSupplierGrid, UniversalSupplierForm } from '@/components/universal/supplier'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function ClothingSuppliersPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'deliveries' | 'orders' | 'performance'>('suppliers')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const { data: session, status } = useSession()
  const router = useRouter()

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
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

  const clothingBusinesses = businesses.filter((b: any) => b.businessType === 'clothing' && b.isActive)
  const hasClothingBusinesses = clothingBusinesses.length > 0

  if (!currentBusiness && hasClothingBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Clothing Business</h2>
          <p className="text-gray-600 mb-4">You have access to {clothingBusinesses.length} clothing business{clothingBusinesses.length > 1 ? 'es' : ''}. Please select one from the sidebar.</p>
        </div>
      </div>
    )
  }

  if (currentBusiness && currentBusiness.businessType !== 'clothing') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600">The Clothing Suppliers page is only for clothing businesses. Please select a clothing business.</p>
        </div>
      </div>
    )
  }

  const businessId = currentBusinessId!

  // Load suppliers from API
  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/suppliers?businessId=${businessId}&businessType=clothing`)
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
  }, [businessId])

  const tabs = [
    { id: 'suppliers', label: 'Supplier Directory', icon: '🏢', description: 'Manage your fashion suppliers' },
    { id: 'deliveries', label: 'Deliveries', icon: '🚚', description: 'Seasonal delivery tracking' },
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
    if (confirm(`Are you sure you want to delete ${supplier.name}?`)) {
      try {
  const response = await fetch(`/api/suppliers/${supplier.id}?businessId=${businessId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          await loadSuppliers() // Reload suppliers
          alert('Supplier deleted successfully')
        } else {
          throw new Error('Failed to delete supplier')
        }
      } catch (error) {
        console.error('Error deleting supplier:', error)
        alert('Error deleting supplier')
      }
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
        alert(`Supplier ${selectedSupplier ? 'updated' : 'created'} successfully`)
      } else {
        throw new Error(`Failed to ${selectedSupplier ? 'update' : 'create'} supplier`)
      }
    } catch (error) {
      console.error('Error saving supplier:', error)
      alert(`Error ${selectedSupplier ? 'updating' : 'creating'} supplier`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = (supplier: any) => {
    console.log('Creating order for supplier:', supplier)
    alert(`Creating purchase order for ${supplier.name} - Feature coming soon!`)
  }

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="clothing">
        <ContentLayout
          title="Fashion Supplier Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clothing', href: '/clothing' },
            { label: 'Suppliers', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Clothing Store Specific Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Suppliers</p>
                    <p className="text-2xl font-bold text-purple-600">9</p>
                  </div>
                  <div className="text-2xl">🏢</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Seasonal Orders</p>
                    <p className="text-2xl font-bold text-blue-600">15</p>
                  </div>
                  <div className="text-2xl">📦</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sustainable</p>
                    <p className="text-2xl font-bold text-green-600">6</p>
                  </div>
                  <div className="text-2xl">🌱</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Lead Time Avg</p>
                    <p className="text-2xl font-bold text-orange-600">45d</p>
                  </div>
                  <div className="text-2xl">⏱️</div>
                </div>
              </div>
            </div>

            {/* Clothing-Specific Features Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-3">
                👕 Fashion Store Supplier Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded border border-purple-200">
                  <div className="text-purple-700 font-medium text-sm">🌱 Sustainable Fashion</div>
                  <div className="text-xs text-purple-600">Ethical & eco-friendly sourcing</div>
                </div>
                <div className="bg-white p-3 rounded border border-purple-200">
                  <div className="text-purple-700 font-medium text-sm">📅 Seasonal Planning</div>
                  <div className="text-xs text-purple-600">Spring/Summer & Fall/Winter</div>
                </div>
                <div className="bg-white p-3 rounded border border-purple-200">
                  <div className="text-purple-700 font-medium text-sm">🏷️ Brand Management</div>
                  <div className="text-xs text-purple-600">Designer & private label</div>
                </div>
                <div className="bg-white p-3 rounded border border-purple-200">
                  <div className="text-purple-700 font-medium text-sm">📏 Size & Fit</div>
                  <div className="text-xs text-purple-600">Size runs & fit consistency</div>
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
                          ? 'border-purple-500 text-purple-600'
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
                        <h3 className="text-lg font-semibold">Fashion Suppliers</h3>
                        <p className="text-sm text-gray-600">Manage clothing manufacturers, fabric suppliers, and accessory vendors</p>
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
                      businessType="clothing"
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
                      <h3 className="text-lg font-semibold">Seasonal Delivery Tracking</h3>
                      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        Schedule Delivery
                      </button>
                    </div>

                    {/* Sample delivery cards for clothing */}
                    <div className="space-y-4">
                      {[
                        {
                          supplier: 'Premium Textiles Ltd.',
                          order: 'PO-CLO-2024-089',
                          status: 'In Transit',
                          items: ['Cotton T-Shirts (200 units)', 'Denim Jeans (150 units)', 'Summer Dresses (100 units)'],
                          scheduled: 'Tomorrow 10:00 AM',
                          driver: 'David Chen',
                          truck: 'PTL-305',
                          value: 8750.00,
                          season: 'Spring/Summer',
                          sustainable: true
                        },
                        {
                          supplier: 'Urban Fashion Wholesale',
                          order: 'PO-CLO-2024-090',
                          status: 'Scheduled',
                          items: ['Hoodies (80 units)', 'Joggers (120 units)', 'Sneakers (60 pairs)'],
                          scheduled: 'Next Week Tuesday',
                          value: 5420.50,
                          season: 'Fall/Winter',
                          sustainable: false
                        },
                        {
                          supplier: 'Eco-Friendly Apparel Co.',
                          order: 'PO-CLO-2024-091',
                          status: 'Processing',
                          items: ['Organic Cotton Shirts (150 units)', 'Recycled Polyester Jackets (75 units)', 'Bamboo Underwear (200 units)'],
                          scheduled: 'Next Month',
                          value: 12150.25,
                          season: 'All Season',
                          sustainable: true
                        }
                      ].map((delivery, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold">{delivery.supplier}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  delivery.status === 'In Transit' ? 'bg-yellow-100 text-yellow-800' :
                                  delivery.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {delivery.status}
                                </span>
                                {delivery.sustainable && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    🌱 Sustainable
                                  </span>
                                )}
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                  {delivery.season}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                Order: {delivery.order} • Scheduled: {delivery.scheduled}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-purple-600">
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
                            <h5 className="font-medium text-gray-900">Items:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {delivery.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="bg-white p-2 rounded border text-sm">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t">
                            <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                              Quality Check
                            </button>
                            <button className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700">
                              Receive Items
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
                    <p className="text-gray-600 mb-6">Create and track fashion purchase orders</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100">
                        <div className="text-2xl mb-2">🌱</div>
                        <div className="font-medium">Sustainable Orders</div>
                        <div className="text-xs text-gray-600">Eco-friendly suppliers</div>
                      </button>
                      <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100">
                        <div className="text-2xl mb-2">📅</div>
                        <div className="font-medium">Seasonal Planning</div>
                        <div className="text-xs text-gray-600">Spring/Summer & Fall/Winter</div>
                      </button>
                      <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100">
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
                    <h3 className="text-lg font-semibold">Fashion Supplier Performance</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Quality & Consistency</h4>
                        <div className="space-y-3">
                          {[
                            { name: 'Premium Textiles Ltd.', score: 91.5, color: 'bg-green-500' },
                            { name: 'Urban Fashion Wholesale', score: 87.2, color: 'bg-yellow-500' },
                            { name: 'Eco-Friendly Apparel Co.', score: 94.8, color: 'bg-green-500' }
                          ].map((supplier, index) => (
                            <div key={index}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">{supplier.name}</span>
                                <span className="text-sm font-semibold text-purple-600">{supplier.score}%</span>
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
                        <h4 className="font-semibold text-gray-900 mb-4">Seasonal Performance</h4>
                        <div className="space-y-3">
                          {[
                            { season: 'Spring/Summer 2024', orders: 45, onTime: 93.3, value: 128450 },
                            { season: 'Fall/Winter 2023', orders: 38, onTime: 89.5, value: 156780 },
                            { season: 'Spring/Summer 2023', orders: 42, onTime: 91.9, value: 112340 }
                          ].map((season, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{season.season}</span>
                                <span className="text-purple-600 font-bold">${season.value.toLocaleString()}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {season.orders} orders • {season.onTime}% on-time delivery
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 mb-3">👕 Fashion Store Insights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-purple-800 mb-2">Sustainability Leaders</h5>
                          <ul className="text-purple-700 space-y-1">
                            <li>• Eco-Friendly Apparel: 94.8% quality</li>
                            <li>• 67% suppliers are sustainable</li>
                            <li>• Carbon footprint reduced 15%</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-purple-800 mb-2">Seasonal Trends</h5>
                          <ul className="text-purple-700 space-y-1">
                            <li>• Spring orders up 12% YoY</li>
                            <li>• Sustainable items growing 25%</li>
                            <li>• Lead times increasing slightly</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-purple-800 mb-2">Action Items</h5>
                          <ul className="text-purple-700 space-y-1">
                            <li>• Expand sustainable supplier base</li>
                            <li>• Negotiate better lead times</li>
                            <li>• Review sizing consistency</li>
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
                  businessType="clothing"
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