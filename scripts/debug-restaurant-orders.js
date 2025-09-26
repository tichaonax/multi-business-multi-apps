const { PrismaClient } = require('@prisma/client')

async function debugRestaurantOrders() {
  const prisma = new PrismaClient()

  try {
    console.log('🔍 Debugging Restaurant Orders Issue...\n')

    // 1. Check admin user exists and get their business memberships
    console.log('1. Checking admin user business memberships:')
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@business.local' },
      include: {
        businessMemberships: {
          include: {
            business: {
              select: { id: true, name: true, type: true }
            }
          }
        }
      }
    })

    if (!adminUser) {
      console.log('❌ Admin user not found!')
      return
    }

    console.log(`✅ Admin user found: ${adminUser.name} (${adminUser.email})`)
    console.log(`   Business memberships: ${adminUser.businessMemberships.length}`)

    adminUser.businessMemberships.forEach((membership, index) => {
      console.log(`   ${index + 1}. ${membership.business.name} (${membership.business.type}) - Active: ${membership.isActive}`)
      console.log(`      Business ID: ${membership.business.id}`)
    })

    // 2. Check specifically for restaurant businesses
    console.log('\n2. Filtering restaurant businesses:')
    const restaurantMemberships = adminUser.businessMemberships.filter(m =>
      m.business.type === 'restaurant' && m.isActive
    )

    console.log(`   Restaurant memberships: ${restaurantMemberships.length}`)
    restaurantMemberships.forEach((membership, index) => {
      console.log(`   ${index + 1}. ${membership.business.name}`)
      console.log(`      Business ID: ${membership.business.id}`)
    })

    // 3. Check total orders in businessOrder table
    console.log('\n3. Checking total orders in businessOrder table:')
    const totalOrders = await prisma.businessOrder.count()
    console.log(`   Total orders in database: ${totalOrders}`)

    // 4. Check restaurant-specific orders
    console.log('\n4. Checking restaurant orders:')
    const restaurantOrders = await prisma.businessOrder.findMany({
      where: {
        businessType: 'restaurant'
      },
      select: {
        id: true,
        orderNumber: true,
        businessId: true,
        businessType: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        business: {
          select: { name: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    console.log(`   Restaurant orders found: ${restaurantOrders.length}`)
    restaurantOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. Order #${order.orderNumber}`)
      console.log(`      Business ID: ${order.businessId}`)
      console.log(`      Business Name: ${order.business?.name || 'Unknown'}`)
      console.log(`      Business Type: ${order.businessType}`)
      console.log(`      Status: ${order.status}`)
      console.log(`      Total: $${order.totalAmount}`)
      console.log(`      Created: ${order.createdAt}`)
    })

    // 5. Check if any restaurant orders match admin's restaurant business IDs
    if (restaurantMemberships.length > 0) {
      console.log('\n5. Checking orders for admin\'s restaurant businesses:')

      for (const membership of restaurantMemberships) {
        const businessOrders = await prisma.businessOrder.findMany({
          where: {
            businessId: membership.business.id,
            businessType: 'restaurant'
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 3
        })

        console.log(`   Business: ${membership.business.name} (ID: ${membership.business.id})`)
        console.log(`   Orders found: ${businessOrders.length}`)

        businessOrders.forEach((order, index) => {
          console.log(`     ${index + 1}. Order #${order.orderNumber} - Status: ${order.status} - $${order.totalAmount}`)
        })
      }
    }

    // 6. Check for HXI-EATS specifically
    console.log('\n6. Checking for HXI-EATS business:')
    const hxiEats = await prisma.business.findFirst({
      where: {
        OR: [
          { name: { contains: 'HXI', mode: 'insensitive' } },
          { name: { contains: 'EATS', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        type: true
      }
    })

    if (hxiEats) {
      console.log(`   ✅ Found business: ${hxiEats.name} (${hxiEats.type})`)
      console.log(`   Business ID: ${hxiEats.id}`)

      // Check if admin has membership to this business
      const adminMembership = await prisma.businessMembership.findFirst({
        where: {
          userId: adminUser.id,
          businessId: hxiEats.id,
          isActive: true
        }
      })

      console.log(`   Admin has membership: ${!!adminMembership}`)

      // Check orders for this business
      const hxiOrders = await prisma.businessOrder.findMany({
        where: {
          businessId: hxiEats.id
        },
        select: {
          id: true,
          orderNumber: true,
          businessType: true,
          status: true,
          totalAmount: true
        },
        take: 5
      })

      console.log(`   Orders for HXI-EATS: ${hxiOrders.length}`)
      hxiOrders.forEach((order, index) => {
        console.log(`     ${index + 1}. Order #${order.orderNumber} - Type: ${order.businessType} - Status: ${order.status}`)
      })
    } else {
      console.log('   ❌ HXI-EATS business not found')
    }

  } catch (error) {
    console.error('❌ Error during debug:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugRestaurantOrders()