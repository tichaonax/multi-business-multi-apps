const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUser() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        isActive: true
      }
    })
    console.log('Users in database:', JSON.stringify(users, null, 2))
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkUser()
