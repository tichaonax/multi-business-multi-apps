const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedPayrollAccount() {
  try {
    console.log('🏦 Seeding initial payroll account...')

    // Check if payroll account already exists
    const existing = await prisma.payrollAccounts.findFirst({
      where: { businessId: null }
    })

    if (existing) {
      console.log('✅ Global payroll account already exists:')
      console.log(`   Account Number: ${existing.accountNumber}`)
      console.log(`   Balance: $${existing.balance}`)
      console.log(`   Created: ${existing.createdAt}`)
      return existing
    }

    // Get the first admin user to use as creator
    const adminUser = await prisma.users.findFirst({
      where: { role: 'admin' }
    })

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.')
      process.exit(1)
    }

    // Generate account number: PAY-GLOBAL-001
    const accountNumber = 'PAY-GLOBAL-001'

    // Create global payroll account
    const payrollAccount = await prisma.payrollAccounts.create({
      data: {
        businessId: null, // Global account
        accountNumber: accountNumber,
        balance: 0,
        isActive: true,
        createdBy: adminUser.id,
      }
    })

    console.log('✅ Global payroll account created successfully!')
    console.log(`   Account Number: ${payrollAccount.accountNumber}`)
    console.log(`   Balance: $${payrollAccount.balance}`)
    console.log(`   Created By: ${adminUser.name} (${adminUser.email})`)
    console.log(`   Created At: ${payrollAccount.createdAt}`)

    return payrollAccount
  } catch (error) {
    console.error('❌ Error seeding payroll account:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function only if this file is executed directly
if (require.main === module) {
  seedPayrollAccount()
    .then(() => {
      console.log('✨ Payroll account seeding completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Payroll account seeding failed:', error)
      process.exit(1)
    })
}

module.exports = { seedPayrollAccount }
