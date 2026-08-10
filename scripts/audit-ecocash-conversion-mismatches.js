/**
 * Read-only audit for MBM-256: finds completed EcocashConversion records where the two
 * ledger legs (ecocashAmount OUTFLOW vs cashTendered INFLOW) differ by more than normal
 * whole-dollar rounding (~$0.50) — evidence of the pre-fix bug that allowed these two
 * amounts to be submitted independently with no validation between them.
 *
 * This script does NOT write anything to the database — it only reports.
 *
 * Usage:
 *   node scripts/audit-ecocash-conversion-mismatches.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const ROUNDING_TOLERANCE = 0.5

async function main() {
  console.log('================================================================')
  console.log(' ECOCASH CONVERSION MISMATCH AUDIT (read-only) — MBM-256')
  console.log('================================================================')
  console.log('')

  const rows = await prisma.ecocashConversion.findMany({
    where: { status: 'COMPLETED' },
    select: {
      id: true,
      ecocashAmount: true,
      cashTendered: true,
      tenderedAmount: true,
      businessId: true,
      completedAt: true,
      business: { select: { name: true } },
    },
    orderBy: { completedAt: 'asc' },
  })

  console.log(`Total completed conversions: ${rows.length}`)
  console.log('')

  const mismatched = rows.filter(r => {
    const eco = Number(r.ecocashAmount ?? 0)
    const cash = Number(r.cashTendered ?? 0)
    return Math.abs(cash - eco) > ROUNDING_TOLERANCE
  })

  if (mismatched.length === 0) {
    console.log('No mismatches found beyond normal whole-dollar rounding. Nothing to correct.')
    return
  }

  let totalDiff = 0
  for (const r of mismatched) {
    const eco = Number(r.ecocashAmount ?? 0)
    const cash = Number(r.cashTendered ?? 0)
    const diff = cash - eco
    totalDiff += diff
    console.log(`- ${r.business?.name ?? r.businessId} — conversion ${r.id}`)
    console.log(`    completedAt: ${r.completedAt?.toISOString()}`)
    console.log(`    ecocashAmount (OUTFLOW): $${eco.toFixed(2)}`)
    console.log(`    cashTendered (INFLOW):   $${cash.toFixed(2)}`)
    console.log(`    difference: ${diff > 0 ? '+' : ''}$${diff.toFixed(2)} ${diff > 0 ? '(cash created)' : '(cash destroyed)'}`)
    console.log('')
  }

  console.log('================================================================')
  console.log('Summary')
  console.log('================================================================')
  console.log(`Mismatched conversions: ${mismatched.length} of ${rows.length}`)
  console.log(`Net difference across all mismatches: ${totalDiff >= 0 ? '+' : ''}$${totalDiff.toFixed(2)}`)
  console.log('')
  console.log('This report does not modify any data. If a correction is needed, it will be')
  console.log('written as a reviewed SQL migration under prisma/migrations/, not applied directly.')
}

main()
  .catch(err => {
    console.error('Audit failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
