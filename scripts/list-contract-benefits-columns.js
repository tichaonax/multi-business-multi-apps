const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  try {
    const cols = await prisma.$queryRaw`select column_name from information_schema.columns where table_name = 'contract_benefits'`
    console.log('contract_benefits columns:')
    console.log(cols)
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) run()
module.exports = { run }
