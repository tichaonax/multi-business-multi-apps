require('dotenv').config({ path: 'config/service.env' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async ()=>{
  try {
    const id = process.argv[2] || 'PE-hIr6sTmqXFfA'
    const entry = await prisma.payrollEntry.findUnique({ where: { id }, include: { payrollAdjustments: true, payrollEntryBenefits: true } })
    console.log('ENTRY RAW:\n', JSON.stringify(entry, null, 2))
    const adjustments = await prisma.payrollAdjustment.findMany({ where: { payrollEntryId: id }, orderBy: { createdAt: 'desc' } })
    console.log('\nADJUSTMENTS:\n', JSON.stringify(adjustments, null, 2))
    await prisma.$disconnect()
  } catch (err) {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  }
})()
