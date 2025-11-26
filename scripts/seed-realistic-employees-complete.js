const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Helper functions
function getEmployeeStartDate() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth() - 2, 1) // 1st of month, 2 months ago
}

function getDateOfBirth(minAge = 22, maxAge = 55) {
  const today = new Date()
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge
  const birthYear = today.getFullYear() - age
  const birthMonth = Math.floor(Math.random() * 12)
  const birthDay = Math.floor(Math.random() * 28) + 1
  return new Date(birthYear, birthMonth, birthDay)
}

function getContractEndDate(startDate, months) {
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + months)
  return endDate
}

function generateNationalId() {
  const part1 = String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')
  const part2 = String(Math.floor(Math.random() * 900000) + 100000)
  const part3 = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const part4 = String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')
  return `${part1}-${part2}${part3}${part4}`
}

function generatePhone() {
  const prefixes = ['071', '073', '077', '078']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const number = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
  return `${prefix}-${number.substring(0, 3)}-${number.substring(3)}`
}

async function hashPassword(password) {
  return await bcrypt.hash(password, 10)
}

// Comprehensive employee data
const employeeData = [
  // RESTAURANT EMPLOYEES
  {
    business: 'restaurant-demo-business',
    firstName: 'Tendai',
    lastName: 'Moyo',
    jobTitle: 'General Manager',
    compensationType: 'monthly-management',
    baseSalary: 1500,
    livingAllowance: 200,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'manager',
    department: 'Management',
  },
  {
    business: 'restaurant-demo-business',
    firstName: 'Rumbidzai',
    lastName: 'Ncube',
    jobTitle: 'Sales Manager',
    compensationType: 'base-plus-commission-low',
    baseSalary: 800,
    livingAllowance: 100,
    commissionRate: 3,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'employee',
    department: 'Sales',
  },
  {
    business: 'restaurant-demo-business',
    firstName: 'Tapiwa',
    lastName: 'Khumalo',
    jobTitle: 'Sales Representative',
    compensationType: 'base-plus-commission-low',
    baseSalary: 600,
    commissionRate: 2.5,
    contractMonths: 3,
    department: 'Sales',
  },
  {
    business: 'restaurant-demo-business',
    firstName: 'Chipo',
    lastName: 'Dube',
    jobTitle: 'Kitchen Staff',
    compensationType: 'hourly-skilled',
    baseSalary: 450,
    contractMonths: 6,
    department: 'Operations',
  },

  // GROCERY EMPLOYEES
  {
    business: 'grocery-demo-business',
    firstName: 'Nyasha',
    lastName: 'Sibanda',
    jobTitle: 'General Manager',
    compensationType: 'monthly-management',
    baseSalary: 1400,
    livingAllowance: 180,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'manager',
    department: 'Management',
  },
  {
    business: 'grocery-demo-business',
    firstName: 'Tatenda',
    lastName: 'Mpofu',
    jobTitle: 'Operations Manager',
    compensationType: 'monthly-professional',
    baseSalary: 900,
    livingAllowance: 80,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'employee',
    department: 'Operations',
  },
  {
    business: 'grocery-demo-business',
    firstName: 'Fungai',
    lastName: 'Ndlovu',
    jobTitle: 'Cashier',
    compensationType: 'hourly-skilled',
    baseSalary: 550,
    contractMonths: 3,
    department: 'Sales',
  },

  // HARDWARE EMPLOYEES
  {
    business: 'hardware-demo-business',
    firstName: 'Tafadzwa',
    lastName: 'Mutasa',
    jobTitle: 'Operations Manager',
    compensationType: 'monthly-management',
    baseSalary: 1600,
    livingAllowance: 220,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'admin',
    department: 'Management',
  },
  {
    business: 'hardware-demo-business',
    firstName: 'Blessing',
    lastName: 'Mahlangu',
    jobTitle: 'Sales Manager',
    compensationType: 'base-plus-commission-high',
    baseSalary: 1000,
    livingAllowance: 120,
    commissionRate: 5,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'manager',
    department: 'Sales',
  },
  {
    business: 'hardware-demo-business',
    firstName: 'Simba',
    lastName: 'Gwaze',
    jobTitle: 'Sales Representative',
    compensationType: 'base-plus-commission-low',
    baseSalary: 650,
    commissionRate: 3,
    contractMonths: 3,
    department: 'Sales',
  },

  // CLOTHING EMPLOYEES
  {
    business: 'clothing-demo-business',
    firstName: 'Kudzai',
    lastName: 'Mapfumo',
    jobTitle: 'General Manager',
    compensationType: 'monthly-management',
    baseSalary: 1400,
    livingAllowance: 190,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'manager',
    department: 'Management',
  },
  {
    business: 'clothing-demo-business',
    firstName: 'Takudzwa',
    lastName: 'Mushonga',
    jobTitle: 'Sales Representative',
    compensationType: 'base-plus-commission-high',
    baseSalary: 750,
    livingAllowance: 90,
    commissionRate: 8,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'employee',
    department: 'Sales',
  },
  {
    business: 'clothing-demo-business',
    firstName: 'Rutendo',
    lastName: 'Gumbo',
    jobTitle: 'Sales Representative',
    compensationType: 'base-plus-commission-high',
    baseSalary: 600,
    commissionRate: 7,
    contractMonths: 3,
    department: 'Sales',
  },
]

