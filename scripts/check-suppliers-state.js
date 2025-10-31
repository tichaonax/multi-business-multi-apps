const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSuppliersState() {
  console.log('🔍 Analyzing Business Suppliers State...\n')

  try {
    // Get all suppliers with business info
    const suppliers = await prisma.businessSuppliers.findMany({
      select: {
        id: true,
        name: true,
        supplierNumber: true,
        businessId: true,
        businessType: true,
        isActive: true,
        businesses: {
          select: {
            name: true,
            type: true
          }
        }
      },
      orderBy: [
        { businessType: 'asc' },
        { name: 'asc' }
      ]
    })

    console.log(`📊 Total Suppliers: ${suppliers.length}\n`)

    // Group by businessType
    const byType = {}
    suppliers.forEach(supplier => {
      const type = supplier.businessType || 'unknown'
      if (!byType[type]) byType[type] = []
      byType[type].push(supplier)
    })

    console.log('📈 Suppliers by Business Type:')
    for (const [type, sups] of Object.entries(byType)) {
      console.log(`  ${type}: ${sups.length} suppliers`)
    }
    console.log('')

    // Find potential duplicates (same name, different businessId, same businessType)
    console.log('🔍 Checking for Duplicate Suppliers (same name, same businessType, different businessId):\n')
    
    const duplicatesByType = {}
    
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

    if (Object.keys(duplicatesByType).length === 0) {
      console.log('✅ No duplicate suppliers found!\n')
    } else {
      let totalDuplicates = 0
      for (const [type, duplicatesMap] of Object.entries(duplicatesByType)) {
        console.log(`\n📦 ${type} Business Type:`)
        for (const [name, suppliers] of duplicatesMap.entries()) {
          console.log(`\n  Supplier Name: "${suppliers[0].name}" (${suppliers.length} instances)`)
          suppliers.forEach(s => {
            console.log(`    - Business: ${s.businesses.name} (ID: ${s.businessId.substring(0, 8)}...)`)
            console.log(`      Supplier ID: ${s.id.substring(0, 8)}...`)
            console.log(`      Supplier #: ${s.supplierNumber}`)
          })
          totalDuplicates += suppliers.length - 1
        }
      }
      console.log(`\n⚠️  Total duplicate instances to consolidate: ${totalDuplicates}\n`)
    }

    // Show sample of supplier relationships
    console.log('\n🔗 Sample Supplier Relationships:\n')
    const suppliersWithProducts = await prisma.businessSuppliers.findMany({
      take: 5,
      include: {
        business_products: {
          take: 3,
          select: {
            name: true,
            sku: true
          }
        },
        _count: {
          select: {
            business_products: true
          }
        }
      }
    })

    suppliersWithProducts.forEach(supplier => {
      console.log(`  ${supplier.name} (${supplier.businessType})`)
      console.log(`    Business: ${supplier.businessId.substring(0, 12)}...`)
      console.log(`    Products linked: ${supplier._count.business_products}`)
      if (supplier.business_products.length > 0) {
        supplier.business_products.forEach(p => {
          console.log(`      - ${p.name} (${p.sku})`)
        })
      }
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSuppliersState()
