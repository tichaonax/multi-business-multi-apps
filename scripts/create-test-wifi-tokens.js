const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createTestTokens() {
  try {
    console.log('=== Creating Test WiFi Tokens ===\n')

    // Get the first restaurant or grocery business
    const business = await prisma.businesses.findFirst({
      where: {
        OR: [
          { type: 'restaurant' },
          { type: 'grocery' }
        ]
      },
      include: {
        portal_integrations: true
      }
    })

    if (!business) {
      console.error('❌ No restaurant or grocery business found')
      return
    }

    console.log(`✓ Using business: ${business.name} (${business.type})`)

    if (!business.portal_integrations) {
      console.error('❌ No portal integration found for this business')
      console.log('   Please set up WiFi Portal integration first')
      return
    }

    console.log(`✓ Portal integration found`)

    // Get all active token configurations
    const configs = await prisma.tokenConfigurations.findMany({
      where: { isActive: true }
    })

    console.log(`✓ Found ${configs.length} active token configurations\n`)

    const tokensToCreate = 5 // Create 5 tokens per config

    for (const config of configs) {
      console.log(`\n📦 Creating ${tokensToCreate} tokens for: ${config.name}`)
      console.log(`   Duration: ${config.durationMinutes} mins, Down: ${config.bandwidthDownMb}MB, Up: ${config.bandwidthUpMb}MB`)

      for (let i = 0; i < tokensToCreate; i++) {
        // Generate a random 8-character token
        const token = Math.random().toString(36).substring(2, 10).toUpperCase()

        // Calculate expiration (duration from now)
        const expiresAt = new Date(Date.now() + config.durationMinutes * 60 * 1000)

        // Create token in database only (not on ESP32)
        const newToken = await prisma.wifiTokens.create({
          data: {
            token: token,
            businessId: business.id,
            tokenConfigId: config.id,
            status: 'UNUSED',
            expiresAt: expiresAt,
            bandwidthUsedDown: 0,
            bandwidthUsedUp: 0,
            usageCount: 0,
          }
        })

        console.log(`   ✓ Created token: ${newToken.token}`)
      }

      console.log(`   ✓ Created ${tokensToCreate} ${config.name} tokens`)
    }

    console.log('\n=== Summary ===')
    console.log(`✓ Created ${tokensToCreate * configs.length} total tokens`)
    console.log(`✓ Business: ${business.name}`)
    console.log(`\nNote: These are DATABASE-ONLY tokens for testing availability count.`)
    console.log(`To create tokens that work on ESP32, use the WiFi Portal UI.`)
    console.log('\n=== Done ===')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestTokens()
