/**
 * Seed Personal Expense Categories
 *
 * Adds personal-oriented flat expense categories (domainId: null).
 * Skips any category whose name already exists globally — safe to re-run.
 *
 * Source: New-Ideas.md personal categories list
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const PERSONAL_CATEGORIES = [
  { id: 'cat-personal-rent',          name: 'Rent',           emoji: '🏡', color: '#3B82F6', description: 'Rent and housing payments' },
  { id: 'cat-personal-grocery',       name: 'Grocery',        emoji: '🥝', color: '#10B981', description: 'Grocery shopping and food supplies' },
  { id: 'cat-personal-dining',        name: 'Dining',         emoji: '🍔', color: '#F59E0B', description: 'Restaurants, takeaways, and dining out' },
  { id: 'cat-personal-shopping',      name: 'Shopping',       emoji: '🛍️', color: '#8B5CF6', description: 'General shopping and retail purchases' },
  { id: 'cat-personal-loan',          name: 'Loan',           emoji: '💳', color: '#EF4444', description: 'Loan repayments and debt obligations' },
  { id: 'cat-personal-pet',           name: 'Pet',            emoji: '🐶', color: '#F97316', description: 'Pet food, vet, grooming, and pet supplies' },
  { id: 'cat-personal-utility',       name: 'Utility',        emoji: '⚡', color: '#FBBF24', description: 'Electricity, water, gas, and other utility bills' },
  { id: 'cat-personal-personal',      name: 'Personal',       emoji: '💫', color: '#6366F1', description: 'Personal miscellaneous expenses' },
  { id: 'cat-personal-phone',         name: 'Phone',          emoji: '📞', color: '#14B8A6', description: 'Mobile phone bills and airtime' },
  { id: 'cat-personal-gym',           name: 'Gym',            emoji: '💪', color: '#22C55E', description: 'Gym membership and fitness costs' },
  { id: 'cat-personal-wellness',      name: 'Wellness',       emoji: '🧘‍♂️', color: '#A3E635', description: 'Wellness, mental health, and self-care' },
  { id: 'cat-personal-travel',        name: 'Travel',         emoji: '✈️', color: '#0EA5E9', description: 'Travel, flights, accommodation, and trips' },
  { id: 'cat-personal-home',          name: 'Home',           emoji: '🏠', color: '#84CC16', description: 'Home goods, furnishings, and household items' },
  { id: 'cat-personal-medical',       name: 'Medical',        emoji: '👩‍⚕️', color: '#EC4899', description: 'Medical bills, prescriptions, and health costs' },
  { id: 'cat-personal-giving',        name: 'Giving',         emoji: '🎗️', color: '#F472B6', description: 'Charitable giving, tithes, and donations' },
  { id: 'cat-personal-interest',      name: 'Interest',       emoji: '💵', color: '#78716C', description: 'Interest charges on loans or credit' },
  { id: 'cat-personal-other',         name: 'Other',          emoji: '🙉', color: '#6B7280', description: 'Other personal expenses not listed above' },
]

// These already exist under the same name — skip to avoid duplicates
const SKIP_NAMES = new Set(['Transportation', 'Insurance', 'Entertainment'])

async function seed() {
  console.log('🌱 Seeding personal expense categories...\n')

  let created = 0
  let skipped = 0

  for (const cat of PERSONAL_CATEGORIES) {
    if (SKIP_NAMES.has(cat.name)) {
      console.log(`⏭️  "${cat.emoji} ${cat.name}" — covered by existing category`)
      skipped++
      continue
    }

    const existing = await prisma.expenseCategories.findFirst({
      where: { name: cat.name, domainId: null },
    })

    if (existing) {
      console.log(`⏭️  "${cat.emoji} ${cat.name}" — already exists (${existing.id})`)
      skipped++
      continue
    }

    const created_ = await prisma.expenseCategories.create({
      data: {
        id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        color: cat.color,
        description: cat.description,
        requiresSubcategory: false,
        isDefault: true,
        isUserCreated: false,
        domainId: null,
      },
    })
    console.log(`✅ Created "${cat.emoji} ${cat.name}" (${created_.id})`)
    created++
  }

  console.log('\n─'.repeat(50))
  console.log(`Created: ${created}   Skipped: ${skipped}   Total: ${PERSONAL_CATEGORIES.length}`)
  console.log('✅ Done.\n')
}

seed()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
