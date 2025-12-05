/**
 * Final Expense Account Backup Test
 *
 * Creates expense accounts, backs them up, validates they're in the backup
 */

const { PrismaClient } = require('@prisma/client')
const { createCleanBackup } = require('../src/lib/backup-clean')
const prisma = new PrismaClient()
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('EXPENSE ACCOUNT BACKUP VALIDATION TEST')
  console.log('='.repeat(80) + '\n')

  const createdIds = []

  try {
    // Get user and business
    const user = await prisma.users.findFirst({ where: { role: 'admin' } })
    const business = await prisma.businesses.findFirst({ where: { isDemo: false } })

    console.log(`Using: ${user.email} / ${business.name}\n`)

    // Create 3 expense accounts (all WITHOUT transactions)
    console.log('Creating 3 expense accounts (NO transactions)...\n')

    const account1 = await prisma.expenseAccounts.create({
      data: {
        id: `test-exp-1-${Date.now()}`,
        accountName: '🧪 BACKUP TEST #1 - NO TRANSACTIONS',
        accountNumber: `TEST1-${Date.now()}`,
        balance: 1000,
        createdBy: user.id,
        isActive: true
      }
    })
    createdIds.push(account1.id)
    console.log(`✓ Account 1: ${account1.accountName}`)
    console.log(`  ID: ${account1.id}`)
    console.log(`  Balance: $${account1.balance}\n`)

    await new Promise(resolve => setTimeout(resolve, 10)) // Small delay for unique IDs

    const account2 = await prisma.expenseAccounts.create({
      data: {
        id: `test-exp-2-${Date.now()}`,
        accountName: '🧪 BACKUP TEST #2 - NO TRANSACTIONS',
        accountNumber: `TEST2-${Date.now()}`,
        balance: 2000,
        createdBy: user.id,
        isActive: true
      }
    })
    createdIds.push(account2.id)
    console.log(`✓ Account 2: ${account2.accountName}`)
    console.log(`  ID: ${account2.id}`)
    console.log(`  Balance: $${account2.balance}\n`)

    await new Promise(resolve => setTimeout(resolve, 10))

    const account3 = await prisma.expenseAccounts.create({
      data: {
        id: `test-exp-3-${Date.now()}`,
        accountName: '🧪 BACKUP TEST #3 - NO TRANSACTIONS',
        accountNumber: `TEST3-${Date.now()}`,
        balance: 3000,
        createdBy: user.id,
        isActive: true
      }
    })
    createdIds.push(account3.id)
    console.log(`✓ Account 3: ${account3.accountName}`)
    console.log(`  ID: ${account3.id}`)
    console.log(`  Balance: $${account3.balance}\n`)

    console.log('='.repeat(80))
    console.log(`✅ Created 3 expense accounts (total balance: $${1000 + 2000 + 3000})`)
    console.log('   ⚠️  NONE have transactions - this is the critical test!')
    console.log('='.repeat(80) + '\n')

    // Perform backup
    console.log('Performing backup...\n')

    const backupData = await createCleanBackup(prisma, {
      includeDemoData: false,
      includeBusinessData: true,
      includeAuditLogs: false
    })

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
    const filename = path.join(__dirname, `expense-backup-test-${timestamp}.json`)

    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2))

    const fileSizeKB = (fs.statSync(filename).size / 1024).toFixed(2)

    console.log(`✓ Backup created (version ${backupData.metadata.version})`)
    console.log(`✓ Saved to: ${path.basename(filename)}`)
    console.log(`✓ Size: ${fileSizeKB} KB\n`)

    // Validate
    console.log('='.repeat(80))
    console.log('VALIDATING BACKUP')
    console.log('='.repeat(80) + '\n')

    const expenseAccounts = backupData.expenseAccounts || []
    console.log(`Total expense accounts in backup: ${expenseAccounts.length}\n`)

    let passed = 0
    let failed = 0

    createdIds.forEach((id, index) => {
      const found = expenseAccounts.find(a => a.id === id)

      if (found) {
        console.log(`✅ Test Account #${index + 1}: FOUND in backup`)
        console.log(`   ${found.accountName}`)
        console.log(`   Number: ${found.accountNumber}`)
        console.log(`   Balance: $${found.balance}\n`)
        passed++
      } else {
        console.log(`❌ Test Account #${index + 1}: NOT FOUND in backup`)
        console.log(`   ID: ${id}\n`)
        failed++
      }
    })

    console.log('='.repeat(80))
    console.log('RESULTS')
    console.log('='.repeat(80))
    console.log(`Accounts Created: 3`)
    console.log(`Found in Backup: ${passed}`)
    console.log(`Missing: ${failed}`)
    console.log(`Backup File: ${filename}`)
    console.log('='.repeat(80) + '\n')

    // Cleanup
    console.log('Cleaning up...')
    for (const id of createdIds) {
      await prisma.expenseAccounts.delete({ where: { id } })
    }
    console.log(`✓ Deleted ${createdIds.length} test accounts\n`)

    if (failed === 0) {
      console.log('🎉 TEST PASSED - All expense accounts backed up correctly!')
      console.log('   The fix is working!\n')
      return 0
    } else {
      console.log('❌ TEST FAILED - Some accounts missing from backup!')
      console.log('   The bug still exists!\n')
      return 1
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error('\nFull error:', error)

    // Cleanup on error
    if (createdIds.length > 0) {
      console.log(`\nCleaning up ${createdIds.length} test accounts...`)
      for (const id of createdIds) {
        try {
          await prisma.expenseAccounts.delete({ where: { id } })
        } catch {}
      }
      console.log('✓ Cleanup done\n')
    }

    return 1
  } finally {
    await prisma.$disconnect()
  }
}

main().then(exitCode => process.exit(exitCode))
