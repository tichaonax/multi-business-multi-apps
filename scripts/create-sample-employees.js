const { PrismaClient } = require('@prisma/client')
const { randomUUID } = require('crypto')
const prisma = new PrismaClient()

// Return a random DOB such that age is between minAge and maxAge (inclusive lower/upper bounds approximate)
function randomDob(minAge = 18, maxAge = 65) {
  const today = new Date()
  const maxDate = new Date()
  maxDate.setFullYear(today.getFullYear() - minAge)
  const minDate = new Date()
  minDate.setFullYear(today.getFullYear() - maxAge)
  const rand = new Date(minDate.getTime() + Math.floor(Math.random() * (maxDate.getTime() - minDate.getTime())))
  return rand
}

async function createSampleEmployees() {
  try {
    console.log('🧑‍💼 Creating sample employees and contracts...')

    // Get existing data
    const businesses = await prisma.businesses.findMany()
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
  dateOfBirth: randomDob(),
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
  dateOfBirth: randomDob(),
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
  dateOfBirth: randomDob(),
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
  dateOfBirth: randomDob(),
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
      const existingEmployee = await prisma.employees.findUnique({
        where: { employeeNumber: empData.employeeNumber }
      })

      if (existingEmployee) {
        console.log(`⏭️  Employee ${empData.employeeNumber} already exists, skipping...`)
        createdEmployees.push(existingEmployee)
        continue
      }

      // Ensure we provide an id if the model requires it (some environments
      // don't auto-generate string UUIDs). Use a UUID when missing.
      empData.id = empData.id || randomUUID()
      const employee = await prisma.employees.create({
        data: empData
      })
      
      console.log(`✅ Created employee: ${employee.fullName} (${employee.employeeNumber})`)
      createdEmployees.push(employee)
    }

    const manager = createdEmployees.find(e => e.employeeNumber === 'EMP001')
    if (manager) {
      await prisma.employees.updateMany({
        where: { employeeNumber: { in: ['EMP002', 'EMP003', 'EMP004'] } },
        data: { supervisorId: manager.id }
      })
      console.log('✅ Set up supervisor relationships')
    }

    // Ensure we have a stable dev manager available to use as a fallback
    const { getOrCreateDevManager } = require('../src/lib/dev/dev-manager')
    const devManager = await getOrCreateDevManager(prisma)

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
      const existingContract = await prisma.employeeContracts.findFirst({
        where: { employeeId: employee.id }
      })

      if (existingContract) {
        console.log(`⏭️  Contract for ${employee.fullName} already exists, skipping...`)
        continue
      }

      // Generate contract number
      const contractCount = await prisma.employeeContracts.count()
      const contractNumber = `CON${String(contractCount + 1).padStart(6, '0')}`

      // Try to create contract via the application's contracts API so seeded
      // contracts run through the same server-side logic as user-created ones.
      const seedApiKey = process.env.SEED_API_KEY
      const seedApiBase = process.env.SEED_API_BASE_URL || 'http://localhost:8080'
      let apiSucceeded = false

      if (seedApiKey) {
        try {
          const payload = {
            jobTitleId: employee.jobTitleId,
            compensationTypeId: employee.compensationTypeId,
            baseSalary: contractData.baseSalary,
            startDate: contractData.startDate,
            primaryBusinessId: employee.primaryBusinessId,
            supervisorId: employee.supervisorId || manager?.id || devManager?.id || null,
            pdfContractData: undefined,
            umbrellaBusinessId: null,
            businessAssignments: null
          }

          const res = await fetch(`${seedApiBase}/api/employees/${employee.id}/contracts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-seed-api-key': seedApiKey },
            body: JSON.stringify(payload)
          })

          if (res.ok) {
            const jr = await res.json().catch(() => null)
            console.log(`345 Contracts API created contract for ${employee.fullName}`, jr?.contractNumber || jr?.id || '')
            apiSucceeded = true
          } else {
            const body = await res.text().catch(() => '')
            console.warn('Contracts API returned non-OK status:', res.status, body)
          }
        } catch (err) {
          console.warn('Failed to POST to contracts API, falling back to direct DB create:', err?.message || err)
        }
      }

      if (!apiSucceeded) {
        try {
          const { createContractViaApiOrDb } = require('../src/lib/services/contract-service')
          const created = await createContractViaApiOrDb(employee.id, {
            contractNumber,
            version: 1,
            jobTitleId: employee.jobTitleId,
            compensationTypeId: employee.compensationTypeId,
            baseSalary: contractData.baseSalary,
            startDate: contractData.startDate,
            primaryBusinessId: employee.primaryBusinessId,
            supervisorId: employee.supervisorId || manager?.id || devManager?.id || null,
            supervisorName: manager?.fullName || 'Manager',
            supervisorTitle: managerJobTitle.title,
            isCommissionBased: contractData.isCommissionBased || false,
            isSalaryBased: true,
            status: 'active',
            // createdBy must reference an existing employee id (FK to employees)
            // prefer the manager who owns these employees, fall back to the dev manager
            createdBy: manager?.id || devManager?.id || employee.id,
            contractBenefits: contractData.benefits || null
          })

          console.log(`345 Created contract ${created.contractNumber || created.id} for ${employee.fullName}`)
        } catch (err) {
          console.error('\u274c Failed to create contract via helper:', err && err.message ? err.message : err)
        }
      }
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
            id: randomUUID(),
            employeeId: sampleEmployee.id,
            actionType: 'Attendance',
            violationType: 'Late Arrival',
            title: 'Late arrivals',
            description: 'Late arrival on three occasions in the past month',
            incidentDate: new Date(2024, 9, 25),
            actionDate: new Date(2024, 10, 1),
            severity: 'low',
            isActive: true,
            improvementPlan: null,
            followUpDate: new Date(2024, 11, 1),
            followUpNotes: 'Monitor attendance over the next month',
            // createdBy must reference an existing employee id (FK to employees)
            createdBy: manager?.id || devManager?.id || sampleEmployee.id,
            hrReviewed: false,
            hrReviewedBy: null,
            hrReviewedAt: null,
            hrNotes: null,
            employeeAcknowledged: false,
            employeeResponse: null,
            employeeSignedAt: null,
            attachments: []
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