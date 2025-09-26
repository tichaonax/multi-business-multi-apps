const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestEmployeeWithContract() {
  try {
    console.log('🔍 Creating test employee with contract for PDF validation...')
    
    // First, get or create a test business
    let business = await prisma.business.findFirst({
      where: { name: { contains: 'Test' } }
    })
    
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: 'Test Construction Company',
          type: 'construction',
          description: 'Test business for contract validation'
        }
      })
      console.log(`✅ Created test business: ${business.name}`)
    }
    
    // Get or create a job title
    let jobTitle = await prisma.jobTitle.findFirst()
    
    if (!jobTitle) {
      jobTitle = await prisma.jobTitle.create({
        data: {
          title: 'Construction Manager',
          description: 'Oversees construction projects and manages teams',
          department: 'Operations',
          level: 'Manager',
          responsibilities: ['Project oversight', 'Team management', 'Quality control']
        }
      })
      console.log(`✅ Created job title: ${jobTitle.title}`)
    }
    
    // Get or create compensation type
    let compensationType = await prisma.compensationType.findFirst()
    
    if (!compensationType) {
      compensationType = await prisma.compensationType.create({
        data: {
          name: 'Management Package',
          type: 'salary_plus_commission',
          baseAmount: 5000.00,
          commissionPercentage: 5.0
        }
      })
      console.log(`✅ Created compensation type: ${compensationType.name}`)
    }
    
    // Create test employee (check for existing first)
    let employee = await prisma.employee.findFirst({
      where: { employeeNumber: 'EMP001' }
    })
    
    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          employeeNumber: 'EMP001',
          firstName: 'John',
          lastName: 'Michael Smith',
          fullName: 'John Michael Smith',
          email: 'john.smith@testcompany.com',
          phone: '+1-555-0199',
          nationalId: '123-45-6789',
          address: '456 Employee Street, Worker Town, WT 54321',
          dateOfBirth: new Date('1985-03-15'),
          hireDate: new Date('2024-01-15'),
          employmentStatus: 'active',
          primaryBusinessId: business.id,
          jobTitleId: jobTitle.id,
          compensationTypeId: compensationType.id
        }
      })
      console.log(`✅ Created test employee: ${employee.fullName} (${employee.employeeNumber})`)
    } else {
      console.log(`✅ Found existing employee: ${employee.fullName} (${employee.employeeNumber})`)
      // Update employee to ensure it has all required relationships
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: {
          primaryBusinessId: business.id,
          jobTitleId: jobTitle.id,
          compensationTypeId: compensationType.id
        }
      })
      console.log(`✅ Updated existing employee relationships`)
    }
    
    // Create employee contract matching Hwanda Enterprises template requirements
    // Check for existing active contract first
    let contract = await prisma.employeeContract.findFirst({
      where: { 
        employeeId: employee.id,
        status: 'active'
      }
    })
    
    if (!contract) {
      contract = await prisma.employeeContract.create({
        data: {
          employeeId: employee.id,
          contractNumber: `CONTRACT-${employee.employeeNumber}-2024`,
          jobTitleId: jobTitle.id,
          compensationTypeId: compensationType.id,
          baseSalary: 5500.00, // Different from compensation base to test actual contract values
          livingAllowance: 800.00, // Living allowance as per Hwanda template
          commissionAmount: 275.00, // 5% commission on base
          contractDurationMonths: 12, // Specified duration
          startDate: new Date('2024-01-15'),
          endDate: new Date('2025-01-14'), // 12 month contract
          primaryBusinessId: business.id,
          supervisorId: employee.id, // Using same employee as supervisor for test purposes
          supervisorName: 'Sarah Johnson',
          supervisorTitle: 'Operations Manager',
          status: 'active',
          createdBy: 'system-test'
        }
      })
      console.log(`✅ Created contract: $${contract.baseSalary} + $${contract.livingAllowance} living + $${contract.commissionAmount} commission`)
    } else {
      console.log(`✅ Found existing active contract: $${contract.baseSalary} + $${contract.livingAllowance} living + $${contract.commissionAmount} commission`)
    }
    
    // Create some time tracking data
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    
    // Check for existing time tracking first
    let timeTracking = await prisma.employeeTimeTracking.findFirst({
      where: {
        employeeId: employee.id,
        year: currentYear,
        month: currentMonth
      }
    })
    
    if (!timeTracking) {
      timeTracking = await prisma.employeeTimeTracking.create({
        data: {
          employeeId: employee.id,
          year: currentYear,
          month: currentMonth,
          workDays: 22
        }
      })
      console.log(`✅ Created time tracking: ${22} work days for ${currentMonth}/${currentYear}`)
    } else {
      console.log(`✅ Found existing time tracking: ${timeTracking.workDays} work days for ${currentMonth}/${currentYear}`)
    }
    
    // Create some allowances for payroll testing
    const allowanceTypes = [
      { type: 'vehicle_reimbursement', amount: 300.00 },
      { type: 'travel_allowance', amount: 150.00 },
      { type: 'overtime', amount: 400.00 }
    ]
    
    // Check for existing allowances first
    const existingAllowances = await prisma.employeeAllowance.findMany({
      where: {
        employeeId: employee.id,
        payrollMonth: currentMonth,
        payrollYear: currentYear
      }
    })
    
    if (existingAllowances.length === 0) {
      for (const allowance of allowanceTypes) {
        await prisma.employeeAllowance.create({
          data: {
            employeeId: employee.id,
            type: allowance.type,
            amount: allowance.amount,
            payrollMonth: currentMonth,
            payrollYear: currentYear
          }
        })
      }
      console.log(`✅ Created allowances: Vehicle $300, Travel $150, Overtime $400`)
    } else {
      console.log(`✅ Found existing allowances: ${existingAllowances.length} records for ${currentMonth}/${currentYear}`)
    }
    
    console.log('')
    console.log('📋 Test Employee Contract Data:')
    console.log('=' .repeat(50))
    console.log(`Employee ID: ${employee.id}`)
    console.log(`Employee Number: ${employee.employeeNumber}`)
    console.log(`Full Name: ${employee.fullName}`)
    console.log(`Email: ${employee.email}`)
    console.log(`Phone: ${employee.phone}`)
    console.log(`National ID: ${employee.nationalId}`)
    console.log(`Address: ${employee.address}`)
    console.log(`Business: ${business.name}`)
    console.log(`Job Title: ${jobTitle.title}`)
    console.log('')
    console.log('💰 Contract Details:')
    console.log(`Contract ID: ${contract.id}`)
    console.log(`Basic Salary: $${contract.baseSalary}`)
    console.log(`Living Allowance: $${contract.livingAllowance}`)
    console.log(`Commission: $${contract.commissionAmount}`)
    console.log(`Total Monthly: $${parseFloat(contract.baseSalary) + parseFloat(contract.livingAllowance) + parseFloat(contract.commissionAmount)}`)
    console.log(`Duration: ${contract.contractDurationMonths} months`)
    console.log(`Start Date: ${contract.startDate.toDateString()}`)
    console.log(`End Date: ${contract.endDate?.toDateString()}`)
    console.log('')
    console.log('🔗 API Endpoints to Test:')
    console.log(`GET  /api/employees/${employee.id}/contracts - View contract data`)
    console.log(`POST /api/employees/${employee.id}/contracts - Download contract PDF`)
    console.log(`GET  /api/payroll/export?month=${currentMonth}&year=${currentYear}&businessId=${business.id}&format=xlsx`)
    console.log('')
    console.log('🎉 Test data created successfully! Ready for PDF validation.')
    
    return {
      employee,
      contract,
      business,
      jobTitle,
      compensationType
    }
    
  } catch (error) {
    console.error('❌ Error creating test employee:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createTestEmployeeWithContract()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed to create test employee:', error)
      process.exit(1)
    })
}

module.exports = { createTestEmployeeWithContract }