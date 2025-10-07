const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function randomDob(minAge = 18, maxAge = 65) {
  const today = new Date()
  const maxDate = new Date()
  maxDate.setFullYear(today.getFullYear() - minAge)
  const minDate = new Date()
  minDate.setFullYear(today.getFullYear() - maxAge)
  const rand = new Date(minDate.getTime() + Math.floor(Math.random() * (maxDate.getTime() - minDate.getTime())))
  return rand
}

async function createSimpleEmployees() {
  try {
    console.log('👥 Creating simple sample employees...')

    // Get existing data
    const businesses = await prisma.business.findMany()
    const jobTitles = await prisma.jobTitle.findMany()
    const compensationTypes = await prisma.compensationType.findMany()

    if (businesses.length === 0 || jobTitles.length === 0 || compensationTypes.length === 0) {
      console.log('❌ Missing required data. Please run seed scripts first.')
      return
    }

    const primaryBusiness = businesses[0]
    const managerJobTitle = jobTitles[0]
    const salaryCompensation = compensationTypes[0]

    // Create one simple employee
    const existingEmployee = await prisma.employee.findUnique({
      where: { employeeNumber: 'EMP001' }
    })

    if (!existingEmployee) {
      const employee = await prisma.employee.create({
        data: {
          employeeNumber: 'EMP001',
          firstName: 'John',
          lastName: 'Smith',
          fullName: 'John Smith',
          email: 'john.smith@company.com',
          phone: '+1-555-0101',
          nationalId: 'ID123456789',
          dateOfBirth: randomDob(),
          hireDate: new Date('2022-01-15'),
          employmentStatus: 'active',
          jobTitleId: managerJobTitle.id,
          compensationTypeId: salaryCompensation.id,
          primaryBusinessId: primaryBusiness.id,
          address: '123 Main St, City, State',
          notes: 'Sample employee for testing'
        }
      })
      console.log(`✅ Created employee: ${employee.fullName}`)
    } else {
      console.log('⏭️ Employee already exists')
    }

    console.log('🎉 Sample employee created successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Sign in to your application')
    console.log('2. Look for "Employee Management" section in the sidebar')
    console.log('3. Click on "Employees" to view the employee list')
    console.log('4. You should see the sample employee')

  } catch (error) {
    console.error('❌ Error creating simple employees:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSimpleEmployees()