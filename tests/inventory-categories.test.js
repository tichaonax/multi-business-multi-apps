/**
 * Integration test for inventory categories API
 * Tests the emoji-based categories and subcategories functionality
 */

const { PrismaClient } = require('@prisma/client');

describe('Inventory Categories Integration Tests', () => {
  let prisma;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  // Removed afterAll cleanup to avoid setImmediate issues in Jest

  test('Categories API returns categories with subcategories', async () => {
    const testBusinessId = 'clothing-demo-business'

    const categories = await prisma.businessCategories.findMany({
      where: {
        businessId: testBusinessId,
        isActive: true
      },
      include: {
        inventory_subcategories: {
          orderBy: [
            { displayOrder: 'asc' },
            { name: 'asc' }
          ]
        },
        _count: {
          select: {
            business_products: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Verify we have categories
    expect(categories.length).toBeGreaterThan(0)

    // Verify each category has required fields
    categories.forEach(category => {
      expect(category).toHaveProperty('id')
      expect(category).toHaveProperty('name')
      expect(category).toHaveProperty('businessId', testBusinessId)
      expect(category).toHaveProperty('emoji')
      expect(category).toHaveProperty('color')
      expect(category).toHaveProperty('isActive', true)
      expect(category).toHaveProperty('inventory_subcategories')
      expect(Array.isArray(category.inventory_subcategories)).toBe(true)
    })

    // Verify at least one category has subcategories
    const categoryWithSubcategories = categories.find(cat => cat.inventory_subcategories.length > 0)
    expect(categoryWithSubcategories).toBeDefined()

    // Verify subcategory structure
    const subcategories = categoryWithSubcategories.inventory_subcategories
    subcategories.forEach(sub => {
      expect(sub).toHaveProperty('id')
      expect(sub).toHaveProperty('name')
      expect(sub).toHaveProperty('categoryId', categoryWithSubcategories.id)
      expect(sub).toHaveProperty('displayOrder')
    })

    console.log(`✅ Found ${categories.length} categories with subcategories`)
  })

  test('Subcategories belong to correct categories', async () => {
    const testBusinessId = 'clothing-demo-business'

    const subcategories = await prisma.inventorySubcategories.findMany({
      where: {
        category: {
          businessId: testBusinessId
        }
      },
      include: {
        category: true
      }
    })

    // Verify subcategories exist
    expect(subcategories.length).toBeGreaterThan(0)

    // Verify each subcategory belongs to a category in the same business
    subcategories.forEach(sub => {
      expect(sub.category).toBeDefined()
      expect(sub.category.businessId).toBe(testBusinessId)
      expect(sub.categoryId).toBe(sub.category.id)
    })

    console.log(`✅ Verified ${subcategories.length} subcategories belong to correct categories`)
  })

  test('Category emoji and color fields are populated', async () => {
    const testBusinessId = 'clothing-demo-business'

    const categories = await prisma.businessCategories.findMany({
      where: {
        businessId: testBusinessId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        emoji: true,
        color: true
      }
    })

    categories.forEach(category => {
      expect(category.emoji).toBeDefined()
      expect(typeof category.emoji).toBe('string')
      expect(category.emoji.length).toBeGreaterThan(0)

      expect(category.color).toBeDefined()
      expect(typeof category.color).toBe('string')
      expect(category.color.length).toBeGreaterThan(0)
    })

    console.log(`✅ Verified emoji and color fields for ${categories.length} categories`)
  })

  test('Business type filtering works correctly', async () => {
    const testBusinessId = 'clothing-demo-business'

    const categories = await prisma.businessCategories.findMany({
      where: {
        businessId: testBusinessId
      },
      select: {
        businessType: true
      }
    })

    // All categories should have the same business type as their business
    const business = await prisma.businesses.findUnique({
      where: { id: testBusinessId },
      select: { type: true }
    })

    expect(business).toBeDefined()
    expect(business.type).toBe('clothing')

    categories.forEach(category => {
      expect(category.businessType).toBe('clothing')
    })

    console.log(`✅ Verified business type filtering for ${categories.length} categories`)
  })
})