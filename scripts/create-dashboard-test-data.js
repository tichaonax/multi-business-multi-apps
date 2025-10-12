const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createDashboardTestData() {
  try {
    console.log('🚀 Starting comprehensive test data creation...')

    // 1. Get or create test businesses
    console.log('📊 Creating test businesses...')

    let restaurantBusiness = await prisma.businesses.findFirst({
      where: { name: 'Test Restaurant', type: 'restaurant' }
    })
    if (!restaurantBusiness) {
      restaurantBusiness = await prisma.businesses.create({
        data: {
          name: 'Test Restaurant',
          type: 'restaurant',
          description: 'Test restaurant for dashboard testing',
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
          description: 'Test grocery store for dashboard testing',
          isActive: true
        }
      })
    }

    let clothingBusiness = await prisma.businesses.findFirst({
      where: { name: 'Test Clothing Store', type: 'clothing' }
    })
    if (!clothingBusiness) {
      clothingBusiness = await prisma.businesses.create({
        data: {
          name: 'Test Clothing Store',
          type: 'clothing',
          description: 'Test clothing store for dashboard testing',
          isActive: true
        }
      })
    }

    let hardwareBusiness = await prisma.businesses.findFirst({
      where: { name: 'Test Hardware Store', type: 'hardware' }
    })
    if (!hardwareBusiness) {
      hardwareBusiness = await prisma.businesses.create({
        data: {
          name: 'Test Hardware Store',
          type: 'hardware',
          description: 'Test hardware store for dashboard testing',
          isActive: true
        }
      })
    }

    console.log('✅ Test businesses created')

    // 2. Get admin user and assign to businesses
    console.log('👤 Setting up admin user business memberships...')

    const adminUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email: 'admin@business.local' },
          { role: 'admin' }
        ]
      }
    })

    if (adminUser) {
      // Assign admin to all test businesses
      const businesses = [restaurantBusiness, groceryBusiness, clothingBusiness, hardwareBusiness]

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
      console.log('✅ Admin user assigned to all test businesses')
    }

    // 3. Create restaurant orders (for Recent Activity)
    console.log('🍽️ Creating restaurant orders...')

    const restaurantOrders = []
    for (let i = 0; i < 8; i++) {
      const order = await prisma.businessOrder.create({
        data: {
          orderNumber: `R${String(i + 1).padStart(3, '0')}`,
          status: i < 3 ? 'COMPLETED' : i < 6 ? 'PROCESSING' : 'PENDING',
          subtotal: 22.50 + (i * 5),
          taxAmount: 2.50,
          totalAmount: 25.50 + (i * 5),
          businessId: restaurantBusiness.id,
          businessType: 'restaurant',
          orderType: 'SALE',
          paymentStatus: i < 3 ? 'PAID' : 'PENDING',
          createdAt: new Date(Date.now() - (i * 2 * 60 * 60 * 1000)) // Spread over last 16 hours
        }
      })
      restaurantOrders.push(order)
    }
    console.log(`✅ Created ${restaurantOrders.length} restaurant orders`)

    // 4. Create construction projects (for Recent Activity)
    console.log('🏗️ Creating construction projects...')

    const projects = []
    for (let i = 0; i < 5; i++) {
      const project = await prisma.project.create({
        data: {
          name: `Test Project ${i + 1}`,
          description: `Construction project ${i + 1} for testing dashboard`,
          status: i < 2 ? 'active' : i < 4 ? 'planned' : 'completed',
          businessType: 'construction',
          totalCost: 50000 + (i * 10000),
          startDate: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
          expectedCompletionDate: new Date(Date.now() + ((30 - i * 5) * 24 * 60 * 60 * 1000)),
          location: `Site ${i + 1}, Test City`,
          createdById: adminUser?.id,
          createdAt: new Date(Date.now() - (i * 3 * 60 * 60 * 1000)) // Spread over last 15 hours
        }
      })
      projects.push(project)
    }
    console.log(`✅ Created ${projects.length} construction projects`)

    // 5. Create project transactions
    console.log('💰 Creating project transactions...')

    const transactions = []
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i]

      // Create 2-3 transactions per project
      for (let j = 0; j < 3; j++) {
        const transaction = await prisma.projectTransaction.create({
          data: {
            amount: 5000 + (j * 2500),
            description: `${j === 0 ? 'Material costs' : j === 1 ? 'Labor payment' : 'Equipment rental'} for ${project.name}`,
            status: j < 2 ? 'completed' : 'pending',
            transactionType: j === 2 ? 'payment_received' : j === 1 ? 'contractor_payment' : 'material_cost',
            paymentMethod: j === 0 ? 'bank_transfer' : j === 1 ? 'cash' : 'check',
            notes: `Transaction ${j + 1} for project testing`,
            projectId: project.id,
            createdById: adminUser?.id,
            createdAt: new Date(Date.now() - ((i * 3 + j) * 60 * 60 * 1000))
          }
        })
        transactions.push(transaction)
      }
    }
    console.log(`✅ Created ${transactions.length} project transactions`)

    // 6. Create personal expenses (for Recent Activity)
    console.log('💸 Creating personal expenses...')

    if (adminUser) {
      const personalExpenses = []
      const categories = ['Food', 'Transportation', 'Supplies', 'Income', 'Contractor Payment']

      for (let i = 0; i < 10; i++) {
        const category = categories[i % categories.length]
        const isIncome = category === 'Income'

        const expense = await prisma.personalExpense.create({
          data: {
            category: category,
            description: isIncome ? `Freelance payment ${i + 1}` : `${category} expense ${i + 1}`,
            amount: isIncome ? 1500 + (i * 200) : 50 + (i * 25),
            date: new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString().split('T')[0],
            tags: category === 'Contractor Payment' ? `contractor:test-${i}:Test Contractor ${i}` : '',
            notes: `Test ${category.toLowerCase()} for dashboard`,
            userId: adminUser.id,
            createdAt: new Date(Date.now() - (i * 60 * 60 * 1000))
          }
        })
        personalExpenses.push(expense)
      }
      console.log(`✅ Created ${personalExpenses.length} personal expenses`)
    }

    // 7. Create business orders for different business types
    console.log('🛒 Creating business orders...')

    const businessOrders = []
    const businessTypes = [
      { business: groceryBusiness, type: 'grocery', icon: '🛒' },
      { business: clothingBusiness, type: 'clothing', icon: '👕' },
      { business: hardwareBusiness, type: 'hardware', icon: '🔧' }
    ]

    for (let i = 0; i < businessTypes.length; i++) {
      const { business, type } = businessTypes[i]

      // Create 3 orders per business type
      for (let j = 0; j < 3; j++) {
        const order = await prisma.businessOrder.create({
          data: {
            orderNumber: `${type.toUpperCase()}${String(j + 1).padStart(3, '0')}`,
            status: j === 0 ? 'COMPLETED' : j === 1 ? 'PROCESSING' : 'PENDING',
            orderType: 'PURCHASE',
            subtotal: 150 + (j * 50),
            taxAmount: 15 + (j * 5),
            totalAmount: 165 + (j * 55),
            businessId: business.id,
            businessType: type,
            notes: `Test ${type} order ${j + 1}`,
            paymentStatus: j === 0 ? 'PAID' : 'PENDING',
            createdAt: new Date(Date.now() - ((i * 3 + j) * 2 * 60 * 60 * 1000))
          }
        })
        businessOrders.push(order)
      }
    }
    console.log(`✅ Created ${businessOrders.length} business orders`)

    // 8. Create some test users (for admin Recent Activity)
    console.log('👥 Creating test users...')

    const testUsers = []
    for (let i = 0; i < 3; i++) {
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
    }
    console.log(`✅ Created ${testUsers.length} test users`)

    // 9. Summary
    console.log('\\n🎉 Test data creation completed successfully!')
    console.log('\\n📊 Summary:')
    console.log(`   🏢 Businesses: 4 (restaurant, grocery, clothing, hardware)`)
    console.log(`   🍽️ Restaurant Orders: ${restaurantOrders.length}`)
    console.log(`   🏗️ Construction Projects: ${projects.length}`)
    console.log(`   💰 Project Transactions: ${transactions.length}`)
    console.log(`   💸 Personal Expenses: 10`)
    console.log(`   🛒 Business Orders: ${businessOrders.length}`)
    console.log(`   👥 Test Users: ${testUsers.length}`)
    console.log('\\n✨ You can now test the dashboard modal functionality!')
    console.log('\\n🔍 To view Recent Activity, go to: http://localhost:8080/dashboard')

  } catch (error) {
    console.error('❌ Error creating test data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createDashboardTestData()
  .then(() => {
    console.log('\\n🚀 Test data script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test data script failed:', error)
    process.exit(1)
  })