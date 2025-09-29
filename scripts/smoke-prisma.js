const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

;(async () => {
  try {
    console.log('Prisma client initializing')
    const u = await p.user.findFirst({ select: { id: true, email: true } })
    console.log('User:', u)
  } catch (e) {
    console.error(e)
    process.exitCode = 1
  } finally {
    await p.$disconnect()
  }
})()
