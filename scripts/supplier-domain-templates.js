// Domain Templates for Shared Suppliers by Business Type
// Similar to category templates, these define common suppliers for each business type

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const supplierDomainTemplates = {
  clothing: [
    {
      name: 'General Fabric Supplier',
      supplierNumber: 'CLO-SUP-001',
      emoji: '🧵',
      description: 'General fabric and textile supplier',
      paymentTerms: 'Net 30',
      isActive: true
    },
    {
      name: 'Accessories & Notions',
      supplierNumber: 'CLO-SUP-002',
      emoji: '🎀',
      description: 'Buttons, zippers, threads, and accessories',
      paymentTerms: 'Net 30',
      isActive: true
    },
    {
      name: 'Wholesale Fashion',
      supplierNumber: 'CLO-SUP-003',
      emoji: '👔',
      description: 'Ready-made garments wholesale',
      paymentTerms: 'Net 30',
      isActive: true
    }
  ],

  hardware: [
    {
      name: 'Tools Wholesale',
      supplierNumber: 'HDW-SUP-001',
      emoji: '🔨',
      description: 'Hand tools and power tools supplier',
      paymentTerms: 'Net 30',
      isActive: true
    },
    {
      name: 'Building Materials Co',
      supplierNumber: 'HDW-SUP-002',
      emoji: '🏗️',
      description: 'Lumber, cement, and construction materials',
      paymentTerms: 'Net 45',
      isActive: true
    },
    {
      name: 'Electrical & Plumbing Supply',
      supplierNumber: 'HDW-SUP-003',
      emoji: '💡',
      description: 'Electrical components and plumbing fixtures',
      paymentTerms: 'Net 30',
      isActive: true
    },
    {
      name: 'Paint & Finishing',
      supplierNumber: 'HDW-SUP-004',
      emoji: '🎨',
      description: 'Paints, stains, and finishing supplies',
      paymentTerms: 'Net 30',
      isActive: true
    }
  ],

  grocery: [
    {
      name: 'Fresh Produce Distributor',
      supplierNumber: 'GRO-SUP-001',
      emoji: '🥬',
      description: 'Fresh fruits and vegetables supplier',
      paymentTerms: 'Net 7',
      isActive: true
    },
    {
      name: 'Dairy Products Co',
      supplierNumber: 'GRO-SUP-002',
      emoji: '🥛',
      description: 'Milk, cheese, yogurt, and dairy products',
      paymentTerms: 'Net 14',
      isActive: true
    },
    {
      name: 'Meat & Poultry Supplier',
      supplierNumber: 'GRO-SUP-003',
      emoji: '🥩',
      description: 'Fresh and frozen meat products',
      paymentTerms: 'Net 7',
      isActive: true
    },
    {
      name: 'Bakery Goods Distributor',
      supplierNumber: 'GRO-SUP-004',
      emoji: '🍞',
      description: 'Bread, pastries, and baked goods',
      paymentTerms: 'Net 14',
      isActive: true
    },
    {
      name: 'General Grocery Wholesale',
      supplierNumber: 'GRO-SUP-005',
      emoji: '🛒',
      description: 'Packaged foods and dry goods',
      paymentTerms: 'Net 30',
      isActive: true
    }
  ],

  restaurant: [
    {
      name: 'Fresh Ingredients Supplier',
      supplierNumber: 'RES-SUP-001',
      emoji: '🥗',
      description: 'Fresh produce and ingredients',
      paymentTerms: 'Net 7',
      isActive: true
    },
    {
      name: 'Meat & Seafood Provider',
      supplierNumber: 'RES-SUP-002',
      emoji: '🍤',
      description: 'Premium meat and seafood',
      paymentTerms: 'Net 7',
      isActive: true
    },
    {
      name: 'Beverage Distributor',
      supplierNumber: 'RES-SUP-003',
      emoji: '🥤',
      description: 'Soft drinks, juices, and beverages',
      paymentTerms: 'Net 30',
      isActive: true
    },
    {
      name: 'Dry Goods & Spices',
      supplierNumber: 'RES-SUP-004',
      emoji: '🌶️',
      description: 'Rice, flour, spices, and dry ingredients',
      paymentTerms: 'Net 30',
      isActive: true
    },
    {
      name: 'Restaurant Supply Co',
      supplierNumber: 'RES-SUP-005',
      emoji: '🍽️',
      description: 'Kitchen equipment and supplies',
      paymentTerms: 'Net 45',
      isActive: true
    }
  ]
}

async function seedSuppliersForBusinessType(businessType, dryRun = false) {
  console.log(`\n🌱 Seeding suppliers for businessType: ${businessType}`)
  
  const templates = supplierDomainTemplates[businessType]
  if (!templates || templates.length === 0) {
    console.log(`  ⚠️  No templates defined for ${businessType}`)
    return { created: 0, skipped: 0 }
  }

  let created = 0
  let skipped = 0

  for (const template of templates) {
    // Check if supplier already exists
    const existing = await prisma.businessSuppliers.findFirst({
      where: {
        businessType: businessType,
        supplierNumber: template.supplierNumber
      }
    })

    if (existing) {
      console.log(`  ⏭️  Skipped: ${template.name} (already exists)`)
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would create: ${template.name}`)
      created++
    } else {
      // Create the supplier
      await prisma.businessSuppliers.create({
        data: {
          businessId: `${businessType}-template`, // Template marker
          supplierNumber: template.supplierNumber,
          name: template.name,
          emoji: template.emoji,
          contactPerson: null,
          email: null,
          phone: null,
          taxId: null,
          address: null,
          paymentTerms: template.paymentTerms,
          creditLimit: null,
          accountBalance: 0,
          notes: template.description,
          isActive: template.isActive,
          businessType: businessType,
          attributes: {},
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Created: ${template.name}`)
      created++
    }
  }

  console.log(`  📊 Summary: ${created} created, ${skipped} skipped`)
  return { created, skipped }
}

async function seedAllBusinessTypes(dryRun = false) {
  console.log('🌱 Seeding Supplier Domain Templates')
  console.log('=====================================\n')

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  const businessTypes = ['clothing', 'hardware', 'grocery', 'restaurant']
  const results = {}

  for (const businessType of businessTypes) {
    results[businessType] = await seedSuppliersForBusinessType(businessType, dryRun)
  }

  console.log('\n📊 Overall Summary:')
  console.log('===================')
  let totalCreated = 0
  let totalSkipped = 0

  for (const [type, result] of Object.entries(results)) {
    console.log(`  ${type}: ${result.created} created, ${result.skipped} skipped`)
    totalCreated += result.created
    totalSkipped += result.skipped
  }

  console.log(`\nTotal: ${totalCreated} created, ${totalSkipped} skipped`)
  
  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes')
  }
}

// Export for use in other scripts
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run')
  
  seedAllBusinessTypes(dryRun)
    .then(() => {
      console.log('\n✅ Done!')
      prisma.$disconnect()
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      prisma.$disconnect()
      process.exit(1)
    })
} else {
  module.exports = {
    supplierDomainTemplates,
    seedSuppliersForBusinessType,
    seedAllBusinessTypes
  }
}
