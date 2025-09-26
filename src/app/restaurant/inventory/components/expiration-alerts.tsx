'use client'

import { useState } from 'react'

interface ExpiringItem {
  id: string
  name: string
  category: string
  sku: string
  currentStock: number
  unit: string
  expirationDate: string
  daysUntilExpiration: number
  location: string
  supplier: string
  cost: number
  totalValue: number
  batchNumber?: string
  priority: 'critical' | 'urgent' | 'soon'
  action: 'use_first' | 'markdown' | 'donate' | 'discard'
}

interface LowStockItem {
  id: string
  name: string
  category: string
  sku: string
  currentStock: number
  reorderLevel: number
  unit: string
  supplier: string
  leadTime: number
  cost: number
  lastOrderDate: string
  autoReorder: boolean
}

export function RestaurantExpirationAlerts() {
  const [activeAlertTab, setActiveAlertTab] = useState<'expiring' | 'lowstock' | 'outofstock'>('expiring')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')

  // Mock expiring items data
  const expiringItems: ExpiringItem[] = [
    {
      id: '1',
      name: 'Ground Beef 80/20',
      category: 'Proteins',
      sku: 'PROT-BEEF-001',
      currentStock: 8.5,
      unit: 'lbs',
      expirationDate: '2024-09-15',
      daysUntilExpiration: 1,
      location: 'Walk-in Cooler A2',
      supplier: 'Prime Meats Inc.',
      cost: 6.99,
      totalValue: 59.42,
      batchNumber: 'PM240913',
      priority: 'critical',
      action: 'use_first'
    },
    {
      id: '2',
      name: 'Heavy Cream',
      category: 'Dairy',
      sku: 'DAIRY-CREAM-001',
      currentStock: 2,
      unit: 'quarts',
      expirationDate: '2024-09-16',
      daysUntilExpiration: 2,
      location: 'Dairy Cooler B1',
      supplier: 'Local Dairy Farm',
      cost: 4.50,
      totalValue: 9.00,
      priority: 'urgent',
      action: 'use_first'
    },
    {
      id: '3',
      name: 'Fresh Spinach',
      category: 'Vegetables',
      sku: 'VEG-SPIN-001',
      currentStock: 3,
      unit: 'lbs',
      expirationDate: '2024-09-17',
      daysUntilExpiration: 3,
      location: 'Produce Cooler C1',
      supplier: 'Green Fields Produce',
      cost: 3.25,
      totalValue: 9.75,
      priority: 'urgent',
      action: 'use_first'
    },
    {
      id: '4',
      name: 'Salmon Fillets',
      category: 'Proteins',
      sku: 'PROT-SALM-001',
      currentStock: 4,
      unit: 'lbs',
      expirationDate: '2024-09-18',
      daysUntilExpiration: 4,
      location: 'Fish Cooler A3',
      supplier: 'Ocean Fresh Seafood',
      cost: 15.99,
      totalValue: 63.96,
      priority: 'soon',
      action: 'markdown'
    },
    {
      id: '5',
      name: 'Mushrooms - Button',
      category: 'Vegetables',
      sku: 'VEG-MUSH-001',
      currentStock: 2.5,
      unit: 'lbs',
      expirationDate: '2024-09-19',
      daysUntilExpiration: 5,
      location: 'Produce Cooler C2',
      supplier: 'Fungi Farm Co.',
      cost: 4.75,
      totalValue: 11.88,
      priority: 'soon',
      action: 'use_first'
    }
  ]

  // Mock low stock items data
  const lowStockItems: LowStockItem[] = [
    {
      id: '1',
      name: 'Olive Oil - Extra Virgin',
      category: 'Pantry',
      sku: 'PANT-OIL-001',
      currentStock: 1,
      reorderLevel: 3,
      unit: 'bottles',
      supplier: 'Mediterranean Imports',
      leadTime: 5,
      cost: 12.99,
      lastOrderDate: '2024-09-01',
      autoReorder: false
    },
    {
      id: '2',
      name: 'Burger Buns',
      category: 'Bread',
      sku: 'BREAD-BUN-001',
      currentStock: 8,
      reorderLevel: 20,
      unit: 'packages',
      supplier: 'Daily Bread Bakery',
      leadTime: 1,
      cost: 2.25,
      lastOrderDate: '2024-09-12',
      autoReorder: true
    },
    {
      id: '3',
      name: 'Roma Tomatoes',
      category: 'Vegetables',
      sku: 'VEG-TOM-001',
      currentStock: 3.2,
      reorderLevel: 10,
      unit: 'lbs',
      supplier: 'Green Fields Produce',
      leadTime: 2,
      cost: 2.49,
      lastOrderDate: '2024-09-10',
      autoReorder: false
    }
  ]

  const alertTabs = [
    { id: 'expiring', label: 'Expiring Soon', icon: '⏰', count: expiringItems.length },
    { id: 'lowstock', label: 'Low Stock', icon: '📦', count: lowStockItems.length },
    { id: 'outofstock', label: 'Out of Stock', icon: '🚫', count: 0 }
  ]

  const priorities = [
    { value: 'all', label: 'All Priorities' },
    { value: 'critical', label: 'Critical (1 day)' },
    { value: 'urgent', label: 'Urgent (2-3 days)' },
    { value: 'soon', label: 'Soon (4-7 days)' }
  ]

  const filteredExpiringItems = selectedPriority === 'all'
    ? expiringItems
    : expiringItems.filter(item => item.priority === selectedPriority)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'soon': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🚨'
      case 'urgent': return '⚠️'
      case 'soon': return '⏰'
      default: return '📦'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'use_first': return 'bg-green-100 text-green-800'
      case 'markdown': return 'bg-blue-100 text-blue-800'
      case 'donate': return 'bg-purple-100 text-purple-800'
      case 'discard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'use_first': return 'Use First'
      case 'markdown': return 'Markdown'
      case 'donate': return 'Donate'
      case 'discard': return 'Discard'
      default: return action
    }
  }

  const totalExpiringValue = expiringItems.reduce((sum, item) => sum + item.totalValue, 0)
  const criticalItems = expiringItems.filter(item => item.priority === 'critical')
  const urgentItems = expiringItems.filter(item => item.priority === 'urgent')

  return (
    <div className="space-y-6">
      {/* Alerts Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">Inventory Alerts</h3>
          <p className="text-sm text-secondary">Monitor expiring items and low stock levels</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="input-field text-sm"
          >
            {priorities.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
          <button className="btn-primary text-sm">
            📧 Send Alerts
          </button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-800 dark:text-red-300">Critical Items</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {criticalItems.length}
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">expires in 1 day</p>
            </div>
            <span className="text-2xl">🚨</span>
          </div>
        </div>

        <div className="card p-4 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-800 dark:text-orange-300">Urgent Items</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {urgentItems.length}
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400">expires in 2-3 days</p>
            </div>
            <span className="text-2xl">⚠️</span>
          </div>
        </div>

        <div className="card p-4 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-300">At Risk Value</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${totalExpiringValue.toFixed(2)}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">total inventory value</p>
            </div>
            <span className="text-2xl">💰</span>
          </div>
        </div>

        <div className="card p-4 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-800 dark:text-purple-300">Low Stock Items</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {lowStockItems.length}
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-400">need reordering</p>
            </div>
            <span className="text-2xl">📦</span>
          </div>
        </div>
      </div>

      {/* Alert Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {alertTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveAlertTab(tab.id as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                  ${activeAlertTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-secondary hover:text-primary hover:border-gray-300'
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activeAlertTab === tab.id ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Expiring Items Tab */}
          {activeAlertTab === 'expiring' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-primary">Items Expiring Soon</h4>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm">
                    📤 Export List
                  </button>
                  <button className="btn-primary text-sm">
                    🔄 Refresh
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-3 font-medium text-secondary">Item</th>
                      <th className="text-left p-3 font-medium text-secondary">Stock</th>
                      <th className="text-left p-3 font-medium text-secondary">Expires</th>
                      <th className="text-left p-3 font-medium text-secondary">Priority</th>
                      <th className="text-left p-3 font-medium text-secondary">Location</th>
                      <th className="text-left p-3 font-medium text-secondary">Value</th>
                      <th className="text-left p-3 font-medium text-secondary">Action</th>
                      <th className="text-left p-3 font-medium text-secondary">Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredExpiringItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-primary">{item.name}</div>
                            <div className="text-xs text-secondary">{item.category} • {item.sku}</div>
                            {item.batchNumber && (
                              <div className="text-xs text-gray-400">Batch: {item.batchNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{item.currentStock} {item.unit}</div>
                          <div className="text-xs text-secondary">${item.cost.toFixed(2)}/{item.unit}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{item.expirationDate}</div>
                          <div className={`text-xs ${
                            item.daysUntilExpiration <= 1 ? 'text-red-600' :
                            item.daysUntilExpiration <= 3 ? 'text-orange-600' :
                            'text-yellow-600'
                          }`}>
                            {item.daysUntilExpiration} days left
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${getPriorityColor(item.priority)}`}>
                            <span>{getPriorityIcon(item.priority)}</span>
                            {item.priority}
                          </span>
                        </td>
                        <td className="p-3 text-secondary text-sm">{item.location}</td>
                        <td className="p-3 font-medium">${item.totalValue.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(item.action)}`}>
                            {getActionLabel(item.action)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button className="text-green-600 hover:text-green-800 text-xs p-1">
                              ✅ Use
                            </button>
                            <button className="text-blue-600 hover:text-blue-800 text-xs p-1">
                              🏷️ Mark
                            </button>
                            <button className="text-purple-600 hover:text-purple-800 text-xs p-1">
                              🎁 Donate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Low Stock Tab */}
          {activeAlertTab === 'lowstock' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-primary">Low Stock Items</h4>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm">
                    📋 Create Order
                  </button>
                  <button className="btn-primary text-sm">
                    🔄 Auto-Reorder
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-3 font-medium text-secondary">Item</th>
                      <th className="text-left p-3 font-medium text-secondary">Current/Reorder</th>
                      <th className="text-left p-3 font-medium text-secondary">Supplier</th>
                      <th className="text-left p-3 font-medium text-secondary">Lead Time</th>
                      <th className="text-left p-3 font-medium text-secondary">Last Order</th>
                      <th className="text-left p-3 font-medium text-secondary">Auto Reorder</th>
                      <th className="text-left p-3 font-medium text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-primary">{item.name}</div>
                            <div className="text-xs text-secondary">{item.category} • {item.sku}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-red-600">
                            {item.currentStock} / {item.reorderLevel} {item.unit}
                          </div>
                          <div className="text-xs text-secondary">${item.cost.toFixed(2)}/{item.unit}</div>
                        </td>
                        <td className="p-3 text-secondary">{item.supplier}</td>
                        <td className="p-3 text-secondary">{item.leadTime} days</td>
                        <td className="p-3 text-secondary">{item.lastOrderDate}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.autoReorder ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.autoReorder ? '✅ Yes' : '❌ No'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button className="text-blue-600 hover:text-blue-800 text-xs p-1">
                              📋 Order
                            </button>
                            <button className="text-green-600 hover:text-green-800 text-xs p-1">
                              🔄 Auto
                            </button>
                            <button className="text-orange-600 hover:text-orange-800 text-xs p-1">
                              ✏️ Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Out of Stock Tab */}
          {activeAlertTab === 'outofstock' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h4 className="text-lg font-semibold text-primary mb-2">Great Job!</h4>
              <p className="text-secondary">No items are currently out of stock.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}