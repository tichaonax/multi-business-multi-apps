/**
 * Test Variant Update via API
 */

const fetch = require('node-fetch')

async function testVariantUpdate() {
  console.log('🧪 Testing Variant Update via API')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    // Product ID for "Eggs"
    const productId = '03ce2ad2-05c4-45a7-b472-ec4b1e23a08b'

    // Test data with updated variant prices
    const updateData = {
      id: productId,
      name: 'Eggs',
      basePrice: 2.00,
      variants: [
        {
          id: '03ce2ad2-05c4-45a7-b472-ec4b1e23a08b-variant-EGGS-LAR',
          name: 'Large',
          sku: 'EGGS-LAR',
          price: 3.50,
          isAvailable: true,
          stockQuantity: 0,
          reorderLevel: 0
        },
        {
          id: '03ce2ad2-05c4-45a7-b472-ec4b1e23a08b-variant-EGGS-REG',
          name: 'Regular',
          sku: 'EGGS-REG',
          price: 2.50,
          isAvailable: true,
          stockQuantity: 0,
          reorderLevel: 0
        },
        {
          id: '03ce2ad2-05c4-45a7-b472-ec4b1e23a08b-variant-EGGS-SMA',
          name: 'Small',
          sku: 'EGGS-SMA',
          price: 2.00,
          isAvailable: true,
          stockQuantity: 0,
          reorderLevel: 0
        },
        {
          id: '03ce2ad2-05c4-45a7-b472-ec4b1e23a08b-variant-ING-EGGS-001',
          name: 'Default',
          sku: 'ING-EGGS-001',
          price: 2.50,
          isAvailable: true,
          stockQuantity: 0,
          reorderLevel: 0
        }
      ]
    }

    console.log('📤 Sending PUT request to update product...')
    console.log(`   Product ID: ${productId}`)
    console.log(`   Variants: ${updateData.variants.length}`)
    console.log('')

    updateData.variants.forEach(v => {
      console.log(`   - ${v.name}: $${v.price}`)
    })
    console.log('')

    const response = await fetch('http://localhost:8080/api/universal/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })

    const result = await response.json()

    if (response.ok && result.success) {
      console.log('✅ Update successful!')
      console.log('')
      console.log('📥 Response:')
      console.log(`   Success: ${result.success}`)
      console.log(`   Message: ${result.message}`)

      if (result.data && result.data.variants) {
        console.log(`   Variants in response: ${result.data.variants.length}`)
        console.log('')
        console.log('Updated Variants:')
        result.data.variants.forEach(v => {
          console.log(`   - ${v.name}: $${v.price}`)
        })
      }
    } else {
      console.log('❌ Update failed!')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${result.error}`)
      if (result.details) {
        console.log('   Details:', JSON.stringify(result.details, null, 2))
      }
    }

    console.log('\n═══════════════════════════════════════════════════')
    console.log('🔍 Now verify in database...\n')

    // Verify in database
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    const product = await prisma.businessProducts.findUnique({
      where: { id: productId },
      include: {
        product_variants: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    })

    if (product && product.product_variants) {
      console.log('Database Variants:')
      product.product_variants.forEach(v => {
        console.log(`   - ${v.name}: $${v.price}`)
      })

      // Check if any prices are still 0
      const hasZeroPrices = product.product_variants.some(v => v.price === 0)
      if (hasZeroPrices) {
        console.log('\n❌ Some variants still have $0 prices!')
      } else {
        console.log('\n✅ All variants have non-zero prices!')
      }
    }

    await prisma.$disconnect()

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testVariantUpdate()
