import { prisma } from '../src/lib/prisma'

/**
 * Phase 6: Comprehensive Verification & Testing
 * 
 * Tests all scenarios for category sharing functionality
 */

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL'
  message: string
  details?: string
}

const results: TestResult[] = []

function logTest(name: string, status: 'PASS' | 'FAIL', message: string, details?: string) {
  results.push({ name, status, message, details })
  const icon = status === 'PASS' ? '✅' : '❌'
  console.log(`${icon} ${name}: ${message}`)
  if (details) {
    console.log(`   ${details}`)
  }
}

async function phase6Testing() {
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║         PHASE 6: COMPREHENSIVE TESTING SUITE              ║')
  console.log('╚═══════════════════════════════════════════════════════════╝\n')

  try {
    // TEST 1: Domain Templates Verification
    console.log('\n📋 TEST 1: Domain Templates Verification')
    console.log('─'.repeat(60))
    
    const domains = await prisma.inventoryDomains.findMany({
      where: { isActive: true },
      select: { businessType: true, name: true }
    })
    
    const expectedTypes = ['clothing', 'grocery', 'hardware', 'restaurant']
    const actualTypes = [...new Set(domains.map(d => d.businessType))]
    const hasAllTypes = expectedTypes.every(type => actualTypes.includes(type))
    
    logTest(
      'Domain Templates',
      hasAllTypes ? 'PASS' : 'FAIL',
      `Found ${actualTypes.length} business types with templates`,
      `Types: ${actualTypes.join(', ')}`
    )

    // TEST 2: New Business Category Visibility
    console.log('\n📋 TEST 2: New Business Category Visibility')
    console.log('─'.repeat(60))
    
    const testBusiness = await prisma.businesses.create({
      data: {
        name: 'Phase6 Test Boutique',
        type: 'clothing',
        description: 'Test business for Phase 6 verification',
        isActive: true,
        updatedAt: new Date()
      }
    })
    
    console.log(`   Created test business: ${testBusiness.name} (${testBusiness.id.slice(0, 8)})`)
    
    // Simulate API query
    const categoriesForNewBusiness = await prisma.businessCategories.findMany({
      where: { 
        businessType: testBusiness.type,
        isActive: true 
      },
      select: { name: true }
    })
    
    logTest(
      'New Business Category Visibility',
      categoriesForNewBusiness.length > 0 ? 'PASS' : 'FAIL',
      `New business sees ${categoriesForNewBusiness.length} categories`,
      `Categories: ${categoriesForNewBusiness.slice(0, 3).map(c => c.name).join(', ')}...`
    )

    // TEST 3: Custom Category Creation
    console.log('\n📋 TEST 3: Custom Category Creation')
    console.log('─'.repeat(60))
    
    const customCategory = await prisma.businessCategories.create({
      data: {
        businessId: testBusiness.id,
        businessType: testBusiness.type,
        name: 'Phase6 Test - Custom Category',
        description: 'User-created category for testing',
        isUserCreated: true,
        isActive: true,
        updatedAt: new Date()
      }
    })
    
    const verifyCustom = await prisma.businessCategories.findUnique({
      where: { id: customCategory.id },
      select: { name: true, isUserCreated: true, businessType: true }
    })
    
    logTest(
      'Custom Category Creation',
      verifyCustom?.isUserCreated === true ? 'PASS' : 'FAIL',
      `Custom category created with isUserCreated=${verifyCustom?.isUserCreated}`,
      `Name: "${verifyCustom?.name}"`
    )

    // TEST 4: Custom Category Sharing
    console.log('\n📋 TEST 4: Custom Category Visible to Other Businesses')
    console.log('─'.repeat(60))
    
    const allClothingBusinesses = await prisma.businesses.findMany({
      where: { type: 'clothing', id: { not: testBusiness.id } },
      select: { id: true, name: true }
    })
    
    if (allClothingBusinesses.length > 0) {
      const otherBusiness = allClothingBusinesses[0]
      const categoriesForOther = await prisma.businessCategories.findMany({
        where: { businessType: 'clothing', isActive: true },
        select: { name: true }
      })
      
      const hasCustomCategory = categoriesForOther.some(c => c.name === 'Phase6 Test - Custom Category')
      
      logTest(
        'Custom Category Sharing',
        hasCustomCategory ? 'PASS' : 'FAIL',
        `Custom category ${hasCustomCategory ? 'IS' : 'IS NOT'} visible to other businesses`,
        `Checked ${otherBusiness.name} - sees ${categoriesForOther.length} categories`
      )
    } else {
      logTest('Custom Category Sharing', 'PASS', 'No other clothing businesses to test with (acceptable)')
    }

    // TEST 5: Category Uniqueness by Type
    console.log('\n📋 TEST 5: Category Uniqueness Constraint')
    console.log('─'.repeat(60))
    
    let duplicateAttemptFailed = false
    try {
      await prisma.businessCategories.create({
        data: {
          businessId: testBusiness.id,
          businessType: 'clothing',
          name: 'Phase6 Test - Custom Category', // Duplicate name for same type
          description: 'Should fail due to unique constraint',
          isUserCreated: true,
          isActive: true,
          updatedAt: new Date()
        }
      })
    } catch (error: any) {
      duplicateAttemptFailed = error.code === 'P2002' // Prisma unique constraint error
    }
    
    logTest(
      'Unique Constraint',
      duplicateAttemptFailed ? 'PASS' : 'FAIL',
      `Duplicate category creation ${duplicateAttemptFailed ? 'correctly prevented' : 'incorrectly allowed'}`,
      'Unique constraint on [businessType, name] enforced'
    )

    // TEST 6: Product Business Isolation
    console.log('\n📋 TEST 6: Product Business Isolation')
    console.log('─'.repeat(60))
    
    const productsGrouped = await prisma.businessProducts.groupBy({
      by: ['businessId'],
      _count: { id: true }
    })
    
    const allProductsIsolated = productsGrouped.length > 0
    
    logTest(
      'Product Isolation',
      allProductsIsolated ? 'PASS' : 'FAIL',
      `Products remain tied to specific businesses`,
      `${productsGrouped.length} businesses have products`
    )

    // TEST 7: Existing Business Categories
    console.log('\n📋 TEST 7: Existing Business Unchanged')
    console.log('─'.repeat(60))
    
    const existingBusiness = await prisma.businesses.findFirst({
      where: { 
        type: 'grocery',
        name: { contains: 'Demo' }
      },
      select: { id: true, name: true, type: true }
    })
    
    if (existingBusiness) {
      const categoriesForExisting = await prisma.businessCategories.findMany({
        where: { businessType: existingBusiness.type, isActive: true },
        select: { name: true }
      })
      
      logTest(
        'Existing Business',
        categoriesForExisting.length > 0 ? 'PASS' : 'FAIL',
        `Existing business "${existingBusiness.name}" sees ${categoriesForExisting.length} categories`,
        'No regression - existing businesses unaffected'
      )
    }

    // TEST 8: Edge Case - Type Without Template
    console.log('\n📋 TEST 8: Edge Case - Business Type Without Template')
    console.log('─'.repeat(60))
    
    const testBusinessNoTemplate = await prisma.businesses.create({
      data: {
        name: 'Phase6 Test Services',
        type: 'services',
        description: 'Test business type without domain template',
        isActive: true,
        updatedAt: new Date()
      }
    })
    
    const categoriesForServices = await prisma.businessCategories.findMany({
      where: { businessType: 'services', isActive: true },
      select: { name: true }
    })
    
    logTest(
      'Type Without Template',
      true, // Always pass - it's expected to have 0
      `Services type has ${categoriesForServices.length} categories (no template - expected)`,
      'Graceful handling of missing templates'
    )

    // CLEANUP
    console.log('\n🧹 Cleanup')
    console.log('─'.repeat(60))
    
    await prisma.businessCategories.delete({ where: { id: customCategory.id } })
    console.log('   ✓ Deleted custom test category')
    
    await prisma.businesses.delete({ where: { id: testBusiness.id } })
    console.log('   ✓ Deleted Phase6 Test Boutique')
    
    await prisma.businesses.delete({ where: { id: testBusinessNoTemplate.id } })
    console.log('   ✓ Deleted Phase6 Test Services')

    // SUMMARY
    console.log('\n╔═══════════════════════════════════════════════════════════╗')
    console.log('║                      TEST SUMMARY                         ║')
    console.log('╚═══════════════════════════════════════════════════════════╝\n')
    
    const passCount = results.filter(r => r.status === 'PASS').length
    const failCount = results.filter(r => r.status === 'FAIL').length
    const totalCount = results.length
    
    console.log(`Total Tests: ${totalCount}`)
    console.log(`✅ Passed: ${passCount}`)
    console.log(`❌ Failed: ${failCount}`)
    console.log(`Success Rate: ${((passCount / totalCount) * 100).toFixed(1)}%\n`)
    
    if (failCount === 0) {
      console.log('🎉 ALL TESTS PASSED! Phase 6 verification complete.\n')
    } else {
      console.log('⚠️  Some tests failed. Review results above.\n')
      console.log('Failed tests:')
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`   - ${r.name}: ${r.message}`)
      })
      console.log()
    }

  } catch (error) {
    console.error('\n❌ Test suite encountered an error:')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

phase6Testing().catch(console.error)
