/**
 * Seed Predefined Flat Expense Categories
 *
 * This script adds common expense categories that don't require subcategories.
 * These are for simple one-off payments like contractors, utilities, etc.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Predefined flat categories (requiresSubcategory = false)
const FLAT_CATEGORIES = [
  {
    name: 'Contractor Services',
    emoji: '🔨',
    color: '#F59E0B',
    description: 'Payments to individual contractors, handymen, and service providers',
    requiresSubcategory: false,
    isDefault: true,
  },
  {
    name: 'Professional Fees',
    emoji: '💼',
    color: '#3B82F6',
    description: 'Lawyers, accountants, consultants, and other professional services',
    requiresSubcategory: false,
    isDefault: true,
  },
  {
    name: 'Utilities & Services',
    emoji: '⚡',
    color: '#10B981',
    description: 'Electricity, water, internet, phone, and other utility payments',
    requiresSubcategory: false,
    isDefault: true,
  },
  {
    name: 'Office Supplies',
    emoji: '📎',
    color: '#8B5CF6',
    description: 'General office supplies and materials',
    requiresSubcategory: false,
    isDefault: true,
  },
  {
    name: 'Maintenance & Repairs',
    emoji: '🔧',
    color: '#EF4444',
    description: 'Property maintenance, equipment repairs, and upkeep',
    requiresSubcategory: false,
    isDefault: true,
  },
  {
    name: 'Transportation',
    emoji: '🚗',
    color: '#06B6D4',
    description: 'Fuel, parking, tolls, and transportation costs',
    requiresSubcategory: false,
    isDefault: true,
  },
  {
    name: 'Insurance',
    emoji: '🛡️',
    color: '#14B8A6',
    description: 'Insurance premiums and related payments',
    requiresSubcategory: false,
    isDefault: true,
  },
  {
    name: 'Subscriptions',
    emoji: '📱',
    color: '#A855F7',
    description: 'Software subscriptions, memberships, and recurring services',
    requiresSubcategory: false,
    isDefault: true,
  },
  {
    name: 'Miscellaneous',
    emoji: '💰',
    color: '#6B7280',
    description: 'Other expenses that don\'t fit into specific categories',
    requiresSubcategory: false,
    isDefault: true,
  },
  {
    name: 'Salaries',
    emoji: '💵',
    color: '#059669',
    description: 'Employee salaries and wages',
    requiresSubcategory: false,
    isDefault: true,
  },
]

async function seedFlatCategories() {
  console.log('🌱 Seeding flat expense categories...\n')

  let created = 0
  let skipped = 0

  for (const category of FLAT_CATEGORIES) {
    try {
      // Check if category already exists (by name, domain-independent)
      const existing = await prisma.expenseCategories.findFirst({
        where: {
          name: category.name,
          domainId: null, // Global categories
        },
      })

      if (existing) {
        console.log(`⏭️  Skipping "${category.emoji} ${category.name}" - already exists`)

        // Update requiresSubcategory flag if it's different
        if (existing.requiresSubcategory !== category.requiresSubcategory) {
          await prisma.expenseCategories.update({
            where: { id: existing.id },
            data: { requiresSubcategory: category.requiresSubcategory },
          })
          console.log(`   ✅ Updated requiresSubcategory flag`)
        }

        skipped++
        continue
      }

      // Create new category
      const newCategory = await prisma.expenseCategories.create({
        data: {
          name: category.name,
          emoji: category.emoji,
          color: category.color,
          description: category.description,
          requiresSubcategory: category.requiresSubcategory,
          isDefault: category.isDefault,
          isUserCreated: false,
          domainId: null, // Global category
        },
      })

      console.log(`✅ Created "${category.emoji} ${category.name}"`)
      console.log(`   ID: ${newCategory.id}`)
      console.log(`   Requires Subcategory: ${newCategory.requiresSubcategory}`)
      console.log(`   Description: ${category.description}\n`)
      created++
    } catch (error) {
      console.error(`❌ Error creating "${category.name}":`, error.message)
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ⏭️  Skipped (already exists): ${skipped}`)
  console.log(`   📝 Total categories: ${FLAT_CATEGORIES.length}`)
}

async function main() {
  try {
    await seedFlatCategories()
    console.log('\n✅ Seeding completed successfully!')
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
