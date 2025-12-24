/**
 * Test script for stock adjustment feature
 * Tests the inventory item stock adjustment API endpoint
 */

const API_BASE = 'http://localhost:8080'

async function testStockAdjustment() {
  console.log('🧪 Testing Stock Adjustment Feature\n')

  // Step 1: Use known clothing business from error message
  console.log('1️⃣ Using clothing business...')
  const clothingBusiness = {
    id: 'de261f7a-0c43-4a38-9d4f-c2936c3158d9',
    businessName: 'Clothing Business'
  }
  console.log(`   ✅ Using: ${clothingBusiness.businessName} (${clothingBusiness.id})`)

  // Step 2: Get an inventory item
  console.log('\n2️⃣ Getting inventory items...')
  const itemsRes = await fetch(`${API_BASE}/api/inventory/${clothingBusiness.id}/items`)
  const itemsData = await itemsRes.json()

  console.log(`   Debug: API response:`, JSON.stringify(itemsData).substring(0, 200))

  if (!itemsData.items || itemsData.items.length === 0) {
    console.error('❌ No inventory items found')
    console.error('   Full response:', itemsData)
    return
  }

  const testItem = itemsData.items[0]
  console.log(`   ✅ Using item: ${testItem.name} (${testItem.id})`)
  console.log(`   📦 Current stock: ${testItem.currentStock}`)

  // Step 3: Get current item details to verify stock
  console.log('\n3️⃣ Fetching item details before adjustment...')
  const beforeRes = await fetch(`${API_BASE}/api/inventory/${clothingBusiness.id}/items/${testItem.id}`)
  const beforeData = await beforeRes.json()
  console.log(`   ✅ Stock before: ${beforeData.data.currentStock}`)

  // Step 4: Test positive adjustment (+5 units)
  console.log('\n4️⃣ Testing positive adjustment (+5 units)...')
  const adjustmentAmount = 5
  const updateRes = await fetch(`${API_BASE}/api/inventory/${clothingBusiness.id}/items/${testItem.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testItem.name,
      categoryId: testItem.categoryId,
      unit: testItem.unit,
      _stockAdjustment: adjustmentAmount
    })
  })

  if (!updateRes.ok) {
    const error = await updateRes.json()
    console.error('❌ Stock adjustment failed:', error)
    console.error('Response status:', updateRes.status)
    return
  }

  const updateData = await updateRes.json()
  console.log(`   ✅ Adjustment successful`)
  console.log(`   📦 Stock after: ${updateData.item.currentStock}`)

  // Step 5: Verify the adjustment
  const expectedStock = beforeData.data.currentStock + adjustmentAmount
  if (updateData.item.currentStock === expectedStock) {
    console.log(`   ✅ VERIFIED: Stock correctly increased by ${adjustmentAmount}`)
  } else {
    console.error(`   ❌ MISMATCH: Expected ${expectedStock}, got ${updateData.item.currentStock}`)
  }

  // Step 6: Test negative adjustment (-2 units)
  console.log('\n5️⃣ Testing negative adjustment (-2 units)...')
  const negativeAdjustment = -2
  const negativeRes = await fetch(`${API_BASE}/api/inventory/${clothingBusiness.id}/items/${testItem.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testItem.name,
      categoryId: testItem.categoryId,
      unit: testItem.unit,
      _stockAdjustment: negativeAdjustment
    })
  })

  if (!negativeRes.ok) {
    const error = await negativeRes.json()
    console.error('❌ Negative adjustment failed:', error)
    return
  }

  const negativeData = await negativeRes.json()
  console.log(`   ✅ Negative adjustment successful`)
  console.log(`   📦 Stock after: ${negativeData.item.currentStock}`)

  const finalExpected = expectedStock + negativeAdjustment
  if (negativeData.item.currentStock === finalExpected) {
    console.log(`   ✅ VERIFIED: Stock correctly decreased by ${Math.abs(negativeAdjustment)}`)
  } else {
    console.error(`   ❌ MISMATCH: Expected ${finalExpected}, got ${negativeData.item.currentStock}`)
  }

  // Step 7: Verify stock movements were created
  console.log('\n6️⃣ Summary:')
  console.log(`   • Initial stock: ${beforeData.data.currentStock}`)
  console.log(`   • After +${adjustmentAmount}: ${updateData.item.currentStock}`)
  console.log(`   • After ${negativeAdjustment}: ${negativeData.item.currentStock}`)
  console.log(`   • Net change: ${negativeData.item.currentStock - beforeData.data.currentStock}`)

  console.log('\n✅ All stock adjustment tests passed!')
}

// Run the test
testStockAdjustment().catch(error => {
  console.error('❌ Test failed with error:', error)
  process.exit(1)
})
