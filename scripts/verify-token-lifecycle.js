const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Verify Token Lifecycle Rules:
 *
 * UNUSED → Token created but not yet redeemed
 *   - CAN stay UNUSED forever
 *   - CANNOT become EXPIRED (expiration clock hasn't started)
 *   - CAN become DISABLED (if not on ESP32 or manually disabled)
 *   - CAN become ACTIVE (when firstUsedAt is set)
 *
 * ACTIVE → Token redeemed and in use
 *   - Expiration clock starts at firstUsedAt
 *   - CAN become EXPIRED (when current time > firstUsedAt + duration)
 *   - CANNOT go back to UNUSED
 *
 * EXPIRED → Token was ACTIVE and time ran out
 *   - Can ONLY be reached from ACTIVE state
 *   - Requires firstUsedAt to be set
 *   - Terminal state
 *
 * DISABLED → Token doesn't exist on ESP32 or manually disabled
 *   - Usually from UNUSED (orphaned tokens)
 *   - Terminal state
 */
async function verifyTokenLifecycle() {
  try {
    console.log('=== WiFi Token Lifecycle Verification ===\n')

    // Test 1: Check for EXPIRED tokens without firstUsedAt (WRONG)
    const expiredUnused = await prisma.wifiTokens.findMany({
      where: {
        status: 'EXPIRED',
        firstUsedAt: null,
      }
    })

    console.log('Test 1: EXPIRED tokens without redemption')
    if (expiredUnused.length > 0) {
      console.log(`❌ FAIL: Found ${expiredUnused.length} EXPIRED tokens that were never redeemed`)
      console.log('   These violate the rule: UNUSED tokens cannot expire\n')
    } else {
      console.log(`✓ PASS: No EXPIRED tokens without redemption\n`)
    }

    // Test 2: Check ACTIVE tokens have firstUsedAt
    const activeTokens = await prisma.wifiTokens.findMany({
      where: {
        status: 'ACTIVE',
      }
    })

    const activeWithoutFirstUsed = activeTokens.filter(t => !t.firstUsedAt)

    console.log('Test 2: ACTIVE tokens must have redemption date')
    if (activeWithoutFirstUsed.length > 0) {
      console.log(`⚠️  WARNING: Found ${activeWithoutFirstUsed.length} ACTIVE tokens without firstUsedAt`)
      console.log('   These tokens are ACTIVE but missing redemption timestamp\n')
    } else {
      console.log(`✓ PASS: All ACTIVE tokens have firstUsedAt\n`)
    }

    // Test 3: Check EXPIRED tokens all have firstUsedAt
    const expiredTokens = await prisma.wifiTokens.findMany({
      where: {
        status: 'EXPIRED',
      }
    })

    const expiredWithFirstUsed = expiredTokens.filter(t => t.firstUsedAt)

    console.log('Test 3: EXPIRED tokens must have been redeemed')
    console.log(`   Total EXPIRED: ${expiredTokens.length}`)
    console.log(`   With firstUsedAt: ${expiredWithFirstUsed.length}`)
    console.log(`   Without firstUsedAt: ${expiredTokens.length - expiredWithFirstUsed.length}`)

    if (expiredTokens.length === expiredWithFirstUsed.length) {
      console.log(`✓ PASS: All EXPIRED tokens were redeemed before expiring\n`)
    } else {
      console.log(`❌ FAIL: Some EXPIRED tokens were never redeemed\n`)
    }

    // Test 4: UNUSED tokens can be past calendar expiration
    const now = new Date()
    const unusedPastExpiration = await prisma.wifiTokens.findMany({
      where: {
        status: 'UNUSED',
        expiresAt: {
          not: null,
          lt: now,
        }
      }
    })

    console.log('Test 4: UNUSED tokens past calendar expiration')
    console.log(`   Found ${unusedPastExpiration.length} UNUSED tokens past expiresAt date`)
    console.log(`   ✓ This is CORRECT - they stay UNUSED until redeemed\n`)

    // Test 5: Status distribution
    const statusCounts = await prisma.wifiTokens.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    console.log('=== Status Distribution ===')
    const statusMap = {}
    statusCounts.forEach(({ status, _count }) => {
      statusMap[status] = _count.id
      console.log(`  ${status}: ${_count.id}`)
    })

    // Summary
    console.log('\n=== Verification Summary ===')
    let allPassed = true

    if (expiredUnused.length > 0) {
      console.log('❌ CRITICAL: EXPIRED tokens exist without redemption')
      console.log('   Action: Run scripts/fix-incorrectly-expired-tokens.js')
      allPassed = false
    }

    if (activeWithoutFirstUsed.length > 0) {
      console.log('⚠️  WARNING: ACTIVE tokens missing firstUsedAt')
      allPassed = false
    }

    if (allPassed) {
      console.log('✓ All lifecycle rules verified successfully')
    }

    console.log('\n=== Token Lifecycle Rules ===')
    console.log('1. UNUSED → Can stay UNUSED forever (even past expiresAt)')
    console.log('2. UNUSED → ACTIVE (when customer redeems token)')
    console.log('3. ACTIVE → EXPIRED (when time runs out after redemption)')
    console.log('4. UNUSED → DISABLED (if not on ESP32 or manually disabled)')
    console.log('5. EXPIRED requires firstUsedAt to be set')
    console.log('6. Expiration timer starts ONLY at redemption (firstUsedAt)')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyTokenLifecycle()
