const { PrismaClient } = require('@prisma/client')
;(async () => {
  const p = new PrismaClient()
  try {
    const keys = Object.keys(p)
      .filter(k => typeof p[k] === 'function' || typeof p[k] === 'object')
    console.log('PrismaClient keys:', keys.sort())
  } catch (err) {
    console.error('Error listing prisma keys:', err)
  } finally {
    await p.$disconnect()
  }
})()
