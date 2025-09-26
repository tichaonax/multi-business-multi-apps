const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createSampleEmployees() {
  try {
    console.log('🧑‍💼 Creating sample employees and contracts...')

    // Get existing data
    const businesses = await prisma.business.findMany()
    const jobTitles = await prisma.jobTitle.findMany()
    const compensationTypes = await prisma.compensationType.findMany()
    const benefitTypes = await prisma.benefitType.findMany()

    if (businesses.length === 0) {
      console.log('❌ No businesses found. Please create businesses first.')
      return
    }

    const primaryBusiness = businesses[0]
    const managerJobTitle = jobTitles.find(jt => jt.title === 'General Manager') || jobTitles[0]
    const salesJobTitle = jobTitles.find(jt => jt.title === 'Sales Representative') || jobTitles[1]
    const adminJobTitle = jobTitles.find(jt => jt.title === 'Administrative Assistant') || jobTitles[2]
    const salaryCompensation = compensationTypes.find(ct => ct.type === 'salary') || compensationTypes[0]
    const commissionCompensation = compensationTypes.find(ct => ct.type === 'commission') || compensationTypes[1]

    // Create sample employees (matching actual schema fields)
    const employees = [
      {
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Smith',
        fullName: 'John Smith',
        email: 'john.smith@company.com',
        phone: '+1-555-0101',
        address: '123 Main St, Anytown, ST 12345',
        nationalId: 'ID123456789',
        hireDate: new Date(2022, 0, 15),
        employmentStatus: 'active',
        jobTitleId: managerJobTitle.id,
        compensationTypeId: salaryCompensation.id,
        primaryBusinessId: primaryBusiness.id,
        notes: 'Experienced manager with excellent leadership skills'
      },
      {
        employeeNumber: 'EMP002',
        firstName: 'Sarah',
        lastName: 'Johnson',
        fullName: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        phone: '+1-555-0102',
        address: '456 Oak Ave, Anytown, ST 12345',
        nationalId: 'ID987654321',
        hireDate: new Date(2022, 2, 10),
        employmentStatus: 'active',
        jobTitleId: salesJobTitle.id,
        compensationTypeId: commissionCompensation.id,
        primaryBusinessId: primaryBusiness.id,
        notes: 'Top performer in sales team'
      },
      {
        employeeNumber: 'EMP003',
        firstName: 'Michael',
        lastName: 'Davis',
        fullName: 'Michael Davis',
        email: 'michael.davis@company.com',
        phone: '+1-555-0103',
        address: '789 Pine Rd, Anytown, ST 12345',
        nationalId: 'ID456789123',
        hireDate: new Date(2023, 5, 1),
        employmentStatus: 'active',
        jobTitleId: adminJobTitle.id,
        compensationTypeId: salaryCompensation.id,
        primaryBusinessId: primaryBusiness.id,
        notes: 'Reliable administrative support'
      },
      {
        employeeNumber: 'EMP004',
        firstName: 'Emily',
        lastName: 'Wilson',
        fullName: 'Emily Wilson',
        email: 'emily.wilson@company.com',
        phone: '+1-555-0104',
        address: '321 Elm St, Anytown, ST 12345',
        nationalId: 'ID555777999',
        hireDate: new Date(2023, 8, 15),
        employmentStatus: 'active',
        jobTitleId: salesJobTitle.id,
        compensationTypeId: commissionCompensation.id,
        primaryBusinessId: primaryBusiness.id,
        notes: 'Rising star in the sales department'
      }
    ]

    const createdEmployees = []
    
    for (const empData of employees) {
      // Check if employee already exists
      const existingEmployee = await prisma.employee.findUnique({
        where: { employeeNumber: empData.employeeNumber }
      })

      if (existingEmployee) {
        console.log(`⏭️  Employee ${empData.employeeNumber} already exists, skipping...`)
        createdEmployees.push(existingEmployee)
        continue
      }

      const employee = await prisma.employee.create({
        data: empData
      })
      
      console.log(`✅ Created employee: ${employee.fullName} (${employee.employeeNumber})`)
      createdEmployees.push(employee)
    }

    // Set up supervisor relationships
    const manager = createdEmployees.find(e => e.employeeNumber === 'EMP001')
    if (manager) {
      await prisma.employee.updateMany({
        where: { employeeNumber: { in: ['EMP002', 'EMP003', 'EMP004'] } },
        data: { supervisorId: manager.id }
      })
      console.log('✅ Set up supervisor relationships')
    }

    // Create sample contracts
    console.log('📋 Creating sample contracts...')
    
    const sampleContracts = [
      {
        employeeNumber: 'EMP001',
        baseSalary: 85000,
        startDate: new Date(2022, 0, 15),
        benefits: [
          { benefitTypeId: benefitTypes.find(bt => bt.name === 'Health Insurance')?.id, amount: 500, isPercentage: false },
          { benefitTypeId: benefitTypes.find(bt => bt.name === 'Transport Allowance')?.id, amount: 300, isPercentage: false }
        ]
      },
      {
        employeeNumber: 'EMP002',
        baseSalary: 45000,
        startDate: new Date(2022, 2, 10),
        isCommissionBased: true,
        benefits: [
          { benefitTypeId: benefitTypes.find(bt => bt.name === 'Health Insurance')?.id, amount: 400, isPercentage: false },
          { benefitTypeId: benefitTypes.find(bt => bt.name === 'Sales Commission')?.id, amount: 5, isPercentage: true }
        ]
      },
      {
        employeeNumber: 'EMP003',
        baseSalary: 38000,
        startDate: new Date(2023, 5, 1),
        benefits: [
          { benefitTypeId: benefitTypes.find(bt => bt.name === 'Health Insurance')?.id, amount: 350, isPercentage: false },
          { benefitTypeId: benefitTypes.find(bt => bt.name === 'Education Allowance')?.id, amount: 200, isPercentage: false }
        ]
      },
      {
        employeeNumber: 'EMP004',
        baseSalary: 42000,
        startDate: new Date(2023, 8, 15),
        isCommissionBased: true,
        benefits: [
          { benefitTypeId: benefitTypes.find(bt => bt.name === 'Health Insurance')?.id, amount: 400, isPercentage: false }
        ]
      }
    ]

    for (const contractData of sampleContracts) {
      const employee = createdEmployees.find(e => e.employeeNumber === contractData.employeeNumber)
      if (!employee) continue

      // Check if contract already exists
      const existingContract = await prisma.employeeContract.findFirst({
        where: { employeeId: employee.id }
      })

      if (existingContract) {
        console.log(`⏭️  Contract for ${employee.fullName} already exists, skipping...`)
        continue
      }

      // Generate contract number
      const contractCount = await prisma.employeeContract.count()
      const contractNumber = `CON${String(contractCount + 1).padStart(6, '0')}`

      // Create contract with transaction
      const contract = await prisma.$transaction(async (tx) => {
        const newContract = await tx.employeeContract.create({
          data: {
            employeeId: employee.id,
            contractNumber,
            version: 1,
            jobTitleId: employee.jobTitleId,
            compensationTypeId: employee.compensationTypeId,
            baseSalary: contractData.baseSalary,
            startDate: contractData.startDate,
            primaryBusinessId: employee.primaryBusinessId,
            supervisorId: employee.supervisorId,
            supervisorName: manager?.fullName || 'Manager',
            supervisorTitle: managerJobTitle.title,
            isCommissionBased: contractData.isCommissionBased || false,
            isSalaryBased: true,
            status: 'active',
            createdBy: 'system'
          }
        })

        // Create benefits
        if (contractData.benefits) {
          for (const benefit of contractData.benefits) {
            if (benefit.benefitTypeId) {
              await tx.contractBenefit.create({
                data: {
                  contractId: newContract.id,
                  benefitTypeId: benefit.benefitTypeId,
                  amount: benefit.amount,
                  isPercentage: benefit.isPercentage || false
                }
              })
            }
          }
        }

        return newContract
      })

      console.log(`✅ Created contract ${contract.contractNumber} for ${employee.fullName}`)
    }

    // Create a sample disciplinary action
    const sampleEmployee = createdEmployees.find(e => e.employeeNumber === 'EMP002')
    if (sampleEmployee) {
      const existingAction = await prisma.disciplinaryAction.findFirst({
        where: { employeeId: sampleEmployee.id }
      })

      if (!existingAction) {
        await prisma.disciplinaryAction.create({
          data: {
            employeeId: sampleEmployee.id,
            type: 'Attendance',
            severity: 'low',
            description: 'Late arrival on three occasions in the past month',
            actionTaken: 'Verbal warning given and attendance policy reviewed',
            actionDate: new Date(2024, 10, 1),
            followUpDate: new Date(2024, 11, 1),
            isResolved: false,
            createdBy: 'system'
          }
        })
        console.log('✅ Created sample disciplinary action')
      }
    }

    console.log('🎉 Sample employees and contracts created successfully!')
    console.log('\n📋 Summary:')
    console.log(`- ${createdEmployees.length} employees created`)
    console.log('- Manager-subordinate relationships established')
    console.log('- Sample contracts with benefits created')
    console.log('- Sample disciplinary action created')
    console.log('\n🔑 You can now access the employee management system!')

  } catch (error) {
    console.error('❌ Error creating sample employees:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleEmployees()