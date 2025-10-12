const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run(employeeNumber) {
  try {
    const e = await prisma.employees.findUnique({
      where: { employeeNumber },
      include: {
        employee_contracts_employee_contracts_employeeIdToemployees: {
          orderBy: { createdAt: 'desc' },
          include: { contract_benefits: { include: { benefitType: true } } }
        },
        employee_benefits: { include: { benefitTypes: true } }
      }
    })

    if (!e) return console.log('Employee not found for', employeeNumber)
    console.log('Employee:', e.fullName, e.employeeNumber, 'id:', e.id)

    console.log('\n-- Employee Benefits --')
    if (!e.employee_benefits || e.employee_benefits.length === 0) {
      console.log('No employee-level benefits')
    } else {
      for (const eb of e.employee_benefits) {
        console.log('Employee Benefit:', eb.benefitTypes ? eb.benefitTypes.name + ' (id:' + eb.benefitTypes.id + ')' : eb.benefitTypeId, 'amount:', eb.amount && eb.amount.toString(), 'isPercentage:', eb.isPercentage)
      }
    }

    console.log('\n-- Contract Benefits (per contract) --')
    if (!e.employee_contracts_employee_contracts_employeeIdToemployees || e.employee_contracts_employee_contracts_employeeIdToemployees.length === 0) {
      console.log('No contracts found for employee', employeeNumber)
    } else {
      for (const c of e.employee_contracts_employee_contracts_employeeIdToemployees) {
        console.log('\nContract:', c.contractNumber, 'id:', c.id, 'status:', c.status, 'baseSalary:', c.baseSalary && c.baseSalary.toString())
        if (!c.contract_benefits || c.contract_benefits.length === 0) console.log('  Benefits: none')
        for (const b of c.contract_benefits) {
          console.log('  Benefit:', b.benefitType ? (b.benefitType.name + ' (id:' + b.benefitType.id + ')') : b.benefitTypeId, 'amount:', b.amount && b.amount.toString(), 'isPercentage:', b.isPercentage)
        }
      }
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const emp = process.argv[2] || 'EMP1007'
  run(emp)
}

module.exports = { run }
