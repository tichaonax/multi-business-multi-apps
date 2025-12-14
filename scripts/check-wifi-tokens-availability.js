const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTokenAvailability() {
  try {
    console.log('=== WiFi Token Availability Check ===\n')

    // Get all token configurations
    const configs = await prisma.tokenConfigurations.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        bandwidthDownMb: true,
        bandwidthUpMb: true,
        basePrice: true,
      },
    })

    console.log(`Found ${configs.length} active token configurations\n`)

    for (const config of configs) {
      console.log(`\n📦 ${config.name}`)
      console.log(`   Duration: ${config.durationMinutes} mins, Down: ${config.bandwidthDownMb}MB, Up: ${config.bandwidthUpMb}MB`)
      console.log(`   Base Price: $${config.basePrice}`)
      console.log(`   Config ID: ${config.id}`)

      // Get all tokens for this config
      const allTokens = await prisma.wifiTokens.findMany({
        where: { tokenConfigId: config.id },
        include: {
          wifi_token_sales: {
            select: {
              id: true,
              saleChannel: true,
              saleAmount: true,
              soldAt: true,
            },
          },
        },
      })

      console.log(`   Total tokens created: ${allTokens.length}`)

      // Count by status
      const byStatus = allTokens.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {})

      console.log(`   Status breakdown:`, byStatus)

      // Count UNUSED tokens
      const unusedTokens = allTokens.filter(t => t.status === 'UNUSED')
      console.log(`   UNUSED tokens: ${unusedTokens.length}`)

      // Count sold tokens
      const soldTokens = allTokens.filter(t => t.wifi_token_sales.length > 0)
      console.log(`   Sold tokens (any channel): ${soldTokens.length}`)

      // Count UNUSED and NOT sold
      const availableTokens = allTokens.filter(t =>
        t.status === 'UNUSED' && t.wifi_token_sales.length === 0
      )
      console.log(`   ✅ AVAILABLE (UNUSED + Not Sold): ${availableTokens.length}`)

      // Show sales breakdown if any
      if (soldTokens.length > 0) {
        const salesByChannel = soldTokens.reduce((acc, t) => {
          if (t.wifi_token_sales[0]) {
            const channel = t.wifi_token_sales[0].saleChannel || 'UNKNOWN'
            acc[channel] = (acc[channel] || 0) + 1
          }
          return acc
        }, {})
        console.log(`   Sales by channel:`, salesByChannel)
      }

      // Show sample tokens if available
      if (availableTokens.length > 0) {
        console.log(`   Sample available tokens:`)
        availableTokens.slice(0, 3).forEach(t => {
          console.log(`     - ${t.token} (created: ${t.createdAt.toISOString()})`)
        })
      }
    }

    console.log('\n=== End of Report ===')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTokenAvailability()
