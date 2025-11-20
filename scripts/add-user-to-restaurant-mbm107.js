const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addUserToRestaurant() {
  try {
    console.log('Adding User to Restaurant Business...\n')

    // Get the user (using first user in system)
    const user = await prisma.users.findFirst()

    if (!user) {
      console.log('❌ No user found')
      return
    }

    console.log(`✅ User: ${user.email}`)
    console.log(`   ID: ${user.id}\n`)

    // Check if membership already exists
    const existing = await prisma.businessMemberships.findFirst({
      where: {
        userId: user.id,
        businessId: 'restaurant-demo-business'
      }
    })

    if (existing) {
      console.log('✅ User already has access to restaurant business')
      console.log(`   Role: ${existing.role}`)
      console.log(`   Active: ${existing.isActive}`)

      if (!existing.isActive) {
        // Reactivate membership
        await prisma.businessMemberships.update({
          where: { id: existing.id },
          data: { isActive: true }
        })
        console.log('   ✅ Reactivated membership')
      }
    } else {
      // Create new membership
      const membership = await prisma.businessMemberships.create({
        data: {
          userId: user.id,
          businessId: 'restaurant-demo-business',
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      console.log('✅ Created new membership')
      console.log(`   ID: ${membership.id}`)
      console.log(`   Role: ${membership.role}`)
      console.log(`   Active: ${membership.isActive}`)
    }

    console.log('\n✅ User can now access restaurant business!')
    console.log('   Navigate to: http://localhost:8080/restaurant/pos')
    console.log('   Or: http://localhost:8080/restaurant/menu')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addUserToRestaurant()
