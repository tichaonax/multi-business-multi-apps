require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcryptjs')

async function testLogin() {
  // Use ADMIN_TEST_EMAIL for CLI test overrides. Do NOT pick up the app's
  // ADMIN_EMAIL (which may point to a real user) to avoid accidental account lockouts.
  const email = process.env.ADMIN_TEST_EMAIL || 'admin@business.local'
  const password = process.env.ADMIN_TEST_PASSWORD || 'admin123'

  console.log('Testing admin login for', email)

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.error('User not found in users table:', email)
      process.exit(2)
    }

  console.log('User found:', { id: user.id, email: user.email, passwordHashPresent: !!user.passwordHash, isActive: user.isActive, role: user.role })

    if (!user.passwordHash) {
      console.error('No passwordHash field on user record; possible prisma model mismatch or field name difference')
      process.exit(3)
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      console.error('Password verification failed for', email)
      process.exit(4)
    }

  console.log('✅ Admin login verification succeeded for', email)
    process.exit(0)
  } catch (err) {
    console.error('Error testing admin login:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) testLogin()

module.exports = { testLogin }
