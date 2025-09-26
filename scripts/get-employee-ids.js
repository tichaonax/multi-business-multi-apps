const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function getEmployeeIds() {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        fullName: true,
        employeeNumber: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('📋 Employee IDs for testing:')
    employees.forEach(emp => {
      console.log(`   • ${emp.fullName} (${emp.employeeNumber}): ${emp.id}`)
    })
    
    return employees
    
  } catch (error) {
    console.error('❌ Error getting employee IDs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  getEmployeeIds()
}

module.exports = { getEmployeeIds }