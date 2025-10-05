'use client'

import React, { useState } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { UniversalSupplierGrid, UniversalSupplierForm } from '@/components/universal/supplier'

const BUSINESS_ID = process.env.NEXT_PUBLIC_DEMO_BUSINESS_ID || 'restaurant-demo'

export default function RestaurantSuppliersPage() {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'deliveries' | 'orders' | 'performance'>('suppliers')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const confirm = useConfirm()
  const toast = useToastContext()

  // Load suppliers from API
  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/suppliers?businessId=${BUSINESS_ID}&businessType=restaurant`)
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
    { id: 'deliveries', label: 'Deliveries', icon: '🚚', description: 'Daily delivery tracking' },
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
        toast.push('Supplier deleted successfully')
      } else {
        throw new Error('Failed to delete supplier')
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.push('Error deleting supplier')
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
    <BusinessProvider businessId={BUSINESS_ID}>
      <BusinessTypeRoute requiredBusinessType="restaurant">
        <ContentLayout
          title="Restaurant Supplier Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Restaurant', href: '/restaurant' },
            { label: 'Suppliers', isActive: true }
          ]}
        >
          <div className="space-y-6">
            {/* Restaurant Specific Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Active Suppliers</p>
                    <p className="text-2xl font-bold text-red-600">6</p>
                  </div>
                  <div className="text-2xl">🏢</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Daily Deliveries</p>
                    <p className="text-2xl font-bold text-blue-600">4</p>
                  </div>
                  <div className="text-2xl">🚚</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Farm-to-Table</p>
                    <p className="text-2xl font-bold text-green-600">3</p>
                  </div>
                  <div className="text-2xl">🌾</div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Food Cost %</p>
                    <p className="text-2xl font-bold text-purple-600">28.5</p>
                  </div>
                  <div className="text-2xl">💰</div>
                </div>
              </div>
            </div>

            {/* Restaurant-Specific Features Banner */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-3">
                🍽️ Restaurant Supplier Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-800">
                  <div className="text-red-700 dark:text-red-300 font-medium text-sm">🌾 Farm-to-Table</div>
                  <div className="text-xs text-red-600 dark:text-red-400">Local & sustainable sourcing</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-800">
                  <div className="text-red-700 dark:text-red-300 font-medium text-sm">📅 Daily Delivery</div>
                  <div className="text-xs text-red-600 dark:text-red-400">Fresh ingredients daily</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-800">
                  <div className="text-red-700 dark:text-red-300 font-medium text-sm">👨‍🍳 Menu Integration</div>
                  <div className="text-xs text-red-600 dark:text-red-400">Recipe costing & planning</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-800">
                  <div className="text-red-700 dark:text-red-300 font-medium text-sm">🛡️ Food Safety</div>
                  <div className="text-xs text-red-600 dark:text-red-400">Temperature & quality control</div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
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
                        <h3 className="text-lg font-semibold">Restaurant Suppliers</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Manage fresh produce, protein, and specialty ingredient suppliers</p>
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
                      businessType="restaurant"
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
                      <h3 className="text-lg font-semibold">Daily Delivery Schedule</h3>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        Schedule Delivery
                      </button>
                    </div>

                    {/* Sample delivery cards for restaurant */}
                    <div className="space-y-4">
                      {[
                        {
                          supplier: 'Farm Fresh Ingredients',
                          order: 'PO-REST-2024-089',
                          status: 'Delivered',
                          items: ['Organic Mixed Greens (10 cases)', 'Cherry Tomatoes (5 lbs)', 'Fresh Herbs (assorted)'],
                          scheduled: 'Today 6:00 AM',
                          driver: 'Maria Rodriguez',
                          truck: 'FFI-205',
                          value: 485.50,
                          farmToTable: true
                        },
                        {
                          supplier: 'Premium Protein Co.',
                          order: 'PO-REST-2024-090',
                          status: 'In Transit',
                          items: ['Prime Beef Tenderloin (8 lbs)', 'Fresh Salmon (6 lbs)', 'Free-Range Chicken (4 whole)'],
                          scheduled: 'Today 7:30 AM',
                          driver: 'Carlos Martinez',
                          truck: 'PPC-102',
                          value: 1247.75,
                          farmToTable: false
                        },
                        {
                          supplier: 'Artisan Bakery Supply',
                          order: 'PO-REST-2024-091',
                          status: 'Scheduled',
                          items: ['Fresh Bread (20 loaves)', 'Dinner Rolls (5 dozen)', 'Pastry Flour (50 lbs)'],
                          scheduled: 'Today 2:00 PM',
                          value: 312.25,
                          farmToTable: true
                        }
                      ].map((delivery, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold">{delivery.supplier}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${delivery.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                    delivery.status === 'In Transit' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {delivery.status}
                                </span>
                                {delivery.farmToTable && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    🌾 Farm-to-Table
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                Order: {delivery.order} • Scheduled: {delivery.scheduled}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-red-600">
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
                            <h5 className="font-medium text-gray-900 dark:text-gray-100">Items:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {delivery.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 text-sm dark:text-gray-200">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                              Quality Check
                            </button>
                            <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
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
                    <p className="text-gray-600 mb-6">Create and track restaurant purchase orders</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <button className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
                        <div className="text-2xl mb-2">🌾</div>
                        <div className="font-medium">Farm-to-Table</div>
                        <div className="text-xs text-gray-600">Local & sustainable orders</div>
                      </button>
                      <button className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
                        <div className="text-2xl mb-2">👨‍🍳</div>
                        <div className="font-medium">Menu Planning</div>
                        <div className="text-xs text-gray-600">Recipe-based ordering</div>
                      </button>
                      <button className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
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
                    <h3 className="text-lg font-semibold">Restaurant Supplier Performance</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Quality & Freshness</h4>
                        <div className="space-y-3">
                          {[
                            { name: 'Farm Fresh Ingredients', score: 97.8, color: 'bg-green-500' },
                            { name: 'Premium Protein Co.', score: 95.2, color: 'bg-green-500' },
                            { name: 'Artisan Bakery Supply', score: 98.5, color: 'bg-green-500' }
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
                        <h4 className="font-semibold text-gray-900 mb-4">Food Cost Impact</h4>
                        <div className="space-y-3">
                          {[
                            { category: 'Fresh Produce', cost: 24.5, target: 22.0, variance: '+2.5%' },
                            { category: 'Proteins', cost: 35.2, target: 36.0, variance: '-0.8%' },
                            { category: 'Dairy & Eggs', cost: 8.1, target: 8.5, variance: '-0.4%' }
                          ].map((category, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{category.category}</span>
                                <span className={`font-bold ${category.variance.startsWith('-') ? 'text-green-600' : 'text-red-600'}`}>
                                  {category.cost}% {category.variance}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                Target: {category.target}% of total food cost
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-3">🍽️ Restaurant Insights</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-red-800 mb-2">Quality Leaders</h5>
                          <ul className="text-red-700 space-y-1">
                            <li>• Artisan Bakery: 98.5% quality</li>
                            <li>• Farm Fresh: 97.8% freshness</li>
                            <li>• Premium Protein: consistent quality</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-red-800 mb-2">Cost Management</h5>
                          <ul className="text-red-700 space-y-1">
                            <li>• 28.5% total food cost (target: 30%)</li>
                            <li>• Protein costs under target</li>
                            <li>• Farm-to-table premium justified</li>
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-medium text-red-800 mb-2">Action Items</h5>
                          <ul className="text-red-700 space-y-1">
                            <li>• Negotiate produce pricing</li>
                            <li>• Expand local supplier network</li>
                            <li>• Review daily delivery schedule</li>
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
                  businessType="restaurant"
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