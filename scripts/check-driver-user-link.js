const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDriverUserLink() {
  try {
    console.log('Checking driver-user link for Tichaona Hwandaza...\n')

    const driver = await prisma.vehicleDrivers.findFirst({
      where: {
        fullName: 'Tichaona Hwandaza'
      },
      include: {
        users: true
      }
    })

    if (!driver) {
      console.log('❌ Driver not found')
      return
    }

    console.log('Driver Info:')
    console.log(`  ID: ${driver.id}`)
    console.log(`  Name: ${driver.fullName}`)
    console.log(`  Email: ${driver.emailAddress || 'N/A'}`)
    console.log(`  User ID (foreign key): ${driver.userId || 'NULL'}`)
    console.log()

    if (driver.users) {
      console.log('✓ Linked User Info:')
      console.log(`  User ID: ${driver.users.id}`)
      console.log(`  Username: ${driver.users.username || 'N/A'}`)
      console.log(`  Email: ${driver.users.email || 'N/A'}`)
      console.log(`  Name: ${driver.users.name || 'N/A'}`)
      console.log(`  Is Active: ${driver.users.isActive}`)
    } else {
      console.log('❌ No user linked to this driver')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDriverUserLink()
