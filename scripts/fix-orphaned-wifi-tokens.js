const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Find and fix orphaned WiFi tokens:
 * - Tokens in database but not on ESP32 should be marked as DISABLED (if UNUSED) or EXPIRED (if ACTIVE)
 */
async function fixOrphanedTokens() {
  try {
    console.log('=== Checking for Orphaned WiFi Tokens ===\n')

    // Get all businesses with WiFi portal integration
    const businesses = await prisma.businesses.findMany({
      where: {
        OR: [
          { type: 'restaurant' },
          { type: 'grocery' }
        ],
        portal_integrations: {
          isNot: null
        }
      },
      include: {
        portal_integrations: true
      }
    })

    if (businesses.length === 0) {
      console.log('No businesses with WiFi portal integration found')
      return
    }

    console.log(`Found ${businesses.length} business(es) with WiFi portal integration\n`)

    for (const business of businesses) {
      console.log(`\n📍 Checking ${business.name} (${business.type})`)

      // Get all non-DISABLED tokens for this business from database
      const dbTokens = await prisma.wifiTokens.findMany({
        where: {
          businessId: business.id,
          status: {
            not: 'DISABLED'
          }
        },
        select: {
          id: true,
          token: true,
          status: true,
          createdAt: true,
          tokenConfigId: true,
        }
      })

      console.log(`   Database tokens (non-DISABLED): ${dbTokens.length}`)

      if (dbTokens.length === 0) {
        console.log('   No tokens to check')
        continue
      }

      // Simulate ESP32 API call to get list of tokens
      // In production, you'd call the actual ESP32 API here
      console.log(`   Note: This is a dry-run. To actually call ESP32, you need to implement the API call.`)
      console.log(`   For now, showing tokens that WOULD be checked:\n`)

      // Group by status
      const byStatus = dbTokens.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1
        return acc
      }, {})

      console.log('   Status breakdown:', byStatus)

      // Show what would happen
      const unusedCount = dbTokens.filter(t => t.status === 'UNUSED').length
      const activeCount = dbTokens.filter(t => t.status === 'ACTIVE').length
      const expiredCount = dbTokens.filter(t => t.status === 'EXPIRED').length

      console.log(`\n   If tokens not found on ESP32:`)
      console.log(`     - ${unusedCount} UNUSED tokens → would be marked DISABLED`)
      console.log(`     - ${activeCount} ACTIVE tokens → would be marked EXPIRED`)
      console.log(`     - ${expiredCount} EXPIRED tokens → no change (already expired)`)
    }

    console.log('\n=== Dry Run Complete ===')
    console.log('\nTo actually fix tokens:')
    console.log('1. Run batch sync from UI: http://localhost:8080/wifi-portal/tokens')
    console.log('2. Click "⚡ Batch Sync" button in Database Ledger tab')
    console.log('3. The sync will automatically mark orphaned tokens correctly')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixOrphanedTokens()
