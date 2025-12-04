"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'

export default function GroceryInventoryPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'movements' | 'alerts' | 'reports'>('overview')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const searchParams = useSearchParams()

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

  // Handle productId from URL parameters
  useEffect(() => {
    const productId = searchParams?.get('productId')
    if (productId && currentBusinessId) {
      // Fetch the product and open edit form
      fetch(`/api/inventory/${currentBusinessId}/items/${productId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSelectedItem(data.data)
            setShowAddForm(true)
            setActiveTab('inventory')
            // Clear the URL parameter after loading
            router.replace('/grocery/inventory', { scroll: false })
          }
        })
        .catch(err => console.error('Failed to load product:', err))
    }
  }, [searchParams, currentBusinessId, router])

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
          <p className="text-gray-600">You need to be logged in to access inventory.</p>
        </div>
      </div>
    )
  }

  const groceryBusinesses = businesses.filter((b: any) => b.businessType === 'grocery' && b.isActive)
  const hasGroceryBusinesses = groceryBusinesses.length > 0

  if (!currentBusiness && hasGroceryBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Grocery Business</h2>
          <p className="text-gray-600 mb-4">You have access to {groceryBusinesses.length} grocery business{groceryBusinesses.length > 1 ? 'es' : ''}. Please select one from the sidebar.</p>
        </div>
      </div>
    )
  }

  if (currentBusiness && currentBusiness.businessType !== 'grocery') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600">The Grocery Inventory page is only for grocery businesses. Please select a grocery business.</p>
        </div>
      </div>
    )
  }

  const businessId = currentBusinessId!

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
    setShowViewModal(true)
  }

  const handleItemDelete = async (item: any) => {
    const ok = await confirm({ title: 'Delete item', description: `Are you sure you want to delete ${item.name}?`, confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return

    try {
      const response = await fetch(`/api/inventory/${businessId}/items/${item.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Trigger grid refresh by updating the key
        setRefreshKey(prev => prev + 1)
      } else {
        await customAlert({ title: 'Delete failed', description: 'Failed to delete item' })
      }
    } catch (error) {
      await customAlert({ title: 'Delete failed', description: 'Error deleting item' })
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = selectedItem
        ? `/api/inventory/${businessId}/items/${selectedItem.id}`
        : `/api/inventory/${businessId}/items`

      const method = selectedItem ? 'PUT' : 'POST'

      // Transform form data to include grocery-specific attributes
      const groceryFormData = {
        ...formData,
        businessId,
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
        setActiveTab('inventory')
        // Trigger grid refresh by updating the key
        setRefreshKey(prev => prev + 1)
      } else {
        const error = await response.json()
        await customAlert({ title: 'Save failed', description: error.message || 'Failed to save item' })
      }
    } catch (error) {
      await customAlert({ title: 'Save failed', description: 'Error saving item' })
      console.error('Save error:', error)
    }
  }

  return (
  <BusinessProvider businessId={businessId}>
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
                      businessId={businessId}
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
                      businessId={businessId}
                      businessType="grocery"
                      onItemEdit={handleItemEdit}
                      onItemView={handleItemView}
                      onItemDelete={handleItemDelete}
                      refreshTrigger={refreshKey}
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
                      businessId={businessId}
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
                      businessId={businessId}
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
                    businessId={businessId}
                    businessType="grocery"
                    item={selectedItem}
                    onSubmit={handleFormSubmit}
                    onCancel={() => {
                      setShowAddForm(false)
                      setSelectedItem(null)
                    }}
                    renderMode="inline"
                    mode={selectedItem ? 'edit' : 'create'}
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

          {/* View Item Modal */}
          {showViewModal && selectedItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowViewModal(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-primary">Product Details</h3>
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Product Name</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">SKU</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.sku || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Barcode</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.barcode || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Category</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.categoryName || 'Uncategorized'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Pricing</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Base Price</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">${selectedItem.basePrice?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Cost Price</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">${selectedItem.costPrice?.toFixed(2) || 'N/A'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Grocery-Specific Attributes */}
                    {selectedItem.attributes && Object.keys(selectedItem.attributes).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Grocery Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedItem.attributes.pluCode && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">PLU Code</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.pluCode}</div>
                            </div>
                          )}
                          {selectedItem.attributes.department && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Department</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.department}</div>
                            </div>
                          )}
                          {selectedItem.attributes.temperatureZone && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Temperature Zone</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.temperatureZone}</div>
                            </div>
                          )}
                          {selectedItem.attributes.organicCertified !== undefined && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Organic Certified</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.organicCertified ? '✓ Yes' : '✗ No'}</div>
                            </div>
                          )}
                          {selectedItem.attributes.allergens && selectedItem.attributes.allergens.length > 0 && (
                            <div className="col-span-2">
                              <div className="text-sm text-gray-500 dark:text-gray-400">Allergens</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.allergens.join(', ')}</div>
                            </div>
                          )}
                          {selectedItem.attributes.expirationDays && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Shelf Life</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.expirationDays} days</div>
                            </div>
                          )}
                          {selectedItem.attributes.batchTracking !== undefined && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Batch Tracking</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.batchTracking ? '✓ Required' : '✗ Not Required'}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {selectedItem.description && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Description</h3>
                        <div className="text-gray-900 dark:text-gray-100">{selectedItem.description}</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setShowViewModal(false)
                          handleItemEdit(selectedItem)
                        }}
                        className="flex-1 btn-primary"
                      >
                        ✏️ Edit Item
                      </button>
                      <button
                        onClick={() => {
                          setShowViewModal(false)
                          setSelectedItem(null)
                        }}
                        className="flex-1 btn-secondary"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}