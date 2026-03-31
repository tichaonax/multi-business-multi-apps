"use client"

import { useState, useEffect, Suspense } from 'react'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
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
import { useGlobalCart } from '@/contexts/global-cart-context'
import { useToastContext } from '@/components/ui/toast'
import { BulkStockPanel } from '@/components/inventory/bulk-stock-panel'
import { StockTakeReportsList } from '@/components/inventory/stock-take-reports-list'
import { BulkPrintModal } from '@/components/clothing/bulk-print-modal'

function GroceryTransferHistoryPanel({ businessId }: { businessId: string }) {
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/inventory/transfer?businessId=${businessId}`)
      .then(r => r.json())
      .then(data => setTransfers(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [businessId])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading transfer history...</div>
  if (transfers.length === 0) return <div className="p-8 text-center text-gray-500">No transfer history found.</div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Transfer History</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Direction</th>
              <th className="px-4 py-3 text-left">Other Business</th>
              <th className="px-4 py-3 text-right">Bales</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3 text-right">Stock Value</th>
              <th className="px-4 py-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transfers.map((t: any) => {
              const isOut = t.sourceBusinessId === businessId
              const other = isOut ? t.targetBusiness?.businessName : t.sourceBusiness?.businessName
              const totalItems = (t.items || []).reduce((s: number, i: any) => s + i.quantity, 0)
              const stockValue = (t.items || []).reduce((s: number, i: any) => s + i.quantity * Number(isOut ? i.sourcePrice : i.targetPrice), 0)
              return (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {new Date(t.transferDate || t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isOut ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'}`}>
                      {isOut ? '↑ OUT' : '↓ IN'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{other || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{(t.items || []).filter((i: any) => i.baleId).length}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{totalItems}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">${stockValue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{t.notes || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GroceryInventoryContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'bales' | 'movements' | 'alerts' | 'reports' | 'transfers'>('overview')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showBulkStockPanel, setShowBulkStockPanel] = useState(false)
  const [bulkStockInitialMode, setBulkStockInitialMode] = useState<'bulkStock' | 'stockTake' | undefined>(undefined)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [formReady, setFormReady] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoadingProduct, setIsLoadingProduct] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [receivedBales, setReceivedBales] = useState<any[]>([])
  const [balesLoading, setBalesLoading] = useState(false)
  const [printBaleId, setPrintBaleId] = useState<string | undefined>(undefined)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false)
  const searchParams = useSearchParams()

  const { data: session, status } = useSession()
  const router = useRouter()
  const customAlert = useAlert()
  const confirm = useConfirm()
  const { addToCart } = useGlobalCart()
  const { push: showToast } = useToastContext()

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses,
    isSystemAdmin,
    hasPermission,
  } = useBusinessPermissionsContext()
  const canAccessFinancialData = isSystemAdmin || hasPermission('canAccessFinancialData')
  const [showStockTakeReports, setShowStockTakeReports] = useState(false)
  const [filterCount, setFilterCount] = useState<number | null>(null)
  const [seedingCategories, setSeedingCategories] = useState(false)
  const [categoriesSeeded, setCategoriesSeeded] = useState(false)

  useEffect(() => {
    fetch('/api/admin/seed-categories?businessType=grocery')
      .then(r => r.json())
      .then(d => { if (d.seeded) setCategoriesSeeded(true) })
      .catch(() => {})
  }, [])

  const handleSeedCategories = async () => {
    setSeedingCategories(true)
    try {
      const res = await fetch('/api/admin/seed-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessType: 'grocery' }),
      })
      const data = await res.json()
      if (data.success) {
        setCategoriesSeeded(true)
        await customAlert({ title: 'Seed Complete', description: `Created ${data.created} categories, skipped ${data.skipped} existing.` })
      } else {
        await customAlert({ title: 'Seed Failed', description: data.error || 'Unknown error' })
      }
    } catch {
      await customAlert({ title: 'Seed Failed', description: 'Network error' })
    } finally {
      setSeedingCategories(false)
    }
  }

  // Handle productId from URL parameters
  useEffect(() => {
    const productId = searchParams?.get('productId')
    if (productId && currentBusinessId) {
      // Set loading state
      setIsLoadingProduct(true)
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
            // Clear loading state after a longer delay to ensure modal is fully rendered
            setTimeout(() => setIsLoadingProduct(false), 800)
          } else {
            setIsLoadingProduct(false)
          }
        })
        .catch(err => {
          console.error('Failed to load product:', err)
          setIsLoadingProduct(false)
        })
    }
  }, [searchParams, currentBusinessId, router])

  useEffect(() => {
    if (searchParams?.get('bulkStock') === '1') setShowBulkStockPanel(true)
    const tabParam = searchParams?.get('tab')
    if (tabParam && ['overview', 'inventory', 'bales', 'movements', 'alerts', 'reports', 'transfers'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab)
    }
  }, [searchParams])

  useEffect(() => {
    if (activeTab !== 'bales' || !currentBusinessId) return
    setBalesLoading(true)
    fetch(`/api/clothing/bales?businessId=${currentBusinessId}`)
      .then(r => r.json())
      .then(data => setReceivedBales(data.data || []))
      .catch(() => {})
      .finally(() => setBalesLoading(false))
  }, [activeTab, currentBusinessId])

  useEffect(() => {
    if (!currentBusinessId) return
    fetch(`/api/admin/grocery/stats?businessId=${currentBusinessId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data) })
      .catch(() => {})
  }, [currentBusinessId])

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
    return <BusinessTypeRedirect />
  }

  const businessId = currentBusinessId!

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'inventory', label: 'Items', icon: '📦' },
    { id: 'bales', label: 'Bales', icon: '📦' },
    { id: 'movements', label: 'Stock Movements', icon: '🔄' },
    { id: 'alerts', label: 'Alerts & Expiration', icon: '⚠️' },
    { id: 'reports', label: 'Analytics', icon: '📈' },
    { id: 'transfers', label: 'Transfer History', icon: '🔀' }
  ]

  const handleItemAddToCart = async (item: any) => {
    try {
      const res = await fetch(`/api/universal/products?businessId=${currentBusinessId}&productId=${item.id}&includeVariants=true`)
      const result = await res.json()
      const product = result.data?.[0]

      if (product) {
        // BusinessProduct path — use variant data
        const variant = (product.variants || []).find((v: any) => parseFloat(v.price) > 0)
        if (!variant) { showToast('No sellable price set for this item', { type: 'error' }); return }
        // Use variant.id as productId so POS cart item.id = variant.id (needed for productVariantId in orders)
        addToCart({
          productId: variant.id,
          variantId: variant.id,
          name: product.name,
          sku: variant.sku || item.sku || '',
          price: parseFloat(variant.price),
          quantity: 1,
          attributes: { unit: item.unit || 'each', category: item.category || 'General' },
        })
      } else {
        // BarcodeInventoryItem path — item.id already has 'inv_' prefix from the inventory API
        if (item.sellPrice <= 0) { showToast('No sellable price set for this item', { type: 'error' }); return }
        addToCart({
          productId: item.id,
          variantId: item.id,
          name: item.name,
          sku: item.sku || '',
          price: item.sellPrice,
          quantity: 1,
          stock: item.currentStock,
          attributes: { unit: item.unit || 'each', category: item.category || 'General' },
        })
      }
      showToast(`${item.name} added to cart`, { type: 'success' })
    } catch {
      showToast('Failed to add item to cart', { type: 'error' })
    }
  }

  const handleItemEdit = (item: any) => {
    setSelectedItem(item)
    setFormReady(false)  // reset until form signals categories are loaded
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

      // Transform form data — grocery-specific attributes are already in formData.attributes
      // (set via handleAttributeChange in UniversalInventoryForm). Just pass through as-is.
      const groceryFormData = {
        ...formData,
        businessId,
        businessType: 'grocery',
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
        await customAlert({ title: 'Save failed', description: error.error || error.message || 'Failed to save item' })
      }
    } catch (error) {
      await customAlert({ title: 'Save failed', description: 'Network error — could not save item' })
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
          headerActions={isSystemAdmin ? (
            <button
              onClick={handleSeedCategories}
              disabled={seedingCategories || categoriesSeeded}
              title={categoriesSeeded ? 'Categories already seeded' : 'Seed standard categories'}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {seedingCategories ? 'Seeding...' : categoriesSeeded ? '✅ Categories Seeded' : '🌱 Seed Categories'}
            </button>
          ) : undefined}
        >
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="card">
              <div className="overflow-hidden rounded-t-xl border-b border-gray-200 dark:border-gray-700">
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

                    {/* Active Department Filter Badge */}
                    {selectedDepartment && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-secondary">Active filter:</span>
                        <span className="inline-flex items-center gap-2 rounded-md bg-green-100 dark:bg-green-900 px-3 py-1 text-sm font-medium text-green-800 dark:text-green-200">
                          Department: {stats?.byDepartment?.[selectedDepartment]?.emoji} {stats?.byDepartment?.[selectedDepartment]?.name}
                          {filterCount !== null && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-200 dark:bg-green-800 text-xs font-semibold">{filterCount} item{filterCount !== 1 ? 's' : ''}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => { setSelectedDepartment(''); setFilterCount(null) }}
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
                                className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-green-500 dark:hover:border-green-400 transition-all text-center group"
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
                      businessType="grocery"
                      departmentFilter={selectedDepartment}
                      onItemEdit={handleItemEdit}
                      onItemView={handleItemView}
                      onItemDelete={handleItemDelete}
                      onItemAddToCart={handleItemAddToCart}
                      onTotalChange={selectedDepartment ? setFilterCount : undefined}
                      refreshTrigger={refreshKey}
                      headerActions={(
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setBulkStockInitialMode('bulkStock'); setShowBulkStockPanel(true) }}
                            className="px-3 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
                          >
                            📦 Bulk Stock
                          </button>
                          <button
                            onClick={() => { setBulkStockInitialMode('stockTake'); setShowBulkStockPanel(true) }}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                          >
                            📋 Stock Take
                          </button>
                          {canAccessFinancialData && (
                            <button
                              onClick={() => setShowStockTakeReports(true)}
                              className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-md text-sm font-medium"
                            >
                              📋 Stock Take Reports
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedItem(null)
                              setFormReady(false)
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

                {/* Received Bales Tab */}
                {activeTab === 'bales' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Received Bales</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{receivedBales.filter(b => b.remainingCount > 0).length} active bale(s)</span>
                        {receivedBales.length > 0 && (
                          <button
                            onClick={() => setShowBulkPrintModal(true)}
                            className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                          >
                            Bulk Print Labels
                          </button>
                        )}
                      </div>
                    </div>
                    {balesLoading ? (
                      <div className="p-8 text-center text-gray-500">Loading bales...</div>
                    ) : receivedBales.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">No bales received yet. Bales transferred from a clothing business will appear here.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                              <th className="px-4 py-3 text-left">Batch</th>
                              <th className="px-4 py-3 text-left">Category</th>
                              <th className="px-4 py-3 text-right">Total Items</th>
                              <th className="px-4 py-3 text-right">Remaining</th>
                              <th className="px-4 py-3 text-right">Unit Price</th>
                              <th className="px-4 py-3 text-left">Scan Code</th>
                              <th className="px-4 py-3 text-left">Status</th>
                              <th className="px-4 py-3 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {receivedBales.map((bale: any) => (
                              <tr key={bale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900 dark:text-gray-100">{bale.batchNumber}</div>
                                  <div className="text-xs text-gray-500">{bale.sku}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{bale.category?.name || '—'}</td>
                                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{bale.itemCount}</td>
                                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">{bale.remainingCount}</td>
                                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">${Number(bale.unitPrice).toFixed(2)}</td>
                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{bale.scanCode}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${bale.remainingCount > 0 && bale.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                                    {bale.remainingCount > 0 && bale.isActive ? 'Active' : 'Depleted'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => { setPrintBaleId(bale.id); setShowPrintModal(true) }}
                                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                                  >
                                    Print Labels
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Transfer History Tab */}
                {activeTab === 'transfers' && (
                  <GroceryTransferHistoryPanel businessId={businessId} />
                )}
              </div>
            </div>
          </div>

          {/* Bale Print Modal (single bale) */}
          {showPrintModal && (
            <BulkPrintModal
              isOpen={showPrintModal}
              onClose={() => { setShowPrintModal(false); setPrintBaleId(undefined) }}
              baleId={printBaleId}
              businessId={currentBusinessId}
              compact={true}
            />
          )}

          {/* Bulk Print Modal (multi-bale selection) */}
          {showBulkPrintModal && (
            <BulkPrintModal
              isOpen={showBulkPrintModal}
              onClose={() => setShowBulkPrintModal(false)}
              businessId={currentBusinessId}
              compact={false}
            />
          )}

          {/* Add/Edit Item Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="card rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-primary break-words">
                      {selectedItem ? 'Edit' : 'Add'} Grocery Item
                    </h3>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {selectedItem?.id && (
                        <a
                          href={formReady ? `/grocery/pos?businessId=${businessId}&addProduct=${selectedItem.id}&autoAdd=true` : '#'}
                          onClick={(e) => { if (!formReady) e.preventDefault() }}
                          aria-disabled={!formReady}
                          className={`px-3 py-1.5 text-white text-sm rounded-md flex items-center gap-1.5 whitespace-nowrap ${formReady ? 'bg-green-600 hover:bg-green-700' : 'bg-green-300 cursor-not-allowed'}`}
                        >
                          🛒 Sell this Item
                        </a>
                      )}
                      <div className="pl-3 ml-2 border-l border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => {
                            setShowAddForm(false)
                            setSelectedItem(null)
                          }}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-xl leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
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
                    onCategoriesLoaded={() => setFormReady(true)}
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

          {/* Loading Overlay for Product Fetch */}
          {isLoadingProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70]">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm w-full mx-4">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 dark:border-green-400 mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Loading Product...
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Please wait while we fetch the product details
                  </p>
                </div>
              </div>
            </div>
          )}
        </ContentLayout>
      {showBulkStockPanel && currentBusiness && currentBusinessId && (
        <BulkStockPanel
          businessId={currentBusinessId}
          businessName={currentBusiness.businessName}
          businessType={currentBusiness.businessType}
          onClose={() => { setShowBulkStockPanel(false); setRefreshKey(prev => prev + 1) }}
          initialMode={bulkStockInitialMode}
        />
      )}
      {showStockTakeReports && currentBusiness && currentBusinessId && (
        <StockTakeReportsList
          businessId={currentBusinessId}
          businessName={currentBusiness.businessName}
          canManage={canAccessFinancialData}
          onClose={() => setShowStockTakeReports(false)}
        />
      )}
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}

export default function GroceryInventoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    }>
      <GroceryInventoryContent />
    </Suspense>
  )
}