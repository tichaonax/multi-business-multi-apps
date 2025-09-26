/**
 * Seed Business Categories
 * Creates business categories for the multi-business platform
 */

const { PrismaClient } = require('@prisma/client')

async function seedBusinessCategories() {
  const prisma = new PrismaClient()

  try {
    console.log('🌱 Seeding business categories...')

    const categories = [
      {
        name: 'Construction',
        description: 'Construction and building services',
        code: 'CONSTRUCTION',
        isActive: true
      },
      {
        name: 'Restaurant',
        description: 'Food service and restaurant business',
        code: 'RESTAURANT',
        isActive: true
      },
      {
        name: 'Grocery',
        description: 'Grocery and retail food sales',
        code: 'GROCERY',
        isActive: true
      },
      {
        name: 'Clothing',
        description: 'Clothing and fashion retail',
        code: 'CLOTHING',
        isActive: true
      },
      {
        name: 'Hardware',
        description: 'Hardware and tools retail',
        code: 'HARDWARE',
        isActive: true
      },
      {
        name: 'Personal Services',
        description: 'Personal services and consulting',
        code: 'PERSONAL',
        isActive: true
      },
      {
        name: 'Professional Services',
        description: 'Professional consulting and services',
        code: 'PROFESSIONAL',
        isActive: true
      },
      {
        name: 'Healthcare',
        description: 'Healthcare and medical services',
        code: 'HEALTHCARE',
        isActive: true
      },
      {
        name: 'Education',
        description: 'Education and training services',
        code: 'EDUCATION',
        isActive: true
      },
      {
        name: 'Technology',
        description: 'Technology and IT services',
        code: 'TECHNOLOGY',
        isActive: true
      }
    ]

    // BusinessCategory has a unique constraint on [businessId, name].
    // Seed into a default system/business context. If no business exists, create a default one.
    let defaultBusiness = await prisma.business.findFirst({ where: { name: 'Default Business' } })
    if (!defaultBusiness) {
      defaultBusiness = await prisma.business.create({
        data: {
          id: require('crypto').randomUUID(),
          name: 'Default Business',
          type: 'system',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('ℹ️  Created default business for seeding:', defaultBusiness.id)
    }

    for (const category of categories) {
      // Try to find by natural key (businessId + name)
      const existing = await prisma.businessCategory.findFirst({ where: { businessId: defaultBusiness.id, name: category.name } })
      if (existing) {
        await prisma.businessCategory.update({
          where: { id: existing.id },
          data: { ...category, updatedAt: new Date() }
        })
      } else {
        await prisma.businessCategory.create({
          data: {
            id: require('crypto').randomUUID(),
            businessId: defaultBusiness.id,
            // businessType is required by schema; default to the business.type or 'general'
            businessType: defaultBusiness.type || 'general',
            ...category,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      }
    }

    console.log(`✅ Seeded ${categories.length} business categories`)

  } catch (error) {
    console.error('❌ Error seeding business categories:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seedBusinessCategories()
}

module.exports = { seedBusinessCategories }