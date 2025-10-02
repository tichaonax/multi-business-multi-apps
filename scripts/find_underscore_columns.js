const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  try {
    const rows = await prisma.$queryRaw`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public' and column_name like '%\_%'
      order by table_name, column_name
    `
    if (!rows || rows.length === 0) {
      console.log('No columns with underscores found in public schema')
      return
    }
    console.log('Columns with underscores:')
    for (const r of rows) {
      console.log(`${r.table_name}.${r.column_name}`)
    }
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) run()
module.exports = { run }
