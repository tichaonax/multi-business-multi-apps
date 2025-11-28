/**
 * Add Missing Deposits to Expense Accounts
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addMissingDeposits() {
  try {
    console.log('💳 Adding missing deposits to expense accounts...')

    const admin = await prisma.users.findUnique({
      where: { email: 'admin@business.local' }
    })

    if (!admin) {
      console.log('❌ Admin user not found')
      return
    }

    const accounts = await prisma.expenseAccounts.findMany({
      include: {
        deposits: true
      }
    })

    let createdCount = 0

    for (const account of accounts) {
      if (account.deposits.length === 0) {
        await prisma.expenseAccountDeposits.create({
          data: {
            expenseAccountId: account.id,
            sourceType: 'MANUAL',
            amount: account.balance,
            depositDate: new Date(),
            manualNote: `Initial deposit for ${account.accountName}`,
            createdBy: admin.id
          }
        })
        console.log(`✅ Created deposit for ${account.accountName}`)
        createdCount++
      } else {
        console.log(`⏭️  ${account.accountName} already has deposits`)
      }
    }

    console.log(`\n✅ Created ${createdCount} deposits`)

  } catch (error) {
    console.error('❌ Error adding deposits:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addMissingDeposits()
