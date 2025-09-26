'use client'

import { useState } from 'react'

interface WasteEntry {
  id: string
  date: string
  time: string
  itemName: string
  category: string
  quantity: number
  unit: string
  cost: number
  reason: string
  employeeName: string
  notes?: string
  preventable: boolean
}

export function RestaurantWasteLog() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [showAddWasteModal, setShowAddWasteModal] = useState(false)

  // Mock waste data - replace with actual API data
  const wasteEntries: WasteEntry[] = [
    {
      id: '1',
      date: '2024-09-14',
      time: '14:30',
      itemName: 'Ground Beef 80/20',
      category: 'Proteins',
      quantity: 2.5,
      unit: 'lbs',
      cost: 17.48,
      reason: 'Expired',
      employeeName: 'Chef Maria',
      notes: 'Left out of refrigeration overnight',
      preventable: true
    },
    {
      id: '2',
      date: '2024-09-14',
      time: '12:15',
      itemName: 'Lettuce - Iceberg',
      category: 'Vegetables',
      quantity: 1.0,
      unit: 'head',
      cost: 2.49,
      reason: 'Spoiled',
      employeeName: 'Prep Cook John',
      notes: 'Brown spots throughout',
      preventable: false
    },
    {
      id: '3',
      date: '2024-09-14',
      time: '10:45',
      itemName: 'Chicken Breast',
      category: 'Proteins',
      quantity: 0.75,
      unit: 'lbs',
      cost: 5.24,
      reason: 'Overcooked',
      employeeName: 'Line Cook Sarah',
      notes: 'Grilled too long, dried out',
      preventable: true
    },
    {
      id: '4',
      date: '2024-09-13',
      time: '16:20',
      itemName: 'Tomatoes - Roma',
      category: 'Vegetables',
      quantity: 3.0,
      unit: 'lbs',
      cost: 7.47,
      reason: 'Dropped',
      employeeName: 'Prep Cook John',
      notes: 'Slipped while carrying to prep station',
      preventable: true
    },
    {
      id: '5',
      date: '2024-09-13',
      time: '09:30',
      itemName: 'Milk - Whole',
      category: 'Dairy',
      quantity: 0.5,
      unit: 'gallon',
      cost: 2.50,
      reason: 'Expired',
      employeeName: 'Opening Manager',
      notes: 'Expired 2 days ago, missed during rotation',
      preventable: true
    }
  ]

  const categories = ['All', 'Proteins', 'Vegetables', 'Dairy', 'Pantry', 'Beverages', 'Prepared Foods']

  const wasteReasons = [
    { value: 'expired', label: 'Expired/Spoiled', preventable: false },
    { value: 'overcooked', label: 'Overcooked', preventable: true },
    { value: 'dropped', label: 'Dropped/Spilled', preventable: true },
    { value: 'wrong_prep', label: 'Wrong Preparation', preventable: true },
    { value: 'contaminated', label: 'Contaminated', preventable: true },
    { value: 'equipment_failure', label: 'Equipment Failure', preventable: false },
    { value: 'over_production', label: 'Over Production', preventable: true },
    { value: 'customer_return', label: 'Customer Return', preventable: false },
    { value: 'trim_waste', label: 'Trim/Prep Waste', preventable: false },
    { value: 'other', label: 'Other', preventable: false }
  ]

  const filteredEntries = selectedCategory === 'All'
    ? wasteEntries
    : wasteEntries.filter(entry => entry.category === selectedCategory)

  const todayWaste = wasteEntries.filter(entry => entry.date === selectedDate)
  const weekWaste = wasteEntries.filter(entry => {
    const entryDate = new Date(entry.date)
    const today = new Date(selectedDate)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    return entryDate >= weekAgo && entryDate <= today
  })

  const todayWasteCost = todayWaste.reduce((sum, entry) => sum + entry.cost, 0)
  const weekWasteCost = weekWaste.reduce((sum, entry) => sum + entry.cost, 0)
  const preventableWaste = weekWaste.filter(entry => entry.preventable)
  const preventableWasteCost = preventableWaste.reduce((sum, entry) => sum + entry.cost, 0)

  const wasteByCategory = categories.slice(1).map(category => {
    const categoryWaste = weekWaste.filter(entry => entry.category === category)
    const cost = categoryWaste.reduce((sum, entry) => sum + entry.cost, 0)
    return { category, cost, count: categoryWaste.length }
  }).sort((a, b) => b.cost - a.cost)

  const getReasonColor = (reason: string) => {
    const reasonObj = wasteReasons.find(r => r.value === reason.toLowerCase().replace(/\s+/g, '_'))
    return reasonObj?.preventable
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Waste Tracking Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">Food Waste Tracking</h3>
          <p className="text-sm text-secondary">Monitor and reduce food waste for cost control</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field text-sm"
          />
          <button
            onClick={() => setShowAddWasteModal(true)}
            className="btn-primary text-sm"
          >
            ➕ Log Waste
          </button>
        </div>
      </div>

      {/* Waste Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-800 dark:text-red-300">Today's Waste Cost</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${todayWasteCost.toFixed(2)}
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">
                {todayWaste.length} items
              </p>
            </div>
            <span className="text-2xl">🗑️</span>
          </div>
        </div>

  <div className="card p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-800 dark:text-orange-300">Weekly Waste Cost</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                ${weekWasteCost.toFixed(2)}
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400">
                {weekWaste.length} items
              </p>
            </div>
            <span className="text-2xl">📊</span>
          </div>
        </div>

  <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">Preventable Waste</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                ${preventableWasteCost.toFixed(2)}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {preventableWaste.length} items
              </p>
            </div>
            <span className="text-2xl">⚠️</span>
          </div>
        </div>

  <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-300">Waste Percentage</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {((weekWasteCost / 5000) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                of food costs
              </p>
            </div>
            <span className="text-2xl">📈</span>
          </div>
        </div>
      </div>

      {/* Waste by Category */}
      <div className="card p-6">
        <h4 className="font-semibold text-primary mb-4">Waste by Category (This Week)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wasteByCategory.map((item) => (
            <div key={item.category} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <div className="font-medium text-primary">{item.category}</div>
                <div className="text-sm text-secondary">{item.count} items</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-red-600">${item.cost.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedCategory === category
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Waste Entries Table */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-primary">Waste Log Entries</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search waste entries..."
                className="input-field text-sm w-64"
              />
              <select className="input-field text-sm">
                <option>All Reasons</option>
                {wasteReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left p-3 font-medium text-secondary">Date/Time</th>
                <th className="text-left p-3 font-medium text-secondary">Item</th>
                <th className="text-left p-3 font-medium text-secondary">Quantity</th>
                <th className="text-left p-3 font-medium text-secondary">Cost</th>
                <th className="text-left p-3 font-medium text-secondary">Reason</th>
                <th className="text-left p-3 font-medium text-secondary">Employee</th>
                <th className="text-left p-3 font-medium text-secondary">Preventable</th>
                <th className="text-left p-3 font-medium text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{entry.date}</div>
                      <div className="text-xs text-secondary">{entry.time}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-primary">{entry.itemName}</div>
                      <div className="text-xs text-secondary">{entry.category}</div>
                    </div>
                  </td>
                  <td className="p-3 font-medium">
                    {entry.quantity} {entry.unit}
                  </td>
                  <td className="p-3 font-medium text-red-600">
                    ${entry.cost.toFixed(2)}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonColor(entry.reason)}`}>
                      {entry.reason}
                    </span>
                  </td>
                  <td className="p-3 text-secondary">{entry.employeeName}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entry.preventable ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {entry.preventable ? '⚠️ Yes' : '✅ No'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button className="text-blue-600 hover:text-blue-800 text-xs p-1">
                        👁️ View
                      </button>
                      <button className="text-orange-600 hover:text-orange-800 text-xs p-1">
                        ✏️ Edit
                      </button>
                      <button className="text-red-600 hover:text-red-800 text-xs p-1">
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Waste Modal */}
      {showAddWasteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-primary">Log Food Waste</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    defaultValue={selectedDate}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    defaultValue={new Date().toTimeString().slice(0, 5)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Item Name
                </label>
                <input
                  type="text"
                  placeholder="Enter item name"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Category
                </label>
                <select className="input-field">
                  <option>Select category...</option>
                  {categories.slice(1).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Unit
                  </label>
                  <select className="input-field">
                    <option>lbs</option>
                    <option>oz</option>
                    <option>each</option>
                    <option>cups</option>
                    <option>gallons</option>
                    <option>portions</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Estimated Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Reason for Waste
                </label>
                <select className="input-field">
                  <option>Select reason...</option>
                  {wasteReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Employee
                </label>
                <input
                  type="text"
                  placeholder="Enter employee name"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Additional details about the waste..."
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowAddWasteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button className="btn-primary">
                Log Waste Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}