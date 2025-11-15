const http = require('http')

async function testAPIEndpoint() {
  try {
    console.log('🌐 Testing /api/universal/products endpoint...\n')

    const params = new URLSearchParams({
      businessId: 'hardware-demo-business',
      includeVariants: 'true',
      includeImages: 'true',
      page: '1',
      limit: '20'
    })

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: `/api/universal/products?${params}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        console.log(`Status: ${res.statusCode}\n`)

        if (res.statusCode === 200) {
          const response = JSON.parse(data)

          if (response.success && response.data) {
            console.log(`✅ Success! Found ${response.data.length} products\n`)

            // Show first 3 products
            response.data.slice(0, 3).forEach((product, i) => {
              console.log(`${i + 1}. ${product.name}`)
              console.log(`   SKU: ${product.sku}`)
              console.log(`   basePrice: ${product.basePrice === null ? 'NULL' : product.basePrice === undefined ? 'UNDEFINED' : product.basePrice}`)
              console.log(`   basePrice type: ${typeof product.basePrice}`)

              if (product.variants && product.variants.length > 0) {
                console.log(`   Variants:`)
                product.variants.forEach(v => {
                  console.log(`     - ${v.sku}`)
                  console.log(`       price: ${v.price === null ? 'NULL' : v.price === undefined ? 'UNDEFINED' : v.price}`)
                  console.log(`       price type: ${typeof v.price}`)
                  console.log(`       stockQuantity: ${v.stockQuantity}`)
                })

                // Simulate what product-card.tsx does
                const currentPrice = product.variants[0].price ?? product.basePrice
                console.log(`\n   🎯 Calculated currentPrice: ${currentPrice}`)
                console.log(`   🎯 currentPrice type: ${typeof currentPrice}`)
              }
              console.log('')
            })
          } else {
            console.log('❌ Response not successful:', response)
          }
        } else {
          console.log(`❌ HTTP Error ${res.statusCode}:`, data)
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message)
      console.log('\n💡 Make sure dev server is running: npm run dev')
    })

    req.end()
  } catch (error) {
    console.error('Error:', error)
  }
}

testAPIEndpoint()
