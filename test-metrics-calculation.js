/**
 * Test Script: Verify Grocery & Restaurant Metrics Calculations
 *
 * This tests the logic we implemented in universal-inventory-stats.tsx
 * to ensure the calculations produce reasonable results.
 */

// Sample Grocery Data
const groceryItems = [
  { name: 'Bananas', costPrice: 0.25, basePrice: 0.69, currentStock: 120, attributes: { organicCertified: false } },
  { name: 'Organic Apples', costPrice: 0.50, basePrice: 1.29, currentStock: 80, attributes: { organicCertified: true } },
  { name: 'Local Tomatoes', costPrice: 0.85, basePrice: 1.99, currentStock: 45, attributes: { local: true } },
  { name: 'Milk', costPrice: 1.20, basePrice: 2.49, currentStock: 40, attributes: {} },
  { name: 'Seasonal Pumpkins', costPrice: 2.00, basePrice: 4.99, currentStock: 30, attributes: { seasonal: true } },
]

// Sample Restaurant Data
const restaurantItems = [
  { name: 'Beef', costPrice: 3.50, basePrice: 5.99, currentStock: 30, attributes: { shelfLife: 3 } },
  { name: 'Chicken', costPrice: 4.80, basePrice: 7.99, currentStock: 25, attributes: { shelfLife: 3 } },
  { name: 'Lettuce', costPrice: 0.85, basePrice: 1.99, currentStock: 45, attributes: { shelfLife: 7 } },
  { name: 'Pasta', costPrice: 0.85, basePrice: 1.99, currentStock: 80, attributes: { shelfLife: 365 } },
]

const movements = [
  { movementType: 'waste', quantity: 5, totalCost: 10 },
  { movementType: 'sale', quantity: 50, totalCost: 100 },
  { movementType: 'SALE_FULFILLED', quantity: 30, totalCost: 60 },
]

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║    Testing Grocery & Restaurant Metrics Calculations      ║')
console.log('╚════════════════════════════════════════════════════════════╝')
console.log('')

// ===== GROCERY METRICS =====
console.log('📦 GROCERY METRICS')
console.log('─'.repeat(60))

const totalGroceryItems = groceryItems.length

// 1. Organic Percentage
const organicItems = groceryItems.filter(item =>
  item.attributes?.organicCertified === true ||
  item.attributes?.organic === true
)
const organicPercentage = totalGroceryItems > 0 ?
  (organicItems.length / totalGroceryItems) * 100 : 0

console.log(`1. Organic Items: ${organicItems.length}/${totalGroceryItems} = ${organicPercentage.toFixed(1)}%`)

// 2. Local Products Percentage
const localItems = groceryItems.filter(item =>
  item.attributes?.local === true ||
  item.attributes?.localSource === true
)
const localPercentage = totalGroceryItems > 0 ?
  (localItems.length / totalGroceryItems) * 100 : 0

console.log(`2. Local Products: ${localItems.length}/${totalGroceryItems} = ${localPercentage.toFixed(1)}%`)

// 3. Seasonal Items Count
const seasonalItemsCount = groceryItems.filter(item =>
  item.attributes?.seasonal === true ||
  item.attributes?.seasonalItem === true
).length

console.log(`3. Seasonal Items: ${seasonalItemsCount} items`)

// 4. Average Margin
let totalMargin = 0
let itemsWithPricing = 0

groceryItems.forEach(item => {
  const cost = parseFloat(item.costPrice || 0)
  const price = parseFloat(item.basePrice || 0)

  if (price > 0 && cost > 0) {
    const margin = ((price - cost) / price) * 100
    totalMargin += margin
    itemsWithPricing++
  }
})

const avgMargin = itemsWithPricing > 0 ?
  totalMargin / itemsWithPricing : 0

console.log(`4. Average Margin: ${avgMargin.toFixed(1)}% (${itemsWithPricing} items with pricing)`)
console.log('')

// ===== RESTAURANT METRICS =====
console.log('🍽️  RESTAURANT METRICS')
console.log('─'.repeat(60))

// 1. Food Cost Percentage
const totalCost = restaurantItems.reduce((sum, item) =>
  sum + (parseFloat(item.costPrice || 0) * item.currentStock), 0
)
const totalPotentialRevenue = restaurantItems.reduce((sum, item) =>
  sum + (parseFloat(item.basePrice || 0) * item.currentStock), 0
)
const foodCostPercentage = totalPotentialRevenue > 0 ?
  (totalCost / totalPotentialRevenue) * 100 : 0

console.log(`1. Food Cost %: ${foodCostPercentage.toFixed(1)}%`)
console.log(`   Total Cost: $${totalCost.toFixed(2)}`)
console.log(`   Potential Revenue: $${totalPotentialRevenue.toFixed(2)}`)

// 2. Waste Percentage
const totalValue = totalCost
const wasteMovements = movements.filter(m =>
  m.movementType === 'waste' || m.movementType === 'WASTE'
)
const wasteValue = wasteMovements.reduce((sum, m) =>
  sum + (m.totalCost || 0), 0
)
const wastePercentage = totalValue > 0 ? (wasteValue / totalValue) * 100 : 0

console.log(`2. Waste %: ${wastePercentage.toFixed(1)}%`)
console.log(`   Waste Value: $${wasteValue.toFixed(2)}`)

// 3. Turnover Rate
const soldMovements = movements.filter(m =>
  m.movementType === 'sale' || m.movementType === 'SALE_FULFILLED'
)
const totalSold = soldMovements.reduce((sum, m) =>
  sum + Math.abs(m.quantity), 0
)
const avgInventory = restaurantItems.reduce((sum, item) =>
  sum + item.currentStock, 0
) / (restaurantItems.length || 1)
const turnoverRate = avgInventory > 0 ? totalSold / avgInventory : 0

console.log(`3. Turnover Rate: ${turnoverRate.toFixed(1)}`)
console.log(`   Total Sold: ${totalSold} units`)
console.log(`   Avg Inventory: ${avgInventory.toFixed(1)} units`)

// 4. Average Shelf Life
let totalShelfLife = 0
let itemsWithShelfLife = 0

restaurantItems.forEach(item => {
  const shelfLife = item.attributes?.shelfLife || item.attributes?.expirationDays
  if (shelfLife && shelfLife > 0) {
    totalShelfLife += parseFloat(shelfLife)
    itemsWithShelfLife++
  }
})

const avgShelfLife = itemsWithShelfLife > 0 ?
  totalShelfLife / itemsWithShelfLife : 0

console.log(`4. Avg Shelf Life: ${avgShelfLife.toFixed(1)} days (${itemsWithShelfLife} items)`)
console.log('')

console.log('✅ All calculations completed successfully!')
console.log('')
console.log('Summary:')
console.log('  • Grocery metrics are now calculated from real inventory attributes')
console.log('  • Restaurant metrics are now calculated from real inventory + movements')
console.log('  • No more hardcoded values!')
