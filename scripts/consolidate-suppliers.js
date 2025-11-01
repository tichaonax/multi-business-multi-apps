// Consolidate duplicate suppliers before migration
// Finds suppliers with same name + businessType but different businessId
// Merges them into a single supplier, updating product references

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findDuplicateSuppliers() {
  console.log('🔍 Searching for duplicate suppliers...\n')

  const suppliers = await prisma.businessSuppliers.findMany({
    select: {
      id: true,
      name: true,
      supplierNumber: true,
      businessId: true,
      businessType: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          business_products: true
        }
      }
    },
    orderBy: [
      { businessType: 'asc' },
      { name: 'asc' }
    ]
  })

  // Group by businessType and name
  const duplicatesByType = {}

  const byType = {}
  suppliers.forEach(supplier => {
    const type = supplier.businessType || 'unknown'
    if (!byType[type]) byType[type] = []
    byType[type].push(supplier)
  })

  for (const [type, sups] of Object.entries(byType)) {
    const nameMap = new Map()
    
    sups.forEach(supplier => {
      const name = supplier.name.toLowerCase().trim()
      if (!nameMap.has(name)) {
        nameMap.set(name, [])
      }
      nameMap.get(name).push(supplier)
    })
    
    // Filter to only duplicates
    const duplicates = new Map(
      Array.from(nameMap.entries()).filter(([_, suppliers]) => suppliers.length > 1)
    )
    
    if (duplicates.size > 0) {
      duplicatesByType[type] = duplicates
    }
  }

  return duplicatesByType
}

function choosePrimarySupplier(suppliers) {
  // Choose primary supplier based on:
  // 1. Most products linked (prefer the one with most usage)
  // 2. Oldest created date (prefer original)
  // 3. Active status (prefer active)
  
  let primary = suppliers[0]
  
  for (const supplier of suppliers) {
    // Prefer supplier with more products
    if (supplier._count.business_products > primary._count.business_products) {
      primary = supplier
      continue
    }
    
    // If same product count, prefer active
    if (supplier._count.business_products === primary._count.business_products) {
      if (supplier.isActive && !primary.isActive) {
        primary = supplier
        continue
      }
      
      // If same active status, prefer older
      if (supplier.isActive === primary.isActive) {
        if (new Date(supplier.createdAt) < new Date(primary.createdAt)) {
          primary = supplier
        }
      }
    }
  }
  
  return primary
}

async function consolidateDuplicates(dryRun = false) {
  console.log('🔧 Consolidating Duplicate Suppliers')
  console.log('=====================================\n')
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  const duplicatesByType = await findDuplicateSuppliers()

  if (Object.keys(duplicatesByType).length === 0) {
    console.log('✅ No duplicate suppliers found!\n')
    return {
      totalDuplicates: 0,
      consolidated: 0,
      productsUpdated: 0
    }
  }

  let totalConsolidated = 0
  let totalProductsUpdated = 0
  let totalDuplicates = 0

  for (const [type, duplicatesMap] of Object.entries(duplicatesByType)) {
    console.log(`\n📦 BusinessType: ${type}`)
    console.log('─'.repeat(50))

    for (const [name, suppliers] of duplicatesMap.entries()) {
      totalDuplicates += suppliers.length - 1
      
      console.log(`\n  Supplier: "${suppliers[0].name}" (${suppliers.length} instances)`)
      
      // Choose primary supplier
      const primary = choosePrimarySupplier(suppliers)
      const duplicates = suppliers.filter(s => s.id !== primary.id)
      
      console.log(`\n  ✨ Primary (keeping):`)
      console.log(`     ID: ${primary.id.substring(0, 12)}...`)
      console.log(`     Business: ${primary.businessId.substring(0, 20)}...`)
      console.log(`     Products: ${primary._count.business_products}`)
      console.log(`     Active: ${primary.isActive}`)
      console.log(`     Created: ${new Date(primary.createdAt).toLocaleDateString()}`)
      
      console.log(`\n  🗑️  Duplicates (removing):`)
      
      for (const duplicate of duplicates) {
        console.log(`     - ID: ${duplicate.id.substring(0, 12)}...`)
        console.log(`       Business: ${duplicate.businessId.substring(0, 20)}...`)
        console.log(`       Products: ${duplicate._count.business_products}`)
        console.log(`       Active: ${duplicate.isActive}`)
        
        if (!dryRun) {
          // Update products to point to primary supplier
          if (duplicate._count.business_products > 0) {
            const updateResult = await prisma.businessProducts.updateMany({
              where: {
                supplierId: duplicate.id
              },
              data: {
                supplierId: primary.id
              }
            })
            console.log(`       ↳ Updated ${updateResult.count} product references`)
            totalProductsUpdated += updateResult.count
          }
          
          // Delete the duplicate supplier
          await prisma.businessSuppliers.delete({
            where: {
              id: duplicate.id
            }
          })
          console.log(`       ↳ Deleted duplicate supplier`)
          totalConsolidated++
        } else {
          console.log(`       ↳ [DRY RUN] Would update ${duplicate._count.business_products} products`)
          console.log(`       ↳ [DRY RUN] Would delete duplicate`)
          totalConsolidated++
          totalProductsUpdated += duplicate._count.business_products
        }
      }
    }
  }

  console.log('\n\n📊 Consolidation Summary:')
  console.log('========================')
  console.log(`  Total duplicate instances: ${totalDuplicates}`)
  console.log(`  Suppliers consolidated: ${totalConsolidated}`)
  console.log(`  Product references updated: ${totalProductsUpdated}`)
  
  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes')
  }

  return {
    totalDuplicates,
    consolidated: totalConsolidated,
    productsUpdated: totalProductsUpdated
  }
}

// Run if called directly
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run')
  
  consolidateDuplicates(dryRun)
    .then((results) => {
      console.log('\n✅ Done!')
      
      if (results.totalDuplicates === 0) {
        console.log('\n🎉 Database is clean - ready for migration!')
      } else if (dryRun) {
        console.log('\n⚠️  Run without --dry-run to consolidate duplicates')
      } else {
        console.log('\n✅ Duplicates consolidated - ready for migration!')
      }
      
      prisma.$disconnect()
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      prisma.$disconnect()
      process.exit(1)
    })
} else {
  module.exports = {
    findDuplicateSuppliers,
    choosePrimarySupplier,
    consolidateDuplicates
  }
}
