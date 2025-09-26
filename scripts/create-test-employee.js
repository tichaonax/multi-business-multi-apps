const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function createTestEmployee() {
  try {
    console.log('🧪 Creating test employee for verification...')

    // Get required references first
    const business = await prisma.business.findFirst({
      where: { isActive: true }
    })
    
    const jobTitle = await prisma.jobTitle.findFirst({
      where: { isActive: true }
    })
    
    const compensationType = await prisma.compensationType.findFirst({
      where: { isActive: true }
    })

    if (!business || !jobTitle || !compensationType) {
      console.log('❌ Missing required data. Please run basic seed scripts first.')
      return false
    }

    // Create a test employee using correct camelCase field names
    const testEmployee = await prisma.employee.create({
      data: {
        id: crypto.randomUUID(),
        employeeNumber: 'TEST001',
        firstName: 'John',
        lastName: 'Test',
        fullName: 'John Test',
        email: 'john.test@example.com',
        phone: '+1-555-0123',
        nationalId: 'TEST-123-456',
        jobTitleId: jobTitle.id,
        compensationTypeId: compensationType.id,
        primaryBusinessId: business.id,
        hireDate: new Date('2024-01-01'),
        startDate: new Date('2024-01-01'),
        employmentStatus: 'active',
        isActive: true,
        createdBy: 'SYSTEM'
      }
    })

    console.log(`✅ Test employee created: ${testEmployee.fullName} (${testEmployee.employeeNumber})`)
    return true

  } catch (error) {
    console.error('❌ Error creating test employee:', error.message)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createTestEmployee()
    .then((success) => {
      if (success) {
        console.log('🎉 Test employee creation completed successfully!')
      }
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('Failed to create test employee:', error)
      process.exit(1)
    })
}

module.exports = { createTestEmployee }