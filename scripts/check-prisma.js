(async function(){
  try {
    const { PrismaClient } = require('@prisma/client')
    const p = new PrismaClient()
    console.log('PrismaClient delegates keys sample:', Object.keys(p).slice(0,40))
    console.log('has payrollExport delegate?:', typeof p.payrollExport)
    await p.$disconnect()
  } catch (err) {
    console.error('error checking prisma client:', err)
    process.exit(1)
  }
})()
