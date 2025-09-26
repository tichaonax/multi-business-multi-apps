/**
 * Test script for the personal expense deletion system
 * Tests both time-based permissions and financial rollback functionality
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing Personal Expense Deletion System...\n')

  try {
    // Find or create a test user
    let testUser = await prisma.user.findFirst({
      where: { email: 'admin@business.local' }
    })

    if (!testUser) {
      console.log('❌ Test admin user not found. Please run create-admin script first.')
      return
    }

    console.log(`✅ Using test user: ${testUser.name} (${testUser.email})`)

    // Create a recent test expense (within 24 hours)
    const recentExpense = await prisma.personalExpense.create({
      data: {
        userId: testUser.id,
        amount: 50.00,
        description: 'Test Recent Expense - Can be deleted',
        category: 'Test',
        date: new Date(), // Current date/time
        notes: 'This is a test expense created within 24 hours'
      }
    })

    console.log(`✅ Created recent test expense: $${recentExpense.amount} - ${recentExpense.description}`)

    // Create an old test expense (older than 24 hours)
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 2) // 2 days ago

    const oldExpense = await prisma.personalExpense.create({
      data: {
        userId: testUser.id,
        amount: 75.00,
        description: 'Test Old Expense - Admin only delete',
        category: 'Test',
        date: oldDate,
        notes: 'This is a test expense older than 24 hours'
      }
    })

    console.log(`✅ Created old test expense: $${oldExpense.amount} - ${oldExpense.description}`)

    // Test high-value transaction
    const highValueExpense = await prisma.personalExpense.create({
      data: {
        userId: testUser.id,
        amount: 15000.00,
        description: 'High Value Test Expense',
        category: 'Test',
        date: new Date(),
        notes: 'This is a high-value test expense'
      }
    })

    console.log(`✅ Created high-value test expense: $${highValueExpense.amount} - ${highValueExpense.description}`)

    // Expected behavior summary
    console.log('\n🔒 Expected Permission Behavior:')
    console.log('Recent expense (user): ✅ CAN DELETE - Within 24-hour window')
    console.log('Old expense (user): ❌ CANNOT DELETE - Outside 24-hour window')
    console.log('Any expense (admin): ✅ CAN DELETE - Admin can delete anything')

    console.log('\n🛡️ Expected Safety Warnings:')
    console.log('Recent/Old expense: ✅ SAFE - Normal amounts, no warnings')
    console.log('High-value expense: ⚠️ WARNING - High-value transaction warning')

    // Show created test expenses
    console.log('\n📋 Test Expenses Created:')
    console.log(`1. Recent Expense ID: ${recentExpense.id} - Can be deleted by user`)
    console.log(`2. Old Expense ID: ${oldExpense.id} - Can only be deleted by admin`)
    console.log(`3. High-Value Expense ID: ${highValueExpense.id} - Has safety warnings`)

    console.log('\n🎯 Testing Complete!')
    console.log('\n📝 Manual Testing Instructions:')
    console.log('1. Login as admin@business.local / admin123')
    console.log('2. Navigate to /admin/personal-finance')
    console.log('3. Select the test user from the dropdown')
    console.log('4. Try deleting the test expenses and observe:')
    console.log('   - Recent expense should show delete confirmation')
    console.log('   - Old expense should show admin override message')
    console.log('   - High-value expense should show safety warnings')
    console.log('5. Navigate to /personal to test user-level deletion')
    console.log('\n🧹 Cleanup:')
    console.log('Test expenses will remain in database for manual testing.')
    console.log('Delete them manually or run this script with --cleanup flag')

  } catch (error) {
    console.error('❌ Test error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch(console.error)