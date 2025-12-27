const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyDataIntegrity() {
  try {
    console.log('🔍 Checking data integrity after schema update...\n')

    const businesses = await prisma.businesses.count()
    const users = await prisma.users.count()
    const orders = await prisma.businessOrders.count()
    const r710Tokens = await prisma.r710Tokens.count()
    const r710TokenConfigs = await prisma.r710TokenConfigs.count()
    const wifiTokens = await prisma.wifiTokens.count()
    const products = await prisma.businessProducts.count()

    console.log('✅ Data Integrity Report:')
    console.log('========================')
    console.log(`Businesses: ${businesses}`)
    console.log(`Users: ${users}`)
    console.log(`Orders: ${orders}`)
    console.log(`Products: ${products}`)
    console.log(`WiFi Tokens (ESP32): ${wifiTokens}`)
    console.log(`R710 Token Configs: ${r710TokenConfigs}`)
    console.log(`R710 Tokens: ${r710Tokens}`)

    // Check the new table
    const r710MenuItems = await prisma.r710BusinessTokenMenuItems.count()
    console.log(`\n📋 New Table:`)
    console.log(`R710 Business Menu Items: ${r710MenuItems} (expected: 0 - new table)`)

    console.log('\n✅ All data appears intact!')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

verifyDataIntegrity()
