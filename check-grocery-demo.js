const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkGroceryDemo() {
  try {
    console.log('Checking Grocery Demo Business...\n')

    // Check if grocery demo exists
    const groceryBusiness = await prisma.businesses.findFirst({
      where: {
        type: 'grocery',
        isDemo: true
      }
    })

    if (!groceryBusiness) {
      console.log('❌ No grocery demo business found!')
      console.log('Run: npm run seed:grocery to create it')
      return
    }

    console.log('✅ Found Grocery Demo:', groceryBusiness.name)
    console.log('   Business ID:', groceryBusiness.id)
    console.log('   Created:', groceryBusiness.createdAt)
    console.log()

    // Check products
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId: groceryBusiness.id
      },
      include: {
        business_categories: true,
        product_variants: true
      }
    })

    console.log(`📦 Products: ${products.length}`)
    
    if (products.length === 0) {
      console.log('❌ No products found! Seed may not have run correctly.')
      return
    }

    // Check variants
    const allVariants = products.flatMap(p => p.product_variants)
    console.log(`   Variants: ${allVariants.length}`)

    // Check stock
    const variantsWithStock = allVariants.filter(v => v.stockQuantity > 0)
    console.log(`   Variants with stock: ${variantsWithStock.length}`)
    
    const totalStock = allVariants.reduce((sum, v) => sum + v.stockQuantity, 0)
    console.log(`   Total stock units: ${totalStock}`)
    console.log()

    // Check stock movements
    const stockMovements = await prisma.businessStockMovements.findMany({
      where: {
        businessId: groceryBusiness.id
      }
    })

    console.log(`📊 Stock Movements: ${stockMovements.length}`)
    console.log()

    // Show sample products with stock
    console.log('Sample Products with Stock:')
    const samplesWithStock = products
      .filter(p => p.product_variants.some(v => v.stockQuantity > 0))
      .slice(0, 5)

    samplesWithStock.forEach(p => {
      const variant = p.product_variants[0]
      console.log(`  • ${p.name}`)
      console.log(`    Category: ${p.business_categories?.name || 'None'}`)
      console.log(`    Stock: ${variant?.stockQuantity || 0} units`)
      console.log(`    Price: $${p.basePrice}`)
    })

    if (samplesWithStock.length === 0) {
      console.log('  ❌ No products have stock! Check stock movements.')
    }

    console.log()

    // Check categories
    const categories = await prisma.businessCategories.findMany({
      where: {
        businessType: 'grocery',
        OR: [
          { businessId: groceryBusiness.id },
          { businessId: null }
        ]
      }
    })

    console.log(`📂 Categories: ${categories.length}`)
    categories.forEach(c => {
      const scope = c.businessId ? 'Business-specific' : 'Type-based'
      console.log(`  • ${c.name} (${scope})`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkGroceryDemo()
