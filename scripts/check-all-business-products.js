const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAllBusinessProducts() {
  try {
    console.log('🔍 Checking products for all businesses...\n')

    // Get all businesses
    const businesses = await prisma.businesses.findMany({
      where: {
        isDemo: true,
        isActive: true
      },
      orderBy: {
        type: 'asc'
      }
    })

    console.log(`Found ${businesses.length} demo businesses\n`)

    for (const business of businesses) {
      console.log(`\n📦 ${business.name} (${business.type})`)
      console.log(`   ID: ${business.id}`)

      // Count products for this business
      const productCount = await prisma.businessProducts.count({
        where: {
          businessId: business.id,
          isActive: true
        }
      })

      // Count variants
      const variantCount = await prisma.productVariants.count({
        where: {
          business_products: {
            businessId: business.id,
            isActive: true
          }
        }
      })

      // Get sample products
      const sampleProducts = await prisma.businessProducts.findMany({
        where: {
          businessId: business.id,
          isActive: true
        },
        take: 3,
        select: {
          id: true,
          name: true,
          sku: true,
          basePrice: true
        }
      })

      console.log(`   Products: ${productCount}`)
      console.log(`   Variants: ${variantCount}`)

      if (productCount === 0) {
        console.log(`   ⚠️  NO PRODUCTS FOUND - Need to seed products`)
      } else {
        console.log(`   ✅ Has products:`)
        sampleProducts.forEach(p => {
          console.log(`      - ${p.name} (${p.sku}) - $${p.basePrice}`)
        })
      }
    }

    console.log('\n\n📊 Summary:')
    const businessesWithoutProducts = []

    for (const business of businesses) {
      const count = await prisma.businessProducts.count({
        where: {
          businessId: business.id,
          isActive: true
        }
      })

      if (count === 0) {
        businessesWithoutProducts.push(`${business.name} (${business.type})`)
      }
    }

    if (businessesWithoutProducts.length > 0) {
      console.log('\n⚠️  Businesses without products:')
      businessesWithoutProducts.forEach(b => console.log(`   - ${b}`))
      console.log('\n💡 Run seed scripts to add products to these businesses')
    } else {
      console.log('\n✅ All businesses have products!')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllBusinessProducts()
