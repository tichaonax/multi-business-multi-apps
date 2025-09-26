'use client'

import { useState } from 'react'

interface PrepItem {
  id: string
  name: string
  category: 'Proteins' | 'Vegetables' | 'Sauces' | 'Sides' | 'Desserts'
  targetQuantity: number
  actualQuantity: number
  unit: string
  prepTime: number
  assignedTo: string
  startTime: string
  completedTime?: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  notes?: string
  wasteQuantity?: number
  wasteReason?: string
}

interface PrepShift {
  id: string
  date: string
  shift: 'morning' | 'afternoon' | 'evening'
  prepItems: PrepItem[]
  totalWaste: number
  efficiency: number
}

export function RestaurantPrepTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const [showWasteModal, setShowWasteModal] = useState(false)
  const [selectedPrepItem, setSelectedPrepItem] = useState<PrepItem | null>(null)

  // Mock data - replace with actual API data
  const todayPrep: PrepItem[] = [
    {
      id: '1',
      name: 'Chicken Breast - Grilled',
      category: 'Proteins',
      targetQuantity: 20,
      actualQuantity: 18,
      unit: 'portions',
      prepTime: 45,
      assignedTo: 'Chef Maria',
      startTime: '06:30',
      completedTime: '07:15',
      status: 'completed',
      wasteQuantity: 0.5,
      wasteReason: 'Trim fat'
    },
    {
      id: '2',
      name: 'Caesar Salad Mix',
      category: 'Vegetables',
      targetQuantity: 30,
      actualQuantity: 25,
      unit: 'portions',
      prepTime: 30,
      assignedTo: 'Prep Cook John',
      startTime: '07:00',
      status: 'in_progress'
    },
    {
      id: '3',
      name: 'House Marinara Sauce',
      category: 'Sauces',
      targetQuantity: 2,
      actualQuantity: 0,
      unit: 'quarts',
      prepTime: 60,
      assignedTo: 'Chef Maria',
      startTime: '08:00',
      status: 'pending'
    },
    {
      id: '4',
      name: 'French Fries - Cut',
      category: 'Sides',
      targetQuantity: 50,
      actualQuantity: 45,
      unit: 'portions',
      prepTime: 25,
      assignedTo: 'Prep Cook John',
      startTime: '06:45',
      completedTime: '07:10',
      status: 'completed',
      wasteQuantity: 2,
      wasteReason: 'Bad potatoes'
    },
    {
      id: '5',
      name: 'Chocolate Cake Slices',
      category: 'Desserts',
      targetQuantity: 12,
      actualQuantity: 0,
      unit: 'slices',
      prepTime: 15,
      assignedTo: 'Pastry Chef Lisa',
      startTime: '09:00',
      status: 'overdue'
    }
  ]

  const shifts = [
    { id: 'morning', label: 'Morning Prep', time: '6:00 AM - 10:00 AM' },
    { id: 'afternoon', label: 'Lunch Prep', time: '10:00 AM - 2:00 PM' },
    { id: 'evening', label: 'Dinner Prep', time: '2:00 PM - 6:00 PM' }
  ]

  const categories = ['All', 'Proteins', 'Vegetables', 'Sauces', 'Sides', 'Desserts']

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅'
      case 'in_progress': return '🔄'
      case 'pending': return '⏳'
      case 'overdue': return '🚨'
      default: return '⏳'
    }
  }

  const calculateEfficiency = () => {
    const completed = todayPrep.filter(item => item.status === 'completed').length
    const total = todayPrep.length
    return total > 0 ? (completed / total) * 100 : 0
  }

  const totalWaste = todayPrep.reduce((sum, item) => sum + (item.wasteQuantity || 0), 0)

  return (
    <div className="space-y-6">
      {/* Prep Tracking Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">Daily Prep Tracking</h3>
          <p className="text-sm text-secondary">Monitor prep progress and waste tracking</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field text-sm"
          />
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value as any)}
            className="input-field text-sm"
          >
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.label}
              </option>
            ))}
          </select>
          <button className="btn-primary text-sm">
            ➕ Add Prep Item
          </button>
        </div>
      </div>

      {/* Prep Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-300">Prep Efficiency</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {calculateEfficiency().toFixed(1)}%
              </p>
            </div>
            <span className="text-2xl">📊</span>
          </div>
        </div>

  <div className="card p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-800 dark:text-green-300">Completed Items</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {todayPrep.filter(item => item.status === 'completed').length}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">of {todayPrep.length} total</p>
            </div>
            <span className="text-2xl">✅</span>
          </div>
        </div>

  <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-800 dark:text-red-300">Total Waste</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {totalWaste.toFixed(1)} lbs
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">
                {((totalWaste / 100) * 100).toFixed(1)}% of prep
              </p>
            </div>
            <span className="text-2xl">🗑️</span>
          </div>
        </div>

  <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">Behind Schedule</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {todayPrep.filter(item => item.status === 'overdue').length}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">items overdue</p>
            </div>
            <span className="text-2xl">⏰</span>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            className="px-4 py-2 rounded-lg text-sm transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {category}
          </button>
        ))}
      </div>

      {/* Prep Items List */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-primary">
              {shifts.find(s => s.id === selectedShift)?.label} - {selectedDate}
            </h4>
            <div className="text-sm text-secondary">
              {shifts.find(s => s.id === selectedShift)?.time}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left p-3 font-medium text-secondary">Item</th>
                <th className="text-left p-3 font-medium text-secondary">Target/Actual</th>
                <th className="text-left p-3 font-medium text-secondary">Assigned To</th>
                <th className="text-left p-3 font-medium text-secondary">Time</th>
                <th className="text-left p-3 font-medium text-secondary">Status</th>
                <th className="text-left p-3 font-medium text-secondary">Waste</th>
                <th className="text-left p-3 font-medium text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {todayPrep.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-primary">{item.name}</div>
                      <div className="text-xs text-secondary">{item.category}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">
                      <div className="font-medium">
                        {item.actualQuantity}/{item.targetQuantity} {item.unit}
                      </div>
                      <div className={`text-xs ${
                        item.actualQuantity >= item.targetQuantity ? 'text-green-600' :
                        item.actualQuantity > 0 ? 'text-yellow-600' : 'text-gray-500'
                      }`}>
                        {item.actualQuantity > 0
                          ? `${((item.actualQuantity / item.targetQuantity) * 100).toFixed(0)}% complete`
                          : 'Not started'
                        }
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-secondary">{item.assignedTo}</td>
                  <td className="p-3">
                    <div className="text-sm">
                      <div>Start: {item.startTime}</div>
                      {item.completedTime && (
                        <div className="text-green-600">Done: {item.completedTime}</div>
                      )}
                      <div className="text-xs text-secondary">{item.prepTime} min</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(item.status)}`}>
                      <span>{getStatusIcon(item.status)}</span>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.wasteQuantity ? (
                      <div className="text-sm">
                        <div className="font-medium text-red-600">
                          {item.wasteQuantity} lbs
                        </div>
                        <div className="text-xs text-red-500">{item.wasteReason}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">No waste</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {item.status === 'pending' && (
                        <button className="text-blue-600 hover:text-blue-800 text-xs p-1">
                          ▶️ Start
                        </button>
                      )}
                      {item.status === 'in_progress' && (
                        <button className="text-green-600 hover:text-green-800 text-xs p-1">
                          ✅ Complete
                        </button>
                      )}
                      <button className="text-orange-600 hover:text-orange-800 text-xs p-1">
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPrepItem(item)
                          setShowWasteModal(true)
                        }}
                        className="text-red-600 hover:text-red-800 text-xs p-1"
                      >
                        🗑️ Waste
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prep Timeline */}
      <div className="card p-6">
        <h4 className="font-semibold text-primary mb-4">Prep Timeline</h4>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
          <div className="space-y-4">
            {todayPrep
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                    item.status === 'completed' ? 'bg-green-500' :
                    item.status === 'in_progress' ? 'bg-blue-500' :
                    item.status === 'overdue' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}>
                    {getStatusIcon(item.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-primary">{item.name}</div>
                        <div className="text-sm text-secondary">
                          {item.startTime} - {item.assignedTo}
                        </div>
                      </div>
                      <div className="text-sm text-secondary">
                        {item.actualQuantity}/{item.targetQuantity} {item.unit}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Waste Tracking Modal */}
      {showWasteModal && selectedPrepItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-primary">Log Waste - {selectedPrepItem.name}</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Waste Quantity
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  className="input-field"
                />
                <div className="text-xs text-secondary mt-1">
                  Unit: {selectedPrepItem.unit}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Reason for Waste
                </label>
                <select className="input-field">
                  <option>Select reason...</option>
                  <option>Spoiled/Expired</option>
                  <option>Overcooked</option>
                  <option>Trim/Prep waste</option>
                  <option>Dropped/Contaminated</option>
                  <option>Wrong preparation</option>
                  <option>Equipment failure</option>
                  <option>Other</option>
                </select>
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
                onClick={() => setShowWasteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button className="btn-primary">
                Log Waste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}