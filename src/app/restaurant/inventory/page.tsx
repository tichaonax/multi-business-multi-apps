'use client'

import { useState } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { RestaurantInventoryStats } from './components/inventory-stats'
import { RestaurantRecipeManager } from './components/recipe-manager'
import { RestaurantPrepTracker } from './components/prep-tracker'
import { RestaurantWasteLog } from './components/waste-log'
import { RestaurantExpirationAlerts } from './components/expiration-alerts'
import { InventoryItemsTable } from './components/inventory-items-table'
import { AddInventoryItemModal } from './components/add-inventory-item-modal'

export default function RestaurantInventoryPage() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'prep' | 'alerts'>('ingredients')
  const [showAddModal, setShowAddModal] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleItemAdded = () => {
    setRefreshTrigger(prev => prev + 1)
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
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              ➕ Add Ingredient
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Inventory Overview Stats */}
          <RestaurantInventoryStats />

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
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary text-sm"
                      >
                        ➕ Add Ingredient
                      </button>
                    </div>
                  </div>

                  {/* Ingredient Categories */}
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

                  {/* Real Inventory Items Table */}
                  <InventoryItemsTable businessId="restaurant-demo" key={refreshTrigger} />
                </div>
              )}

              {activeTab === 'recipes' && <RestaurantRecipeManager />}
              {activeTab === 'prep' && <RestaurantPrepTracker />}
              {activeTab === 'alerts' && <RestaurantExpirationAlerts />}
            </div>
          </div>
        </div>

        {/* Add Inventory Item Modal */}
        <AddInventoryItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          businessId="restaurant-demo"
          onItemAdded={handleItemAdded}
        />
      </ContentLayout>
    </BusinessTypeRoute>
  )
}