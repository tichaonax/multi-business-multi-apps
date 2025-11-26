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

// Helper to generate realistic Zimbabwe National ID
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

// Realistic employee data with proper compensation
const realisticEmployees = {
  'restaurant-demo-business': [
    {
      firstName: 'Tendai',
      lastName: 'Moyo',
      role: 'manager',
      jobTitle: 'General Manager',
      email: 'tendai.moyo@restaurant-demo.local',
      systemUser: true,
      systemRole: 'manager',
      compensationType: 'monthly-management',
      basicSalary: 1500,
      livingAllowance: 200,
      vehicleReimbursement: 150,
      contractMonths: 6,
      benefits: { medical: true, pension: true },
    },
    {
      firstName: 'Rumbidzai',
      lastName: 'Ncube',
      role: 'sales',
      jobTitle: 'Head Waiter',
      email: 'rumbidzai.ncube@restaurant-demo.local',
      systemUser: true,
      systemRole: 'employee',
      compensationType: 'base-plus-commission-low',
      basicSalary: 600,
      livingAllowance: 100,
      commissionRate: 3,
      contractMonths: 6,
    },
    {
      firstName: 'Tapiwa',
      lastName: 'Khumalo',
      role: 'sales',
      jobTitle: 'Waiter',
      compensationType: 'base-plus-commission-low',
      basicSalary: 500,
      commissionRate: 2.5,
      contractMonths: 3,
    },
    {
      firstName: 'Chipo',
      lastName: 'Dube',
      role: 'staff',
      jobTitle: 'Kitchen Staff',
      compensationType: 'hourly-skilled',
      basicSalary: 450,
      contractMonths: 6,
    },
  ],
  'grocery-demo-business': [
    {
      firstName: 'Nyasha',
      lastName: 'Sibanda',
      role: 'manager',
      jobTitle: 'Store Manager',
      email: 'nyasha.sibanda@grocery-demo.local',
      systemUser: true,
      systemRole: 'manager',
      compensationType: 'monthly-management',
      basicSalary: 1300,
      livingAllowance: 180,
      travelAllowance: 120,
      contractMonths: 6,
      benefits: { medical: true, pension: true },
    },
    {
      firstName: 'Tatenda',
      lastName: 'Mpofu',
      role: 'sales',
      jobTitle: 'Sales Supervisor',
      email: 'tatenda.mpofu@grocery-demo.local',
      systemUser: true,
      systemRole: 'employee',
      compensationType: 'hourly-professional',
      basicSalary: 700,
      livingAllowance: 80,
      contractMonths: 6,
    },
    {
      firstName: 'Fungai',
      lastName: 'Ndlovu',
      role: 'sales',
      jobTitle: 'Cashier',
      compensationType: 'hourly-skilled',
      basicSalary: 550,
      contractMonths: 3,
    },
    {
      firstName: 'Rudo',
      lastName: 'Chiweshe',
      role: 'staff',
      jobTitle: 'Stock Clerk',
      compensationType: 'hourly-minimum',
      basicSalary: 400,
      contractMonths: 3,
    },
  ],
  'hardware-demo-business': [
    {
      firstName: 'Tafadzwa',
      lastName: 'Mutasa',
      role: 'manager',
      jobTitle: 'Operations Manager',
      email: 'tafadzwa.mutasa@hardware-demo.local',
      systemUser: true,
      systemRole: 'admin',
      compensationType: 'monthly-management',
      basicSalary: 1600,
      livingAllowance: 220,
      vehicleReimbursement: 200,
      contractMonths: 6,
      benefits: { medical: true, pension: true, housing: true },
    },
    {
      firstName: 'Blessing',
      lastName: 'Mahlangu',
      role: 'sales',
      jobTitle: 'Sales Manager',
      email: 'blessing.mahlangu@hardware-demo.local',
      systemUser: true,
      systemRole: 'manager',
      compensationType: 'base-plus-commission-high',
      basicSalary: 900,
      livingAllowance: 120,
      commissionRate: 5,
      contractMonths: 6,
    },
    {
      firstName: 'Simba',
      lastName: 'Gwaze',
      role: 'sales',
      jobTitle: 'Sales Representative',
      compensationType: 'base-plus-commission-low',
      basicSalary: 650,
      commissionRate: 3,
      contractMonths: 3,
    },
    {
      firstName: 'Grace',
      lastName: 'Zvobgo',
      role: 'staff',
      jobTitle: 'Warehouse Assistant',
      compensationType: 'hourly-skilled',
      basicSalary: 480,
      contractMonths: 6,
    },
  ],
  'clothing-demo-business': [
    {
      firstName: 'Kudzai',
      lastName: 'Mapfumo',
      role: 'manager',
      jobTitle: 'Store Manager',
      email: 'kudzai.mapfumo@clothing-demo.local',
      systemUser: true,
      systemRole: 'manager',
      compensationType: 'monthly-management',
      basicSalary: 1400,
      livingAllowance: 190,
      travelAllowance: 100,
      contractMonths: 6,
      benefits: { medical: true, pension: true },
    },
    {
      firstName: 'Takudzwa',
      lastName: 'Mushonga',
      role: 'sales',
      jobTitle: 'Senior Sales Associate',
      email: 'takudzwa.mushonga@clothing-demo.local',
      systemUser: true,
      systemRole: 'employee',
      compensationType: 'base-plus-commission-high',
      basicSalary: 750,
      livingAllowance: 90,
      commissionRate: 8,
      contractMonths: 6,
    },
    {
      firstName: 'Rutendo',
      lastName: 'Gumbo',
      role: 'sales',
      jobTitle: 'Sales Associate',
      compensationType: 'base-plus-commission-high',
      basicSalary: 600,
      commissionRate: 7,
      contractMonths: 3,
    },
    {
      firstName: 'Muchaneta',
      lastName: 'Chirwa',
      role: 'staff',
      jobTitle: 'Stock Manager',
      compensationType: 'hourly-professional',
      basicSalary: 580,
      contractMonths: 6,
    },
  ],
}

