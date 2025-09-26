const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkExistingEmployees() {
  try {
    console.log('Checking existing employees...')
    
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    })
    
    console.log(`Found ${employees.length} existing employees:`)
    employees.forEach(emp => {
      console.log(`- ${emp.firstName} ${emp.lastName} (${emp.email})`)
    })
    
    if (employees.length > 0) {
      console.log('\nDeleting existing employees to avoid duplicates...')
      await prisma.employee.deleteMany()
      console.log('✅ Existing employees deleted')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkExistingEmployees()