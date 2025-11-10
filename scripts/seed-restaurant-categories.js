/**
 * Seed Default Restaurant Categories
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const defaultCategories = [
  { name: 'Appetizers', emoji: '🥟', color: '#FF6B6B', displayOrder: 1 },
  { name: 'Main Courses', emoji: '🍽️', color: '#4ECDC4', displayOrder: 2 },
  { name: 'Sides', emoji: '🍟', color: '#FFE66D', displayOrder: 3 },
  { name: 'Salads', emoji: '🥗', color: '#95E1D3', displayOrder: 4 },
  { name: 'Soups', emoji: '🍲', color: '#F38181', displayOrder: 5 },
  { name: 'Desserts', emoji: '🍰', color: '#AA96DA', displayOrder: 6 },
  { name: 'Beverages', emoji: '🥤', color: '#FCBAD3', displayOrder: 7 },
  { name: 'Breakfast', emoji: '🍳', color: '#FFA07A', displayOrder: 8 },
  { name: 'Lunch', emoji: '🌮', color: '#98D8C8', displayOrder: 9 },
  { name: 'Dinner', emoji: '🍖', color: '#C7CEEA', displayOrder: 10 },
  { name: 'Seafood', emoji: '🦐', color: '#85E3FF', displayOrder: 11 },
  { name: 'Vegetarian', emoji: '🥬', color: '#B4F8C8', displayOrder: 12 },
  { name: 'Vegan', emoji: '🌱', color: '#A0E7E5', displayOrder: 13 },
  { name: 'Specials', emoji: '⭐', color: '#FFD93D', displayOrder: 14 }
]

async function seedCategories() {
  console.log('🌱 Seeding Restaurant Categories')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    const businessId = 'restaurant-demo'

    // Check if business exists
    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    })

    if (!business) {
      console.log('❌ Business "restaurant-demo" not found')
      console.log('   Creating business first...\n')

      await prisma.businesses.create({
        data: {
          id: businessId,
          name: 'Restaurant [Demo]',
          type: 'restaurant',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('✅ Created restaurant-demo business\n')
    }

    // Check existing categories
    const existing = await prisma.businessCategories.findMany({
      where: { businessId, isActive: true }
    })

    if (existing.length > 0) {
      console.log(`⚠️  Found ${existing.length} existing categories`)
      console.log('   Skipping seed to avoid duplicates\n')
      existing.forEach(cat => {
        console.log(`   - ${cat.emoji || '❓'} ${cat.name}`)
      })
      return
    }

    console.log('📝 Creating default categories...\n')

    let created = 0
    for (const category of defaultCategories) {
      try {
        await prisma.businessCategories.create({
          data: {
            businessId,
            name: category.name,
            emoji: category.emoji,
            color: category.color,
            displayOrder: category.displayOrder,
            businessType: 'restaurant',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`✅ Created: ${category.emoji} ${category.name}`)
        created++
      } catch (error) {
        console.log(`❌ Failed to create ${category.name}: ${error.message}`)
      }
    }

    console.log('\n═══════════════════════════════════════════════════')
    console.log(`✅ Successfully created ${created} categories!\n`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

seedCategories()
