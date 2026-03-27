/**
 * Backfill: auto-grant FULL access to expense account creators who don't yet have a grant.
 * Fixes the bug where accounts created before POST handler auto-grant fix are invisible to their creator.
 * Run once: node scripts/backfill-expense-account-creator-grants.js
 */
require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find all accounts that have a createdBy but no grant for that user
  const accounts = await prisma.expenseAccounts.findMany({
    where: { createdBy: { isSet: true } },
    select: { id: true, accountNumber: true, accountName: true, createdBy: true },
  })

  let created = 0
  let skipped = 0

  for (const account of accounts) {
    const existing = await prisma.expenseAccountGrants.findUnique({
      where: { expenseAccountId_userId: { expenseAccountId: account.id, userId: account.createdBy } },
    })

    if (!existing) {
      await prisma.expenseAccountGrants.create({
        data: { expenseAccountId: account.id, userId: account.createdBy, permissionLevel: 'FULL' },
      })
      console.log(`  Created grant: ${account.accountName} (${account.accountNumber}) → user ${account.createdBy}`)
      created++
    } else {
      skipped++
    }
  }

  console.log(`\nDone. Created ${created} grants, skipped ${skipped} (already had grants).`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
