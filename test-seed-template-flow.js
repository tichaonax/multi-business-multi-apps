/**
 * Test script to verify seed template system
 * Run with: node test-seed-template-flow.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('\n=== Testing Seed Template System ===\n')

  // 1. Check if seed_data_templates table exists and is accessible
  console.log('1. Checking seed_data_templates table...')
  try {
    const templates = await prisma.seedDataTemplates.findMany({
      select: {
        id: true,
        name: true,
        businessType: true,
        version: true,
      }
    })
    console.log(`✓ Table exists. Found ${templates.length} templates`)
    if (templates.length > 0) {
      console.log('   Templates:', templates)
    }
  } catch (err) {
    console.error('✗ Error accessing table:', err.message)
    return
  }

  // 2. Check businesses available for export
  console.log('\n2. Checking available businesses...')
  try {
    const businesses = await prisma.businesses.findMany({
      where: {
        isActive: true,
        type: { not: 'umbrella' }
      },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            products: true,
            business_categories: true
          }
        }
      },
      take: 5
    })
    console.log(`✓ Found ${businesses.length} active businesses`)
    businesses.forEach(b => {
      console.log(`   - ${b.name} (${b.type}): ${b._count.products} products, ${b._count.business_categories} categories`)
    })
  } catch (err) {
    console.error('✗ Error fetching businesses:', err.message)
  }

  // 3. Check if there's a test business with products
  console.log('\n3. Looking for best candidate for export...')
  try {
    const candidate = await prisma.businesses.findFirst({
      where: {
        isActive: true,
        type: { not: 'umbrella' },
        products: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: {
            products: true,
            business_categories: true,
            business_subcategories: true
          }
        }
      },
      orderBy: {
        products: {
          _count: 'desc'
        }
      }
    })

    if (candidate) {
      console.log(`✓ Best candidate: ${candidate.name} (${candidate.type})`)
      console.log(`   Products: ${candidate._count.products}`)
      console.log(`   Categories: ${candidate._count.business_categories}`)
      console.log(`   Subcategories: ${candidate._count.business_subcategories}`)
      console.log(`\n   → Use business ID: ${candidate.id}`)
    } else {
      console.log('✗ No businesses with products found')
      console.log('   → Need to seed a business first with products')
    }
  } catch (err) {
    console.error('✗ Error:', err.message)
  }

  // 4. Check admin user
  console.log('\n4. Checking admin user...')
  try {
    const admin = await prisma.users.findFirst({
      where: {
        OR: [
          { role: 'admin' },
          { isAdmin: true }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isAdmin: true
      }
    })

    if (admin) {
      console.log(`✓ Admin user: ${admin.name} (${admin.email})`)
      console.log(`   Role: ${admin.role}, isAdmin: ${admin.isAdmin}`)
    } else {
      console.log('✗ No admin user found')
    }
  } catch (err) {
    console.error('✗ Error:', err.message)
  }

  console.log('\n=== Test Complete ===\n')
}

main()
  .catch(err => {
    console.error('Fatal error:', err)
  })
  .finally(() => {
    prisma.$disconnect()
  })
