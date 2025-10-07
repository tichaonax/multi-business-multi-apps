// Diagnostic script: prints payroll period entries for inspection
// Usage: node scripts/diagnose-period.js PP-KhQ1m6QGECSU

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const periodId = process.argv[2]
  if (!periodId) {
    console.error('Usage: node scripts/diagnose-period.js <periodId>')
    process.exit(1)
  }

  console.log('Fetching period:', periodId)
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      business: { select: { id: true, name: true, type: true } },
      payrollEntries: {
        include: {
          employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true, fullName: true, nationalId: true } },
          payrollEntryBenefits: true
        }
      }
    }
  })

  if (!period) {
    console.error('Period not found')
    process.exit(2)
  }

  // Print summary and the entry for EMP1001 if present
  console.log('Period summary: id=%s year=%s month=%s entries=%d', period.id, period.year, period.month, period.payrollEntries.length)
  const target = period.payrollEntries.find(e => (e.employeeNumber || (e.employee && e.employee.employeeNumber)) === 'EMP1001')
  if (target) {
    console.log('\nFound EMP1001 entry:')
    console.log(JSON.stringify(target, null, 2))
  } else {
    console.log('\nEMP1001 not found in this period. Listing first 5 entries:')
    console.log(JSON.stringify(period.payrollEntries.slice(0,5), null, 2))
  }

  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
