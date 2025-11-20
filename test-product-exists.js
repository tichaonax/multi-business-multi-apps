// Verify product exists in clothing-demo-business
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProduct() {
  const productId = '8bfe0fc5-f544-416e-9154-002837b96cf8'

  try {
    // Check which business this product belongs to
    const product = await prisma.businessProducts.findFirst({
      where: { id: productId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    if (!product) {
      console.log('❌ Product not found!')
      return
    }

    console.log('✅ Product found!')
    console.log(`Product ID: ${product.id}`)
    console.log(`Product Name: ${product.name}`)
    console.log(`Business ID: ${product.businessId}`)
    console.log(`Business Name: ${product.businesses.name}`)
    console.log(`Business Type: ${product.businesses.type}`)
    console.log('')
    console.log(`Expected: clothing-demo-business`)
    console.log(`Actual: ${product.businessId}`)
    console.log(`Match: ${product.businessId === 'clothing-demo-business' ? '✅ YES' : '❌ NO'}`)

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkProduct()
