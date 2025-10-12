const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run(empId) {
  try {
    const contracts = await prisma.employeeContracts.findMany({
      where: { employeeId: empId },
      include: { contract_benefits: { include: { benefitType: true } } },
      orderBy: { createdAt: 'desc' }
    })
    if (!contracts || contracts.length === 0) return console.log('No contracts found for', empId)
    console.log('Found', contracts.length, 'contracts for', empId)
    for (const c of contracts) {
      console.log('Contract:', c.contractNumber, 'status:', c.status, 'baseSalary:', c.baseSalary && c.baseSalary.toString())
      console.log('  pdfGenerationData present:', !!c.pdfGenerationData)
      if (!c.contract_benefits || c.contract_benefits.length === 0) console.log('  Benefits: none')
      for (const b of c.contract_benefits) {
        console.log('  Benefit:', b.benefitType?.name || b.benefitTypeId, 'amount:', b.amount && b.amount.toString(), 'isPercentage:', b.isPercentage)
      }
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  const id = process.argv[2] || '148336d5-a366-444a-841a-57432c4b85d1'
  run(id)
}

module.exports = { run }
