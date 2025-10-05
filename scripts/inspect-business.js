const { PrismaClient } = require('@prisma/client')
;(async () => {
  const prisma = new PrismaClient()
  try {
    const id = process.argv[2] || 'cmfj6cfvz00001pgg2rn9710e'
    const b = await prisma.business.findUnique({ where: { id } })
    console.log(JSON.stringify(b, null, 2))
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
})()
