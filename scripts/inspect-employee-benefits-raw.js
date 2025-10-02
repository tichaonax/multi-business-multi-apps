const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run(empId) {
  try {
    const contracts = await prisma.$queryRaw`
      select c.*, cb.id as benefit_id, cb.amount, cb.is_percentage, bt.name as benefit_name
      from employee_contracts c
      left join contract_benefits cb on cb.contract_id = c.id
      left join benefit_types bt on bt.id = cb.benefit_type_id
      where c.employee_id = ${empId}
      order by c.created_at desc
    `
    if (!contracts || contracts.length === 0) return console.log('No contracts or employee not found')
    // Group by contract
    const map = new Map()
    for (const row of contracts) {
      const cid = row.id
      if (!map.has(cid)) map.set(cid, { contract: row, benefits: [] })
      if (row.benefit_id) {
        map.get(cid).benefits.push({ id: row.benefit_id, name: row.benefit_name, amount: row.amount, isPercentage: row.is_percentage })
      }
    }
    console.log('Found', map.size, 'contracts')
    for (const [cid, { contract, benefits }] of map) {
      console.log('Contract:', contract.contract_number, 'baseSalary:', contract.base_salary, 'pdfGenerationData present:', !!contract.pdf_generation_data)
      if (benefits.length === 0) console.log('  Benefits: none')
      for (const b of benefits) {
        console.log('  Benefit:', b.name, 'amount:', b.amount, 'isPercentage:', b.ispercentage)
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
