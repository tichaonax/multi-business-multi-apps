/**
 * One-time data fix: re-link employee records to their user accounts.
 *
 * Background: A bug in the employee edit form's PUT handler was setting
 * `userId = null` on every save because the form didn't round-trip the field.
 * This script finds employees whose `userId` is null but have a matching user
 * account (matched by email) and restores the link.
 *
 * Safe to run multiple times — it only touches rows that are currently unlinked.
 *
 * Run with:
 *   npx tsx scripts/fix-employee-user-links.ts
 *   -- or --
 *   npx ts-node --skip-project scripts/fix-employee-user-links.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Finding employees with no userId but a matching user account by email...\n')

  // Find all employees without a userId who have an email set
  const unlinkedEmployees = await prisma.employees.findMany({
    where: {
      userId: null,
      email: { not: null }
    },
    select: {
      id: true,
      employeeNumber: true,
      fullName: true,
      email: true
    }
  })

  console.log(`Found ${unlinkedEmployees.length} employees with userId=null and an email address.`)

  if (unlinkedEmployees.length === 0) {
    console.log('✅ Nothing to fix.')
    return
  }

  let fixed = 0
  let skipped = 0

  for (const emp of unlinkedEmployees) {
    if (!emp.email) continue

    // Find a matching user by email
    const matchingUser = await prisma.users.findUnique({
      where: { email: emp.email },
      select: { id: true, email: true, name: true }
    })

    if (!matchingUser) {
      console.log(`  ⏭️  ${emp.employeeNumber} ${emp.fullName} (${emp.email}) — no matching user found, skipping`)
      skipped++
      continue
    }

    // Check the user isn't already linked to a different employee
    const alreadyLinked = await prisma.employees.findUnique({
      where: { userId: matchingUser.id },
      select: { id: true, employeeNumber: true, fullName: true }
    })

    if (alreadyLinked && alreadyLinked.id !== emp.id) {
      console.log(`  ⚠️  ${emp.employeeNumber} ${emp.fullName} — user ${matchingUser.email} is already linked to ${alreadyLinked.employeeNumber} ${alreadyLinked.fullName}, skipping`)
      skipped++
      continue
    }

    // Restore the link
    await prisma.employees.update({
      where: { id: emp.id },
      data: { userId: matchingUser.id }
    })

    console.log(`  ✅ Linked ${emp.employeeNumber} ${emp.fullName} → user "${matchingUser.name}" (${matchingUser.email})`)
    fixed++
  }

  console.log(`\nDone. ${fixed} employee(s) re-linked, ${skipped} skipped.`)
}

main()
  .catch(err => {
    console.error('Script failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
