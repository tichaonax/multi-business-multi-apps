const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetUserPassword() {
  try {
    // Get email from command line argument
    const email = process.argv[2]
    const newPassword = process.argv[3] || 'password123'

    if (!email) {
      console.log('Usage: node reset-user-password.js <email> [newPassword]')
      console.log('Example: node reset-user-password.js user@example.com newpassword123')
      process.exit(1)
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log(`❌ User with email ${email} not found`)
      process.exit(1)
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update user password
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword }
    })

    console.log(`✅ Password reset successfully for ${email}`)
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 New Password: ${newPassword}`)
    console.log(`👤 User ID: ${user.id}`)
    console.log(`📝 Role: ${user.role}`)

  } catch (error) {
    console.error('❌ Error resetting password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetUserPassword()