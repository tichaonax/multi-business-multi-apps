// Quick script to verify Prisma include keys for Employee
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

;(async ()=>{
  try{
    await prisma.$connect()
    const e = await prisma.employee.findUnique({
      where: { id: 'test-employee' },
      include: {
        idFormatTemplates: true,
        driverLicenseTemplates: true,
        businesses: true,
      }
    })
    console.log('RESULT', JSON.stringify(e, null, 2))
  }catch(err){
    console.error('PRISMA ERROR', err && err.message ? err.message : err)
  }finally{
    await prisma.$disconnect()
  }
})()
