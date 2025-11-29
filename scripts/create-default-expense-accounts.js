/**
 * Create Default Expense Accounts for Existing Businesses
 * Creates a default expense account for each business that doesn't have one
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Copy of generateAccountNumber function from expense-account-utils
async function generateAccountNumber() {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // Find the highest account number for today
  const lastAccount = await prisma.expenseAccounts.findFirst({
    where: {
      accountNumber: {
        startsWith: `EXP-${dateStr}-`
      }
    },
    orderBy: {
      accountNumber: 'desc'
    }
  })

  let sequence = 1
  if (lastAccount) {
    const lastSequence = parseInt(lastAccount.accountNumber.split('-')[2])
    sequence = lastSequence + 1
  }

  return `EXP-${dateStr}-${sequence.toString().padStart(4, '0')}`
}

async function createDefaultExpenseAccounts() {
  console.log('\n💼 Creating Default Expense Accounts for Existing Businesses...\n')

  // Get all active businesses
  const businesses = await prisma.businesses.findMany({
    where: {
      isActive: true,
      type: { not: 'umbrella' }
    },
    select: {
      id: true,
      name: true,
      type: true,
      createdBy: true,
    },
  })

  console.log(`Found ${businesses.length} active businesses\n`)

  // Get all expense accounts to check which businesses already have them
  const expenseAccounts = await prisma.expenseAccounts.findMany({
    select: {
      accountName: true,
    },
  })

  let created = 0
  let skipped = 0
  let failed = 0

  for (const business of businesses) {
    try {
      // Check if an expense account already exists for this business
      const accountName = `${business.name} Expense Account`
      const exists = expenseAccounts.some(acc => acc.accountName === accountName)

      if (exists) {
        console.log(`⏭️  Skipped: ${business.name} - already has expense account`)
        skipped++
        continue
      }

      // Generate unique account number
      const accountNumber = await generateAccountNumber()

      // Get a valid user ID
      const adminUser = await prisma.users.findFirst({
        where: { role: 'admin' },
        select: { id: true },
      })

      let createdByUserId = null
      if (business.createdBy) {
        const userExists = await prisma.users.findUnique({
          where: { id: business.createdBy },
          select: { id: true },
        })
        createdByUserId = userExists ? business.createdBy : adminUser?.id || null
      } else {
        createdByUserId = adminUser?.id || null
      }

      // Create expense account
      await prisma.expenseAccounts.create({
        data: {
          accountNumber,
          accountName,
          description: `Default expense account for ${business.name}`,
          balance: 0,
          lowBalanceThreshold: 500,
          isActive: true,
          createdBy: createdByUserId,
        },
      })

      console.log(`✅ Created expense account for: ${business.name} (${accountNumber})`)
      created++
    } catch (error) {
      console.error(`❌ Failed to create expense account for ${business.name}:`, error.message)
      failed++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📝 Total businesses: ${businesses.length}`)
}

async function main() {
  try {
    await createDefaultExpenseAccounts()
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
