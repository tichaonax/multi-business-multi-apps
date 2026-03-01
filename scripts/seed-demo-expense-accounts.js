/**
 * Seed Demo Expense Accounts
 * Creates realistic expense accounts for demo businesses with initial deposits
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Demo expense accounts for each business
const expenseAccountsByBusiness = {
  'restaurant-demo-business': [
    {
      accountName: 'Operating Expenses - Restaurant',
      accountNumber: 'EXP-REST-001',
      description: 'General operating expenses for restaurant operations',
      initialBalance: 15000.00
    },
    {
      accountName: 'Food & Supplies - Restaurant',
      accountNumber: 'EXP-REST-002',
      description: 'Food inventory and kitchen supplies',
      initialBalance: 25000.00
    },
    {
      accountName: 'Staff Benefits - Restaurant',
      accountNumber: 'EXP-REST-003',
      description: 'Employee benefits and welfare',
      initialBalance: 8000.00
    }
  ],
  'grocery-demo-business': [
    {
      accountName: 'Operating Expenses - Grocery',
      accountNumber: 'EXP-GROC1-001',
      description: 'General operating expenses for grocery store',
      initialBalance: 20000.00
    },
    {
      accountName: 'Inventory - Grocery',
      accountNumber: 'EXP-GROC1-002',
      description: 'Stock and inventory purchases',
      initialBalance: 35000.00
    }
  ],
  'grocery-demo-2': [
    {
      accountName: 'Operating Expenses - Grocery 2',
      accountNumber: 'EXP-GROC2-001',
      description: 'General operating expenses',
      initialBalance: 18000.00
    },
    {
      accountName: 'Equipment & Maintenance',
      accountNumber: 'EXP-GROC2-002',
      description: 'Store equipment and maintenance costs',
      initialBalance: 12000.00
    }
  ],
  'hardware-demo-business': [
    {
      accountName: 'Operating Expenses - Hardware',
      accountNumber: 'EXP-HARD-001',
      description: 'General operating expenses for hardware store',
      initialBalance: 22000.00
    },
    {
      accountName: 'Tools & Equipment Stock',
      accountNumber: 'EXP-HARD-002',
      description: 'Tools and equipment inventory',
      initialBalance: 40000.00
    },
    {
      accountName: 'Vehicle & Delivery',
      accountNumber: 'EXP-HARD-003',
      description: 'Delivery vehicles and logistics',
      initialBalance: 15000.00
    }
  ],
  'clothing-demo-business': [
    {
      accountName: 'Operating Expenses - Clothing',
      accountNumber: 'EXP-CLOTH-001',
      description: 'General operating expenses for clothing store',
      initialBalance: 18000.00
    },
    {
      accountName: 'Inventory - Clothing',
      accountNumber: 'EXP-CLOTH-002',
      description: 'Clothing inventory and stock',
      initialBalance: 30000.00
    }
  ]
}

// All hardcoded demo account numbers — used for safe targeted cleanup.
// IMPORTANT: Real accounts use format EXP-YYYYMMDD-XXXX (e.g. EXP-20251125-0001).
// Never use a broad pattern like contains:'EXP-' — it would match real accounts too.
const DEMO_ACCOUNT_NUMBERS = Object.values(expenseAccountsByBusiness)
  .flat()
  .map(a => a.accountNumber)

async function seedDemoExpenseAccounts() {
  console.log('💳 Starting demo expense account seeding...\n')

  try {
    // Check for existing demo expense accounts using EXACT account numbers only
    const existingAccounts = await prisma.expenseAccounts.findMany({
      where: {
        accountNumber: {
          in: DEMO_ACCOUNT_NUMBERS
        }
      }
    })

    if (existingAccounts.length > 0) {
      console.log(`⚠️  Found ${existingAccounts.length} existing demo expense accounts`)
      console.log('🗑️  Cleaning up existing demo expense accounts...\n')

      // Delete deposits first (foreign key constraint)
      await prisma.expenseAccountDeposits.deleteMany({
        where: {
          expenseAccountId: {
            in: existingAccounts.map(a => a.id)
          }
        }
      })

      // Delete payments
      await prisma.expenseAccountPayments.deleteMany({
        where: {
          expenseAccountId: {
            in: existingAccounts.map(a => a.id)
          }
        }
      })

      // Delete accounts — scope to exact demo account numbers, never a broad pattern
      await prisma.expenseAccounts.deleteMany({
        where: {
          accountNumber: {
            in: DEMO_ACCOUNT_NUMBERS
          }
        }
      })

      console.log('✅ Cleanup complete\n')
    }

    // Find the admin or finance manager to create accounts
    let creatorUser = await prisma.users.findUnique({
      where: { email: 'marcus.thompson@restaurant-demo.com' }
    })

    if (!creatorUser) {
      creatorUser = await prisma.users.findUnique({
        where: { email: 'admin@business.local' }
      })
    }

    if (!creatorUser) {
      throw new Error('No suitable user found to create expense accounts (need Finance Manager or Admin)')
    }

    console.log(`👤 Using creator: ${creatorUser.name || creatorUser.email}\n`)

    let totalAccounts = 0
    let totalDeposits = 0

    // Process each business
    for (const [businessId, accounts] of Object.entries(expenseAccountsByBusiness)) {
      console.log(`\n📦 Processing business: ${businessId}`)

      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: { name: true, type: true }
      })

      if (!business) {
        console.log(`  ⚠️  Business not found: ${businessId}`)
        continue
      }

      console.log(`  Business: ${business.name} (${business.type})`)

      for (const accountData of accounts) {
        console.log(`  💳 Creating expense account: ${accountData.accountName}`)

        try {
          // Create expense account — include businessId so cleanup can target by business
          const account = await prisma.expenseAccounts.create({
            data: {
              accountName: accountData.accountName,
              accountNumber: accountData.accountNumber,
              description: accountData.description,
              balance: accountData.initialBalance,
              isActive: true,
              businessId: businessId,
              createdBy: creatorUser.id
            }
          })
          totalAccounts++
          console.log(`    ✅ Account created: ${account.accountNumber}`)

          // Create initial deposit
          const deposit = await prisma.expenseAccountDeposits.create({
            data: {
              expenseAccountId: account.id,
              sourceType: 'MANUAL',
              amount: accountData.initialBalance,
              depositDate: new Date(),
              manualNote: `Initial deposit for ${accountData.accountName}`,
              createdBy: creatorUser.id
            }
          })
          totalDeposits++
          console.log(`    ✅ Initial deposit created: $${parseFloat(accountData.initialBalance).toFixed(2)}`)

        } catch (error) {
          console.error(`    ❌ Error creating account ${accountData.accountName}:`, error.message)
        }
      }
    }

    console.log('\n✅ Demo expense account seeding complete!')
    console.log(`\n📊 Summary:`)
    console.log(`   - Expense accounts created: ${totalAccounts}`)
    console.log(`   - Initial deposits created: ${totalDeposits}`)
    console.log(`   - Total balance across all accounts: $${Object.values(expenseAccountsByBusiness).flat().reduce((sum, acc) => sum + acc.initialBalance, 0).toFixed(2)}`)
    console.log('\n💡 Tips:')
    console.log('   - Finance Manager (marcus.thompson@restaurant-demo.com / Demo@123) has full access')
    console.log('   - Regular managers can make payments and view reports')
    console.log('   - Admin (admin@business.local / admin123) has full access')

  } catch (error) {
    console.error('❌ Error seeding demo expense accounts:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedDemoExpenseAccounts()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error)
    process.exit(1)
  })
