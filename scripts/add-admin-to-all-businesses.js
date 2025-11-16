// Add the admin user to all businesses
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addAdminToAllBusinesses() {
  try {
    // Find the admin user
    const admin = await prisma.users.findFirst({
      where: {
        email: 'admin@business.local'
      }
    })

    if (!admin) {
      console.error('Admin user not found')
      return
    }

    console.log(`Found admin user: ${admin.name} (${admin.email})`)
    console.log(`User ID: ${admin.id}\n`)

    // Get all businesses
    const businesses = await prisma.businesses.findMany({
      where: {
        isActive: true
      }
    })

    console.log(`Found ${businesses.length} active businesses\n`)

    // Add admin to each business
    for (const business of businesses) {
      // Check if membership already exists
      const existing = await prisma.businessMemberships.findFirst({
        where: {
          userId: admin.id,
          businessId: business.id
        }
      })

      if (existing) {
        if (!existing.isActive) {
          // Reactivate if inactive
          await prisma.businessMemberships.update({
            where: { id: existing.id },
            data: { isActive: true }
          })
          console.log(`✅ Reactivated membership: ${business.name} (${business.type})`)
        } else {
          console.log(`✓ Already member: ${business.name} (${business.type})`)
        }
      } else {
        // Create new membership
        await prisma.businessMemberships.create({
          data: {
            userId: admin.id,
            businessId: business.id,
            role: 'MANAGER', // Give manager role for full access
            isActive: true,
            joinedAt: new Date()
          }
        })
        console.log(`✅ Added membership: ${business.name} (${business.type})`)
      }
    }

    console.log(`\n✅ Admin user now has access to all ${businesses.length} businesses!`)

    // Verify
    const memberships = await prisma.businessMemberships.findMany({
      where: {
        userId: admin.id,
        isActive: true
      },
      include: {
        businesses: {
          select: {
            name: true,
            type: true
          }
        }
      }
    })

    console.log(`\nVerification:`)
    console.log(`Total active memberships: ${memberships.length}`)
    memberships.forEach((m) => {
      console.log(`  - ${m.businesses.name} (${m.businesses.type}) as ${m.role}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addAdminToAllBusinesses()
