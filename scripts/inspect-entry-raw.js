require('dotenv').config({ path: 'config/service.env' })
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async ()=>{
  try {
    const id = process.argv[2] || 'PE-hIr6sTmqXFfA'
    const entry = await prisma.payrollEntry.findUnique({ where: { id }, select: { id:true, baseSalary:true, benefitsTotal:true, adjustmentsTotal:true, adjustmentsAsDeductions:true, totalDeductions:true, advanceDeductions:true, loanDeductions:true, miscDeductions:true } })
    console.log('Raw entry:', JSON.stringify(entry, null, 2))
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
})()
