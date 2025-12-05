/**
 * Simple Expense Account Backup Test
 *
 * Tests that the expense account backup fix is working
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('EXPENSE ACCOUNT BACKUP FIX VALIDATION')
  console.log('='.repeat(70) + '\n')

  let testAccountId = null

  try {
    //Get user and business
    const user = await prisma.users.findFirst({ where: { role: 'admin' } })
    const business = await prisma.businesses.findFirst({ where: { isDemo: false } })

    if (!user || !business) {
      console.log('❌ No admin user or business found\n')
      return 1
    }

    console.log(`Using user: ${user.email}`)
    console.log(`Using business: ${business.name}\n`)

    // Ensure membership
    let membership = await prisma.businessMemberships.findFirst({
      where: { userId: user.id, businessId: business.id }
    })

    if (!membership) {
      membership = await prisma.businessMemberships.create({
        data: {
          id: `test-mbr-${Date.now()}`,
          userId: user.id,
          businessId: business.id,
          role: 'admin'
        }
      })
      console.log('✓ Created membership\n')
    }

    // Create test expense account
    console.log('Creating test expense account (NO transactions)...')
    const account = await prisma.expenseAccounts.create({
      data: {
        id: `test-exp-${Date.now()}`,
        accountName: '🧪 TEST - Backup Validation',
        accountNumber: `TEST-${Date.now()}`,
        balance: 1000,
        createdBy: user.id,
        description: 'Test account to validate backup fix',
        isActive: true
      }
    })
    testAccountId = account.id

    console.log(`✓ Created: ${account.accountName}`)
    console.log(`  ID: ${account.id}`)
    console.log(`  Balance: $${account.balance}`)
    console.log(`  Created by: ${user.email}`)
    console.log(`  ⚠️  Has NO transactions\n`)

    // Test backup
    console.log('Testing backup via API...')
    const response = await fetch('http://localhost:8080/api/backup?includeDemoData=false&includeBusinessData=true')

    if (!response.ok) {
      console.log(`❌ Backup API returned ${response.status}`)
      return 1
    }

    const backupData = await response.json()
    console.log(`✓ Backup created (version ${backupData.metadata.version})\n`)

    // Validate
    console.log('Validating backup...')
    const expenseAccounts = backupData.expenseAccounts || []

    console.log(`Total expense accounts in backup: ${expenseAccounts.length}`)

    const found = expenseAccounts.find(a => a.id === testAccountId)

    if (found) {
      console.log(`\n✅ SUCCESS: Test account found in backup!`)
      console.log(`   Account: ${found.accountName}`)
      console.log(`   Number: ${found.accountNumber}`)
      console.log(`   Balance: $${found.balance}`)
      console.log(`\n🎉 THE FIX IS WORKING!`)
      console.log(`   Expense accounts WITHOUT transactions are now backed up.\n`)
    } else {
      console.log(`\n❌ FAILED: Test account NOT in backup!`)
      console.log(`   This means the fix is not working.\n`)
      return 1
    }

    // Cleanup
    console.log('Cleaning up...')
    await prisma.expenseAccounts.delete({ where: { id: testAccountId } })
    console.log('✓ Deleted test account\n')

    return 0

  } catch (error) {
    console.error('\n❌ Error:', error.message)

    // Try cleanup
    if (testAccountId) {
      try {
        await prisma.expenseAccounts.delete({ where: { id: testAccountId } })
        console.log('✓ Cleaned up test account')
      } catch {}
    }

    return 1
  } finally {
    await prisma.$disconnect()
  }
}

main().then(exitCode => {
  console.log('='.repeat(70) + '\n')
  process.exit(exitCode)
})
