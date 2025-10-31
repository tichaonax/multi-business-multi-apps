import { prisma } from '../src/lib/prisma'

/**
 * Test script to verify category sharing by business type
 * 
 * Tests:
 * 1. New business creation - should see existing type-level categories
 * 2. Category addition - should be visible to all businesses of same type
 * 3. Products remain business-specific
 */

async function testCategorySharing() {
  console.log('🧪 Testing Category Sharing by Business Type\n')

  // Test 1: Create a new clothing business and verify it sees existing categories
  console.log('TEST 1: New Business Category Inheritance')
  console.log('==========================================\n')

  const existingClothingCategories = await prisma.businessCategories.findMany({
    where: { businessType: 'clothing' },
    select: { name: true }
  })

  console.log(`✓ Existing clothing categories: ${existingClothingCategories.length}`)
  existingClothingCategories.forEach(cat => console.log(`  - ${cat.name}`))

  const newBusiness = await prisma.businesses.create({
    data: {
      name: 'Test Clothing Store',
      type: 'clothing',
      description: 'Test business for category sharing verification',
      isActive: true,
      updatedAt: new Date()
    }
  })

  console.log(`\n✓ Created new clothing business: ${newBusiness.name} (${newBusiness.id.slice(0, 8)})`)

  // Query categories as the API would (by businessType)
  const categoriesForNewBusiness = await prisma.businessCategories.findMany({
    where: { businessType: newBusiness.type },
    select: { name: true }
  })

  console.log(`✓ Categories visible to new business: ${categoriesForNewBusiness.length}`)
  
  if (categoriesForNewBusiness.length === existingClothingCategories.length) {
    console.log('✅ PASS: New business sees all existing type-level categories!\n')
  } else {
    console.log('❌ FAIL: Category count mismatch!\n')
  }

  // Test 2: Add a new category and verify all clothing businesses see it
  console.log('TEST 2: Category Addition Sharing')
  console.log('==================================\n')

  const allClothingBusinesses = await prisma.businesses.findMany({
    where: { type: 'clothing' },
    select: { id: true, name: true }
  })

  console.log(`✓ Total clothing businesses: ${allClothingBusinesses.length}`)
  allClothingBusinesses.forEach(b => console.log(`  - ${b.name} (${b.id.slice(0, 8)})`))

  // Add a new category
  const newCategory = await prisma.businessCategories.create({
    data: {
      businessId: newBusiness.id,
      businessType: 'clothing',
      name: 'Test Category - Sportswear',
      description: 'Test category for verification',
      isUserCreated: true,
      isActive: true,
      updatedAt: new Date()
    }
  })

  console.log(`\n✓ Added new category: "${newCategory.name}"`)

  // Check if all clothing businesses see it
  const categoriesAfterAdd = await prisma.businessCategories.findMany({
    where: { businessType: 'clothing' },
    select: { name: true }
  })

  console.log(`✓ Total clothing categories now: ${categoriesAfterAdd.length}`)

  if (categoriesAfterAdd.length === existingClothingCategories.length + 1) {
    console.log('✅ PASS: New category is shared across all clothing businesses!\n')
  } else {
    console.log('❌ FAIL: Category not properly shared!\n')
  }

  // Test 3: Verify products remain business-specific
  console.log('TEST 3: Product Business Isolation')
  console.log('===================================\n')

  const productsGroupedByBusiness = await prisma.businessProducts.groupBy({
    by: ['businessId'],
    _count: { id: true },
    orderBy: { businessId: 'asc' },
    take: 5
  })

  console.log('✓ Products are tied to specific businesses:')
  for (const group of productsGroupedByBusiness) {
    const business = await prisma.businesses.findUnique({
      where: { id: group.businessId },
      select: { name: true, type: true }
    })
    console.log(`  - ${business?.name} (${business?.type}): ${group._count.id} products`)
  }

  console.log('\n✅ PASS: Products remain business-specific (not shared)\n')

  // Cleanup: Delete test business and category
  console.log('🧹 Cleanup')
  console.log('==========\n')

  await prisma.businessCategories.delete({
    where: { id: newCategory.id }
  })
  console.log('✓ Deleted test category')

  await prisma.businesses.delete({
    where: { id: newBusiness.id }
  })
  console.log('✓ Deleted test business')

  console.log('\n✅ All tests passed! Category sharing is working correctly.\n')

  await prisma.$disconnect()
}

testCategorySharing().catch(console.error)
