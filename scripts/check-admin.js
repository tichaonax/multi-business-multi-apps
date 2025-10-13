#!/usr/bin/env node
/**
 * Check Admin User Script
 * Verifies admin user exists and checks login credentials
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkAdmin() {
  try {
    console.log('🔍 Checking admin user...\n')

    const adminEmail = 'admin@business.local'
    const adminPassword = 'admin123'

    // Find admin user
    const user = await prisma.users.findUnique({
      where: { email: adminEmail }
    })

    if (!user) {
      console.log('❌ Admin user NOT found in database')
      console.log(`   Expected email: ${adminEmail}`)
      console.log('\n💡 Run: npm run create-admin')
      return false
    }

    console.log('✅ Admin user found:')
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   IsActive: ${user.isActive}`)
    console.log(`   Has password hash: ${!!user.passwordHash}`)
    console.log(`   Username: ${user.username || 'N/A'}`)
    console.log('')

    // Test password
    if (user.passwordHash) {
      const passwordMatch = await bcrypt.compare(adminPassword, user.passwordHash)

      if (passwordMatch) {
        console.log('✅ Password verification: PASS')
        console.log(`   Password '${adminPassword}' matches stored hash`)
      } else {
        console.log('❌ Password verification: FAIL')
        console.log(`   Password '${adminPassword}' does NOT match stored hash`)
        console.log('\n💡 Password may have been changed or hash is corrupt')
      }
    } else {
      console.log('❌ No password hash found')
    }

    console.log('')
    console.log('📋 Login Details:')
    console.log(`   URL: http://localhost:8080/auth/signin`)
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)

    return user && user.passwordHash && user.isActive
  } catch (error) {
    console.error('❌ Error checking admin user:', error.message)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

checkAdmin()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    console.error('💥 Fatal error:', err)
    process.exit(1)
  })
