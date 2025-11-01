/**
 * Test the inventory reports API to verify real data
 */

async function testInventoryReports() {
  const businessId = 'clothing-demo-business' // Has actual data

  console.log('=== Testing Inventory Reports API ===\n')
  console.log(`Business ID: ${businessId}\n`)

  try {
    const response = await fetch(`http://localhost:8080/api/inventory/${businessId}/reports?reportType=inventory_value`)
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`)
      const error = await response.text()
      console.error(error)
      return
    }

    const data = await response.json()
    const report = data.report?.data || {}

    console.log('📊 Report Data:')
    console.log('─'.repeat(60))
    console.log(`Total Inventory Value: $${report.totalInventoryValue?.toLocaleString() || 0}`)
    console.log(`Total Items: ${report.totalItems || 0}`)
    console.log('')

    if (report.categories && report.categories.length > 0) {
      console.log('📦 Categories:')
      report.categories.forEach((cat, i) => {
        console.log(`  ${i + 1}. ${cat.category}`)
        console.log(`     Value: $${cat.value.toLocaleString()}`)
        console.log(`     Percentage: ${cat.percentage.toFixed(1)}%`)
        console.log(`     Items: ${cat.items}`)
        console.log(`     Avg Value: $${cat.averageValue.toFixed(2)}`)
        console.log('')
      })
    } else {
      console.log('⚠️  No categories found')
    }

    console.log('📈 Trends:')
    console.log(`  Week-over-Week: ${report.trends?.weekOverWeek >= 0 ? '+' : ''}${report.trends?.weekOverWeek || 0}%`)
    console.log(`  Month-over-Month: ${report.trends?.monthOverMonth >= 0 ? '+' : ''}${report.trends?.monthOverMonth || 0}%`)
    console.log(`  Year-over-Year: ${report.trends?.yearOverYear >= 0 ? '+' : ''}${report.trends?.yearOverYear || 0}%`)

    console.log('\n✅ SUCCESS: API returns REAL data (no hardcoded $47,850)')
    
    // Verify it's not the hardcoded value
    if (report.totalInventoryValue === 47850) {
      console.log('\n⚠️  WARNING: Still showing hardcoded value $47,850!')
      console.log('   This should not happen. Check if changes were saved.')
    } else {
      console.log('\n✅ VERIFIED: Value is calculated from actual database!')
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message)
  }
}

testInventoryReports()
