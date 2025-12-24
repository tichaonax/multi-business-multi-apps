/**
 * Analyze a single product to see all its data including attributes
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function analyzeProduct() {
  try {
    // Get the "5pc Luxury Sheets" product
    const product = await prisma.businessProducts.findFirst({
      where: { name: { contains: '5pc Luxury Sheets' } },
      include: {
        product_variants: true,
        business_categories: true
      }
    })

    if (!product) {
      console.log('Product not found')
      return
    }

    console.log('📦 Product Data:\n')
    console.log('Name:', product.name)
    console.log('SKU:', product.sku)
    console.log('basePrice:', product.basePrice)
    console.log('costPrice:', product.costPrice)
    console.log('\nAttributes:',JSON.stringify(product.attributes, null, 2))
    console.log('\nCategory:', product.business_categories?.name)

    if (product.product_variants && product.product_variants.length > 0) {
      console.log('\n📌 Variants:')
      product.product_variants.forEach(variant => {
        console.log(`  - ${variant.name || 'Default'}`)
        console.log(`    SKU: ${variant.sku}`)
        console.log(`    Price: ${variant.price}`)
        console.log(`    Stock: ${variant.stockQuantity}`)
        console.log(`    Attributes:`, JSON.stringify(variant.attributes, null, 2))
      })
    }

    // Check if there's a pricing pattern in other fields
    console.log('\n🔍 All Fields:')
    console.log(JSON.stringify(product, null, 2))

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeProduct()
