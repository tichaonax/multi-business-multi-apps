'use client'

import { useState, useEffect } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
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

export default function ClothingInventoryPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'movements' | 'alerts' | 'reports'>('overview')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const customAlert = useAlert()
  const confirm = useConfirm()

  const { data: session, status } = useSession()
  const router = useRouter()

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  // Fetch department statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/clothing/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  // Restore active tab from sessionStorage on mount
  useEffect(() => {
    const savedTab = sessionStorage.getItem('clothing-inventory-active-tab')
    if (savedTab && ['overview', 'inventory', 'movements', 'alerts', 'reports'].includes(savedTab)) {
      setActiveTab(savedTab as any)
    }
  }, [])

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [])

  // Save active tab whenever it changes
  useEffect(() => {
    sessionStorage.setItem('clothing-inventory-active-tab', activeTab)
  }, [activeTab])

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
          <p className="text-gray-600">The Clothing Inventory page is only for clothing businesses. Please select a clothing business.</p>
        </div>
      </div>
    )
  }

  const businessId = currentBusinessId!

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'inventory', label: 'Items', icon: '👕' },
    { id: 'movements', label: 'Stock Movements', icon: '📦' },
    { id: 'alerts', label: 'Low Stock & Alerts', icon: '⚠️' },
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
    const confirmed = await confirm({
      title: 'Delete item',
      description: `Are you sure you want to delete ${item.name}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
    if (confirmed) {
      try {
  const response = await fetch(`/api/inventory/${businessId}/items/${item.id}`, {
          method: 'DELETE'
        })

            if (response.ok) {
              router.refresh()
            } else {
              await customAlert({ title: 'Failed to delete item' })
            }
      } catch (error) {
  await customAlert({ title: 'Error deleting item' })
      }
    }
  }

  const handleResetExternalFilters = () => {
    setSelectedDepartment('')
  }

  const handleSeedProducts = async () => {
    // Get business name from businesses array
    const businessName = businesses.find((b: any) => b.businessId === currentBusinessId)?.businessName || 'this business'

    const confirmed = await confirm({
      title: 'Seed Common Clothing Products',
      description: (
        <div>
          <p className="mb-3">
            This will import <strong>1067 common clothing products</strong> with zero quantities for{' '}
            <span className="font-semibold text-purple-600 dark:text-purple-400">{businessName}</span>.
          </p>
          <p className="mb-3">Products with existing SKUs will be skipped.</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">This is safe to run multiple times.</p>
        </div>
      ),
      confirmText: 'Seed Products',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      setIsSeeding(true)

      const response = await fetch('/api/admin/clothing/seed-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId })
      })

      const data = await response.json()

      setIsSeeding(false)

      if (data.success) {
        const { imported, skipped, errors } = data.data
        let message = `Successfully seeded products!\n\n`
        message += `• Imported: ${imported} products\n`
        message += `• Skipped: ${skipped} products (already existed)\n`
        if (errors > 0) {
          message += `• Errors: ${errors}\n`
        }

        await customAlert({
          title: '✅ Products Seeded Successfully',
          description: message
        })

        // Refresh the page to show new products
        router.refresh()
        fetchStats()
      } else {
        await customAlert({
          title: 'Seeding Failed',
          description: data.error || 'Failed to seed products. Please try again.'
        })
      }
    } catch (error: any) {
      setIsSeeding(false)
      await customAlert({
        title: 'Error',
        description: `Failed to seed products: ${error.message}`
      })
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = selectedItem
        ? `/api/inventory/${businessId}/items/${selectedItem.id}`
        : `/api/inventory/${businessId}/items`

      const method = selectedItem ? 'PUT' : 'POST'

      // Attributes are already in formData.attributes from the form
      // Just ensure businessId and businessType are set
      const payload = {
        ...formData,
        businessId,
        businessType: 'clothing'
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Close form immediately
        setShowAddForm(false)
        setSelectedItem(null)
        setActiveTab('inventory')
        router.refresh()
      } else {
        // Extract error message from API response
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.error || 'Unable to save item. Please try again.'
  await customAlert({ title: 'Save failed', description: errorMessage })
      }
    } catch (error: any) {
      // Handle network errors or other exceptions
      let errorMessage = 'Unable to save item. Please check your connection and try again.'

      // Try to get a more specific error message if available
      if (error.message && !error.message.includes('fetch')) {
        errorMessage = error.message
      }

  await customAlert({ title: 'Save failed', description: errorMessage })
      console.error('Save error:', error)
    }
  }

  return (
    <>
      {/* Loading Spinner Modal */}
      {isSeeding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl max-w-md mx-4">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Seeding Products...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Importing 1067 clothing products
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  This may take 30-60 seconds. Please wait.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

  <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="clothing">
        <ContentLayout
          title="👕 Inventory Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clothing', href: '/clothing' },
            { label: 'Inventory', isActive: true }
          ]}
        >
          <div className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
            {/* Tab Navigation */}
            <div className="card">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-1 sm:space-x-8 px-2 sm:px-6 overflow-x-auto" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 min-w-0 ${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600 dark:text-purple-400'
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
                    {/* Clothing-specific banner */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 sm:p-6">
                      <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">
                        👕 Clothing Store Inventory Features
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-3 border border-purple-200 dark:border-purple-800">
                          <div className="text-purple-700 dark:text-purple-300 font-medium text-sm">📐 Size & Color Matrix</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">Track variants across sizes & colors</div>
                        </div>
                        <div className="card p-3 border border-purple-200 dark:border-purple-800">
                          <div className="text-purple-700 dark:text-purple-300 font-medium text-sm">🌟 Seasonal Management</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">Organize by seasons & trends</div>
                        </div>
                        <div className="card p-3 border border-purple-200 dark:border-purple-800">
                          <div className="text-purple-700 dark:text-purple-300 font-medium text-sm">🏷️ Brand & Material Tracking</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">Detailed product attributes</div>
                        </div>
                        <div className="card p-3 border border-purple-200 dark:border-purple-800">
                          <div className="text-purple-700 dark:text-purple-300 font-medium text-sm">♻️ Sustainability Tracking</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">Ethical & sustainable sourcing</div>
                        </div>
                      </div>
                    </div>

                    {/* Universal Inventory Stats */}
                    <UniversalInventoryStats
                      businessId={businessId}
                      businessType="clothing"
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
                      <h3 className="text-lg font-semibold">Clothing Inventory</h3>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={handleSeedProducts}
                          disabled={isSeeding}
                          className="btn-secondary border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Import 1067 common clothing products with zero quantities"
                        >
                          {isSeeding ? '⏳ Seeding...' : '🌱 Seed Products'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(null)
                            setShowAddForm(true)
                          }}
                          className="btn-primary bg-purple-600 hover:bg-purple-700"
                        >
                          ➕ Add Item
                        </button>
                      </div>
                    </div>

                    {/* Active Department Filter Badge */}
                    {selectedDepartment && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-secondary">Active filter:</span>
                        <span className="inline-flex items-center gap-2 rounded-md bg-green-100 dark:bg-green-900 px-3 py-1 text-sm font-medium text-green-800 dark:text-green-200">
                          Department: {stats?.byDepartment?.[selectedDepartment]?.emoji} {stats?.byDepartment?.[selectedDepartment]?.name}
                          <button
                            type="button"
                            onClick={() => setSelectedDepartment('')}
                            className="hover:text-green-600 dark:hover:text-green-400"
                            title="Clear department filter"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    )}

                    {/* Department Quick Navigation */}
                    {stats?.byDepartment && Object.keys(stats.byDepartment).length > 0 && !selectedDepartment && (
                      <div className="card p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Browse by Department</h3>
                          <span className="text-sm text-secondary">
                            {Object.keys(stats.byDepartment).length} departments • Click to filter
                          </span>
                        </div>
                        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                          {Object.entries(stats.byDepartment)
                            .sort(([, a]: [string, any], [, b]: [string, any]) => b.count - a.count)
                            .map(([id, dept]: [string, any]) => (
                            <button
                              key={id}
                              onClick={() => setSelectedDepartment(id)}
                              className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-purple-500 dark:hover:border-purple-400 transition-all text-center group"
                            >
                              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{dept.emoji}</span>
                              <span className="text-sm font-medium mb-1">{dept.name}</span>
                              <span className="text-xs text-secondary">
                                {dept.count} product{dept.count !== 1 ? 's' : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <UniversalInventoryGrid
                      businessId={businessId}
                      businessType="clothing"
                      departmentFilter={selectedDepartment}
                      onItemEdit={handleItemEdit}
                      onItemView={handleItemView}
                      onItemDelete={handleItemDelete}
                      onResetExternalFilters={handleResetExternalFilters}
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
                    <h3 className="text-lg font-semibold">Inventory Alerts & Low Stock</h3>

                    {/* Clothing-specific alert info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">👕 Clothing Store Alert Types</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Size/Color Variants</div>
                          <div className="text-blue-700 dark:text-blue-300">Specific size/color combinations low</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Seasonal Items</div>
                          <div className="text-blue-700 dark:text-blue-300">End-of-season clearance needed</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Popular Styles</div>
                          <div className="text-blue-700 dark:text-blue-300">High-demand items running low</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Slow-Moving Stock</div>
                          <div className="text-blue-700 dark:text-blue-300">Items needing markdown</div>
                        </div>
                      </div>
                    </div>

                    <UniversalLowStockAlerts
                      businessId={businessId}
                      businessType="clothing"
                      alertTypes={['low_stock', 'out_of_stock', 'overstock']}
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
                    <h3 className="text-lg font-semibold">Clothing Analytics & Reports</h3>

                    {/* Clothing-specific report types */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">📐</div>
                        <h4 className="font-semibold mb-2">Size Distribution Report</h4>
                        <p className="text-sm text-secondary">Analyze size demand patterns</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">🌈</div>
                        <h4 className="font-semibold mb-2">Color Performance</h4>
                        <p className="text-sm text-secondary">Best and worst selling colors</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">🌟</div>
                        <h4 className="font-semibold mb-2">Seasonal Analysis</h4>
                        <p className="text-sm text-secondary">Track seasonal performance</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">🏷️</div>
                        <h4 className="font-semibold mb-2">Brand Performance</h4>
                        <p className="text-sm text-secondary">Compare brand sales and margins</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">💰</div>
                        <h4 className="font-semibold mb-2">Markdown Analysis</h4>
                        <p className="text-sm text-secondary">Track clearance and discounts</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">♻️</div>
                        <h4 className="font-semibold mb-2">Sustainability Report</h4>
                        <p className="text-sm text-secondary">Ethical and sustainable inventory</p>
                      </div>
                    </div>

                    {/* Universal stats with clothing focus */}
                    <UniversalInventoryStats
                      businessId={businessId}
                      businessType="clothing"
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
            businessType="clothing"
            item={selectedItem}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowAddForm(false)
              setSelectedItem(null)
            }}
            isOpen={showAddForm}
            mode={selectedItem ? 'edit' : 'create'}
          />

          {/* View Item Details Modal */}
          {showViewModal && selectedItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedItem.name}</h2>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {selectedItem.categoryEmoji && <span className="mr-1">{selectedItem.categoryEmoji}</span>}
                        {selectedItem.category}
                        {selectedItem.subcategory && (
                          <>
                            {' → '}
                            {selectedItem.subcategoryEmoji && <span className="mr-1">{selectedItem.subcategoryEmoji}</span>}
                            {selectedItem.subcategory}
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowViewModal(false)
                        setSelectedItem(null)
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Content */}
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">SKU</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.sku}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                          <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedItem.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedItem.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Current Stock</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.currentStock} {selectedItem.unit}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Supplier</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.supplier || 'Not specified'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Location</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.location || 'Not specified'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Pricing</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Cost Price</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">${selectedItem.costPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Sell Price</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">${selectedItem.sellPrice.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Clothing-Specific Attributes */}
                    {selectedItem.attributes && Object.keys(selectedItem.attributes).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Clothing Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedItem.attributes.sizes && selectedItem.attributes.sizes.length > 0 && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Sizes</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.sizes.join(', ')}</div>
                            </div>
                          )}
                          {selectedItem.attributes.colors && selectedItem.attributes.colors.length > 0 && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Colors</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.colors.join(', ')}</div>
                            </div>
                          )}
                          {selectedItem.attributes.material && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Material</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.material}</div>
                            </div>
                          )}
                          {selectedItem.attributes.brand && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Brand</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.brand}</div>
                            </div>
                          )}
                          {selectedItem.attributes.season && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Season</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.season}</div>
                            </div>
                          )}
                          {selectedItem.attributes.gender && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Gender</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.gender}</div>
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
    </>
  )
}