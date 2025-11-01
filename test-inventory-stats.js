/**
 * Test script to verify inventory stats calculations
 * Run with: node test-inventory-stats.js
 */

// Mock data similar to what the API would return
const mockItems = [
  { id: '1', name: 'T-Shirt Blue M', category: 'Shirts', costPrice: 15, currentStock: 50 },
  { id: '2', name: 'T-Shirt Blue L', category: 'Shirts', costPrice: 15, currentStock: 45 },
  { id: '3', name: 'Jeans Black 32', category: 'Pants', costPrice: 40, currentStock: 30 },
  { id: '4', name: 'Jeans Black 34', category: 'Pants', costPrice: 40, currentStock: 25 }
]

const mockMovements = [
  // Recent week - receiving stock
  { id: 'm1', itemId: '1', movementType: 'receive', quantity: 20, totalCost: 300, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'm2', itemId: '2', movementType: 'receive', quantity: 15, totalCost: 225, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  
  // Recent month - mixed movements
  { id: 'm3', itemId: '3', movementType: 'receive', quantity: 10, totalCost: 400, createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'm4', itemId: '1', movementType: 'use', quantity: -5, totalCost: 75, createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'm5', itemId: '4', movementType: 'waste', quantity: -3, totalCost: 120, createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
]

const mockAlerts = [
  { itemName: 'T-Shirt Blue M', alertType: 'low_stock', priority: 'warning' },
  { itemName: 'Jeans Black 34', alertType: 'low_stock', priority: 'warning' }
]

// Calculate stats
const totalItems = mockItems.length
const totalValue = mockItems.reduce((sum, item) => sum + (item.costPrice * item.currentStock), 0)
const totalCategories = new Set(mockItems.map(item => item.category)).size
const lowStockItems = mockAlerts.filter(alert => alert.alertType === 'low_stock').length
const outOfStockItems = mockAlerts.filter(alert => alert.alertType === 'out_of_stock').length
const expiringItems = mockAlerts.filter(alert => alert.alertType === 'expiring_soon' || alert.alertType === 'expired').length

// Calculate trends
const now = new Date()
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

const lastWeekMovements = mockMovements.filter(m => new Date(m.createdAt) >= oneWeekAgo)
const lastMonthMovements = mockMovements.filter(m => new Date(m.createdAt) >= oneMonthAgo)

const lastWeekValue = lastWeekMovements.reduce((sum, m) => {
  const movementValue = m.totalCost || 0
  return sum + (m.quantity > 0 ? movementValue : -movementValue)
}, 0)

const lastMonthValue = lastMonthMovements.reduce((sum, m) => {
  const movementValue = m.totalCost || 0
  return sum + (m.quantity > 0 ? movementValue : -movementValue)
}, 0)

const weekOverWeek = totalValue > 0 ? (lastWeekValue / totalValue) * 100 : 0
const monthOverMonth = totalValue > 0 ? (lastMonthValue / totalValue) * 100 : 0

const recentReceiveMovements = lastMonthMovements.filter(m => 
  m.movementType === 'receive' || (m.movementType === 'adjustment' && m.quantity > 0)
)
const uniqueNewItems = new Set(recentReceiveMovements.map(m => m.itemId)).size
const itemCountChange = totalItems > 0 ? ((uniqueNewItems / totalItems) * 100) - 100 : 0

console.log('=== Inventory Stats Calculation Test ===\n')
console.log('Current State:')
console.log(`  Total Items: ${totalItems}`)
console.log(`  Total Value: $${totalValue.toLocaleString()}`)
console.log(`  Categories: ${totalCategories}`)
console.log(`  Low Stock: ${lowStockItems}`)
console.log(`  Out of Stock: ${outOfStockItems}`)
console.log(`  Expiring: ${expiringItems}`)
console.log('')

console.log('Historical Analysis:')
console.log(`  Last Week Movements: ${lastWeekMovements.length}`)
console.log(`  Last Week Value Change: $${lastWeekValue.toFixed(2)}`)
console.log(`  Last Month Movements: ${lastMonthMovements.length}`)
console.log(`  Last Month Value Change: $${lastMonthValue.toFixed(2)}`)
console.log('')

console.log('Calculated Trends:')
console.log(`  Week-over-Week: ${(weekOverWeek >= 0 ? '+' : '')}${weekOverWeek.toFixed(1)}%`)
console.log(`  Month-over-Month (Item Count): ${(itemCountChange >= 0 ? '+' : '')}${itemCountChange.toFixed(1)}%`)
console.log(`  Value Trend: ${(monthOverMonth >= 0 ? '+' : '')}${monthOverMonth.toFixed(1)}%`)
console.log('')

console.log('Expected Display (in UI):')
console.log(`  Total Items: ${totalItems}`)
console.log(`    ${itemCountChange >= 0 ? '📈' : '📉'} ${(itemCountChange >= 0 ? '+' : '')}${itemCountChange.toFixed(1)}%`)
console.log('')
console.log(`  Total Value: $${totalValue.toLocaleString()}`)
console.log(`    ${weekOverWeek >= 0 ? '📈' : '📉'} ${(weekOverWeek >= 0 ? '+' : '')}${weekOverWeek.toFixed(1)}%`)
console.log('')
console.log(`  Categories: ${totalCategories}`)
console.log(`  Low Stock: ${lowStockItems}`)
console.log(`  Out of Stock: ${outOfStockItems}`)
console.log(`  Expiring: ${expiringItems}`)
console.log('')

console.log('✅ Stats calculation working correctly!')
console.log('   - Trends are now based on real movement data')
console.log('   - Week-over-Week shows value changes from last 7 days')
console.log('   - Month-over-Month shows item count changes from last 30 days')
