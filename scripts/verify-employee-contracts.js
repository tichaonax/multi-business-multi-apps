const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyEmployeeContracts() {
  try {
    console.log('🔍 Verifying employee contracts and data...')
    console.log('=' .repeat(50))
    
    // Check employees with contracts
    const employeesWithContracts = await prisma.employee.findMany({
      include: {
        employeeContracts: true,
        jobTitles: true,
        compensationTypes: true,
        business: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Found ${employeesWithContracts.length} employees`)
    console.log('')
    
    employeesWithContracts.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.fullName} (${emp.employeeNumber})`)
      console.log(`   📧 Email: ${emp.email || 'N/A'}`)
      console.log(`   📞 Phone: ${emp.phone}`)
      console.log(`   🏢 Job Title: ${emp.jobTitles?.title || 'N/A'}`)
      console.log(`   💰 Compensation: ${emp.compensationTypes?.name || 'N/A'}`)
      console.log(`   🏪 Business: ${emp.business?.name || 'N/A'}`)
      console.log(`   📋 Contracts: ${emp.employeeContracts?.length || 0}`)
      
      if (emp.employeeContracts?.length > 0) {
        emp.employeeContracts.forEach((contract, cIndex) => {
          console.log(`      Contract ${cIndex + 1}: ${contract.status} - $${contract.baseSalary}`)
        })
      }
      console.log('')
    })
    
    // Summary
    const totalContracts = employeesWithContracts.reduce((acc, emp) => acc + (emp.employeeContracts?.length || 0), 0)
    const employeesWithActiveContracts = employeesWithContracts.filter(emp => 
      emp.employeeContracts?.some(c => c.status === 'active')
    ).length
    
    console.log('📈 Summary:')
    console.log(`   • Total Employees: ${employeesWithContracts.length}`)
    console.log(`   • Total Contracts: ${totalContracts}`)
    console.log(`   • Employees with Active Contracts: ${employeesWithActiveContracts}`)
    
    return { employeesWithContracts, totalContracts, employeesWithActiveContracts }
    
  } catch (error) {
    console.error('❌ Error verifying employee contracts:', error)
    return null
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  verifyEmployeeContracts()
    .then((result) => {
      if (result) {
        console.log('🎉 Employee contract verification completed!')
      }
      process.exit(result ? 0 : 1)
    })
    .catch((error) => {
      console.error('Failed to verify employee contracts:', error)
      process.exit(1)
    })
}

module.exports = { verifyEmployeeContracts }