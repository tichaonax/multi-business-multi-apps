// Test the product API endpoint
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testProductAPI() {
  const productId = 'abff694c-8b3b-4e2b-9db4-d000efe6cb9a'
  const businessId = 'e5bc7e64-a140-4990-870c-59398594cbb2'

  try {
    console.log('Testing product fetch...')
    console.log(`Product ID: ${productId}`)
    console.log(`Business ID: ${businessId}`)
    console.log('')

    // Fetch the product with its variants
    const product = await prisma.businessProducts.findFirst({
      where: {
        id: productId,
        businessId: businessId,
        isActive: true
      },
      include: {
        business_categories: {
          select: {
            id: true,
            name: true,
            businessType: true
          }
        },
        product_variants: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stockQuantity: true,
            attributes: true,
            isActive: true
          }
        }
      }
    })

    if (!product) {
      console.error('❌ Product not found!')
      console.log('\nLet me check if the product exists at all...')

      const anyProduct = await prisma.businessProducts.findFirst({
        where: { id: productId }
      })

      if (anyProduct) {
        console.log(`✓ Product exists but with different businessId: ${anyProduct.businessId}`)
        console.log(`  Product name: ${anyProduct.name}`)
        console.log(`  Is active: ${anyProduct.isActive}`)
      } else {
        console.log('❌ Product does not exist in database at all')
      }

      return
    }

    console.log('✅ Product found!')
    console.log(`Name: ${product.name}`)
    console.log(`SKU: ${product.sku}`)
    console.log(`Base Price: ${product.basePrice}`)
    console.log(`Business Type: ${product.businessType}`)
    console.log(`Variants: ${product.product_variants?.length || 0}`)

    if (product.product_variants && product.product_variants.length > 0) {
      console.log('\nVariants:')
      product.product_variants.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.name} - SKU: ${v.sku} - Price: $${v.price}`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testProductAPI()
