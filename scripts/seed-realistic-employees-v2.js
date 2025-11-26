const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Helper to get start date (1st of month, 2 months ago)
function getEmployeeStartDate() {
  const today = new Date()
  const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  return twoMonthsAgo
}

// Helper to get date of birth (age between 22-55)
function getDateOfBirth(minAge = 22, maxAge = 55) {
  const today = new Date()
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge
  const birthYear = today.getFullYear() - age
  const birthMonth = Math.floor(Math.random() * 12)
  const birthDay = Math.floor(Math.random() * 28) + 1
  return new Date(birthYear, birthMonth, birthDay)
}

// Helper to get contract end date (3 or 6 months from start)
function getContractEndDate(startDate, months) {
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + months)
  return endDate
}

// Helper to generate Zimbabwe National ID
function generateNationalId() {
  const part1 = String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')
  const part2 = String(Math.floor(Math.random() * 900000) + 100000)
  const part3 = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const part4 = String(Math.floor(Math.random() * 90) + 10).padStart(2, '0')
  return `${part1}-${part2}${part3}${part4}`
}

// Helper to generate phone number (Zimbabwe format)
function generatePhone() {
  const prefixes = ['071', '073', '077', '078']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const number = String(Math.floor(Math.random() * 10000000)).padStart(7, '0')
  return `${prefix}-${number.substring(0, 3)}-${number.substring(3)}`
}

// Helper to hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10)
}

// Realistic employee data
const employees = [
  // RESTAURANT
  {
    business: 'restaurant-demo-business',
    firstName: 'Tendai',
    lastName: 'Moyo',
    jobTitle: 'General Manager',
    compensationType: 'monthly-management',
    salary: 1500,
    allowances: { living: 200, vehicle: 150 },
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'manager',
  },
  {
    business: 'restaurant-demo-business',
    firstName: 'Rumbidzai',
    lastName: 'Ncube',
    jobTitle: 'Sales Manager',
    compensationType: 'base-plus-commission-low',
    salary: 800,
    allowances: { living: 100 },
    commissionRate: 3,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'employee',
  },
  {
    business: 'restaurant-demo-business',
    firstName: 'Tapiwa',
    lastName: 'Khumalo',
    jobTitle: 'Sales Representative',
    compensationType: 'base-plus-commission-low',
    salary: 600,
    commissionRate: 2.5,
    contractMonths: 3,
  },
  // GROCERY
  {
    business: 'grocery-demo-business',
    firstName: 'Nyasha',
    lastName: 'Sibanda',
    jobTitle: 'General Manager',
    compensationType: 'monthly-management',
    salary: 1400,
    allowances: { living: 180, travel: 120 },
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'manager',
  },
  {
    business: 'grocery-demo-business',
    firstName: 'Tatenda',
    lastName: 'Mpofu',
    jobTitle: 'Operations Manager',
    compensationType: 'monthly-professional',
    salary: 900,
    allowances: { living: 80 },
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'employee',
  },
  // HARDWARE
  {
    business: 'hardware-demo-business',
    firstName: 'Tafadzwa',
    lastName: 'Mutasa',
    jobTitle: 'Operations Manager',
    compensationType: 'monthly-management',
    salary: 1600,
    allowances: { living: 220, vehicle: 200 },
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'admin',
  },
  {
    business: 'hardware-demo-business',
    firstName: 'Blessing',
    lastName: 'Mahlangu',
    jobTitle: 'Sales Manager',
    compensationType: 'base-plus-commission-high',
    salary: 1000,
    allowances: { living: 120 },
    commissionRate: 5,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'manager',
  },
  // CLOTHING
  {
    business: 'clothing-demo-business',
    firstName: 'Kudzai',
    lastName: 'Mapfumo',
    jobTitle: 'General Manager',
    compensationType: 'monthly-management',
    salary: 1400,
    allowances: { living: 190, travel: 100 },
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'manager',
  },
  {
    business: 'clothing-demo-business',
    firstName: 'Takudzwa',
    lastName: 'Mushonga',
    jobTitle: 'Sales Representative',
    compensationType: 'base-plus-commission-high',
    salary: 750,
    allowances: { living: 90 },
    commissionRate: 8,
    contractMonths: 6,
    isSystemUser: true,
    systemRole: 'employee',
  },
]

