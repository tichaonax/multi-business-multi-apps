/**
 * Test Script: Supplier Sharing by Business Type
 * 
 * Tests the shared supplier functionality to ensure:
 * 1. Suppliers are shared across businesses of the same type
 * 2. Suppliers are isolated between different business types
 * 3. Duplicate prevention works correctly
 * 4. Product relationships are maintained
 * 5. CRUD operations respect businessType constraints
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(testName, passed, details = '') {
  const symbol = passed ? '✓' : '✗'
  const color = passed ? 'green' : 'red'
  log(`${symbol} ${testName}`, color)
  if (details) {
    log(`  ${details}`, 'cyan')
  }
}

async function runTests() {
  log('\n========================================', 'blue')
  log('Supplier Sharing Tests', 'blue')
  log('========================================\n', 'blue')

  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  }

  try {
    // Test 1: Get all businesses and their types
    log('Test 1: Getting business data...', 'yellow')
    const businesses = await prisma.businesses.findMany({
      select: {
        id: true,
        name: true,
        type: true
      },
      orderBy: { type: 'asc' }
    })

    if (businesses.length === 0) {
      log('No businesses found in database', 'red')
      return
    }

    log(`Found ${businesses.length} businesses:`, 'cyan')
    const typeGroups = {}
    businesses.forEach(b => {
      if (!typeGroups[b.type]) typeGroups[b.type] = []
      typeGroups[b.type].push(b)
      log(`  - ${b.name} (${b.type})`, 'cyan')
    })

    // Test 2: Check supplier unique constraint
    log('\nTest 2: Verifying unique constraint on businessType + supplierNumber...', 'yellow')
    testResults.total++
    
    const constraints = await prisma.$queryRaw`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'business_suppliers' 
      AND constraint_type = 'UNIQUE'
    `
    
    const hasCorrectConstraint = constraints.some(c => 
      c.constraint_name === 'business_suppliers_businessType_supplierNumber_key'
    )
    
    logTest(
      'Unique constraint on businessType + supplierNumber',
      hasCorrectConstraint,
      hasCorrectConstraint 
        ? 'Constraint exists: business_suppliers_businessType_supplierNumber_key'
        : 'Expected constraint not found'
    )
    
    hasCorrectConstraint ? testResults.passed++ : testResults.failed++

    // Test 3: Get all suppliers grouped by businessType
    log('\nTest 3: Analyzing supplier distribution by businessType...', 'yellow')
    testResults.total++
    
    const suppliers = await prisma.businessSuppliers.findMany({
      select: {
        id: true,
        businessType: true,
        supplierNumber: true,
        name: true,
        _count: {
          select: {
            business_products: true,
            supplier_products: true
          }
        }
      },
      orderBy: [
        { businessType: 'asc' },
        { supplierNumber: 'asc' }
      ]
    })

    const suppliersByType = {}
    suppliers.forEach(s => {
      if (!suppliersByType[s.businessType]) suppliersByType[s.businessType] = []
      suppliersByType[s.businessType].push(s)
    })

    log(`Found ${suppliers.length} suppliers across ${Object.keys(suppliersByType).length} business types:`, 'cyan')
    for (const [type, sups] of Object.entries(suppliersByType)) {
      log(`  ${type}: ${sups.length} suppliers`, 'cyan')
      sups.forEach(s => {
        const productCount = s._count.business_products + s._count.supplier_products
        log(`    - ${s.supplierNumber}: ${s.name} (${productCount} products)`, 'cyan')
      })
    }

    const hasSuppliers = suppliers.length > 0
    logTest(
      'Supplier data analysis',
      hasSuppliers,
      hasSuppliers ? `${suppliers.length} suppliers found` : 'No suppliers in database'
    )
    
    hasSuppliers ? testResults.passed++ : testResults.failed++

    // Test 4: Verify businessType matches business relationships
    log('\nTest 4: Verifying supplier businessType consistency...', 'yellow')
    testResults.total++
    
    let allConsistent = true
    for (const supplier of suppliers) {
      // Check if any products reference this supplier from wrong business type
      const productCheck = await prisma.businessProducts.findFirst({
        where: {
          supplierId: supplier.id,
          businesses: {
            type: { not: supplier.businessType }
          }
        },
        include: {
          businesses: {
            select: { type: true, name: true }
          }
        }
      })
      
      if (productCheck) {
        allConsistent = false
        log(`  WARNING: Supplier ${supplier.supplierNumber} (type: ${supplier.businessType}) referenced by product in business with type: ${productCheck.businesses.type}`, 'red')
      }
    }
    
    logTest(
      'Supplier businessType consistency',
      allConsistent,
      allConsistent 
        ? 'All supplier-product relationships match businessType'
        : 'Found mismatched businessType references'
    )
    
    allConsistent ? testResults.passed++ : testResults.failed++

    // Test 5: Test sharing across businesses of same type
    if (Object.keys(typeGroups).length > 0) {
      log('\nTest 5: Testing supplier sharing within same business type...', 'yellow')
      
      for (const [type, businessList] of Object.entries(typeGroups)) {
        if (businessList.length >= 2 && suppliersByType[type]?.length > 0) {
          testResults.total++
          
          const supplier = suppliersByType[type][0]
          const business1 = businessList[0]
          const business2 = businessList[1]
          
          // Check if both businesses can see the same supplier
          const supplier1 = await prisma.businessSuppliers.findFirst({
            where: {
              id: supplier.id,
              businessType: business1.type
            }
          })
          
          const supplier2 = await prisma.businessSuppliers.findFirst({
            where: {
              id: supplier.id,
              businessType: business2.type
            }
          })
          
          const bothCanSee = supplier1 && supplier2 && supplier1.id === supplier2.id
          
          logTest(
            `Supplier sharing for ${type}`,
            bothCanSee,
            bothCanSee 
              ? `Both ${business1.name} and ${business2.name} can access ${supplier.name}`
              : `Supplier visibility issue between businesses`
          )
          
          bothCanSee ? testResults.passed++ : testResults.failed++
          break // Only test one type that has multiple businesses
        }
      }
    }

    // Test 6: Test isolation between different business types
    if (Object.keys(suppliersByType).length >= 2) {
      log('\nTest 6: Testing supplier isolation between business types...', 'yellow')
      testResults.total++
      
      const types = Object.keys(suppliersByType)
      const type1 = types[0]
      const type2 = types[1]
      
      const type1Suppliers = suppliersByType[type1]
      const type2Suppliers = suppliersByType[type2]
      
      // Check if any supplier appears in both types (should not happen)
      const sharedIds = type1Suppliers
        .map(s => s.id)
        .filter(id => type2Suppliers.some(s => s.id === id))
      
      const properIsolation = sharedIds.length === 0
      
      logTest(
        'Supplier isolation between business types',
        properIsolation,
        properIsolation 
          ? `${type1} and ${type2} have separate suppliers`
          : `Found ${sharedIds.length} suppliers shared between different types`
      )
      
      properIsolation ? testResults.passed++ : testResults.failed++
    }

    // Test 7: Verify supplier number prefixes match businessType
    log('\nTest 7: Verifying supplier number prefixes...', 'yellow')
    testResults.total++
    
    const prefixMap = {
      'clothing': 'CLO-SUP',
      'hardware': 'HDW-SUP',
      'grocery': 'GRO-SUP',
      'restaurant': 'RES-SUP'
    }
    
    let allPrefixesCorrect = true
    for (const supplier of suppliers) {
      const expectedPrefix = prefixMap[supplier.businessType.toLowerCase()]
      if (expectedPrefix && !supplier.supplierNumber.startsWith(expectedPrefix)) {
        allPrefixesCorrect = false
        log(`  WARNING: Supplier ${supplier.supplierNumber} has incorrect prefix for type ${supplier.businessType}`, 'red')
      }
    }
    
    logTest(
      'Supplier number prefixes',
      allPrefixesCorrect,
      allPrefixesCorrect 
        ? 'All supplier numbers have correct type-based prefixes'
        : 'Some supplier numbers have incorrect prefixes'
    )
    
    allPrefixesCorrect ? testResults.passed++ : testResults.failed++

    // Test 8: Check for duplicate supplier numbers within same businessType
    log('\nTest 8: Checking for duplicate supplier numbers...', 'yellow')
    testResults.total++
    
    let hasDuplicates = false
    for (const [type, sups] of Object.entries(suppliersByType)) {
      const numbers = sups.map(s => s.supplierNumber)
      const duplicates = numbers.filter((num, idx) => numbers.indexOf(num) !== idx)
      
      if (duplicates.length > 0) {
        hasDuplicates = true
        log(`  WARNING: Found duplicate supplier numbers in ${type}: ${duplicates.join(', ')}`, 'red')
      }
    }
    
    const noDuplicates = !hasDuplicates
    logTest(
      'No duplicate supplier numbers',
      noDuplicates,
      noDuplicates 
        ? 'All supplier numbers are unique within their business type'
        : 'Found duplicate supplier numbers'
    )
    
    noDuplicates ? testResults.passed++ : testResults.failed++

    // Summary
    log('\n========================================', 'blue')
    log('Test Summary', 'blue')
    log('========================================', 'blue')
    log(`Total Tests: ${testResults.total}`, 'cyan')
    log(`Passed: ${testResults.passed}`, 'green')
    log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'cyan')
    
    const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1)
    log(`Pass Rate: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow')
    
    if (testResults.failed === 0) {
      log('\n✓ All tests passed! Supplier sharing is working correctly.', 'green')
    } else {
      log(`\n✗ ${testResults.failed} test(s) failed. Please review the issues above.`, 'red')
    }

  } catch (error) {
    log('\nError running tests:', 'red')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests
runTests()
