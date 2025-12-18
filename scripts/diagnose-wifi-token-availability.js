const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function diagnoseTokenAvailability() {
  console.log('\n=== WiFi Token Availability Diagnostic ===\n')

  try {
    // Step 1: Find the business with WiFi portal integration
    console.log('Step 1: Finding businesses with WiFi Portal integration...')
    const businesses = await prisma.business.findMany({
      where: {
        businessType: {
          in: ['restaurant', 'grocery']
        }
      },
      select: {
        id: true,
        name: true,
        businessType: true
      }
    })

    console.log(`Found ${businesses.length} restaurant/grocery businesses:`)
    businesses.forEach(b => console.log(`  - ${b.name} (${b.businessType}): ${b.id}`))

    // For testing, let's use the first business
    const testBusiness = businesses[0]
    if (!testBusiness) {
      console.log('ERROR: No restaurant/grocery businesses found')
      return
    }

    console.log(`\nUsing business: ${testBusiness.name} (${testBusiness.id})`)

    // Step 2: Check WiFi Portal Integration
    console.log('\nStep 2: Checking WiFi Portal integration...')
    const integration = await prisma.wifiPortalIntegration.findFirst({
      where: { businessId: testBusiness.id },
      include: {
        tokenConfigurations: {
          where: { isActive: true }
        }
      }
    })

    if (!integration) {
      console.log('ERROR: No WiFi Portal integration found for this business')
      return
    }

    console.log(`Integration found:`)
    console.log(`  - ESP32 URL: ${integration.esp32BaseUrl}`)
    console.log(`  - Active configs: ${integration.tokenConfigurations.length}`)
    integration.tokenConfigurations.forEach(config => {
      console.log(`    * ${config.name}: ${config.durationMinutes}min, ↓${config.bandwidthDownMb}MB ↑${config.bandwidthUpMb}MB`)
    })

    // Step 3: Query Database Ledger
    console.log('\nStep 3: Querying Database Ledger...')
    const dbTokens = await prisma.wifiToken.findMany({
      where: {
        businessId: testBusiness.id,
        status: 'UNUSED'
      },
      include: {
        tokenConfig: true,
        sale: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    console.log(`\nDatabase Ledger Results: ${dbTokens.length} UNUSED tokens`)
    console.log('\nToken Details:')
    console.log('─'.repeat(120))
    console.log('Token'.padEnd(12), 'Status'.padEnd(10), 'Config'.padEnd(30), 'Sold?'.padEnd(8), 'Created')
    console.log('─'.repeat(120))

    let unsoldCount = 0
    let soldCount = 0
    const specificToken = '2CJ8AC9K'
    let foundSpecificToken = null

    dbTokens.forEach(token => {
      const isSold = token.sale !== null
      const marker = token.token === specificToken ? '>>> ' : '    '

      if (token.token === specificToken) {
        foundSpecificToken = token
      }

      console.log(
        marker + token.token.padEnd(12),
        token.status.padEnd(10),
        (token.tokenConfig?.name || 'Unknown').padEnd(30),
        (isSold ? 'YES' : 'NO').padEnd(8),
        new Date(token.createdAt).toLocaleString()
      )

      if (isSold) {
        soldCount++
      } else {
        unsoldCount++
      }
    })

    console.log('─'.repeat(120))
    console.log(`\nSummary:`)
    console.log(`  - Total UNUSED tokens: ${dbTokens.length}`)
    console.log(`  - Sold (unavailable): ${soldCount}`)
    console.log(`  - Unsold (available): ${unsoldCount}`)

    // Step 4: Check specific token
    if (foundSpecificToken) {
      console.log(`\n>>> Token "${specificToken}" Details:`)
      console.log(`    Status: ${foundSpecificToken.status}`)
      console.log(`    Config ID: ${foundSpecificToken.tokenConfigId}`)
      console.log(`    Config Name: ${foundSpecificToken.tokenConfig?.name}`)
      console.log(`    Has Sale Record: ${foundSpecificToken.sale ? 'YES (SOLD - NOT AVAILABLE)' : 'NO (UNSOLD - AVAILABLE)'}`)
      if (foundSpecificToken.sale) {
        console.log(`    Sale ID: ${foundSpecificToken.sale.id}`)
        console.log(`    Sold At: ${new Date(foundSpecificToken.sale.createdAt).toLocaleString()}`)
        console.log(`    Sale Price: $${foundSpecificToken.sale.salePrice}`)
      }
    } else {
      console.log(`\n>>> Token "${specificToken}" NOT FOUND in Database Ledger`)
    }

    // Step 5: Check token configurations with menu items
    console.log('\nStep 5: Checking token configurations with menu items...')
    const menuItems = await prisma.businessTokenMenuItem.findMany({
      where: {
        businessId: testBusiness.id,
        isActive: true
      },
      include: {
        tokenConfig: true
      }
    })

    console.log(`\nActive Menu Items: ${menuItems.length}`)
    menuItems.forEach(item => {
      console.log(`  - ${item.tokenConfig.name}: $${item.businessPrice} (Config ID: ${item.tokenConfigId})`)
    })

    // Step 6: Simulate POS availability calculation
    console.log('\nStep 6: Simulating POS Availability Calculation...')
    console.log('\nThis simulates what happens in Grocery/Restaurant POS:')

    const tokenConfigIds = menuItems.map(item => item.tokenConfigId)
    console.log(`\nToken Config IDs to check: [${tokenConfigIds.join(', ')}]`)

    // Get only unsold UNUSED tokens
    const availableTokens = await prisma.wifiToken.findMany({
      where: {
        businessId: testBusiness.id,
        status: 'UNUSED',
        sale: null  // CRITICAL: Only tokens without sales records
      },
      select: {
        token: true,
        tokenConfigId: true
      }
    })

    console.log(`\nTokens matching criteria (UNUSED + unsold): ${availableTokens.length}`)

    // Count by config
    const quantityMap = {}
    availableTokens.forEach(token => {
      const configId = token.tokenConfigId
      if (configId && tokenConfigIds.includes(configId)) {
        quantityMap[configId] = (quantityMap[configId] || 0) + 1
      }
    })

    console.log('\nAvailability by Config (DATABASE ONLY - no ESP32 cross-reference):')
    console.log('─'.repeat(80))
    menuItems.forEach(item => {
      const count = quantityMap[item.tokenConfigId] || 0
      console.log(`${item.tokenConfig.name.padEnd(50)} ${count} tokens`)
    })
    console.log('─'.repeat(80))

    // Step 7: List all unsold tokens for cross-reference
    console.log('\nStep 7: Tokens available for ESP32 cross-reference:')
    console.log('\nThese are the tokens we would send to ESP32 cross-reference:')
    if (availableTokens.length > 0) {
      console.log('\nToken codes:')
      availableTokens.forEach((t, i) => {
        const marker = t.token === specificToken ? '>>> ' : '    '
        console.log(`${marker}${i + 1}. ${t.token}`)
      })
    } else {
      console.log('  NO TOKENS AVAILABLE FOR CROSS-REFERENCE!')
      console.log('  This means ALL tokens are either:')
      console.log('    - Not in UNUSED status, OR')
      console.log('    - Have been sold (sale record exists)')
    }

    // Step 8: Show what ESP32 API call would look like
    console.log('\nStep 8: ESP32 API Call Information:')
    console.log(`\nTo test ESP32 API manually, use:`)
    console.log(`GET ${integration.esp32BaseUrl}/api/tokens/list?business_id=${testBusiness.id}&status=unused&api_key=${integration.esp32ApiKey}`)
    console.log(`\nThis should return tokens with "status": "unused"`)

    // Step 9: Final diagnosis
    console.log('\n' + '='.repeat(120))
    console.log('DIAGNOSIS SUMMARY')
    console.log('='.repeat(120))

    if (foundSpecificToken && foundSpecificToken.sale) {
      console.log(`\n⚠️  ISSUE FOUND: Token "${specificToken}" has a sale record!`)
      console.log(`   - Token exists in Database Ledger: YES`)
      console.log(`   - Token status: ${foundSpecificToken.status}`)
      console.log(`   - Token is sold: YES (sale ID: ${foundSpecificToken.sale.id})`)
      console.log(`   - Available for sale: NO`)
      console.log(`\n   This token should NOT be counted as available because it has been sold.`)
      console.log(`   Even if it appears in ESP32 as "unused", it's not available for sale.`)
    } else if (foundSpecificToken && !foundSpecificToken.sale) {
      console.log(`\n✅ Token "${specificToken}" is available (unsold) in Database`)
      console.log(`   Next step: Check if it exists in ESP32 API response`)
    } else {
      console.log(`\n❌ Token "${specificToken}" not found in Database Ledger`)
    }

    console.log(`\nAvailable tokens for sale (unsold UNUSED): ${availableTokens.length}`)
    console.log(`\nNext steps:`)
    console.log(`1. Test ESP32 API endpoint manually`)
    console.log(`2. Verify token "${specificToken}" appears in ESP32 response`)
    console.log(`3. Check if cross-reference logic is working correctly`)

  } catch (error) {
    console.error('ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseTokenAvailability()
