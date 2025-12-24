/**
 * Migration Script: Set Default Receipt Configuration for Existing Businesses
 *
 * Sets default values for newly added receipt configuration fields:
 * - receiptReturnPolicy: "All sales are final, returns not accepted"
 * - taxIncludedInPrice: true
 * - taxRate: null
 * - taxLabel: null
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateBusinessReceiptConfig() {
  console.log('🔄 Migrating Business Receipt Configuration\\n')

  try {
    // Use raw SQL to update businesses that don't have receipt config
    // This bypasses Prisma client type checking issues
    console.log('📝 Setting default receipt configuration values...\\n')

    // Update return policy for businesses where it's null
    const returnPolicyResult = await prisma.$executeRaw`
      UPDATE "businesses"
      SET "receiptReturnPolicy" = 'All sales are final, returns not accepted'
      WHERE "receiptReturnPolicy" IS NULL
    `

    console.log(`✅ Updated ${returnPolicyResult} businesses with default return policy`)

    // Update taxIncludedInPrice for businesses where it's null
    const taxIncludedResult = await prisma.$executeRaw`
      UPDATE "businesses"
      SET "taxIncludedInPrice" = true
      WHERE "taxIncludedInPrice" IS NULL
    `

    console.log(`✅ Updated ${taxIncludedResult} businesses with default tax setting (tax included)`)

    console.log('\\n' + '='.repeat(60))
    console.log('📊 Migration Summary:')
    console.log(`   Return policies set: ${returnPolicyResult}`)
    console.log(`   Tax settings set: ${taxIncludedResult}`)
    console.log('='.repeat(60))

    // Verify migration using raw query
    console.log('\\n🔍 Verifying migration...')
    const verifyResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "businesses"
      WHERE "receiptReturnPolicy" IS NULL OR "taxIncludedInPrice" IS NULL
    `

    const remainingCount = parseInt(verifyResult[0].count)
    if (remainingCount === 0) {
      console.log('✅ Migration successful! All businesses now have receipt configuration.')
    } else {
      console.log(`⚠️  Warning: ${remainingCount} businesses still need configuration`)
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateBusinessReceiptConfig()
