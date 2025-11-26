const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Employees that should be system users
const systemUserMappings = [
  { business: 'restaurant-demo-business', firstName: 'Tendai', lastName: 'Moyo', role: 'manager' },
  { business: 'restaurant-demo-business', firstName: 'Rumbidzai', lastName: 'Ncube', role: 'employee' },
  { business: 'grocery-demo-business', firstName: 'Nyasha', lastName: 'Sibanda', role: 'manager' },
  { business: 'grocery-demo-business', firstName: 'Tatenda', lastName: 'Mpofu', role: 'employee' },
  { business: 'hardware-demo-business', firstName: 'Tafadzwa', lastName: 'Mutasa', role: 'admin' },
  { business: 'hardware-demo-business', firstName: 'Blessing', lastName: 'Mahlangu', role: 'manager' },
  { business: 'clothing-demo-business', firstName: 'Kudzai', lastName: 'Mapfumo', role: 'manager' },
  { business: 'clothing-demo-business', firstName: 'Takudzwa', lastName: 'Mushonga', role: 'employee' },
]

async function hashPassword(password) {
  return await bcrypt.hash(password, 10)
}

async function linkEmployeesToSystemUsers() {
  console.log('🔗 LINKING EMPLOYEES TO SYSTEM USERS\n')
  console.log('='.repeat(70))

  try {
    let created = 0
    let linked = 0
    let skipped = 0

    for (const mapping of systemUserMappings) {
      console.log(`\n📝 Processing: ${mapping.firstName} ${mapping.lastName}`)

      // Find employee
      const employee = await prisma.employees.findFirst({
        where: {
          primaryBusinessId: mapping.business,
          firstName: mapping.firstName,
          lastName: mapping.lastName,
        },
      })

      if (!employee) {
        console.log(`  ⚠️  Employee not found`)
        skipped++
        continue
      }

      // Check if already has user
      if (employee.userId) {
        console.log(`  ⏭️  Already has system user`)
        skipped++
        continue
      }

      const email = employee.email
      const hashedPassword = await hashPassword('Password123!')

      // Check if user already exists
      let user = await prisma.users.findUnique({
        where: { email },
      })

      if (!user) {
        // Create user
        user = await prisma.users.create({
          data: {
            email,
            name: `${mapping.firstName} ${mapping.lastName}`,
            passwordHash: hashedPassword,
            role: mapping.role,
          },
        })
        console.log(`  👤 Created system user: ${mapping.role}`)
        created++
      } else {
        console.log(`  ℹ️  System user already exists`)
      }

      // Link employee to user
      await prisma.employees.update({
        where: { id: employee.id },
        data: { userId: user.id },
      })
      console.log(`  🔗 Linked employee to user`)

      // Create business membership
      try {
        await prisma.businessMemberships.create({
          data: {
            userId: user.id,
            businessId: mapping.business,
            role: mapping.role,
            isActive: true,
            permissions: JSON.stringify({}),
          },
        })
        console.log(`  🔐 Created business membership`)
      } catch (e) {
        console.log(`  ℹ️  Business membership already exists`)
      }

      linked++
    }

    console.log('\n' + '='.repeat(70))
    console.log('📊 SUMMARY')
    console.log('='.repeat(70))
    console.log(`✅ Users created: ${created}`)
    console.log(`🔗 Employees linked: ${linked}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log('\n💡 Default password for system users: Password123!')
    console.log('='.repeat(70))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

linkEmployeesToSystemUsers()
