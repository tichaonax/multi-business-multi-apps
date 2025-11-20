// Test script to verify barcode lookup API response
const testBarcode = process.argv[2] || 'TEST-001'

async function testBarcodeLookup() {
  try {
    console.log(`Testing barcode lookup for: ${testBarcode}`)
    console.log('---')

    // Note: This will fail without proper auth, but we can check the structure
    const response = await fetch(`http://localhost:8080/api/global/inventory-lookup/${testBarcode}`, {
      headers: {
        'Cookie': process.env.TEST_COOKIE || ''
      }
    })

    const data = await response.json()

    console.log('Response Status:', response.status)
    console.log('Response Data:', JSON.stringify(data, null, 2))

    if (data.success && data.data?.businesses) {
      console.log('\n--- Business Details ---')
      data.data.businesses.forEach((biz, index) => {
        console.log(`\nBusiness ${index + 1}:`)
        console.log(`  Name: ${biz.businessName}`)
        console.log(`  Type: ${biz.businessType}`)
        console.log(`  Has Access: ${biz.hasAccess}`)
        console.log(`  Is Informational: ${biz.isInformational}`)
        console.log(`  Product ID: ${biz.productId}`)
        console.log(`  Variant ID: ${biz.variantId}`)
        console.log(`  Stock: ${biz.stockQuantity}`)
        console.log(`  Price: $${biz.price}`)
        console.log(`  `)
        console.log(`  ⚠️ Add to Cart button will ${biz.isInformational ? 'NOT' : ''} show`)
        console.log(`  ⚠️ View Only label will ${biz.isInformational ? '' : 'NOT'} show`)
      })

      const accessibleCount = data.data.businesses.filter(b => b.hasAccess).length
      const informationalCount = data.data.businesses.filter(b => b.isInformational).length

      console.log('\n--- Summary ---')
      console.log(`Total businesses: ${data.data.businesses.length}`)
      console.log(`Accessible (with Add to Cart): ${accessibleCount}`)
      console.log(`Informational (View Only): ${informationalCount}`)
    }

  } catch (error) {
    console.error('Error:', error.message)
  }
}

testBarcodeLookup()
