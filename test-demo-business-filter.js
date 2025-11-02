// Test script for demo business sync filtering
// This script verifies that demo business events are properly filtered from sync

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Demo business ID patterns to test
const TEST_IDS = [
  { id: 'clothing-demo-business', expected: true, description: 'Standard demo business' },
  { id: 'hardware-demo-business', expected: true, description: 'Hardware demo' },
  { id: 'grocery-demo-business', expected: true, description: 'Grocery demo' },
  { id: 'restaurant-demo', expected: true, description: 'Restaurant demo (short form)' },
  { id: 'demo-test-business', expected: true, description: 'Demo prefix' },
  { id: 'demo', expected: true, description: 'Just demo' },
  { id: 'real-business-123', expected: false, description: 'Real business' },
  { id: 'my-clothing-store', expected: false, description: 'Real clothing store' },
  { id: 'acme-corporation', expected: false, description: 'Regular business' }
]

/**
 * Check if a business ID matches demo patterns
 */
function isDemoBusinessId(businessId) {
  if (!businessId || typeof businessId !== 'string') {
    return false
  }

  const lowerBusinessId = businessId.toLowerCase()

  return lowerBusinessId.includes('-demo-business') ||
         lowerBusinessId.endsWith('-demo') ||
         lowerBusinessId.startsWith('demo-') ||
         lowerBusinessId === 'demo'
}

/**
 * Test the filtering logic
 */
function testFiltering() {
  console.log('🧪 Testing Demo Business ID Filtering\n')
  console.log('─'.repeat(70))

  let passed = 0
  let failed = 0

  for (const test of TEST_IDS) {
    const result = isDemoBusinessId(test.id)
    const status = result === test.expected ? '✅' : '❌'
    const outcome = result === test.expected ? 'PASS' : 'FAIL'

    console.log(`${status} ${outcome} | ID: "${test.id}"`)
    console.log(`   ${test.description}`)
    console.log(`   Expected: ${test.expected ? 'DEMO' : 'REAL'}, Got: ${result ? 'DEMO' : 'REAL'}\n`)

    if (result === test.expected) {
      passed++
    } else {
      failed++
    }
  }

  console.log('─'.repeat(70))
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`)

  return failed === 0
}

/**
 * Check actual sync events in database
 */
async function checkSyncEvents() {
  console.log('🔍 Checking Sync Events in Database\n')
  console.log('─'.repeat(70))

  try {
    // Get count of all sync events
    const totalEvents = await prisma.syncEvents.count()
    console.log(`Total sync events: ${totalEvents}`)

    if (totalEvents === 0) {
      console.log('ℹ️  No sync events found in database\n')
      return
    }

    // Get sample of recent events
    const recentEvents = await prisma.syncEvents.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        eventId: true,
        tableName: true,
        recordId: true,
        changeData: true,
        processed: true,
        createdAt: true
      }
    })

    console.log(`\nRecent sync events (last 10):\n`)

    for (const event of recentEvents) {
      const businessId = event.tableName === 'businesses' 
        ? event.recordId 
        : event.changeData?.businessId || event.changeData?.business_id || 'N/A'
      
      const isDemo = typeof businessId === 'string' ? isDemoBusinessId(businessId) : false
      const demoFlag = isDemo ? '🚫 DEMO' : '✅ REAL'

      console.log(`  ${demoFlag} | Table: ${event.tableName}`)
      console.log(`     Business ID: ${businessId}`)
      console.log(`     Event ID: ${event.eventId.substring(0, 8)}...`)
      console.log(`     Processed: ${event.processed}`)
      console.log(`     Created: ${event.createdAt.toISOString()}`)
      console.log()
    }

    // Count events by demo vs real
    let demoCount = 0
    let realCount = 0

    for (const event of recentEvents) {
      const businessId = event.tableName === 'businesses' 
        ? event.recordId 
        : event.changeData?.businessId || event.changeData?.business_id

      if (typeof businessId === 'string' && isDemoBusinessId(businessId)) {
        demoCount++
      } else if (businessId !== 'N/A' && businessId !== null) {
        realCount++
      }
    }

    console.log('─'.repeat(70))
    console.log(`\n📊 Recent Events Breakdown:`)
    console.log(`   Demo business events: ${demoCount}`)
    console.log(`   Real business events: ${realCount}`)
    console.log(`   Other/Unknown: ${recentEvents.length - demoCount - realCount}\n`)

    if (demoCount > 0) {
      console.log('⚠️  WARNING: Demo business events detected in sync queue!')
      console.log('   These will be filtered out and NOT synced to other nodes.\n')
    }

  } catch (error) {
    console.error('❌ Error checking sync events:', error.message)
  }
}

/**
 * Check for demo businesses in the database
 */
async function checkDemoBusinesses() {
  console.log('🏢 Checking Demo Businesses in Database\n')
  console.log('─'.repeat(70))

  try {
    // Find all businesses
    const businesses = await prisma.businesses.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true
      }
    })

    console.log(`Total businesses found: ${businesses.length}\n`)

    const demoBusinesses = businesses.filter(b => isDemoBusinessId(b.id))
    const realBusinesses = businesses.filter(b => !isDemoBusinessId(b.id))

    console.log(`📊 Business Breakdown:`)
    console.log(`   Demo businesses: ${demoBusinesses.length}`)
    console.log(`   Real businesses: ${realBusinesses.length}\n`)

    if (demoBusinesses.length > 0) {
      console.log(`🚫 Demo Businesses (will NOT sync):\n`)
      for (const business of demoBusinesses) {
        console.log(`   • ${business.name}`)
        console.log(`     ID: ${business.id}`)
        console.log(`     Type: ${business.type}`)
        console.log(`     Active: ${business.isActive}`)
        console.log()
      }
    }

    if (realBusinesses.length > 0) {
      console.log(`✅ Real Businesses (will sync):\n`)
      for (const business of realBusinesses) {
        console.log(`   • ${business.name}`)
        console.log(`     ID: ${business.id}`)
        console.log(`     Type: ${business.type}`)
        console.log(`     Active: ${business.isActive}`)
        console.log()
      }
    }

  } catch (error) {
    console.error('❌ Error checking businesses:', error.message)
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n')
  console.log('═'.repeat(70))
  console.log('  DEMO BUSINESS SYNC FILTER TEST')
  console.log('═'.repeat(70))
  console.log('\n')

  // Test 1: Filtering logic
  const filterTestPassed = testFiltering()

  console.log('\n')

  // Test 2: Check actual businesses
  await checkDemoBusinesses()

  console.log('\n')

  // Test 3: Check sync events
  await checkSyncEvents()

  console.log('\n')
  console.log('═'.repeat(70))
  
  if (filterTestPassed) {
    console.log('✅ All filtering tests passed!')
  } else {
    console.log('❌ Some filtering tests failed!')
  }
  
  console.log('═'.repeat(70))
  console.log('\n')

  await prisma.$disconnect()
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error)
  prisma.$disconnect()
  process.exit(1)
})
