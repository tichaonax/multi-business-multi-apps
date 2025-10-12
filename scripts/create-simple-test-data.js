const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createSimpleTestData() {
  try {
    console.log('🚀 Starting simple test data creation for modal testing...')

    // 1. Get admin user
    const adminUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email: 'admin@business.local' },
          { role: 'admin' }
        ]
      }
    })

    if (!adminUser) {
      console.log('❌ Admin user not found. Please run create-admin first.')
      return
    }

    console.log('✅ Found admin user:', adminUser.email)

    // 2. Create test businesses
    console.log('📊 Creating test businesses...')

    let restaurantBusiness = await prisma.businesses.findFirst({
      where: { name: 'Test Restaurant', type: 'restaurant' }
    })
    if (!restaurantBusiness) {
      restaurantBusiness = await prisma.businesses.create({
        data: {
          name: 'Test Restaurant',
          type: 'restaurant',
          description: 'Test restaurant for modal testing',
          isActive: true
        }
      })
    }

    let groceryBusiness = await prisma.businesses.findFirst({
      where: { name: 'Test Grocery Store', type: 'grocery' }
    })
    if (!groceryBusiness) {
      groceryBusiness = await prisma.businesses.create({
        data: {
          name: 'Test Grocery Store',
          type: 'grocery',
          description: 'Test grocery store for modal testing',
          isActive: true
        }
      })
    }

    console.log('✅ Test businesses created')

    // 3. Assign admin to businesses
    const businesses = [restaurantBusiness, groceryBusiness]
    for (const business of businesses) {
      await prisma.businessMembership.upsert({
        where: {
          userId_businessId: {
            userId: adminUser.id,
            businessId: business.id
          }
        },
        update: {},
        create: {
          userId: adminUser.id,
          businessId: business.id,
          role: 'owner',
          isActive: true
        }
      })
    }
    console.log('✅ Admin assigned to test businesses')

    // 4. Create restaurant business orders
    console.log('🍽️ Creating restaurant business orders...')
    const restaurantOrders = []
    for (let i = 0; i < 5; i++) {
      const order = await prisma.businessOrder.create({
        data: {
          orderNumber: `R${String(i + 1).padStart(3, '0')}`,
          status: i < 2 ? 'COMPLETED' : i < 4 ? 'PROCESSING' : 'PENDING',
          subtotal: 22.50 + (i * 5),
          taxAmount: 2.50,
          totalAmount: 25.50 + (i * 5),
          businessId: restaurantBusiness.id,
          businessType: 'restaurant',
          orderType: 'SALE',
          paymentStatus: i < 2 ? 'PAID' : 'PENDING',
          createdAt: new Date(Date.now() - (i * 2 * 60 * 60 * 1000))
        }
      })
      restaurantOrders.push(order)
    }
    console.log(`✅ Created ${restaurantOrders.length} restaurant orders`)

    // 5. Create grocery business orders
    console.log('🛒 Creating grocery business orders...')
    const groceryOrders = []
    for (let i = 0; i < 3; i++) {
      const order = await prisma.businessOrder.create({
        data: {
          orderNumber: `G${String(i + 1).padStart(3, '0')}`,
          status: i < 1 ? 'COMPLETED' : i < 2 ? 'PROCESSING' : 'PENDING',
          subtotal: 150 + (i * 50),
          taxAmount: 15 + (i * 5),
          totalAmount: 165 + (i * 55),
          businessId: groceryBusiness.id,
          businessType: 'grocery',
          orderType: 'PURCHASE',
          paymentStatus: i < 1 ? 'PAID' : 'PENDING',
          createdAt: new Date(Date.now() - ((i + 5) * 2 * 60 * 60 * 1000))
        }
      })
      groceryOrders.push(order)
    }
    console.log(`✅ Created ${groceryOrders.length} grocery orders`)

    // 6. Create personal expenses
    console.log('💸 Creating personal expenses...')
    const personalExpenses = []
    const categories = ['Food', 'Transportation', 'Supplies', 'Income']

    for (let i = 0; i < 8; i++) {
      const category = categories[i % categories.length]
      const isIncome = category === 'Income'

      const expense = await prisma.personalExpense.create({
        data: {
          category: category,
          description: isIncome ? `Freelance payment ${i + 1}` : `${category} expense ${i + 1}`,
          amount: isIncome ? 1500 + (i * 200) : 50 + (i * 25),
          date: new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString().split('T')[0],
          notes: `Test ${category.toLowerCase()} for modal testing`,
          userId: adminUser.id,
          createdAt: new Date(Date.now() - (i * 60 * 60 * 1000))
        }
      })
      personalExpenses.push(expense)
    }
    console.log(`✅ Created ${personalExpenses.length} personal expenses`)

    // 7. Create test users
    console.log('👥 Creating test users...')
    const testUsers = []
    for (let i = 0; i < 2; i++) {
      try {
        const user = await prisma.users.create({
          data: {
            email: `testuser${i + 1}@test.com`,
            name: `Test User ${i + 1}`,
            role: i === 0 ? 'manager' : 'employee',
            isActive: true,
            createdAt: new Date(Date.now() - (i * 4 * 60 * 60 * 1000))
          }
        })
        testUsers.push(user)
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️ User testuser${i + 1}@test.com already exists, skipping...`)
        } else {
          throw error
        }
      }
    }
    console.log(`✅ Created ${testUsers.length} new test users`)

    // 8. Summary
    console.log('\\n🎉 Simple test data creation completed successfully!')
    console.log('\\n📊 Summary:')
    console.log(`   🏢 Businesses: 2 (restaurant, grocery)`)
    console.log(`   🍽️ Restaurant Orders: ${restaurantOrders.length}`)
    console.log(`   🛒 Grocery Orders: ${groceryOrders.length}`)
    console.log(`   💸 Personal Expenses: ${personalExpenses.length}`)
    console.log(`   👥 Test Users: ${testUsers.length}`)
    console.log('\\n✨ You can now test the dashboard modal functionality!')
    console.log('\\n🔍 To view Recent Activity, go to: http://localhost:8080/dashboard')

  } catch (error) {
    console.error('❌ Error creating simple test data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createSimpleTestData()
  .then(() => {
    console.log('\\n🚀 Simple test data script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Simple test data script failed:', error)
    process.exit(1)
  })