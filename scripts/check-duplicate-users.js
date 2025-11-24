const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDuplicateUsers() {
  try {
    console.log('Checking for users named "Tichaona Hwandaza"...\n')

    const users = await prisma.users.findMany({
      where: {
        name: 'Tichaona Hwandaza'
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`Found ${users.length} user(s) with name "Tichaona Hwandaza":\n`)

    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Username: ${user.username || 'N/A'}`)
      console.log(`  Email: ${user.email || 'N/A'}`)
      console.log(`  Name: ${user.name}`)
      console.log(`  Is Active: ${user.isActive}`)
      console.log(`  Created: ${user.createdAt}`)
      console.log()
    })

    // Check which user is linked to the driver
    const driver = await prisma.vehicleDrivers.findFirst({
      where: {
        fullName: 'Tichaona Hwandaza'
      },
      select: {
        userId: true
      }
    })

    if (driver && driver.userId) {
      console.log(`✓ Driver is linked to user ID: ${driver.userId}`)
      const linkedUser = users.find(u => u.id === driver.userId)
      if (linkedUser) {
        console.log(`  This is User ${users.indexOf(linkedUser) + 1} in the list above`)
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDuplicateUsers()
