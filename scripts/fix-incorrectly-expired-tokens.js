const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Fix tokens that are marked EXPIRED but were never used
 * These should be DISABLED instead (they don't exist on ESP32 or expired before redemption)
 */
async function fixIncorrectlyExpiredTokens() {
  try {
    console.log('=== Fixing Incorrectly EXPIRED Tokens ===\n')

    // Find all tokens marked EXPIRED but never used
    const incorrectlyExpired = await prisma.wifiTokens.findMany({
      where: {
        status: 'EXPIRED',
        firstUsedAt: null,
      },
      select: {
        id: true,
        token: true,
        createdAt: true,
        expiresAt: true,
      }
    })

    console.log(`Found ${incorrectlyExpired.length} tokens marked EXPIRED but never used\n`)

    if (incorrectlyExpired.length === 0) {
      console.log('✓ No tokens need fixing')
      return
    }

    console.log('These tokens will be changed from EXPIRED → DISABLED\n')
    console.log('Reason: EXPIRED status should only apply to tokens that were')
    console.log('        ACTIVE (redeemed) and then expired. Tokens that were')
    console.log('        never used should be DISABLED instead.\n')

    // Confirm before proceeding
    console.log(`Updating ${incorrectlyExpired.length} tokens...\n`)

    // Update all tokens
    const result = await prisma.wifiTokens.updateMany({
      where: {
        status: 'EXPIRED',
        firstUsedAt: null,
      },
      data: {
        status: 'DISABLED',
      }
    })

    console.log(`✓ Updated ${result.count} tokens from EXPIRED to DISABLED\n`)

    // Verify
    const remaining = await prisma.wifiTokens.count({
      where: {
        status: 'EXPIRED',
        firstUsedAt: null,
      }
    })

    if (remaining === 0) {
      console.log('✓ All tokens fixed successfully')
    } else {
      console.log(`⚠️  Warning: ${remaining} tokens still have issues`)
    }

    // Show final status breakdown
    const statusCounts = await prisma.wifiTokens.groupBy({
      by: ['status'],
      _count: {
        id: true,
      }
    })

    console.log('\n=== Final Status Breakdown ===')
    statusCounts.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count.id}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixIncorrectlyExpiredTokens()
