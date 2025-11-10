const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCategories() {
  try {
    console.log('\n=== All Categories by Business Type ===\n')

    // Get all categories grouped by businessType
    const allCategories = await prisma.businessCategories.findMany({
      orderBy: [
        { businessType: 'asc' },
        { displayOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        }
      }
    })

    // Group by business type
    const grouped = {}
    allCategories.forEach(cat => {
      const type = cat.businessType || 'unknown'
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(cat)
    })

    // Display grouped results
    for (const [type, categories] of Object.entries(grouped)) {
      console.log(`\n📂 ${type.toUpperCase()} (${categories.length} categories)`)
      console.log('─'.repeat(60))

      categories.forEach(cat => {
        const status = cat.isActive ? '✓' : '✗'
        const emoji = cat.emoji || '  '
        const business = cat.businesses?.name || 'No business'
        console.log(`  ${status} ${emoji} ${cat.name} (${cat.id})`)
        console.log(`     └─ Business: ${business} (${cat.businessId})`)
      })
    }

    // Check for expense-related categories specifically
    console.log('\n\n=== Expense-Related Categories ===\n')
    const expenseCategories = await prisma.businessCategories.findMany({
      where: {
        OR: [
          { name: { contains: 'expense', mode: 'insensitive' } },
          { name: { contains: 'cost', mode: 'insensitive' } },
          { businessType: { contains: 'expense', mode: 'insensitive' } }
        ]
      }
    })

    if (expenseCategories.length === 0) {
      console.log('❌ No expense-related categories found!')
    } else {
      expenseCategories.forEach(cat => {
        const status = cat.isActive ? '✓ Active' : '✗ Inactive'
        console.log(`  ${status}: ${cat.name} (${cat.businessType})`)
      })
    }

    // Summary by business
    console.log('\n\n=== Categories by Business ===\n')
    const businesses = await prisma.businesses.findMany({
      include: {
        business_categories: {
          where: { isActive: true }
        }
      }
    })

    businesses.forEach(business => {
      console.log(`\n${business.name} (${business.type})`)
      console.log(`  └─ ${business.business_categories.length} active categories`)
      if (business.business_categories.length > 0) {
        business.business_categories.slice(0, 5).forEach(cat => {
          console.log(`     • ${cat.emoji || ''}${cat.name}`)
        })
        if (business.business_categories.length > 5) {
          console.log(`     ... and ${business.business_categories.length - 5} more`)
        }
      }
    })

    console.log('\n')

  } catch (error) {
    console.error('Error checking categories:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCategories()
