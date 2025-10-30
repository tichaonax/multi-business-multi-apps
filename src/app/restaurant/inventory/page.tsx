'use client'

import { useState, useEffect } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import {
  UniversalInventoryForm,
  UniversalInventoryGrid,
  UniversalInventoryStats
} from '@/components/universal/inventory'
import { RestaurantRecipeManager } from './components/recipe-manager'
import { RestaurantPrepTracker } from './components/prep-tracker'
import { RestaurantWasteLog } from './components/waste-log'
import { RestaurantExpirationAlerts } from './components/expiration-alerts'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

export default function RestaurantInventoryPage() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'prep' | 'alerts'>('ingredients')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
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

  // Get user info
  const sessionUser = session?.user as SessionUser
  const employeeId = sessionUser?.id

  // Check if current business is a restaurant business
  const isRestaurantBusiness = currentBusiness?.businessType === 'restaurant'

  // Redirect to signin if not authenticated
  useEffect(() => {
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
          <p className="text-gray-600 mb-4">
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 mb-4">
            The Restaurant Inventory is only available for restaurant businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
          </p>
          <p className="text-sm text-gray-500">
            Please select a restaurant business from the sidebar to use this inventory system.
          </p>
        </div>
      </div>
    )
  }

  // If no restaurant businesses at all, show message
  if (!hasRestaurantBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Restaurant Businesses</h2>
          <p className="text-gray-600 mb-4">
            You don't have access to any restaurant businesses. The Restaurant Inventory system requires access to at least one restaurant business.
          </p>
          <p className="text-sm text-gray-500">
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
    try {
      const method = selectedItem ? 'PUT' : 'POST'
      const url = selectedItem
        ? `/api/inventory/${businessId}/items/${selectedItem.id}`
        : `/api/inventory/${businessId}/items`

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to save item')
      }

      handleItemAdded()
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
            <button className="btn-secondary">
              📊 Reports
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              ➕ Add Ingredient
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
              <nav className="flex space-x-2 sm:space-x-8 px-3 sm:px-6 overflow-x-auto" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                      ${activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-secondary hover:text-primary hover:border-gray-300'
                      }
                    `}
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
              {activeTab === 'ingredients' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-semibold text-primary">Ingredient Inventory</h3>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary text-sm">
                        📱 Scan Barcode
                      </button>
                      <button className="btn-secondary text-sm">
                        📥 Receive Order
                      </button>
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="btn-primary text-sm"
                      >
                        ➕ Add Ingredient
                      </button>
                    </div>
                  </div>

                  {/* Ingredient Categories - Keep for now but will be replaced by UniversalInventoryGrid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[
                      { name: 'Proteins', icon: '🥩', count: 12, color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' },
                      { name: 'Vegetables', icon: '🥬', count: 24, color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
                      { name: 'Dairy', icon: '🥛', count: 8, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
                      { name: 'Pantry', icon: '🏺', count: 35, color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' },
                      { name: 'Beverages', icon: '🥤', count: 16, color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' },
                      { name: 'Supplies', icon: '📦', count: 22, color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300' }
                    ].map((category) => (
                      <div key={category.name} className={`card p-4 border-2 ${category.color} hover:shadow-md transition-shadow cursor-pointer`}>
                        <div className="text-center">
                          <div className="text-2xl mb-2">{category.icon}</div>
                          <div className="font-semibold text-sm">{category.name}</div>
                          <div className="text-xs opacity-75">{category.count} items</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Universal Inventory Grid */}
                  <UniversalInventoryGrid
                    businessId={businessId}
                    businessType="restaurant"
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
            </div>
          </div>

          {/* Universal Inventory Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-primary">
                    {selectedItem ? 'Edit Ingredient' : 'Add New Ingredient'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setSelectedItem(null)
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6">
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
        </div>
      </ContentLayout>
      </BusinessProvider>
    </BusinessTypeRoute>
  )
}