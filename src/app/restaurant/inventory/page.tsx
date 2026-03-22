"use client"

import { useState, useEffect, Suspense } from 'react'
import { BusinessTypeRedirect } from '@/components/business-type-redirect'
import { useSearchParams } from 'next/navigation'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import {
  UniversalInventoryForm,
  UniversalInventoryGrid,
  UniversalInventoryStats,
  UniversalStockMovements
} from '@/components/universal/inventory'
import { RestaurantRecipeManager } from './components/recipe-manager'
import { RestaurantPrepTracker } from './components/prep-tracker'
import { RestaurantWasteLog } from './components/waste-log'
import { RestaurantExpirationAlerts } from './components/expiration-alerts'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import { BulkStockPanel } from '@/components/inventory/bulk-stock-panel'

function RestaurantInventoryContent() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'prep' | 'alerts' | 'receiving'>('ingredients')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showBulkStockPanel, setShowBulkStockPanel] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [menuOnlyFilter, setMenuOnlyFilter] = useState(false)
  const [priceFilter, setPriceFilter] = useState<'all' | 'with' | 'without'>('with')
  const [posTrackedFilter, setPosTrackedFilter] = useState(false)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [isLoadingProduct, setIsLoadingProduct] = useState(false)
  const [isInventoryTracked, setIsInventoryTracked] = useState(false)
  const [reorderLevel, setReorderLevel] = useState(0)
  const searchParams = useSearchParams()
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

  const toast = useToastContext()

  // Get user info
  const sessionUser = session?.user as SessionUser
  const employeeId = sessionUser?.id

  // Check if current business is a restaurant business
  const isRestaurantBusiness = currentBusiness?.businessType === 'restaurant'

  // Handle productId from URL parameters
  useEffect(() => {
    const productId = searchParams?.get('productId')
    if (productId && currentBusinessId) {
      setIsLoadingProduct(true)
      fetch(`/api/inventory/${currentBusinessId}/items/${productId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSelectedItem(data.data)
            setShowAddForm(true)
            setActiveTab('ingredients')
            router.replace('/restaurant/inventory', { scroll: false })
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

  // Pre-fill inventory tracking fields when editing an existing item
  useEffect(() => {
    if (selectedItem) {
      setIsInventoryTracked(selectedItem.isInventoryTracked ?? false)
      setReorderLevel(selectedItem.reorderLevel ?? 0)
    } else {
      setIsInventoryTracked(false)
      setReorderLevel(0)
    }
  }, [selectedItem])

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Fetch category counts - MUST be before any conditional returns
  useEffect(() => {
    const fetchCategoryCounts = async () => {
      if (!currentBusinessId) return
      
      try {
        const response = await fetch(`/api/inventory/${currentBusinessId}/items?limit=1000`)
        if (response.ok) {
          const data = await response.json()
          const items = data.items || []
          
          // Count items by ingredientType (from attributes) for ingredients, or category for menu items
          const counts: Record<string, number> = {}
          items.forEach((item: any) => {
            // For ingredients, use ingredientType from attributes
            const ingredientType = item.attributes?.ingredientType
            const category = ingredientType || item.category || 'Uncategorized'
            counts[category] = (counts[category] || 0) + 1
          })
          
          setCategoryCounts(counts)
        }
      } catch (error) {
        console.error('Error fetching category counts:', error)
      }
    }

    fetchCategoryCounts()
  }, [currentBusinessId, refreshTrigger])

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
          <p className="text-gray-600">You need to be logged in to use the inventory system.</p>
        </div>
      </div>
    )
  }

  // Check if user has any restaurant businesses
  const restaurantBusinesses = businesses.filter(b => b.businessType === 'restaurant' && b.isActive)
  const hasRestaurantBusinesses = restaurantBusinesses.length > 0

  // If no current business selected and user has restaurant businesses, show selection prompt
  if (!currentBusiness && hasRestaurantBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Restaurant Business</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You have access to {restaurantBusinesses.length} restaurant business{restaurantBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to use the inventory system.
          </p>
          <div className="space-y-2">
            {restaurantBusinesses.slice(0, 3).map(business => (
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

  // If current business is not restaurant, show error
  if (currentBusiness && !isRestaurantBusiness) {
    return <BusinessTypeRedirect />
  }

  // If no restaurant businesses at all, show message
  if (!hasRestaurantBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Restaurant Businesses</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have access to any restaurant businesses. The Restaurant Inventory system requires access to at least one restaurant business.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Contact your administrator if you need access to restaurant businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid restaurant business selected
  const businessId = currentBusinessId!

  const handleItemAdded = () => {
    setRefreshTrigger(prev => prev + 1)
    setShowAddForm(false)
    setSelectedItem(null)
  }

  const handleFormSubmit = async (formData: any) => {
    // Validate reorder level when inventory tracking is enabled
    if (isInventoryTracked && reorderLevel < 1) {
      alert('Reorder level must be at least 1 when Track Inventory for POS is enabled. This is the stock level at which the badge turns amber.')
      return
    }
    try {
      const method = selectedItem ? 'PUT' : 'POST'
      const url = selectedItem
        ? `/api/inventory/${businessId}/items/${selectedItem.id}`
        : `/api/inventory/${businessId}/items`

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isInventoryTracked, reorderLevel })
      })

      if (!response.ok) {
        throw new Error('Failed to save item')
      }

      // Capture before handleItemAdded() nulls selectedItem
      const justEnabled = isInventoryTracked && !selectedItem?.isInventoryTracked
      const savedName = formData.name || selectedItem?.name || 'this item'

      handleItemAdded()

      if (justEnabled) {
        toast.push(
          `Inventory tracking enabled for "${savedName}". Go to Receive Stock to add units.`,
          { type: 'info', duration: 8000 }
        )
      }
    } catch (error) {
      console.error('Error saving item:', error)
      throw error
    }
  }

  const tabs = [
    {
      id: 'ingredients',
      label: 'Ingredients',
      icon: '🥬',
      description: 'Raw ingredients and supplies'
    },
    {
      id: 'recipes',
      label: 'Recipes',
      icon: '👨‍🍳',
      description: 'Recipe cost analysis'
    },
    {
      id: 'prep',
      label: 'Prep Tracking',
      icon: '⏲️',
      description: 'Daily prep and waste'
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: '🚨',
      description: 'Expiration and low stock'
    },
    {
      id: 'receiving',
      label: 'Movements',
      icon: '📥',
      description: 'Receiving and stock movements'
    }
  ]

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <BusinessProvider businessId={businessId}>
        <ContentLayout
        title="Restaurant Inventory Management"
        subtitle="Manage ingredients, recipes, prep tracking, and food costs"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', href: '/restaurant' },
          { label: 'Inventory', isActive: true }
        ]}
        headerActions={
          <div className="flex gap-3">
            <button
              onClick={() => setShowBulkStockPanel(true)}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
            >
              📦 Bulk Stock
            </button>
            <button
              onClick={() => router.push('/restaurant/inventory/receive')}
              className="btn-secondary"
            >
              📥 Receive Stock
            </button>
            <button
              onClick={() => router.push('/restaurant/inventory/add')}
              className="btn-primary"
            >
              ➕ Add Item
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Inventory Overview Stats */}
          <UniversalInventoryStats businessId={businessId} />

          {/* Tab Navigation */}
          <div className="card">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-1 sm:space-x-6 px-2 sm:px-6 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap flex-shrink-0
                      ${activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-secondary hover:text-primary hover:border-gray-300'
                      }
                    `}
                  >
                    <span className="text-base sm:text-lg">{tab.icon}</span>
                    <div className="text-left">
                      <div>{tab.label}</div>
                      <div className="hidden sm:block text-xs text-gray-400 font-normal">{tab.description}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'ingredients' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-semibold text-primary">Ingredient Inventory</h3>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => router.push('/restaurant/inventory/receive')}
                        className="btn-secondary text-sm"
                      >
                        📥 Receive Stock
                      </button>
                      <button
                        onClick={() => router.push('/restaurant/inventory/add')}
                        className="btn-primary text-sm"
                      >
                        ➕ Add Item
                      </button>
                    </div>
                  </div>

                  {/* Ingredient Categories - Click to filter — built from real data */}
                  {Object.keys(categoryCounts).length > 0 && (() => {
                    const KNOWN: Record<string, { icon: string; color: string }> = {
                      'Proteins':      { icon: '🥩', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' },
                      'Vegetables':    { icon: '🥬', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
                      'Dairy':         { icon: '🥛', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
                      'Pantry':        { icon: '🏺', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' },
                      'Beverages':     { icon: '🥤', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' },
                      'Supplies':      { icon: '📦', color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300' },
                      'Seafood':       { icon: '🦐', color: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300' },
                      'Grains':        { icon: '🌾', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
                      'Spices':        { icon: '🌶️', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300' },
                      'Condiments':    { icon: '🍯', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
                      'Oils & Fats':   { icon: '🫙', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' },
                      'Frozen':        { icon: '🧊', color: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300' },
                      'Bakery':        { icon: '🍞', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300' },
                      'Desserts':      { icon: '🍰', color: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300' },
                      'Main Courses':  { icon: '🍽️', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300' },
                      'Appetizers':    { icon: '🥗', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
                      'Starters':      { icon: '🥙', color: 'bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-800 text-lime-700 dark:text-lime-300' },
                      'Soups':         { icon: '🍲', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
                      'Salads':        { icon: '🥗', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
                      'Snacks':        { icon: '🍿', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' },
                      'Sauces':        { icon: '🧴', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' },
                      'Service':       { icon: '🛎️', color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' },
                      'Revenue':       { icon: '💵', color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' },
                      'Packaging':     { icon: '🎁', color: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300' },
                      'Cleaning':      { icon: '🧹', color: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300' },
                      'Equipment':     { icon: '🔧', color: 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300' },
                      'Uncategorized': { icon: '❓', color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400' },
                    }
                    const FALLBACK = { icon: '🗂️', color: 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300' }
                    const categories = Object.entries(categoryCounts)
                      .filter(([, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1]) // sort by item count descending
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {categories.map(([name, count]) => {
                          const meta = KNOWN[name] ?? FALLBACK
                          return (
                            <button
                              key={name}
                              onClick={() => setSelectedCategory(selectedCategory === name ? null : name)}
                              className={`card p-4 border-2 ${meta.color} hover:shadow-md transition-all cursor-pointer ${
                                selectedCategory === name ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' : ''
                              }`}
                            >
                              <div className="text-center">
                                <div className="text-2xl mb-2">{meta.icon}</div>
                                <div className="font-semibold text-sm">{name}</div>
                                <div className="text-xs opacity-75">{count} {count === 1 ? 'item' : 'items'}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* Selected Category Indicator */}
                  {selectedCategory && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>Showing:</span>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                        {selectedCategory}
                      </span>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Clear filter
                      </button>
                    </div>
                  )}

                  {/* Menu & Price Filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* In-menu toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => setMenuOnlyFilter(!menuOnlyFilter)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          menuOnlyFilter ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            menuOnlyFilter ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        🍽️ Menu items only
                      </span>
                    </label>

                    {/* POS-tracked toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => setPosTrackedFilter(!posTrackedFilter)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          posTrackedFilter ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            posTrackedFilter ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        📲 POS tracked only
                      </span>
                    </label>

                    {/* Price filter */}
                    <select
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(e.target.value as 'all' | 'with' | 'without')}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">💲 All items</option>
                      <option value="with">✅ Items with prices</option>
                      <option value="without">⚠️ Items without prices</option>
                    </select>

                    {/* Clear all extra filters */}
                    {(menuOnlyFilter || posTrackedFilter || priceFilter !== 'with') && (
                      <button
                        onClick={() => { setMenuOnlyFilter(false); setPosTrackedFilter(false); setPriceFilter('with') }}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 underline"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>

                  {/* Universal Inventory Grid */}
                  <UniversalInventoryGrid
                    businessId={businessId}
                    businessType="restaurant"
                    categoryFilter={selectedCategory || undefined}
                    menuOnlyFilter={menuOnlyFilter}
                    posTrackedFilter={posTrackedFilter}
                    priceFilter={priceFilter}
                    refreshTrigger={refreshTrigger}
                    onItemEdit={(item) => {
                      setSelectedItem(item)
                      setShowAddForm(true)
                    }}
                  />
                </div>
              )}

              {activeTab === 'recipes' && <RestaurantRecipeManager />}
              {activeTab === 'prep' && <RestaurantPrepTracker />}
              {activeTab === 'alerts' && <RestaurantExpirationAlerts />}
              {activeTab === 'receiving' && (
                <UniversalStockMovements businessId={businessId} showFilters={true} layout="full" />
              )}
            </div>
          </div>

          {/* Universal Inventory Form Modal */}
          {showAddForm && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto"
              onClick={(e) => { if (e.target === e.currentTarget) { setShowAddForm(false); setSelectedItem(null) } }}
            >
              <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl my-4">

                  {/* Compact inventory tracking bar — sits above the form's own header */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 rounded-t-lg">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="isInventoryTracked"
                        checked={isInventoryTracked}
                        onChange={(e) => setIsInventoryTracked(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        Track Inventory for POS
                      </span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 hidden sm:inline">
                        — shows live stock badge on menu card
                      </span>
                    </label>

                    {isInventoryTracked && (
                      <label className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          Reorder at:
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={reorderLevel || ''}
                          onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                          className={`input-field w-20 py-1 text-sm ${
                            reorderLevel < 1 ? 'border-red-400 dark:border-red-500 ring-1 ring-red-300 dark:ring-red-600' : ''
                          }`}
                          placeholder="e.g. 5"
                        />
                        <span className="text-xs hidden sm:inline">
                          {reorderLevel < 1
                            ? <span className="text-red-500 font-medium">Required — cannot be 0</span>
                            : <span className="text-gray-500 dark:text-gray-400">units (badge turns amber)</span>
                          }
                        </span>
                      </label>
                    )}
                  </div>

                  <UniversalInventoryForm
                    businessId={businessId}
                    businessType="restaurant"
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
                        name: 'storageTemp',
                        label: 'Storage Temperature',
                        type: 'select',
                        options: [
                          { value: 'room', label: 'Room Temperature' },
                          { value: 'refrigerated', label: 'Refrigerated (32°F - 40°F)' },
                          { value: 'frozen', label: 'Frozen (-10°F - 0°F)' }
                        ],
                        section: 'restaurant'
                      },
                      {
                        name: 'expirationDays',
                        label: 'Shelf Life (Days)',
                        type: 'number',
                        placeholder: 'Average days until expiration',
                        section: 'restaurant'
                      },
                      {
                        name: 'allergens',
                        label: 'Allergens',
                        type: 'multiselect',
                        options: [
                          { value: 'gluten', label: 'Gluten' },
                          { value: 'dairy', label: 'Dairy' },
                          { value: 'eggs', label: 'Eggs' },
                          { value: 'nuts', label: 'Tree Nuts' },
                          { value: 'peanuts', label: 'Peanuts' },
                          { value: 'shellfish', label: 'Shellfish' },
                          { value: 'fish', label: 'Fish' },
                          { value: 'soy', label: 'Soy' }
                        ],
                        section: 'restaurant'
                      },
                      {
                        name: 'preparationTime',
                        label: 'Preparation Time (minutes)',
                        type: 'number',
                        placeholder: 'Time to prepare/cook this ingredient',
                        section: 'restaurant'
                      },
                      {
                        name: 'yield',
                        label: 'Yield/Portion Size',
                        type: 'text',
                        placeholder: 'e.g., 100g, 1 cup, 2 pieces',
                        section: 'restaurant'
                      },
                      {
                        name: 'supplier',
                        label: 'Primary Supplier',
                        type: 'text',
                        placeholder: 'Supplier name or contact',
                        section: 'restaurant'
                      }
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loading Overlay for Product Fetch */}
          {isLoadingProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70]">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm w-full mx-4">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 dark:border-red-400 mb-4"></div>
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
        </div>
      </ContentLayout>
      {showBulkStockPanel && currentBusiness && currentBusinessId && (
        <BulkStockPanel
          businessId={currentBusinessId}
          businessName={currentBusiness.businessName}
          businessType={currentBusiness.businessType}
          onClose={() => setShowBulkStockPanel(false)}
        />
      )}
      </BusinessProvider>
    </BusinessTypeRoute>
  )
}

export default function RestaurantInventoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    }>
      <RestaurantInventoryContent />
    </Suspense>
  )
}