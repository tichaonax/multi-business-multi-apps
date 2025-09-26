const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createMaryUser() {
  try {
    console.log('🚀 Creating Mary user for testing filters...')

    // Create Mary user
    let mary = await prisma.user.findFirst({
      where: { email: 'mary@test.com' }
    })

    if (!mary) {
      mary = await prisma.user.create({
        data: {
          email: 'mary@test.com',
          name: 'Mary Johnson',
          role: 'employee',
          isActive: true,
          passwordHash: 'dummy_hash_for_testing', // This user won't be used for login
          createdAt: new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)) // 2 days ago
        }
      })
      console.log('✅ Created Mary user:', mary.email)
    } else {
      console.log('✅ Found existing Mary user:', mary.email)
    }

    // Create personal expenses for Mary
    const expenses = [
      {
        category: 'Food',
        description: 'Lunch at restaurant downtown',
        amount: 25.50,
        date: new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)).toISOString(), // 1 day ago
        notes: 'Business lunch with client',
        userId: mary.id,
        createdAt: new Date(Date.now() - (1 * 24 * 60 * 60 * 1000))
      },
      {
        category: 'Transportation',
        description: 'Taxi to client meeting',
        amount: 15.00,
        date: new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)).toISOString(),
        notes: 'Client meeting transportation',
        userId: mary.id,
        createdAt: new Date(Date.now() - (1 * 24 * 60 * 60 * 1000))
      },
      {
        category: 'Income',
        description: 'Freelance project payment',
        amount: 500.00,
        date: new Date(Date.now() - (6 * 60 * 60 * 1000)).toISOString(), // 6 hours ago
        notes: 'Web development project',
        userId: mary.id,
        createdAt: new Date(Date.now() - (6 * 60 * 60 * 1000))
      }
    ]

    let createdExpenses = []
    for (const expense of expenses) {
      try {
        const created = await prisma.personalExpense.create({
          data: expense
        })
        createdExpenses.push(created)
      } catch (error) {
        if (error.code !== 'P2002') { // Skip if already exists
          throw error
        }
      }
    }

    console.log(`✅ Created ${createdExpenses.length} personal expenses for Mary`)

    console.log('\n🎉 Mary user creation completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   👤 User: Mary Johnson (${mary.email})`)
    console.log(`   💸 Personal Expenses: ${createdExpenses.length}`)
    console.log('\n✨ You can now test cross-user filtering!')
    console.log('\n🔍 To test:')
    console.log('   1. Login as admin@business.local')
    console.log('   2. Go to Dashboard Recent Activity')
    console.log('   3. Change filter from "My Activities" to "All Activities"')
    console.log('   4. Or use "By User" filter and select Mary Johnson')

  } catch (error) {
    console.error('❌ Error creating Mary user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createMaryUser()
  .then(() => {
    console.log('\n🚀 Mary user creation script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Mary user creation script failed:', error)
    process.exit(1)
  })