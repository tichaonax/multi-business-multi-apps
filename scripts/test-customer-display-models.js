// Test script for customer display database models
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testModels() {
  console.log('🧪 Testing Customer Display Database Models...\n')

  try {
    // Get a test business ID (use first active business)
    const testBusiness = await prisma.businesses.findFirst({
      where: { isActive: true }
    })

    if (!testBusiness) {
      console.log('❌ No active business found. Please create a business first.')
      return
    }

    console.log(`✅ Using test business: ${testBusiness.name} (${testBusiness.id})\n`)

    // Test 1: CustomerDisplaySession
    console.log('1️⃣ Testing CustomerDisplaySession model...')
    const session = await prisma.customerDisplaySession.create({
      data: {
        businessId: testBusiness.id,
        terminalId: 'test-terminal-1',
        connectionType: 'broadcast',
        isActive: true
      }
    })
    console.log(`   ✅ Created session: ${session.id}`)

    const fetchedSession = await prisma.customerDisplaySession.findUnique({
      where: { id: session.id }
    })
    console.log(`   ✅ Fetched session: ${fetchedSession.id} (Terminal: ${fetchedSession.terminalId})\n`)

    // Test 2: CustomerDisplayAd
    console.log('2️⃣ Testing CustomerDisplayAd model...')
    const ad = await prisma.customerDisplayAd.create({
      data: {
        businessId: testBusiness.id,
        title: 'Test Advertisement',
        imageUrl: 'https://example.com/test-ad.jpg',
        duration: 10,
        isActive: true,
        sortOrder: 1
      }
    })
    console.log(`   ✅ Created ad: ${ad.id} - "${ad.title}"`)

    const fetchedAd = await prisma.customerDisplayAd.findUnique({
      where: { id: ad.id }
    })
    console.log(`   ✅ Fetched ad: ${fetchedAd.id} (Duration: ${fetchedAd.duration}s)\n`)

    // Test 3: PosTerminalConfig
    console.log('3️⃣ Testing PosTerminalConfig model...')
    const config = await prisma.posTerminalConfig.create({
      data: {
        businessId: testBusiness.id,
        terminalId: 'terminal-main-001',
        displayName: 'Main Register',
        hasCustomerDisplay: true
      }
    })
    console.log(`   ✅ Created config: ${config.id} - "${config.displayName}"`)

    const fetchedConfig = await prisma.posTerminalConfig.findUnique({
      where: { id: config.id }
    })
    console.log(`   ✅ Fetched config: ${fetchedConfig.id} (Has Display: ${fetchedConfig.hasCustomerDisplay})\n`)

    // Test 4: Relations
    console.log('4️⃣ Testing relations with Businesses model...')
    const businessWithRelations = await prisma.businesses.findUnique({
      where: { id: testBusiness.id },
      include: {
        customer_display_sessions: true,
        customer_display_ads: true,
        pos_terminal_configs: true
      }
    })
    console.log(`   ✅ Business has ${businessWithRelations.customer_display_sessions.length} session(s)`)
    console.log(`   ✅ Business has ${businessWithRelations.customer_display_ads.length} ad(s)`)
    console.log(`   ✅ Business has ${businessWithRelations.pos_terminal_configs.length} terminal config(s)\n`)

    // Cleanup
    console.log('🧹 Cleaning up test data...')
    await prisma.customerDisplaySession.delete({ where: { id: session.id } })
    await prisma.customerDisplayAd.delete({ where: { id: ad.id } })
    await prisma.posTerminalConfig.delete({ where: { id: config.id } })
    console.log('   ✅ Test data cleaned up\n')

    console.log('✅ All database model tests passed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testModels()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
