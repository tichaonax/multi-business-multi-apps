const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const [payrollPeriodId, businessId] = process.argv.slice(2)
  if (!payrollPeriodId || !businessId) {
    console.error('Usage: node scripts/diagnose-payroll-data.js <payrollPeriodId> <businessId>')
    process.exit(2)
  }

  console.log('Diagnosing payroll data for period:', payrollPeriodId, 'business:', businessId)

  const period = await prisma.payrollPeriod.findUnique({ where: { id: payrollPeriodId }, include: { business: true } })
  if (!period) {
    console.error('Payroll period not found')
    process.exit(3)
  }

  console.log('Payroll period:', { id: period.id, name: period.name || null, startDate: period.startDate, endDate: period.endDate })

  const employees = await prisma.employee.findMany({
    where: { primaryBusinessId: businessId, isActive: true },
    select: { id: true, employeeNumber: true, fullName: true, dateOfBirth: true },
    take: 50
  })

  console.log(`Found ${employees.length} active employees for business ${businessId}. Showing up to 50:`)

  const results = []
  let missingDobCount = 0
  let missingContractCount = 0
  let zeroBaseSalaryCount = 0

  for (const emp of employees) {
    const contract = await prisma.employeeContract.findFirst({ where: { employeeId: emp.id }, orderBy: { startDate: 'desc' } })
    const entry = await prisma.payrollEntry.findFirst({ where: { payrollPeriodId, employeeId: emp.id } })

    const baseSalaryRaw = contract?.baseSalary ? (typeof contract.baseSalary.toNumber === 'function' ? contract.baseSalary.toNumber() : String(contract.baseSalary)) : null

    const row = {
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      fullName: emp.fullName,
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.toISOString().split('T')[0] : null,
      hasPayrollEntry: !!entry,
      payrollEntryBaseSalary: entry ? (entry.baseSalary != null ? Number(entry.baseSalary) : null) : null,
      contractId: contract ? contract.id : null,
      contractBaseSalary: baseSalaryRaw
    }

    if (!emp.dateOfBirth) missingDobCount++
    if (!contract) missingContractCount++
    if (contract && (baseSalaryRaw === 0 || baseSalaryRaw === '0' || baseSalaryRaw === '0.00')) zeroBaseSalaryCount++

    results.push(row)
  }

  console.table(results)

  console.log('Summary:')
  console.log('  missing dateOfBirth:', missingDobCount)
  console.log('  missing contract:', missingContractCount)
  console.log('  contracts with zero baseSalary:', zeroBaseSalaryCount)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Error during diagnosis:', err)
  prisma.$disconnect().then(() => process.exit(1))
})
