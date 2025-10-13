const { PrismaClient } = require('@prisma/client')
const { v4: uuidv4 } = require('uuid')
const prisma = new PrismaClient()

async function createSimpleRestaurantOrders() {
  try {
    console.log('🍽️ Creating simple restaurant orders in database...')

    // Get HXI EATS restaurant business
    const hxiEats = await prisma.businesses.findFirst({
      where: { name: 'HXI EATS', type: 'restaurant' }
    })

    if (!hxiEats) {
      console.warn('HXI EATS restaurant not found; skipping simple restaurant orders creation')
      return []
    }

    console.log('✅ Found HXI EATS restaurant:', hxiEats.id)

    // Get Mary user and employee record
    const mary = await prisma.users.findFirst({
      where: { email: 'mary@hxi.com' }
    })

    const maryEmployee = await prisma.employees.findFirst({
      where: { userId: mary?.id }
    })

    console.log('✅ Found Mary user:', mary?.id)
    console.log('✅ Found Mary employee:', maryEmployee?.id)

    // Create simple restaurant orders directly using businessOrder table
    const orders = []
    const orderData = [
      {
        orderNumber: 'HXI-001',
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        subtotal: 25.00,
        taxAmount: 3.75,
        totalAmount: 28.75,
        notes: 'Dine-in order - Table 5',
        hoursAgo: 3
      },
      {
        orderNumber: 'HXI-002',
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        subtotal: 18.50,
        taxAmount: 2.78,
        totalAmount: 21.28,
        notes: 'Takeout order - Fish and chips',
        hoursAgo: 5
      },
      {
        orderNumber: 'HXI-003',
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        subtotal: 15.75,
        taxAmount: 2.36,
        totalAmount: 18.11,
        notes: 'Dine-in order - Table 2',
        hoursAgo: 1
      },
      {
        orderNumber: 'HXI-004',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        subtotal: 12.00,
        taxAmount: 1.80,
        totalAmount: 13.80,
        notes: 'Walk-in customer order',
        hoursAgo: 0.5
      },
      {
        orderNumber: 'HXI-005',
        status: 'READY',
        paymentStatus: 'PAID',
        subtotal: 22.25,
        taxAmount: 3.34,
        totalAmount: 25.59,
        notes: 'Delivery order - Chicken wings combo',
        hoursAgo: 0.25
      }
    ]

    for (const orderInfo of orderData) {
      // Use upsert so script is idempotent (unique index on businessId+orderNumber)
      const orderDataObj = {
        businessId: hxiEats.id,
        employeeId: maryEmployee?.id || null, // Mary processed the order, null if no employee record
        orderNumber: orderInfo.orderNumber,
        orderType: 'SALE',
        status: orderInfo.status,
        paymentStatus: orderInfo.paymentStatus,
        paymentMethod: orderInfo.paymentStatus === 'PAID' ? 'CASH' : null,
        subtotal: orderInfo.subtotal,
        taxAmount: orderInfo.taxAmount,
        totalAmount: orderInfo.totalAmount,
        businessType: 'restaurant',
        notes: orderInfo.notes,
        attributes: {
          tableNumber: Math.floor(Math.random() * 10) + 1,
          orderType: orderInfo.notes.includes('Dine-in') ? 'DINE_IN' :
                    orderInfo.notes.includes('Takeout') ? 'TAKEOUT' :
                    orderInfo.notes.includes('Delivery') ? 'DELIVERY' : 'DINE_IN'
        },
        createdAt: new Date(Date.now() - (orderInfo.hoursAgo * 60 * 60 * 1000))
      }

      // Add ID and updatedAt for create operation
      const createDataObj = {
        id: `hxi-order-${orderInfo.orderNumber.toLowerCase()}-${Date.now()}`,
        ...orderDataObj,
        updatedAt: orderDataObj.createdAt
      }

      const order = await prisma.businessOrders.upsert({
        where: { businessId_orderNumber: { businessId: hxiEats.id, orderNumber: orderInfo.orderNumber } },
        update: orderDataObj,
        create: createDataObj
      })

      // Ensure order items are idempotent: remove existing items then recreate
      await prisma.businessOrderItems.deleteMany({ where: { orderId: order.id } }).catch(() => {})

      // Create order items
      const items = []
      if (orderInfo.items) {
        for (const item of orderInfo.items) {
          const productVariant = item.productVariant || null
          if (productVariant) {
            const createdItem = await prisma.businessOrderItems.create({
              data: {
                orderId: order.id,
                productVariantId: productVariant.id,
                quantity: item.quantity,
                unitPrice: productVariant.price,
                totalPrice: productVariant.price * item.quantity
              }
            })
            items.push(createdItem)
          }
        }
      }

      orders.push(order)
      console.log(`✅ Upserted order: ${order.orderNumber} (${order.status}) - $${order.totalAmount}`)
    }

    console.log('\n🎉 Simple restaurant orders creation completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   🏢 Restaurant: HXI EATS`)
    console.log(`   👤 Employee: Mary Hwandaza`)
    console.log(`   📋 Orders: ${orders.length}`)
    console.log(`   💰 Total Revenue: $${orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0).toFixed(2)}`)
    console.log('\n✨ Orders are now in the database and properly associated!')
    console.log('\n🔍 To test:')
    console.log('   1. Login as Mary (mary@hxi.com) or Admin')
    console.log('   2. Go to Restaurant Orders: http://localhost:8080/restaurant/orders')
    console.log('   3. Check Recent Activity in dashboard')

  } catch (error) {
    console.error('❌ Error creating simple restaurant orders:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createSimpleRestaurantOrders()
  .then(() => {
    console.log('\n🚀 Simple restaurant orders script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Simple restaurant orders script failed:', error)
    process.exit(1)
  })