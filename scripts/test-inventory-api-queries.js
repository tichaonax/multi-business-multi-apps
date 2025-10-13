const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testInventoryQueries() {
  try {
    console.log('🧪 Testing Inventory API Prisma Queries')
    console.log('=======================================\n')

    // Test the main query that was failing
    console.log('📦 Testing BusinessProducts query with relations...')
    
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId: 'grocery-demo-business'
      },
      include: {
        business_categories: true,
        business_brands: true,
        product_variants: {
          include: {
            business_stock_movements: true
          }
        }
      },
      take: 5 // Limit for testing
    })

    console.log(`✅ Found ${products.length} products`)
    
    if (products.length > 0) {
      console.log('\n📊 Sample product data:')
      products.forEach((product, idx) => {
        console.log(`   ${idx + 1}. ${product.name}`)
        console.log(`      - Category: ${product.business_categories?.name || 'None'}`)
        console.log(`      - Brand: ${product.business_brands?.name || 'None'}`)
        console.log(`      - Variants: ${product.product_variants?.length || 0}`)
        if (product.product_variants && product.product_variants.length > 0) {
          product.product_variants.forEach(variant => {
            const stockMovements = variant.business_stock_movements?.length || 0
            console.log(`        - ${variant.name}: ${stockMovements} stock movements`)
          })
        }
      })
    }

    console.log('\n🔍 Testing category filtering...')
    const categoryProducts = await prisma.businessProducts.findMany({
      where: {
        businessId: 'grocery-demo-business',
        business_categories: {
          name: { contains: 'Fresh', mode: 'insensitive' }
        }
      },
      include: {
        business_categories: true
      },
      take: 3
    })

    console.log(`✅ Found ${categoryProducts.length} products in 'Fresh' categories`)
    categoryProducts.forEach(product => {
      console.log(`   - ${product.name} (${product.business_categories?.name})`)
    })

    console.log('\n🏷️ Testing business categories...')
    const categories = await prisma.businessCategories.findMany({
      where: {
        businessId: 'grocery-demo-business'
      },
      take: 5
    })

    console.log(`✅ Found ${categories.length} categories`)
    categories.forEach(cat => {
      console.log(`   - ${cat.name}: ${cat.description}`)
    })

    console.log('\n📊 Testing product variants...')
    const variants = await prisma.productVariants.findMany({
      where: {
        business_products: {
          businessId: 'grocery-demo-business'
        }
      },
      include: {
        business_stock_movements: true
      },
      take: 5
    })

    console.log(`✅ Found ${variants.length} product variants`)
    variants.forEach(variant => {
      const movements = variant.business_stock_movements?.length || 0
      console.log(`   - ${variant.name} (${variant.sku}): ${movements} stock movements`)
    })

    console.log('\n🧮 Testing count queries...')
    const counts = {
      products: await prisma.businessProducts.count({ where: { businessId: 'grocery-demo-business' } }),
      categories: await prisma.businessCategories.count({ where: { businessId: 'grocery-demo-business' } }),
      variants: await prisma.productVariants.count({ where: { business_products: { businessId: 'grocery-demo-business' } } }),
      stockMovements: await prisma.businessStockMovements.count({ where: { businessId: 'grocery-demo-business' } })
    }

    console.log(`   📦 Products: ${counts.products}`)
    console.log(`   📂 Categories: ${counts.categories}`)
    console.log(`   📊 Variants: ${counts.variants}`)
    console.log(`   📈 Stock Movements: ${counts.stockMovements}`)

    console.log('\n✅ All inventory API queries completed successfully!')
    console.log('🎯 The relation name fixes are working correctly.')

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error.message.includes('businessCategory')) {
      console.error('💡 Still have businessCategory relation name issues')
    }
    if (error.message.includes('productVariants')) {
      console.error('💡 Still have productVariants relation name issues') 
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testInventoryQueries()
    .then(() => {
      console.log('\n🚀 Inventory API query test completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Inventory API query test failed:', error)
      process.exit(1)
    })
}

module.exports = { testInventoryQueries }