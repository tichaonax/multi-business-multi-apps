const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkBusinesses() {
  try {
    console.log('Checking businesses in database...')

    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true
      }
    })

    console.log(`\nFound ${businesses.length} businesses:`)
    businesses.forEach(b => {
      console.log(`- ${b.name} (${b.type}) [Active: ${b.isActive}]`)
    })

    if (businesses.length === 0) {
      console.log('\n⚠️ No businesses found in the database!')
      console.log('You need to create a business first before using the Layby Management system.')
    }

    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      take: 5
    })

    console.log(`\nFound ${users.length} users:`)
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}) [Role: ${u.role}]`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkBusinesses()
