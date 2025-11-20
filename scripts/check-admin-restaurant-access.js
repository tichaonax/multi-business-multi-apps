const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAdminAccess() {
  try {
    console.log('Checking Admin User Access to Restaurant Business...\n')

    // Find admin users
    const adminUsers = await prisma.users.findMany({
      where: {
        OR: [
          { email: { contains: 'admin' } },
          { role: 'admin' }
        ]
      }
    })

    if (adminUsers.length === 0) {
      console.log('❌ No admin users found')
      return
    }

    console.log(`Found ${adminUsers.length} admin user(s):\n`)

    for (const admin of adminUsers) {
      console.log(`👤 ${admin.email}`)
      console.log(`   ID: ${admin.id}`)
      console.log(`   Name: ${admin.firstName || 'N/A'} ${admin.lastName || 'N/A'}`)

      // Check restaurant membership
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: admin.id,
          businessId: 'restaurant-demo-business'
        }
      })

      if (membership) {
        console.log(`   ✅ HAS access to restaurant-demo-business`)
        console.log(`      Role: ${membership.role}`)
        console.log(`      Active: ${membership.isActive}`)
      } else {
        console.log(`   ❌ NO access to restaurant-demo-business`)
      }

      // Show all memberships
      const allMemberships = await prisma.businessMemberships.findMany({
        where: { userId: admin.id, isActive: true },
        include: { businesses: true }
      })

      console.log(`   📋 Active businesses (${allMemberships.length}):`)
      if (allMemberships.length === 0) {
        console.log(`      (none)`)
      } else {
        allMemberships.forEach(m => {
          console.log(`      - ${m.businesses.name} (${m.businesses.type}) [${m.role}]`)
        })
      }
      console.log('')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminAccess()
