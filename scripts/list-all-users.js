const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listAllUsers() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log('\n📋 All Users in Database:')
    console.log('=' .repeat(60))

    if (users.length === 0) {
      console.log('No users found in database')
      return
    }

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User Details:`)
      console.log(`   📧 Email: ${user.email}`)
      console.log(`   👤 Name: ${user.name || 'N/A'}`)
      console.log(`   🔑 Role: ${user.role}`)
      console.log(`   ✅ Active: ${user.isActive}`)
      console.log(`   📅 Created: ${user.createdAt.toLocaleString()}`)
      console.log(`   🆔 ID: ${user.id}`)
    })

    console.log('\n' + '=' .repeat(60))
    console.log(`Total users: ${users.length}`)

    // Show password reset command examples
    console.log('\n🔧 To reset password for any user:')
    users.forEach(user => {
      console.log(`   node reset-user-password.js "${user.email}" password123`)
    })

  } catch (error) {
    console.error('❌ Error listing users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listAllUsers()