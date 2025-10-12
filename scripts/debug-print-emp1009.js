const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const employee = await prisma.employees.findFirst({ where: { employeeNumber: 'EMP1009' } })
    if (!employee) {
      console.error('Employee EMP1009 not found')
      process.exit(1)
    }

    const contracts = await prisma.employeeContracts.findMany({
      where: { employeeId: employee.id },
      select: { contractNumber: true, id: true, pdfGenerationData: true, baseSalary: true, startDate: true }
    })

    console.log(JSON.stringify({ employeeNumber: 'EMP1009', employeeId: employee.id, contracts }, null, 2))
  } catch (err) {
    console.error('Error querying DB:', err)
    process.exit(2)
  } finally {
    await prisma.$disconnect()
  }
}

main()
