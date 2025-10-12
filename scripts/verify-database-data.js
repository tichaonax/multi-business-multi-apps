const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyDatabaseData() {
  try {
    console.log('🔍 Checking current database data...')
    console.log('=' .repeat(50))

    // Check basic reference data
    const businesses = await prisma.businesses.count()
    const jobTitles = await prisma.jobTitle.count()
    const compensationTypes = await prisma.compensationType.count()
    const benefitTypes = await prisma.benefitType.count()
    const employees = await prisma.employees.count()
    const employeeContracts = await prisma.employeeContracts.count()

    console.log('📊 Current Data Counts:')
    console.log(`   • Businesses: ${businesses}`)
    console.log(`   • Job Titles: ${jobTitles}`)
    console.log(`   • Compensation Types: ${compensationTypes}`)
    console.log(`   • Benefit Types: ${benefitTypes}`)
    console.log(`   • Employees: ${employees}`)
    console.log(`   • Employee Contracts: ${employeeContracts}`)
    console.log('')

    if (employees > 0) {
      console.log('👥 Sample Employees:')
      const sampleEmployees = await prisma.employees.findMany({
        take: 5,
        include: {
          jobTitles: true,
          compensationTypes: true,
          business: true
        }
      })
      
      sampleEmployees.forEach(emp => {
        console.log(`   • ${emp.fullName} (${emp.employeeNumber}) - ${emp.jobTitles?.title || 'No title'} at ${emp.business?.name || 'No business'}`)
      })
    }

    return {
      businesses,
      jobTitles,
      compensationTypes,
      benefitTypes,
      employees,
      employeeContracts
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message)
    return null
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  verifyDatabaseData()
    .then((data) => {
      if (data) {
        console.log('🎉 Database verification completed!')
      }
      process.exit(data ? 0 : 1)
    })
    .catch((error) => {
      console.error('Failed to verify database:', error)
      process.exit(1)
    })
}

module.exports = { verifyDatabaseData }