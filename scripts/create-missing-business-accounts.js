/**
 * Create Missing Business Accounts
 * Creates business accounts for all businesses that don't have one
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createMissingBusinessAccounts() {
  console.log('\n🏦 Creating Missing Business Accounts...\n')

  // Get all businesses
  const businesses = await prisma.businesses.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      createdBy: true,
      business_accounts: {
        select: { id: true }
      }
    },
  })

  console.log(`Found ${businesses.length} active businesses\n`)

  // Filter businesses without accounts
  const businessesWithoutAccounts = businesses.filter(b => !b.business_accounts)

  console.log(`${businessesWithoutAccounts.length} businesses need accounts\n`)

  if (businessesWithoutAccounts.length === 0) {
    console.log('✅ All businesses already have accounts!')
    return
  }

  let created = 0
  let failed = 0

  // Get a valid user ID (admin or first user)
  const adminUser = await prisma.users.findFirst({
    where: { role: 'admin' },
    select: { id: true },
  })

  const validUserId = adminUser?.id || null

  for (const business of businessesWithoutAccounts) {
    try {
      // Verify if the business's createdBy user exists
      let createdByUserId = null
      if (business.createdBy) {
        const userExists = await prisma.users.findUnique({
          where: { id: business.createdBy },
          select: { id: true },
        })
        createdByUserId = userExists ? business.createdBy : validUserId
      } else {
        createdByUserId = validUserId
      }

      await prisma.businessAccounts.create({
        data: {
          businessId: business.id,
          balance: 0,
          updatedAt: new Date(),
          createdBy: createdByUserId,
        },
      })

      console.log(`✅ Created account for: ${business.name} (${business.type})`)
      created++
    } catch (error) {
      console.error(`❌ Failed to create account for ${business.name}:`, error.message)
      failed++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📝 Total: ${businessesWithoutAccounts.length}`)
}

async function main() {
  try {
    await createMissingBusinessAccounts()
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
