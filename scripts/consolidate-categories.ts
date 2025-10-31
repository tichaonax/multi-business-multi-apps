import { prisma } from '../src/lib/prisma'

/**
 * Pre-migration script: Consolidate duplicate categories per business type
 * 
 * Problem: Categories currently have @@unique([businessId, name]), allowing
 * multiple "Appetizers" categories across different restaurants.
 * 
 * Solution: Before changing to @@unique([businessType, name]), we need to:
 * 1. Find all duplicate (businessType, name) combinations
 * 2. Keep one canonical category per (businessType, name)
 * 3. Update all product references to point to the canonical category
 * 4. Delete the duplicate categories
 */

async function consolidateCategories() {
  console.log('🔍 Finding duplicate categories per business type...\n')

  // Get all categories grouped by type and name
  const allCategories = await prisma.businessCategories.findMany({
    select: {
      id: true,
      businessId: true,
      businessType: true,
      name: true,
      createdAt: true,
      isUserCreated: true,
      _count: {
        select: {
          business_products: true
        }
      }
    },
    orderBy: [
      { businessType: 'asc' },
      { name: 'asc' },
      { createdAt: 'asc' } // Keep oldest as canonical
    ]
  })

  // Group by businessType + name
  const grouped = new Map<string, typeof allCategories>()
  
  allCategories.forEach(cat => {
    const key = `${cat.businessType}:${cat.name}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(cat)
  })

  // Find duplicates
  const duplicates = Array.from(grouped.entries()).filter(([_, cats]) => cats.length > 1)

  if (duplicates.length === 0) {
    console.log('✅ No duplicate categories found! Safe to migrate.\n')
    await prisma.$disconnect()
    return
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate category names:\n`)

  let totalConsolidated = 0
  let totalProductsUpdated = 0

  for (const [key, categories] of duplicates) {
    const [businessType, name] = key.split(':')
    const canonical = categories[0] // Keep the oldest one
    const duplicateIds = categories.slice(1).map(c => c.id)

    console.log(`\n📦 ${businessType} - "${name}":`)
    console.log(`   Keeping: ${canonical.id.slice(0, 8)} (created ${canonical.createdAt.toISOString().split('T')[0]}, ${canonical._count.business_products} products)`)
    
    for (const dup of categories.slice(1)) {
      console.log(`   Removing: ${dup.id.slice(0, 8)} (created ${dup.createdAt.toISOString().split('T')[0]}, ${dup._count.business_products} products)`)
    }

    // Update all products pointing to duplicate categories
    if (duplicateIds.length > 0) {
      const updateResult = await prisma.businessProducts.updateMany({
        where: {
          categoryId: {
            in: duplicateIds
          }
        },
        data: {
          categoryId: canonical.id
        }
      })

      totalProductsUpdated += updateResult.count

      // Delete duplicate categories
      const deleteResult = await prisma.businessCategories.deleteMany({
        where: {
          id: {
            in: duplicateIds
          }
        }
      })

      totalConsolidated += deleteResult.count
      console.log(`   ✅ Consolidated: ${updateResult.count} products updated, ${deleteResult.count} duplicates removed`)
    }
  }

  console.log(`\n✅ Consolidation complete!`)
  console.log(`   ${totalConsolidated} duplicate categories removed`)
  console.log(`   ${totalProductsUpdated} product references updated`)
  console.log(`   Schema is now ready for migration\n`)

  await prisma.$disconnect()
}

consolidateCategories().catch(console.error)
