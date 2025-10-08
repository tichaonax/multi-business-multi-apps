const { PrismaClient } = require('@prisma/client')
;(async () => {
  const p = new PrismaClient()
  try {
    const cols = await p.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='payroll_exports' ORDER BY ordinal_position")
    console.log(cols)
  } catch (e) {
    console.error(e)
  } finally {
    await p.$disconnect()
  }
})()