async function seedRealisticEmployees() {
  console.log('🌱 COMPREHENSIVE EMPLOYEE SEEDING')
  console.log('='.repeat(70))

  try {
    // Step 1: Get admin user
    const adminUser = await prisma.users.findFirst({
      where: { email: 'admin@business.local' },
    })

    if (!adminUser) {
      console.error('❌ Admin user not found!')
      return
    }

    console.log(`✅ Admin user found: ${adminUser.email}`)

    // Step 2: Get existing employee count for numbering
    const existingCount = await prisma.employees.count()
    let empCounter = existingCount + 1

    console.log(`📊 Existing employees: ${existingCount}`)
    console.log(`🔢 Starting employee number: EMP${String(empCounter).padStart(6, '0')}`)

    const startDate = getEmployeeStartDate()
    console.log(`📅 Employee start date: ${startDate.toISOString().split('T')[0]}`)
    console.log('')

    let created = 0
    let skipped = 0
    let errors = []

    for (const empData of employeeData) {
      try {
        // Generate employee number at start of each iteration
        const employeeNumber = `EMP${String(empCounter).padStart(6, '0')}`
        empCounter++ // Increment immediately so each iteration gets unique number

        console.log(`\n📝 Processing: ${empData.firstName} ${empData.lastName}`)

        // Validate business
        const business = await prisma.businesses.findUnique({
          where: { id: empData.business },
        })

        if (!business) {
          console.log(`  ⚠️  Business ${empData.business} not found`)
          skipped++
          continue
        }

        // Check if employee already exists
        const existing = await prisma.employees.findFirst({
          where: {
            primaryBusinessId: empData.business,
            firstName: empData.firstName,
            lastName: empData.lastName,
          },
          include: {
            employee_contracts_employee_contracts_employeeIdToemployees: {
              where: { status: 'active' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        })

        if (existing) {
          console.log(`  ⏭️  Already exists - updating dates`)

          // Update employee hire date to new calculated date
          await prisma.employees.update({
            where: { id: existing.id },
            data: { hireDate: startDate },
          })

          // Update contract dates if active contract exists
          if (existing.employee_contracts_employee_contracts_employeeIdToemployees.length > 0) {
            const contractEndDate = getContractEndDate(startDate, empData.contractMonths)
            const contract = existing.employee_contracts_employee_contracts_employeeIdToemployees[0]

            await prisma.employeeContracts.update({
              where: { id: contract.id },
              data: {
                startDate,
                endDate: contractEndDate,
              },
            })

            console.log(`  📅 Updated hire & contract dates`)
            console.log(`     Start: ${startDate.toISOString().split('T')[0]}`)
            console.log(`     End: ${contractEndDate.toISOString().split('T')[0]}`)
          } else {
            console.log(`  📅 Updated hire date`)
          }

          skipped++
          continue
        }

        // Get or create job title
        let jobTitle = await prisma.jobTitles.findFirst({
          where: { title: empData.jobTitle },
        })

        if (!jobTitle) {
          console.log(`  📋 Creating job title: ${empData.jobTitle}`)
          jobTitle = await prisma.jobTitles.create({
            data: {
              title: empData.jobTitle,
              description: empData.jobTitle,
              department: empData.department,
            },
          })
        }

        // Validate compensation type
        const compensationType = await prisma.compensationTypes.findUnique({
          where: { id: empData.compensationType },
        })

        if (!compensationType) {
          console.log(`  ⚠️  Compensation type ${empData.compensationType} not found`)
          skipped++
          continue
        }

        // Generate other employee details
        const nationalId = generateNationalId()
        const dateOfBirth = getDateOfBirth()
        const phone = generatePhone()
        const email = `${empData.firstName.toLowerCase()}.${empData.lastName.toLowerCase()}@${business.type}.local`
        const fullName = `${empData.firstName} ${empData.lastName}`

        console.log(`  🆔 ${employeeNumber} | ${nationalId}`)
        console.log(`  📞 ${phone}`)
        console.log(`  📧 ${email}`)

        // Create employee
        const employee = await prisma.employees.create({
          data: {
            primaryBusinessId: empData.business,
            employeeNumber,
            firstName: empData.firstName,
            lastName: empData.lastName,
            fullName,
            nationalId,
            dateOfBirth,
            phone,
            email,
            address: `${Math.floor(Math.random() * 999) + 1} ${['Main', 'Second', 'Park', 'High'][Math.floor(Math.random() * 4)]} Street, Harare, Zimbabwe`,
            hireDate: startDate,
            employmentStatus: 'active',
            jobTitleId: jobTitle.id,
            compensationTypeId: compensationType.id,
            createdBy: adminUser.id,
          },
        })

        console.log(`  ✅ Employee created`)

        // Create contract
        const contractNumber = `CT-${employeeNumber}-001`
        const contractEndDate = getContractEndDate(startDate, empData.contractMonths)

        await prisma.employeeContracts.create({
          data: {
            employeeId: employee.id,
            primaryBusinessId: empData.business,
            contractNumber,
            contractDurationMonths: empData.contractMonths,
            startDate,
            endDate: contractEndDate,
            jobTitleId: jobTitle.id,
            compensationTypeId: compensationType.id,
            baseSalary: empData.baseSalary,
            livingAllowance: empData.livingAllowance || null,
            commissionAmount: empData.commissionRate || null,
            status: 'active',
            version: 1,
            createdBy: adminUser.id,
            approvedBy: adminUser.id,
            approvedAt: startDate,
            employeeSignedAt: startDate,
            managerSignedAt: startDate,
            notes: `${empData.contractMonths}-month contract`,
          },
        })

        console.log(`  📄 Contract created: ${contractNumber}`)
        console.log(`     Expires: ${contractEndDate.toISOString().split('T')[0]}`)
        console.log(`     Salary: $${empData.baseSalary}${empData.commissionRate ? ` + ${empData.commissionRate}% commission` : ''}`)

        // Create system user if specified
        if (empData.isSystemUser) {
          const hashedPassword = await hashPassword('Password123!')

          let user = await prisma.users.findUnique({
            where: { email },
          })

          if (!user) {
            user = await prisma.users.create({
              data: {
                email,
                name: fullName,
                passwordHash: hashedPassword,
                role: empData.systemRole || 'employee',
              },
            })
            console.log(`  👤 System user created: ${empData.systemRole}`)
          }

          // Create business membership
          try {
            await prisma.businessMemberships.create({
              data: {
                userId: user.id,
                businessId: empData.business,
                role: empData.systemRole || 'employee',
                isActive: true,
                permissions: JSON.stringify({}),
              },
            })
            console.log(`  🔐 Business membership created`)
          } catch (e) {
            console.log(`  ℹ️  Business membership already exists`)
          }

          // Link employee to user
          await prisma.employees.update({
            where: { id: employee.id },
            data: { userId: user.id },
          })
        }

        created++
        console.log(`  ✅ COMPLETE`)

      } catch (error) {
        console.error(`  ❌ ERROR: ${error.message}`)
        errors.push({ name: `${empData.firstName} ${empData.lastName}`, error: error.message })
        skipped++
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70))
    console.log('📊 SEEDING SUMMARY')
    console.log('='.repeat(70))
    console.log(`✅ Successfully created: ${created} employees`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`📈 Total processed: ${created + skipped}`)

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS:')
      errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`))
    }

    console.log('\n' + '='.repeat(70))
    console.log('🎉 Employee seeding complete!')
    console.log('💡 System user password: Password123!')
    console.log('='.repeat(70))

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Export for API usage
module.exports = { seed: seedRealisticEmployees }

// Run the seeding when called directly
if (require.main === module) {
  seedRealisticEmployees()
}
