const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDemoEmployees() {
  try {
    console.log('👥 Checking Employees in Demo Businesses...\n')

    const demoBizIds = [
      'restaurant-demo-business',
      'grocery-demo-business',
      'grocery-demo-2',
      'hardware-demo-business',
      'clothing-demo-business'
    ]

    for (const bizId of demoBizIds) {
      const business = await prisma.businesses.findUnique({
        where: { id: bizId },
        select: { name: true, type: true }
      })

      if (!business) {
        console.log(`❌ Business ${bizId} not found\n`)
        continue
      }

      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: bizId },
        select: {
          id: true,
          fullName: true,
          employeeNumber: true,
          isActive: true
        }
      })

      console.log(`📊 ${business.name} (${business.type})`)
      console.log(`   Business ID: ${bizId}`)
      console.log(`   Employees: ${employees.length}`)

      if (employees.length > 0) {
        employees.slice(0, 3).forEach(emp => {
          console.log(`      - ${emp.fullName} (${emp.employeeNumber})`)
        })
        if (employees.length > 3) {
          console.log(`      ... and ${employees.length - 3} more`)
        }
      }
      console.log('')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDemoEmployees()
