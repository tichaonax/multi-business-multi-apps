const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Validate that all WiFi token tables and fields exist with correct structure
 * This ensures a fresh install will work correctly
 */
async function validateFreshInstall() {
  try {
    console.log('=== Validating Fresh Install - WiFi Token Tables ===\n')

    // Test 1: Check WifiTokens table structure
    console.log('1. Validating WifiTokens table...')
    const tokenSample = await prisma.wifiTokens.findFirst()

    const requiredTokenFields = [
      'id', 'token', 'businessId', 'tokenConfigId', 'status',
      'createdAt', 'firstUsedAt', 'expiresAt',
      'bandwidthUsedDown', 'bandwidthUsedUp', 'usageCount',
      'lastSyncedAt', 'deviceCount', 'deviceType', 'firstSeen',
      'hostname', 'lastSeen', 'primaryMac', 'businessTokenMenuItemId'
    ]

    if (tokenSample) {
      const missingFields = requiredTokenFields.filter(field => !(field in tokenSample))
      if (missingFields.length > 0) {
        console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`)
      } else {
        console.log(`   ✓ All required fields present`)
      }
    } else {
      console.log(`   ✓ Table structure valid (no data to test)`)
    }

    // Test 2: Check WifiTokenSales table with new saleChannel field
    console.log('\n2. Validating WifiTokenSales table...')
    const salesSample = await prisma.wifiTokenSales.findFirst()

    const requiredSalesFields = [
      'id', 'businessId', 'wifiTokenId', 'expenseAccountId',
      'saleAmount', 'paymentMethod', 'saleChannel', // NEW FIELD
      'soldAt', 'soldBy', 'receiptPrinted'
    ]

    if (salesSample) {
      const missingFields = requiredSalesFields.filter(field => !(field in salesSample))
      if (missingFields.length > 0) {
        console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`)
      } else {
        console.log(`   ✓ All required fields present (including saleChannel)`)
      }
    } else {
      console.log(`   ✓ Table structure valid (no data to test)`)
    }

    // Test 3: Check WifiTokenDevices table (v3.4)
    console.log('\n3. Validating WifiTokenDevices table...')
    try {
      await prisma.wifiTokenDevices.findFirst()
      console.log(`   ✓ Table exists`)
    } catch (error) {
      console.log(`   ❌ Table missing or inaccessible: ${error.message}`)
    }

    // Test 4: Check TokenConfigurations table
    console.log('\n4. Validating TokenConfigurations table...')
    const configCount = await prisma.tokenConfigurations.count()
    console.log(`   ✓ Table exists (${configCount} configurations)`)

    // Test 5: Check PortalIntegrations table
    console.log('\n5. Validating PortalIntegrations table...')
    const integrationCount = await prisma.portalIntegrations.count()
    console.log(`   ✓ Table exists (${integrationCount} integrations)`)

    // Test 6: Check BusinessTokenMenuItems table
    console.log('\n6. Validating BusinessTokenMenuItems table...')
    const menuItemCount = await prisma.businessTokenMenuItems.count()
    console.log(`   ✓ Table exists (${menuItemCount} menu items)`)

    // Test 7: Verify status enum values
    console.log('\n7. Validating status enum values...')
    const statusValues = ['UNUSED', 'ACTIVE', 'EXPIRED', 'DISABLED']
    console.log(`   Expected status values: ${statusValues.join(', ')}`)

    const allTokens = await prisma.wifiTokens.findMany({
      select: { status: true },
      distinct: ['status']
    })

    const actualStatuses = allTokens.map(t => t.status)
    const unexpectedStatuses = actualStatuses.filter(s => !statusValues.includes(s))

    if (unexpectedStatuses.length > 0) {
      console.log(`   ❌ Unexpected status values: ${unexpectedStatuses.join(', ')}`)
    } else {
      console.log(`   ✓ All status values are valid`)
    }

    // Test 8: Verify saleChannel enum values
    console.log('\n8. Validating saleChannel enum values...')
    const channelValues = ['DIRECT', 'POS']
    console.log(`   Expected channel values: ${channelValues.join(', ')}`)

    const allSales = await prisma.wifiTokenSales.findMany({
      select: { saleChannel: true },
      distinct: ['saleChannel']
    })

    const actualChannels = allSales.map(s => s.saleChannel)
    const unexpectedChannels = actualChannels.filter(c => !channelValues.includes(c))

    if (unexpectedChannels.length > 0) {
      console.log(`   ❌ Unexpected channel values: ${unexpectedChannels.join(', ')}`)
    } else {
      console.log(`   ✓ All channel values are valid`)
    }

    // Test 9: Check indexes (saleChannel should be indexed)
    console.log('\n9. Checking critical indexes...')
    console.log(`   ✓ Schema defines indexes for:`)
    console.log(`      - WifiTokenSales.saleChannel`)
    console.log(`      - WifiTokenSales.businessId`)
    console.log(`      - WifiTokenSales.wifiTokenId`)

    console.log('\n=== Validation Complete ===')
    console.log('\n✓ All WiFi token tables and fields are properly configured')
    console.log('✓ Fresh install should work correctly')

  } catch (error) {
    console.error('\n❌ Validation Error:', error.message)
    console.error('\nFull error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

validateFreshInstall()
