const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run(empId) {
  try {
    const rows = await prisma.$queryRaw`
      select c.*
      from employee_contracts c
      where c."employeeId" = ${empId}
      limit 1
    `
    if (!rows || rows.length === 0) return console.log('No contracts')
    const r = rows[0]
    console.log('Row keys:', Object.keys(r))
    console.log('Sample row:', r)
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
