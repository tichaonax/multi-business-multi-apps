/**
 * Check what inventory data exists for clothing businesses
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkClothingInventory() {
  try {
    console.log('=== Checking Clothing Business Inventory ===\n')

    // Find clothing businesses
    const clothingBusinesses = await prisma.businesses.findMany({
      where: {
        type: 'clothing',
        isActive: true
      },
      select: {
        id: true,
        name: true
      }
    })

    console.log(`Found ${clothingBusinesses.length} active clothing business(es):\n`)
    
    for (const business of clothingBusinesses) {
      console.log(`\n📍 Business: ${business.name} (${business.id})`)
      console.log('─'.repeat(60))

      // Count products
      const productCount = await prisma.businessProducts.count({
        where: {
          businessId: business.id,
          isActive: true
        }
      })

      // Get products with variants
      const products = await prisma.businessProducts.findMany({
        where: {
          businessId: business.id,
          isActive: true
        },
        include: {
          product_variants: true
        },
        take: 5
      })

      // Calculate total inventory value
      let totalValue = 0
      let totalStock = 0
      
      for (const product of products) {
        for (const variant of product.product_variants) {
          const value = parseFloat(variant.price?.toString() || '0') * variant.stockQuantity
          totalValue += value
          totalStock += variant.stockQuantity
        }
      }

      console.log(`  Total Products: ${productCount}`)
      console.log(`  Total Stock: ${totalStock} units`)
      console.log(`  Total Value: $${totalValue.toFixed(2)}`)

      // Check stock movements
      const movements = await prisma.businessStockMovements.findMany({
        where: {
          businessId: business.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })

      console.log(`  Stock Movements: ${movements.length} found`)
      
      if (movements.length > 0) {
        console.log('\n  Recent movements:')
        movements.slice(0, 3).forEach(m => {
          const date = new Date(m.createdAt).toLocaleDateString()
          console.log(`    - ${m.movementType}: ${m.quantity} units (${date})`)
        })
      } else {
        console.log('  ⚠️  No stock movements found!')
        console.log('  This explains why trends show 0.0%')
      }

      // Show sample products
      if (products.length > 0) {
        console.log(`\n  Sample products (showing ${Math.min(3, products.length)}):`)
        products.slice(0, 3).forEach(p => {
          const variantCount = p.product_variants.length
          const totalStock = p.product_variants.reduce((sum, v) => sum + v.stockQuantity, 0)
          console.log(`    - ${p.name}: ${variantCount} variant(s), ${totalStock} in stock`)
        })
      }
    }

    console.log('\n\n=== Analysis ===')
    console.log('If trends show 0.0%, it means:')
    console.log('  1. No stock movements have been recorded yet')
    console.log('  2. Products were created but no receiving/usage recorded')
    console.log('  3. Need to add stock movements for trend calculation')
    console.log('\nSolution: Add some stock movements via the inventory interface')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkClothingInventory()