async function seedEmployees() {
  console.log('🌱 Seeding realistic employees...\n')

  try {
    const adminUser = await prisma.users.findFirst({
      where: { email: 'admin@business.local' },
    })

    if (!adminUser) {
      console.error('❌ Admin user not found!')
      return
    }

    const startDate = getEmployeeStartDate()
    console.log(`📅 Employee start date: ${startDate.toISOString().split('T')[0]}\n`)

    // Get the max employee number
    const existingEmployees = await prisma.employees.findMany({
      select: { employeeNumber: true },
      orderBy: { employeeNumber: 'desc' },
      take: 1,
    })

    let empCounter = 1
    if (existingEmployees.length > 0) {
      const lastNumber = existingEmployees[0].employeeNumber.replace('EMP', '')
      empCounter = parseInt(lastNumber) + 1
    }

    let created = 0
    let skipped = 0

    for (const emp of employees) {
      try {
        const business = await prisma.businesses.findUnique({
          where: { id: emp.business },
        })

        if (!business) {
          console.log(`⚠️  Business ${emp.business} not found, skipping...`)
          skipped++
          continue
        }

        // Get compensation type
        const compensationType = await prisma.compensationTypes.findFirst({
          where: { id: emp.compensationType },
        })

        if (!compensationType) {
          console.log(`⚠️  Compensation type ${emp.compensationType} not found, skipping ${emp.firstName}...`)
          skipped++
          continue
        }

        // Get or create job title
        let jobTitle = await prisma.jobTitles.findFirst({
          where: { title: emp.jobTitle },
        })

        if (!jobTitle) {
          jobTitle = await prisma.jobTitles.create({
            data: {
              title: emp.jobTitle,
              description: emp.jobTitle,
              category: 'general',
            },
          })
        }

        // Check if employee exists
        const nationalId = generateNationalId()
        const employeeNumber = `EMP${String(empCounter).padStart(6, '0')}`

        const existing = await prisma.employees.findFirst({
          where: {
            primaryBusinessId: emp.business,
            firstName: emp.firstName,
            lastName: emp.lastName,
          },
        })

        if (existing) {
          console.log(`⏭️  ${emp.firstName} ${emp.lastName} already exists`)
          skipped++
          empCounter++ // Increment to avoid number collision
          continue
        }

        const dateOfBirth = getDateOfBirth()
        const phone = generatePhone()
        const email = `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@${business.type}.local`

        // Create employee
        const employee = await prisma.employees.create({
          data: {
            primaryBusinessId: emp.business,
            employeeNumber,
            firstName: emp.firstName,
            lastName: emp.lastName,
            fullName: `${emp.firstName} ${emp.lastName}`,
            nationalId,
            dateOfBirth,
            phone,
            email,
            address: `${Math.floor(Math.random() * 999) + 1} ${['Main', 'Second', 'Park', 'High'][Math.floor(Math.random() * 4)]} Street, Harare`,
            hireDate: startDate,
            employmentStatus: 'active',
            jobTitleId: jobTitle.id,
            compensationTypeId: compensationType.id,
            createdBy: adminUser.id,
          },
        })

        // Create contract
        const contractEnd = getContractEndDate(startDate, emp.contractMonths)
        const contractNumber = `CT-${employeeNumber}-001`

        await prisma.employeeContracts.create({
          data: {
            employeeId: employee.id,
            contractNumber,
            contractType: emp.contractMonths === 6 ? 'fixed-term' : 'temporary',
            startDate,
            endDate: contractEnd,
            jobTitleId: jobTitle.id,
            compensationTypeId: compensationType.id,
            baseSalary: emp.salary,
            status: 'active',
            isSigned: true,
            signedDate: startDate,
            createdBy: adminUser.id,
            notes: `${emp.contractMonths}-month contract`,
          },
        })

        // Create allowances if specified
        if (emp.allowances) {
          if (emp.allowances.living) {
            await prisma.employeeAllowances.create({
              data: {
                employeeId: employee.id,
                allowanceType: 'living',
                amount: emp.allowances.living,
                frequency: 'monthly',
                startDate,
                isActive: true,
                createdBy: adminUser.id,
                approvedBy: adminUser.id,
                approvedAt: startDate,
              },
            })
          }
          if (emp.allowances.travel) {
            await prisma.employeeAllowances.create({
              data: {
                employeeId: employee.id,
                allowanceType: 'transport',
                amount: emp.allowances.travel,
                frequency: 'monthly',
                startDate,
                isActive: true,
                createdBy: adminUser.id,
                approvedBy: adminUser.id,
                approvedAt: startDate,
              },
            })
          }
          if (emp.allowances.vehicle) {
            await prisma.employeeAllowances.create({
              data: {
                employeeId: employee.id,
                allowanceType: 'vehicle',
                amount: emp.allowances.vehicle,
                frequency: 'monthly',
                startDate,
                isActive: true,
                createdBy: adminUser.id,
                approvedBy: adminUser.id,
                approvedAt: startDate,
              },
            })
          }
        }

        // Create system user if specified
        if (emp.isSystemUser) {
          const hashedPassword = await hashPassword('Password123!')

          let user = await prisma.users.findUnique({
            where: { email },
          })

          if (!user) {
            user = await prisma.users.create({
              data: {
                email,
                name: `${emp.firstName} ${emp.lastName}`,
                password: hashedPassword,
                role: emp.systemRole || 'employee',
                createdBy: adminUser.id,
              },
            })
          }

          // Create business membership
          await prisma.businessMemberships.create({
            data: {
              userId: user.id,
              businessId: emp.business,
              role: emp.systemRole || 'employee',
              isActive: true,
              permissions: JSON.stringify({}),
            },
          }).catch(() => {})

          // Link employee to user
          await prisma.employees.update({
            where: { id: employee.id },
            data: { userId: user.id },
          })

          console.log(`✅ ${emp.firstName} ${emp.lastName} - ${emp.jobTitle} ($${emp.salary}) [SYSTEM: ${email}]`)
        } else {
          console.log(`✅ ${emp.firstName} ${emp.lastName} - ${emp.jobTitle} ($${emp.salary})`)
        }

        console.log(`   📄 Contract: ${contractNumber} (${emp.contractMonths}mo, ends ${contractEnd.toISOString().split('T')[0]})`)
        console.log(`   🆔 National ID: ${nationalId}`)
        created++
        empCounter++
      } catch (error) {
        console.error(`❌ Error creating ${emp.firstName}: ${error.message}`)
        skipped++
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log('📊 SUMMARY')
    console.log('='.repeat(70))
    console.log(`✅ Created: ${created}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log('\n🎉 Employee seeding complete!')
    console.log('💡 Default password for system users: Password123!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedEmployees()
