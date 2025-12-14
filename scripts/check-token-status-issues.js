const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Check for token status inconsistencies:
 * 1. UNUSED tokens that are marked as EXPIRED (should be DISABLED instead)
 * 2. Tokens with passed expiration but still UNUSED (correct - should stay UNUSED)
 */
async function checkTokenStatusIssues() {
  try {
    console.log('=== Checking Token Status Consistency ===\n')

    // Get all WiFi tokens
    const allTokens = await prisma.wifiTokens.findMany({
      include: {
        token_configurations: {
          select: {
            name: true,
            durationMinutes: true,
          }
        },
        businesses: {
          select: {
            name: true,
            type: true,
          }
        }
      }
    })

    console.log(`Total tokens in database: ${allTokens.length}\n`)

    // Check for UNUSED + EXPIRED (impossible combination)
    const unusedExpired = allTokens.filter(t => t.status === 'EXPIRED' && t.firstUsedAt === null)

    console.log('=== Issue 1: Tokens marked EXPIRED but never used ===')
    if (unusedExpired.length > 0) {
      console.log(`❌ Found ${unusedExpired.length} tokens marked as EXPIRED but never redeemed`)
      console.log('   These should be DISABLED instead (not on ESP32 or expired before use)\n')

      unusedExpired.slice(0, 10).forEach(t => {
        console.log(`   Token: ${t.token}`)
        console.log(`     Status: ${t.status}`)
        console.log(`     First Used: ${t.firstUsedAt || 'Never'}`)
        console.log(`     Expires: ${t.expiresAt}`)
        console.log(`     Business: ${t.businesses.name}`)
        console.log(`     Config: ${t.token_configurations?.name || 'Unknown'}`)
        console.log('')
      })

      if (unusedExpired.length > 10) {
        console.log(`   ... and ${unusedExpired.length - 10} more\n`)
      }
    } else {
      console.log(`✓ No tokens found with EXPIRED status that were never used\n`)
    }

    // Check for UNUSED tokens past expiration (correct - should stay UNUSED)
    const now = new Date()
    const unusedPastExpiration = allTokens.filter(t =>
      t.status === 'UNUSED' &&
      new Date(t.expiresAt) < now
    )

    console.log('=== Info: UNUSED tokens past expiration (CORRECT) ===')
    if (unusedPastExpiration.length > 0) {
      console.log(`✓ Found ${unusedPastExpiration.length} UNUSED tokens past expiration`)
      console.log('   These are CORRECT - they should stay UNUSED until redeemed or marked DISABLED\n')
    } else {
      console.log(`  No UNUSED tokens past expiration\n`)
    }

    // Status breakdown
    console.log('=== Status Breakdown ===')
    const statusCounts = allTokens.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1
      return acc
    }, {})

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

    // Check for tokens that were used (have firstUsedAt) and are past expiration
    const usedAndExpired = allTokens.filter(t =>
      t.firstUsedAt !== null &&
      new Date(t.expiresAt) < now &&
      t.status !== 'EXPIRED'
    )

    console.log('\n=== Issue 2: Used tokens past expiration not marked EXPIRED ===')
    if (usedAndExpired.length > 0) {
      console.log(`⚠️  Found ${usedAndExpired.length} tokens that were used and past expiration but not marked EXPIRED`)
      console.log('   These should be EXPIRED\n')

      usedAndExpired.slice(0, 5).forEach(t => {
        console.log(`   Token: ${t.token}`)
        console.log(`     Status: ${t.status}`)
        console.log(`     First Used: ${t.firstUsedAt}`)
        console.log(`     Expires: ${t.expiresAt}`)
        console.log('')
      })
    } else {
      console.log(`✓ All used tokens past expiration are correctly marked EXPIRED\n`)
    }

    console.log('\n=== Summary ===')
    console.log(`Total tokens: ${allTokens.length}`)
    console.log(`Issues found:`)
    console.log(`  - EXPIRED but never used: ${unusedExpired.length}`)
    console.log(`  - Used + past expiration but not EXPIRED: ${usedAndExpired.length}`)
    console.log(`\nCorrect statuses:`)
    console.log(`  - UNUSED past expiration: ${unusedPastExpiration.length} ✓`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTokenStatusIssues()
