const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: node scripts/fix-payroll-baseSalary-and-dob.js <payrollPeriodId> [--dry-run]')
    process.exit(2)
  }

  const payrollPeriodId = args[0]
  const dryRun = args.includes('--dry-run')

  console.log(`Diagnosing payrollPeriod ${payrollPeriodId} (dryRun=${dryRun})`)

  const entries = await prisma.payrollEntry.findMany({
    where: { payrollPeriodId },
    include: { employee: true, payrollEntryBenefits: true }
  })

  if (!entries || entries.length === 0) {
    console.log('No payroll entries found for period', payrollPeriodId)
    await prisma.$disconnect()
    return
  }

  const updates = []

  for (const entry of entries) {
    const currentBase = entry.baseSalary != null ? (typeof entry.baseSalary.toNumber === 'function' ? entry.baseSalary.toNumber() : Number(entry.baseSalary)) : 0
    const dob = entry.employee?.dateOfBirth || null

    if (currentBase && currentBase !== 0 && dob) continue // already good

    // find latest contract for employee
    const contract = entry.employeeId ? await prisma.employeeContracts.findFirst({
      where: { employeeId: entry.employeeId },
      orderBy: { startDate: 'desc' },
      take: 1
    }) : null

    const contractBase = contract && contract.baseSalary != null ? (typeof contract.baseSalary.toNumber === 'function' ? contract.baseSalary.toNumber() : Number(contract.baseSalary)) : 0

    const benefitTotal = (entry.payrollEntryBenefits || []).reduce((s, b) => s + (b.amount != null ? (typeof b.amount.toNumber === 'function' ? b.amount.toNumber() : Number(b.amount)) : 0), 0)

    const commission = entry.commission != null ? (typeof entry.commission.toNumber === 'function' ? entry.commission.toNumber() : Number(entry.commission)) : 0
    const overtimePay = entry.overtimePay != null ? (typeof entry.overtimePay.toNumber === 'function' ? entry.overtimePay.toNumber() : Number(entry.overtimePay)) : 0
    const adjustmentsTotal = entry.adjustmentsTotal != null ? (typeof entry.adjustmentsTotal.toNumber === 'function' ? entry.adjustmentsTotal.toNumber() : Number(entry.adjustmentsTotal)) : 0
    const totalDeductions = entry.totalDeductions != null ? (typeof entry.totalDeductions.toNumber === 'function' ? entry.totalDeductions.toNumber() : Number(entry.totalDeductions)) : 0

    const newBase = currentBase && currentBase !== 0 ? currentBase : contractBase

    if ((newBase === 0 || newBase == null) && !dob) {
      // nothing to do
      continue
    }

    const plannedGross = newBase + commission + overtimePay + benefitTotal + adjustmentsTotal
    const plannedNet = plannedGross - totalDeductions

    updates.push({
      entryId: entry.id,
      employeeId: entry.employeeId,
      oldBase: currentBase,
      newBase,
      oldDob: entry.dateOfBirth || null,
      newDob: dob || null,
      plannedGross,
      plannedNet
    })
  }

  if (updates.length === 0) {
    console.log('No updates necessary')
    await prisma.$disconnect()
    return
  }

  console.log('Planned updates:')
  console.table(updates.map(u => ({ entryId: u.entryId, employeeId: u.employeeId, oldBase: u.oldBase, newBase: u.newBase, oldDob: u.oldDob, newDob: u.newDob })))

  if (dryRun) {
    console.log('Dry run - no changes applied')
    await prisma.$disconnect()
    return
  }

  // Apply updates
  for (const u of updates) {
    const setData = {}
    if (u.newBase != null && u.newBase !== 0) setData.baseSalary = u.newBase
    if (u.newDob && !u.oldDob) setData.dateOfBirth = new Date(u.newDob)

    // update gross/net as computed
    setData.grossPay = u.plannedGross
    setData.netPay = u.plannedNet

    await prisma.payrollEntry.update({ where: { id: u.entryId }, data: setData })
    console.log('Updated entry', u.entryId, 'baseSalary ->', u.newBase)
  }

  // Recompute period totals
  const allEntries = await prisma.payrollEntry.findMany({ where: { payrollPeriodId } })
  const totals = allEntries.reduce((acc, entry) => {
    const gross = entry.grossPay != null ? (typeof entry.grossPay.toNumber === 'function' ? entry.grossPay.toNumber() : Number(entry.grossPay)) : 0
    const totalDeductions = entry.totalDeductions != null ? (typeof entry.totalDeductions.toNumber === 'function' ? entry.totalDeductions.toNumber() : Number(entry.totalDeductions)) : 0
    const net = entry.netPay != null ? (typeof entry.netPay.toNumber === 'function' ? entry.netPay.toNumber() : Number(entry.netPay)) : 0
    acc.totalEmployees += 1
    acc.totalGrossPay += gross
    acc.totalDeductions += totalDeductions
    acc.totalNetPay += net
    return acc
  }, { totalEmployees: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 })

  await prisma.payrollPeriod.update({ where: { id: payrollPeriodId }, data: { totalEmployees: totals.totalEmployees, totalGrossPay: totals.totalGrossPay, totalDeductions: totals.totalDeductions, totalNetPay: totals.totalNetPay } })

  console.log('Applied updates and recomputed period totals')
  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Error running script:', err)
  prisma.$disconnect().then(() => process.exit(1))
})