async function seedRealisticEmployees() {
  console.log('🌱 Seeding realistic employees with contracts and compensation...\n')

  try {
    // Get the umbrella business ID (optional)
    const umbrellaBusiness = await prisma.businesses.findFirst({
      where: { type: 'umbrella' },
    })

    const umbrellaId = umbrellaBusiness?.id

    // Get system admin user for created_by
    const adminUser = await prisma.users.findFirst({
      where: { email: 'admin@business.local' },
    })

    if (!adminUser) {
      console.error('❌ Admin user not found!')
      return
    }

    const startDate = getEmployeeStartDate()
    console.log(`📅 Employee start date: ${startDate.toISOString().split('T')[0]}`)
    console.log(`📅 Contracts will expire 3 or 6 months from start date\n`)

    let totalCreated = 0
    let totalSkipped = 0

    for (const [businessId, employees] of Object.entries(realisticEmployees)) {
      console.log(`\n📦 Processing business: ${businessId}`)

      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
      })

      if (!business) {
        console.log(`  ⚠️  Business not found, skipping...`)
        continue
      }

      for (const empData of employees) {
        const employeeNumber = `EMP${String(totalCreated + 1).padStart(6, '0')}`
        const nationalId = generateNationalId()
        const phone = generatePhone()
        const dateOfBirth = getDateOfBirth()
        const contractEndDate = getContractEndDate(startDate, empData.contractMonths)

        // Check if employee exists
        const existing = await prisma.employees.findFirst({
          where: {
            businessId: businessId,
            firstName: empData.firstName,
            lastName: empData.lastName,
          },
        })

        if (existing) {
          console.log(`  ⏭️  Skipping ${empData.firstName} ${empData.lastName} - already exists`)
          totalSkipped++
          continue
        }

        // Create employee
        const employee = await prisma.employees.create({
          data: {
            businessId: businessId,
            employeeNumber: employeeNumber,
            firstName: empData.firstName,
            lastName: empData.lastName,
            fullName: `${empData.firstName} ${empData.lastName}`,
            nationalId: nationalId,
            dateOfBirth: dateOfBirth,
            phone: phone,
            email: empData.email || `${empData.firstName.toLowerCase()}.${empData.lastName.toLowerCase()}@${business.type}.local`,
            address: `${Math.floor(Math.random() * 999) + 1} ${['Main', 'Second', 'Park', 'High'][Math.floor(Math.random() * 4)]} Street, Harare`,
            jobTitle: empData.jobTitle,
            department: empData.role === 'manager' ? 'Management' : empData.role === 'sales' ? 'Sales' : 'Operations',
            hireDate: startDate,
            employmentStatus: 'active',
            compensationType: empData.compensationType,
            basicSalary: empData.basicSalary,
            commissionRate: empData.commissionRate || null,
            livingAllowance: empData.livingAllowance || null,
            travelAllowance: empData.travelAllowance || null,
            vehicleReimbursement: empData.vehicleReimbursement || null,
            benefits: empData.benefits ? JSON.stringify(empData.benefits) : null,
            createdBy: adminUser.id,
          },
        })

        // Create contract
        const contractNumber = `CT-${employeeNumber}-001`
        await prisma.employeeContracts.create({
          data: {
            employeeId: employee.id,
            contractNumber: contractNumber,
            contractType: empData.contractMonths === 6 ? 'fixed-term' : 'temporary',
            startDate: startDate,
            endDate: contractEndDate,
            jobTitle: empData.jobTitle,
            department: employee.department,
            basicSalary: empData.basicSalary,
            benefits: empData.benefits ? JSON.stringify(empData.benefits) : null,
            status: 'active',
            isSigned: true,
            signedDate: startDate,
            createdBy: adminUser.id,
            notes: `${empData.contractMonths}-month contract`,
          },
        })

        // Create business membership if system user
        if (empData.systemUser) {
          const hashedPassword = await hashPassword('Password123!')

          // Create or update user
          let user = await prisma.users.findUnique({
            where: { email: empData.email },
          })

          if (!user) {
            user = await prisma.users.create({
              data: {
                email: empData.email,
                name: `${empData.firstName} ${empData.lastName}`,
                password: hashedPassword,
                role: empData.systemRole || 'employee',
                createdBy: adminUser.id,
              },
            })
          }

          // Create business membership with umbrella (if exists)
          if (umbrellaId) {
            await prisma.businessMemberships.create({
              data: {
                userId: user.id,
                businessId: umbrellaId,
                role: empData.systemRole || 'employee',
                isActive: true,
                permissions: JSON.stringify({}),
              },
            }).catch(() => console.log(`    ℹ️  Membership already exists for ${user.email}`))
          }

          // Create business membership with actual business
          await prisma.businessMemberships.create({
            data: {
              userId: user.id,
              businessId: businessId,
              role: empData.systemRole || 'employee',
              isActive: true,
              permissions: JSON.stringify({}),
            },
          }).catch(() => console.log(`    ℹ️  Membership already exists for ${user.email}`))

          console.log(`  ✅ ${empData.firstName} ${empData.lastName} - ${empData.jobTitle} (${nationalId}) [SYSTEM USER: ${empData.email}]`)
          console.log(`     💰 Salary: $${empData.basicSalary}${empData.commissionRate ? ` + ${empData.commissionRate}% commission` : ''}`)
          console.log(`     📄 Contract: ${contractNumber} (${empData.contractMonths} months, expires ${contractEndDate.toISOString().split('T')[0]})`)
        } else {
          console.log(`  ✅ ${empData.firstName} ${empData.lastName} - ${empData.jobTitle} (${nationalId})`)
          console.log(`     💰 Salary: $${empData.basicSalary}${empData.commissionRate ? ` + ${empData.commissionRate}% commission` : ''}`)
          console.log(`     📄 Contract: ${contractNumber} (${empData.contractMonths} months, expires ${contractEndDate.toISOString().split('T')[0]})`)
        }

        totalCreated++
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log('📊 SUMMARY')
    console.log('='.repeat(70))
    console.log(`✅ Successfully created: ${totalCreated} employees`)
    console.log(`⏭️  Skipped (already exist): ${totalSkipped} employees`)
    console.log(`📈 Total processed: ${totalCreated + totalSkipped}`)
    console.log('\n🎉 Realistic employee seeding complete!')
    console.log('\n💡 Default password for system users: Password123!')
  } catch (error) {
    console.error('❌ Error seeding employees:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedRealisticEmployees()
