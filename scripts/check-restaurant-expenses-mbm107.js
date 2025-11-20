const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkRestaurantExpenses() {
  try {
    console.log('🍽️  Checking Restaurant Expense Categories...\n')

    // Get Restaurant domain
    const restaurantDomain = await prisma.expenseDomains.findFirst({
      where: { name: 'Restaurant' }
    })

    if (!restaurantDomain) {
      console.log('❌ Restaurant domain not found')
      return
    }

    console.log(`✅ Found domain: ${restaurantDomain.emoji} ${restaurantDomain.name}`)
    console.log(`   Description: ${restaurantDomain.description}\n`)

    // Get all categories for Restaurant domain
    const categories = await prisma.expenseCategories.findMany({
      where: { domainId: restaurantDomain.id },
      include: {
        expense_subcategories: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    })

    console.log(`📂 Found ${categories.length} categories:\n`)

    let totalSubcategories = 0

    for (const category of categories) {
      console.log(`${category.emoji} ${category.name}`)
      console.log(`   Subcategories: ${category.expense_subcategories.length}`)

      // Show first 3 subcategories as examples
      const examples = category.expense_subcategories.slice(0, 3)
      examples.forEach(sub => {
        console.log(`      - ${sub.emoji} ${sub.name}`)
      })

      if (category.expense_subcategories.length > 3) {
        console.log(`      ... and ${category.expense_subcategories.length - 3} more`)
      }

      console.log('')
      totalSubcategories += category.expense_subcategories.length
    }

    console.log('═'.repeat(60))
    console.log('📊 Summary:')
    console.log(`   Total Categories: ${categories.length}`)
    console.log(`   Total Subcategories: ${totalSubcategories}`)
    console.log('═'.repeat(60))

    // Verify specific items from requirements
    console.log('\n✅ Verification of Key Items:')

    const keyItems = [
      'Greens',
      'Beef',
      'Internet',
      'Rent',
      'Transfer Out',
      'Utensils',
      'Miscellaneous'
    ]

    for (const itemName of keyItems) {
      const found = await prisma.expenseSubcategories.findFirst({
        where: {
          name: itemName,
          category: {
            domainId: restaurantDomain.id
          }
        },
        include: {
          category: true
        }
      })

      if (found) {
        console.log(`   ✅ ${found.emoji} ${found.name} (${found.category.name})`)
      } else {
        console.log(`   ❌ ${itemName} not found`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkRestaurantExpenses()
