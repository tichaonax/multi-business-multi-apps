const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run(empId) {
  try {
    const e = await prisma.employee.findUnique({
      where: { id: empId },
      include: {
        employeeContracts: {
          include: { contract_benefits: { include: { benefitType: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    if (!e) return console.log('Employee not found')
    console.log('Employee:', e.fullName, e.employeeNumber)
    for (const c of e.employeeContracts) {
      console.log('Contract:', c.contractNumber, c.status)
      console.log('  Base Salary:', c.baseSalary && c.baseSalary.toString())
      if (c.contract_benefits.length === 0) console.log('  Benefits: none')
      for (const b of c.contract_benefits) {
        console.log('  Benefit:', b.benefitType.name, 'amount:', b.amount.toString(), 'isPercentage:', b.isPercentage)
      }
    }
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const id = process.argv[2] || '148336d5-a366-444a-841a-57432c4b85d1'
  run(id)
}

module.exports = { run }
