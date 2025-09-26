const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

const sampleEmployees = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@techcorp.com',
    phone: '+1-555-0101',
    nationalId: 'NAT-001-2024',
    address: '123 Main St, City, State 12345',
    dateOfBirth: new Date('1985-03-15'),
    jobTitleName: 'General Manager',
    compensationTypeName: 'Senior Management Salary',
    hireDate: new Date('2020-01-15'),
    baseSalary: 85000,
    annualLeave: 25,
    sickLeave: 12
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson', 
    email: 'sarah.johnson@techcorp.com',
    phone: '+1-555-0102',
    nationalId: 'NAT-002-2024',
    address: '456 Oak Ave, City, State 12345',
    dateOfBirth: new Date('1990-07-22'),
    jobTitleName: 'Assistant Manager',
    compensationTypeName: 'Monthly Salary',
    supervisorFirstName: 'John',
    supervisorLastName: 'Smith',
    hireDate: new Date('2021-03-01'),
    baseSalary: 65000,
    annualLeave: 20,
    sickLeave: 10
  },
  {
    firstName: 'Michael',
    lastName: 'Davis',
    email: 'michael.davis@techcorp.com', 
    phone: '+1-555-0103',
    nationalId: 'NAT-003-2024',
    address: '789 Pine St, City, State 12345',
    dateOfBirth: new Date('1988-11-08'),
    jobTitleName: 'Administrative Assistant',
    compensationTypeName: 'Hourly Wage',
    supervisorFirstName: 'Sarah',
    supervisorLastName: 'Johnson',
    hireDate: new Date('2022-06-15'),
    baseSalary: 45000,
    annualLeave: 15,
    sickLeave: 8
  }
]

async function createSampleEmployeesCorrected() {
  try {
    console.log('🌱 Creating corrected sample employees with contracts...')
    
    // Get required business and reference data
    const business = await prisma.business.findFirst({
      where: { isActive: true }
    })
    
    if (!business) {
      throw new Error('No active business found. Please create businesses first.')
    }

    const createdEmployees = []

    for (const employeeData of sampleEmployees) {
      console.log(`Creating employee: ${employeeData.firstName} ${employeeData.lastName}`)

      // Find job title and compensation type
      const jobTitle = await prisma.jobTitle.findFirst({
        where: { title: employeeData.jobTitleName, isActive: true }
      })
      
      const compensationType = await prisma.compensationType.findFirst({
        where: { name: employeeData.compensationTypeName, isActive: true }
      })

      if (!jobTitle || !compensationType) {
        console.log(`⚠️  Skipping ${employeeData.firstName} ${employeeData.lastName} - missing job title or compensation type`)
        continue
      }

      // Generate employee number
      const employeeCount = await prisma.employee.count()
      const employeeNumber = `EMP${String(employeeCount + 1).padStart(6, '0')}`

      // Check if employee already exists
      const existingEmployee = await prisma.employee.findUnique({
        where: { nationalId: employeeData.nationalId }
      })

      if (existingEmployee) {
        console.log(`⚠️  Employee ${employeeData.firstName} ${employeeData.lastName} already exists`)
        continue
      }

      // Find supervisor if specified
      let supervisor = null
      if (employeeData.supervisorFirstName && employeeData.supervisorLastName) {
        supervisor = createdEmployees.find(emp => 
          emp.firstName === employeeData.supervisorFirstName && 
          emp.lastName === employeeData.supervisorLastName
        )
      }

      // Create employee with transaction
      const employee = await prisma.$transaction(async (tx) => {
        // Create employee
        const newEmployee = await tx.employee.create({
          data: {
            id: crypto.randomUUID(),
            employeeNumber: employeeNumber,
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            fullName: `${employeeData.firstName} ${employeeData.lastName}`,
            email: employeeData.email,
            phone: employeeData.phone,
            nationalId: employeeData.nationalId,
            dateOfBirth: employeeData.dateOfBirth,
            address: employeeData.address,
            jobTitleId: jobTitle.id,
            compensationTypeId: compensationType.id,
            supervisorId: supervisor?.id || null,
            primaryBusinessId: business.id,
            hireDate: employeeData.hireDate,
            startDate: employeeData.hireDate,
            isActive: true,
            employmentStatus: 'active',
            createdBy: 'SYSTEM'
          }
        })

        // Create active contract
        await tx.employeeContract.create({
          data: {
            id: crypto.randomUUID(),
            employeeId: newEmployee.id,
            jobTitleId: jobTitle.id,
            compensationTypeId: compensationType.id,
            baseSalary: employeeData.baseSalary,
            startDate: employeeData.hireDate,
            status: 'active',
            contractNumber: `EMP-${String(Math.floor(Math.random() * 9999) + 1000)}-${new Date().getFullYear()}`,
            primaryBusinessId: business.id,
            supervisorId: supervisor?.id || newEmployee.id,
            supervisorName: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : `${employeeData.firstName} ${employeeData.lastName}`,
            supervisorTitle: supervisor ? 'Manager' : jobTitle.title,
            createdBy: 'SYSTEM'
          }
        })

        // Create leave balance for current year
        const currentYear = new Date().getFullYear()
        const usedAnnual = Math.floor(Math.random() * 5)
        const usedSick = Math.floor(Math.random() * 3)
        await tx.employeeLeaveBalance.create({
          data: {
            id: crypto.randomUUID(),
            employeeId: newEmployee.id,
            year: currentYear,
            annualLeaveDays: employeeData.annualLeave,
            sickLeaveDays: employeeData.sickLeave,
            usedAnnualDays: usedAnnual,
            usedSickDays: usedSick,
            remainingAnnual: employeeData.annualLeave - usedAnnual,
            remainingSick: employeeData.sickLeave - usedSick
          }
        })

        // Create business assignment
        await tx.employeeBusinessAssignment.create({
          data: {
            id: crypto.randomUUID(),
            employeeId: newEmployee.id,
            businessId: business.id,
            isPrimary: true,
            role: 'employee',
            assignedBy: 'SYSTEM',
            isActive: true
          }
        })

        return newEmployee
      })

      createdEmployees.push(employee)
      console.log(`✅ Created employee: ${employee.fullName} (${employee.employeeNumber})`)
    }

    console.log(`🎉 Created ${createdEmployees.length} sample employees with contracts successfully!`)
    return createdEmployees

  } catch (error) {
    console.error('❌ Error creating sample employees:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createSampleEmployeesCorrected()
    .then((employees) => {
      console.log('Sample employees creation completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Sample employees creation failed:', error)
      process.exit(1)
    })
}

module.exports = { createSampleEmployeesCorrected }