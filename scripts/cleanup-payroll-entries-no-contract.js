#!/usr/bin/env node
/*
  cleanup-payroll-entries-no-contract.js

  Usage:
    node scripts/cleanup-payroll-entries-no-contract.js <PAYROLL_PERIOD_ID> [--dry-run] [--yes]

  This script finds payrollEntry rows for the given payroll period that do not
  have an employee contract overlapping the payroll period (i.e., the
  employee had no valid contract for that period). It prints a report and,
  when not in --dry-run mode and when --yes is provided, deletes the offending
  payrollEntry rows and associated payrollEntryBenefit rows.

  Always run with --dry-run first.
*/

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const payrollPeriodId = args[0]
  const dryRun = args.includes('--dry-run')
  const yes = args.includes('--yes')

  if (!payrollPeriodId) {
    console.error('Usage: node scripts/cleanup-payroll-entries-no-contract.js <PAYROLL_PERIOD_ID> [--dry-run] [--yes]')
    process.exit(1)
  }

  console.log(`Running cleanup for payrollPeriodId=${payrollPeriodId} (dryRun=${dryRun})`)

  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollPeriodId } })
  if (!period) {
    console.error('Payroll period not found')
    process.exit(2)
  }

  // Fetch entries in the payroll period
  const entries = await prisma.payrollEntry.findMany({ where: { payrollPeriodId }, include: { employee: true } })
  console.log(`Found ${entries.length} payroll entries in period ${payrollPeriodId}`)

  const offenders = []

  for (const e of entries) {
    const employeeId = e.employeeId
    // Find any contract for the employee that overlaps the period
    const contract = await prisma.employeeContract.findFirst({
      where: {
        employeeId,
        startDate: { lte: period.endDate },
        AND: [
          {
            OR: [
              { status: 'active' },
              {
                AND: [
                  { status: 'terminated' },
                  { endDate: { gte: period.startDate } }
                ]
              }
            ]
          }
        ]
      }
    })

    if (!contract) {
      offenders.push({ entryId: e.id, employeeId, employeeNumber: e.employeeNumber, employeeName: e.employeeName })
    }
  }

  if (offenders.length === 0) {
    console.log('No payroll entries without overlapping contracts found. Nothing to do.')
    await prisma.$disconnect()
    return
  }

  console.log('\nPayroll entries with no overlapping contract:')
  offenders.forEach(o => console.log(`- entryId=${o.entryId} employee=${o.employeeNumber} (${o.employeeName})`))

  if (dryRun) {
    console.log('\nDry-run: no changes made. To delete these entries, run without --dry-run and with --yes to confirm.')
    await prisma.$disconnect()
    return
  }

  if (!yes) {
    console.log('\nNot deleting: re-run with --yes to confirm deletion (this is destructive).')
    await prisma.$disconnect()
    return
  }

  // Delete benefits then entries in transaction
  const entryIds = offenders.map(o => o.entryId)
  console.log(`\nDeleting ${entryIds.length} payrollEntry records and related benefits...`)
  await prisma.$transaction(async (tx) => {
    await tx.payrollEntryBenefit.deleteMany({ where: { payrollEntryId: { in: entryIds } } })
    await tx.payrollEntry.deleteMany({ where: { id: { in: entryIds } } })
  })

  console.log('Deletion complete.')
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Error during cleanup:', err)
  try { await prisma.$disconnect() } catch (e) {}
  process.exit(1)
})
