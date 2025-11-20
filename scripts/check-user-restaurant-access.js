const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUserAccess() {
  try {
    console.log('Checking User Access to Restaurant Business...\n')

    // Find all users
    const allUsers = await prisma.users.findMany({
      take: 5
    })

    console.log('Available users in system:')
    allUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.firstName || ''} ${u.lastName || ''})`)
    })
    console.log('')

    // Use first user
    const testUser = allUsers[0]

    if (!testUser) {
      console.log('❌ No users found in system')
      return
    }

    console.log(`✅ Found user: ${testUser.email}`)
    console.log(`   ID: ${testUser.id}`)
    console.log(`   Name: ${testUser.firstName} ${testUser.lastName}`)
    console.log('')

    // Check restaurant business
    const restaurantBusiness = await prisma.businesses.findUnique({
      where: { id: 'restaurant-demo-business' }
    })

    if (!restaurantBusiness) {
      console.log('❌ Restaurant demo business not found')
      return
    }

    console.log(`✅ Found business: ${restaurantBusiness.name}`)
    console.log(`   ID: ${restaurantBusiness.id}`)
    console.log(`   Type: ${restaurantBusiness.type}`)
    console.log(`   Active: ${restaurantBusiness.isActive}`)
    console.log('')

    // Check user membership
    const membership = await prisma.businessMemberships.findFirst({
      where: {
        userId: testUser.id,
        businessId: 'restaurant-demo-business'
      }
    })

    if (membership) {
      console.log(`✅ User HAS access to restaurant business`)
      console.log(`   Role: ${membership.role}`)
      console.log(`   Active: ${membership.isActive}`)
    } else {
      console.log(`❌ User does NOT have access to restaurant business`)
      console.log('')
      console.log('   Need to add user to business membership!')
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('All user business memberships:')

    const allMemberships = await prisma.businessMemberships.findMany({
      where: { userId: testUser.id },
      include: { businesses: true }
    })

    if (allMemberships.length === 0) {
      console.log('  (none)')
    } else {
      allMemberships.forEach(m => {
        console.log(`  - ${m.businesses.name} (${m.businesses.type})`)
        console.log(`    Role: ${m.role}, Active: ${m.isActive}`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserAccess()
