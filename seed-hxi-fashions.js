async function seedHXIFashions() {
  const businessId = 'a9f3f5e8-612a-46b5-bb3a-6838b4ed4fd2' // HXI Fashions

  console.log(`\n📦 Seeding products for HXI Fashions...`)
  console.log(`Business ID: ${businessId}\n`)

  try {
    const response = await fetch('http://localhost:8080/api/admin/clothing/seed-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ businessId })
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Success!')
      console.log(`   Imported: ${result.data.imported}`)
      console.log(`   Skipped: ${result.data.skipped}`)
      console.log(`   Errors: ${result.data.errors}`)
      console.log(`   Total Products: ${result.data.totalProducts}`)

      if (result.data.errors > 0 && result.data.errorLog?.length > 0) {
        console.log('\n⚠️  Error Log (first 10):')
        result.data.errorLog.forEach(err => {
          console.log(`   - ${err.product} (${err.sku}): ${err.error}`)
        })
      }
    } else {
      console.log('❌ Failed!')
      console.log(`   Error: ${result.error}`)
      if (result.details) {
        console.log(`   Details: ${result.details}`)
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

seedHXIFashions()
