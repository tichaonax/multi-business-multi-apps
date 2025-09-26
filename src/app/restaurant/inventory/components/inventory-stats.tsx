'use client'

import { useState, useEffect } from 'react'

interface InventoryStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
  expiringItems: number
  foodCostPercentage: number
  inventoryTurnover: number
  wastePercentage: number
  daysOfInventory: number
}

export function RestaurantInventoryStats() {
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    expiringItems: 0,
    foodCostPercentage: 0,
    inventoryTurnover: 0,
    wastePercentage: 0,
    daysOfInventory: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call - replace with actual API call
    const fetchStats = async () => {
      try {
        // Mock data for now
        const mockStats: InventoryStats = {
          totalItems: 147,
          totalValue: 18750.00,
          lowStockItems: 12,
          expiringItems: 8,
          foodCostPercentage: 28.5,
          inventoryTurnover: 12.4,
          wastePercentage: 3.2,
          daysOfInventory: 4.2
        }

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500))
        setStats(mockStats)
      } catch (error) {
        console.error('Failed to fetch inventory stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Inventory Value',
      value: `$${stats.totalValue.toLocaleString()}`,
      subtitle: `${stats.totalItems} items`,
      icon: '💰',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Food Cost %',
      value: `${stats.foodCostPercentage}%`,
      subtitle: 'of revenue',
      icon: '📊',
      color: stats.foodCostPercentage > 30 ? 'text-red-600' : stats.foodCostPercentage > 25 ? 'text-yellow-600' : 'text-green-600',
      bgColor: stats.foodCostPercentage > 30 ? 'bg-red-50 dark:bg-red-900/20' : stats.foodCostPercentage > 25 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20',
      borderColor: stats.foodCostPercentage > 30 ? 'border-red-200 dark:border-red-800' : stats.foodCostPercentage > 25 ? 'border-yellow-200 dark:border-yellow-800' : 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Items Needing Attention',
      value: stats.lowStockItems + stats.expiringItems,
      subtitle: `${stats.lowStockItems} low stock, ${stats.expiringItems} expiring`,
      icon: '🚨',
      color: stats.lowStockItems + stats.expiringItems > 15 ? 'text-red-600' : stats.lowStockItems + stats.expiringItems > 5 ? 'text-yellow-600' : 'text-green-600',
      bgColor: stats.lowStockItems + stats.expiringItems > 15 ? 'bg-red-50 dark:bg-red-900/20' : stats.lowStockItems + stats.expiringItems > 5 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20',
      borderColor: stats.lowStockItems + stats.expiringItems > 15 ? 'border-red-200 dark:border-red-800' : stats.lowStockItems + stats.expiringItems > 5 ? 'border-yellow-200 dark:border-yellow-800' : 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Inventory Turnover',
      value: `${stats.inventoryTurnover}x`,
      subtitle: `${stats.daysOfInventory} days on hand`,
      icon: '🔄',
      color: stats.inventoryTurnover > 10 ? 'text-green-600' : stats.inventoryTurnover > 6 ? 'text-yellow-600' : 'text-red-600',
      bgColor: stats.inventoryTurnover > 10 ? 'bg-green-50 dark:bg-green-900/20' : stats.inventoryTurnover > 6 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20',
      borderColor: stats.inventoryTurnover > 10 ? 'border-green-200 dark:border-green-800' : stats.inventoryTurnover > 6 ? 'border-yellow-200 dark:border-yellow-800' : 'border-red-200 dark:border-red-800'
    }
  ]

  const secondaryStats = [
    {
      label: 'Waste Percentage',
      value: `${stats.wastePercentage}%`,
      target: '< 5%',
      status: stats.wastePercentage < 5 ? 'good' : stats.wastePercentage < 8 ? 'warning' : 'danger'
    },
    {
      label: 'Inventory Days',
      value: `${stats.daysOfInventory} days`,
      target: '3-7 days',
      status: stats.daysOfInventory >= 3 && stats.daysOfInventory <= 7 ? 'good' : 'warning'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`card p-6 border-2 ${stat.bgColor} ${stat.borderColor} transition-all hover:shadow-lg`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{stat.icon}</span>
                <h3 className="text-sm font-medium text-secondary">{stat.title}</h3>
              </div>
            </div>
            <div className={`text-2xl font-bold ${stat.color} mb-1`}>
              {stat.value}
            </div>
            <p className="text-sm text-secondary">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Performance Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {secondaryStats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-lg font-semibold text-primary">{stat.value}</div>
              <div className="text-sm text-secondary">{stat.label}</div>
              <div className={`text-xs mt-1 ${
                stat.status === 'good' ? 'text-green-600' :
                stat.status === 'warning' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                Target: {stat.target}
              </div>
            </div>
          ))}

          {/* Additional quick metrics */}
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">$2,340</div>
            <div className="text-sm text-secondary">This Week Orders</div>
            <div className="text-xs text-green-600 mt-1">↗ +12% vs last week</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-primary">24</div>
            <div className="text-sm text-secondary">Suppliers</div>
            <div className="text-xs text-blue-600 mt-1">3 orders pending</div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary text-sm">
            📊 View Detailed Report
          </button>
          <button className="btn-secondary text-sm">
            📈 Cost Analysis
          </button>
          <button className="btn-secondary text-sm">
            📋 Order from Suppliers
          </button>
          <button className="btn-secondary text-sm">
            🗓️ Schedule Inventory Count
          </button>
        </div>
      </div>
    </div>
  )
}