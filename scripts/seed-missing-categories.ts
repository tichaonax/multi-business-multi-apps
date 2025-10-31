import { prisma } from '../src/lib/prisma'

/**
 * Seed missing type-level categories from inventory domain templates
 */

async function seedMissingCategories() {
  console.log('🔍 Checking which business types need category seeding...\n')

  // Get all unique business types
  const businessTypes = await prisma.businesses.groupBy({
    by: ['type'],
    _count: {
      type: true
    }
  })

  console.log('Business Types Found:')
  businessTypes.forEach((bt: any) => {
    console.log(`  - ${bt.type} (${bt._count.type} businesses)`)
  })

  console.log('\n📊 Category Status by Type:\n')

  for (const bt of businessTypes) {
    const categoryCount = await prisma.businessCategories.count({
      where: { businessType: bt.type }
    })

    const status = categoryCount > 0 ? '✅' : '❌'
    console.log(`${status} ${bt.type}: ${categoryCount} categories`)

    // If no categories, seed from domain templates
    if (categoryCount === 0) {
      console.log(`   🌱 Seeding ${bt.type} categories from templates...`)

      // Get domain template for this type
      const domain = await prisma.inventoryDomains.findFirst({
        where: { 
          businessType: bt.type,
          isActive: true
        },
        include: {
          business_categories: {
            where: { isActive: true },
            select: {
              name: true,
              description: true,
              emoji: true,
              color: true,
              displayOrder: true
            }
          }
        }
      })

      if (!domain || domain.business_categories.length === 0) {
        console.log(`   ⚠️  No template found for ${bt.type}`)
        continue
      }

      // Get one business of this type to associate categories with
      const business = await prisma.businesses.findFirst({
        where: { type: bt.type },
        select: { id: true }
      })

      if (!business) {
        console.log(`   ⚠️  No business found for type ${bt.type}`)
        continue
      }

      // Create categories for this business type
      const categoriesToCreate = domain.business_categories.map(cat => ({
        businessId: business.id, // Required field, but queries use businessType
        businessType: bt.type,
        name: cat.name,
        description: cat.description,
        emoji: cat.emoji,
        color: cat.color,
        displayOrder: cat.displayOrder,
        domainId: domain.id,
        isUserCreated: false,
        isActive: true,
        updatedAt: new Date()
      }))

      const result = await prisma.businessCategories.createMany({
        data: categoriesToCreate,
        skipDuplicates: true
      })

      console.log(`   ✅ Created ${result.count} categories for ${bt.type}`)
    }
  }

  console.log('\n✅ Seeding complete!\n')

  // Final summary
  console.log('=== Final Category Counts ===\n')
  const finalCounts = await prisma.businessCategories.groupBy({
    by: ['businessType'],
    _count: { id: true },
    orderBy: { businessType: 'asc' }
  })

  finalCounts.forEach((row: any) => {
    console.log(`${row.businessType}: ${row._count.id} categories`)
  })

  await prisma.$disconnect()
}

seedMissingCategories().catch(console.error)
