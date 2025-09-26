const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createDemoBusinesses() {
  try {
    console.log('🏢 Creating demo businesses...')

    // Check if admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@business.local' }
    })

    if (!adminUser) {
      console.error('❌ Admin user not found. Please run create-admin first.')
      return
    }

    // Demo businesses to create
    const demoBusinesses = [
      {
        id: 'restaurant-demo',
        name: 'Demo Restaurant',
        type: 'restaurant',
        description: 'Demo restaurant for testing restaurant features',
        isActive: true,
        createdBy: adminUser.id,
        settings: {
          address: '123 Demo Street',
          phone: '+1-555-0100',
          email: 'restaurant@demo.com'
        }
      },
      {
        id: 'grocery-demo-business',
        name: 'Demo Grocery Store',
        type: 'grocery',
        description: 'Demo grocery store for testing grocery features',
        isActive: true,
        createdBy: adminUser.id,
        settings: {
          address: '456 Demo Avenue',
          phone: '+1-555-0200',
          email: 'grocery@demo.com'
        }
      },
      {
        id: 'clothing-demo',
        name: 'Demo Clothing Store',
        type: 'clothing',
        description: 'Demo clothing store for testing clothing features',
        isActive: true,
        createdBy: adminUser.id,
        settings: {
          address: '789 Demo Boulevard',
          phone: '+1-555-0300',
          email: 'clothing@demo.com'
        }
      },
      {
        id: 'hardware-demo',
        name: 'Demo Hardware Store',
        type: 'hardware',
        description: 'Demo hardware store for testing hardware features',
        isActive: true,
        createdBy: adminUser.id,
        settings: {
          address: '321 Demo Lane',
          phone: '+1-555-0400',
          email: 'hardware@demo.com'
        }
      }
    ]

    for (const businessData of demoBusinesses) {
      console.log(`Creating business: ${businessData.name}...`)

      // Check if business already exists
      const existingBusiness = await prisma.business.findUnique({
        where: { id: businessData.id }
      })

      if (existingBusiness) {
        console.log(`✅ Business ${businessData.name} already exists`)
        continue
      }

      // Create business
      const business = await prisma.business.create({
        data: businessData
      })

      console.log(`✅ Created business: ${business.name} (${business.id})`)

      // Create admin membership for this business
      const existingMembership = await prisma.businessMembership.findFirst({
        where: {
          userId: adminUser.id,
          businessId: business.id
        }
      })

      if (!existingMembership) {
        await prisma.businessMembership.create({
          data: {
            userId: adminUser.id,
            businessId: business.id,
            role: 'owner',
            permissions: {
              canManageUsers: true,
              canManageInventory: true,
              canManageOrders: true,
              canViewReports: true,
              canManageSettings: true,
              canManagePos: true
            },
            isActive: true,
            joinedAt: new Date()
          }
        })
        console.log(`✅ Created admin membership for ${business.name}`)
      }
    }

    console.log('🎉 Demo businesses created successfully!')

  } catch (error) {
    console.error('❌ Error creating demo businesses:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDemoBusinesses()