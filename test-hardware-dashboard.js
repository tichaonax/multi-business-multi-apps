// Test script for hardware dashboard stats API
// Usage: node test-hardware-dashboard.js <businessId>

const businessId = process.argv[2] || 'hardware-demo-business'

async function testDashboardStats() {
  console.log('🔧 Testing Hardware Dashboard Stats API...\n')
  console.log(`Business ID: ${businessId}\n`)

  try {
    const url = `http://localhost:8080/api/hardware/${businessId}/dashboard`
    console.log(`Fetching: ${url}\n`)

    const response = await fetch(url, {
      headers: {
        'Cookie': '' // Add session cookie if needed for local testing
      }
    })

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`)
      const error = await response.text()
      console.error(error)
      return
    }

    const data = await response.json()
    console.log('✅ API Response Success!\n')
    console.log('📊 Dashboard Statistics:')
    console.log('─'.repeat(50))
    
    if (data.data) {
      const stats = data.data
      console.log(`💰 Daily Sales:         $${stats.dailySales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
      console.log(`📦 Orders Today:        ${stats.ordersToday}`)
      console.log(`🏪 Inventory Value:     $${stats.inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
      console.log(`⚠️  Low Stock Items:     ${stats.lowStockItems}`)
      console.log(`✂️  Cut-to-Size Orders:  ${stats.cutToSizeOrders}`)
    } else {
      console.log('⚠️  No data returned')
      console.log(JSON.stringify(data, null, 2))
    }

    console.log('\n' + '─'.repeat(50))
    console.log('Test completed successfully! ✅')

  } catch (error) {
    console.error('\n❌ Test Failed!')
    console.error('Error:', error.message)
    if (error.cause) {
      console.error('Cause:', error.cause)
    }
  }
}

testDashboardStats()
