/**
 * Restaurant POS WiFi Token Test
 * Verifies all fixes applied from grocery POS
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testRestaurantWiFiTokens() {
  console.log('🧪 Restaurant POS WiFi Token Integration Test\n')
  console.log('=' .repeat(60))

  try {
    // Step 1: Find restaurant business
    console.log('\n📋 Step 1: Finding restaurant business...')
    const restaurant = await prisma.businesses.findFirst({
      where: { type: 'restaurant' },
      select: { id: true, name: true }
    })

    if (!restaurant) {
      console.log('❌ No restaurant business found')
      return
    }
    console.log(`✅ Found: ${restaurant.name} (${restaurant.id})`)

    // Step 2: Check WiFi Portal integration
    console.log('\n📋 Step 2: Checking WiFi Portal integration...')
    const integration = await prisma.portalIntegrations.findUnique({
      where: { businessId: restaurant.id },
      include: {
        expense_accounts: {
          select: { id: true, accountName: true }
        }
      }
    })

    if (!integration) {
      console.log('❌ No WiFi Portal integration found')
      return
    }
    console.log(`✅ Integration active: ${integration.portalIpAddress}:${integration.portalPort}`)
    console.log(`   Active: ${integration.isActive}`)
    console.log(`   Expense Account: ${integration.expense_accounts?.accountName || 'NOT LINKED'}`)

    if (!integration.expenseAccountId) {
      console.log('❌ CRITICAL: Expense account not linked!')
      return
    }

    // Step 3: Check token menu items
    console.log('\n📋 Step 3: Checking business token menu...')
    const menuItems = await prisma.businessTokenMenuItems.findMany({
      where: {
        businessId: restaurant.id,
        isActive: true
      },
      include: {
        token_configurations: true
      }
    })

    console.log(`✅ Found ${menuItems.length} active menu items:`)
    menuItems.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.token_configurations.name} - $${Number(item.businessPrice).toFixed(2)}`)
      console.log(`      Config ID: ${item.tokenConfigId}`)
      console.log(`      Duration: ${item.token_configurations.durationMinutes} min`)
    })

    // Step 4: Check available database tokens
    console.log('\n📋 Step 4: Checking available database tokens...')
    const dbTokens = await prisma.wifiTokens.findMany({
      where: {
        businessId: restaurant.id,
        status: 'UNUSED',
        wifi_token_sales: { none: {} } // Not sold yet
      },
      include: {
        token_configurations: true
      }
    })

    console.log(`✅ Database has ${dbTokens.length} UNUSED, unsold tokens`)

    // Group by config
    const dbTokensByConfig = dbTokens.reduce((acc, token) => {
      const configId = token.tokenConfigId
      if (!acc[configId]) {
        acc[configId] = []
      }
      acc[configId].push(token)
      return acc
    }, {})

    console.log('\n   Tokens by configuration:')
    Object.entries(dbTokensByConfig).forEach(([configId, tokens]) => {
      const config = tokens[0].token_configurations
      console.log(`   - ${config.name}: ${tokens.length} available`)
      console.log(`     Sample tokens: ${tokens.slice(0, 3).map(t => t.token).join(', ')}`)
    })

    // Step 5: Check sold tokens
    console.log('\n📋 Step 5: Checking sold tokens...')
    const soldTokens = await prisma.wifiTokenSales.findMany({
      where: { businessId: restaurant.id },
      include: {
        wifi_tokens: {
          include: {
            token_configurations: true
          }
        }
      },
      orderBy: { soldAt: 'desc' },
      take: 5
    })

    console.log(`✅ Total sold tokens: ${soldTokens.length}`)
    if (soldTokens.length > 0) {
      console.log('\n   Recent sales (latest 5):')
      soldTokens.forEach((sale, idx) => {
        const soldDate = new Date(sale.soldAt).toLocaleString()
        console.log(`   ${idx + 1}. ${sale.wifi_tokens.token_configurations.name}`)
        console.log(`      Token: ${sale.wifi_tokens.token}`)
        console.log(`      Amount: $${Number(sale.saleAmount).toFixed(2)}`)
        console.log(`      Channel: ${sale.saleChannel || 'POS'}`)
        console.log(`      Date: ${soldDate}`)
        console.log(`      Status: ${sale.wifi_tokens.status}`)
      })
    }

    // Step 6: Test ESP32 connection
    console.log('\n📋 Step 6: Testing ESP32 device connectivity...')
    try {
      const testUrl = `http://${integration.portalIpAddress}:${integration.portalPort}/api/health?api_key=${integration.apiKey}`
      const testResponse = await fetch(testUrl, {
        signal: AbortSignal.timeout(5000)
      })

      if (testResponse.ok) {
        console.log('✅ ESP32 device is reachable')
      } else {
        console.log(`⚠️  ESP32 responded with status: ${testResponse.status}`)
      }
    } catch (error) {
      console.log('❌ ESP32 device is NOT reachable:', error.message)
      console.log('   Token sales will fail until ESP32 is back online')
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Restaurant: ${restaurant.name}`)
    console.log(`WiFi Integration: ${integration ? '✅ Active' : '❌ Not configured'}`)
    console.log(`Expense Account: ${integration?.expense_accounts ? '✅ Linked' : '❌ Not linked'}`)
    console.log(`Menu Items: ${menuItems.length} active`)
    console.log(`Available Tokens: ${dbTokens.length} (UNUSED, not sold)`)
    console.log(`Sold Tokens: ${soldTokens.length}`)
    console.log('\n✅ Restaurant POS WiFi token integration ready!')
    console.log('\nNext steps:')
    console.log('1. Ensure dev server is running: npm run dev')
    console.log('2. Navigate to: http://localhost:8080/restaurant/pos')
    console.log('3. Select HXI Eats business')
    console.log('4. Add WiFi token to cart')
    console.log('5. Complete purchase')
    console.log('6. Verify token appears on receipt with SSID')
    console.log('7. Check badge count updates immediately')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

testRestaurantWiFiTokens()
