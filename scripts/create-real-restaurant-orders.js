const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createRealRestaurantOrders() {
  try {
    console.log('🍽️ Creating real restaurant orders in database...')

    // Create or get HXI EATS restaurant business
    let hxiEats = await prisma.businesses.findFirst({
      where: { name: 'HXI EATS', type: 'restaurant' }
    })

    if (!hxiEats) {
      console.log('📝 Creating HXI EATS restaurant business...')
      hxiEats = await prisma.businesses.create({
        data: {
          id: `hxi-eats-${Date.now()}`,
          name: 'HXI EATS',
          type: 'restaurant',
          description: 'Demo restaurant for order testing',
          isActive: true
        }
      })
      console.log('✅ Created HXI EATS restaurant:', hxiEats.id)
    } else {
      console.log('✅ Found existing HXI EATS restaurant:', hxiEats.id)
    }

    // Create or get Mary user
    let mary = await prisma.users.findFirst({
      where: { email: 'mary@hxi.com' }
    })

    if (!mary) {
      console.log('📝 Creating Mary user...')
      mary = await prisma.users.create({
        data: {
          id: `mary-${Date.now()}`,
          email: 'mary@hxi.com',
          name: 'Mary Hwandaza',
          passwordHash: 'demo-placeholder',
          role: 'employee'
        }
      })
      console.log('✅ Created Mary user:', mary.id)
    } else {
      console.log('✅ Found existing Mary user:', mary.id)
    }

    // Create some customers first
    const customers = []
    const customerData = [
      { name: 'John Smith', phone: '+263771234567', email: 'john@example.com' },
      { name: 'Sarah Johnson', phone: '+263772345678', email: 'sarah@example.com' },
      { name: 'Mike Wilson', phone: '+263773456789', email: 'mike@example.com' }
    ]

    for (const customerInfo of customerData) {
      const customer = await prisma.businessCustomers.create({
        data: {
          id: `${hxiEats.id}-customer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          businessId: hxiEats.id,
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          customerNumber: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          businessType: 'restaurant',
          isActive: true,
          updatedAt: new Date()
        }
      })
      customers.push(customer)
      console.log(`✅ Created customer: ${customer.name}`)
    }

    // Create business categories first
    const categories = ['Burgers', 'Appetizers', 'Salads', 'Drinks', 'Main Course']
    const categoryMap = {}
    
    for (const categoryName of categories) {
      const categoryId = `${hxiEats.id}-category-${categoryName.toLowerCase().replace(/\s+/g, '-')}`
      const category = await prisma.businessCategories.upsert({
        where: { id: categoryId },
        update: {
          description: `${categoryName} menu items`,
          businessType: 'restaurant',
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          id: categoryId,
          businessId: hxiEats.id,
          name: categoryName,
          description: `${categoryName} menu items`,
          businessType: 'restaurant',
          isActive: true,
          updatedAt: new Date()
        }
      })
      categoryMap[categoryName] = category.id
      console.log(`✅ Created/updated category: ${categoryName}`)
    }

    // Create some products/menu items
    const products = []
    const menuItems = [
      { name: 'Beef Burger', price: 12.50, type: 'FOOD', category: 'Burgers' },
      { name: 'Chicken Wings', price: 8.75, type: 'FOOD', category: 'Appetizers' },
      { name: 'Caesar Salad', price: 7.25, type: 'FOOD', category: 'Salads' },
      { name: 'Coca Cola', price: 2.50, type: 'BEVERAGE', category: 'Drinks' },
      { name: 'Fish & Chips', price: 15.00, type: 'FOOD', category: 'Main Course' }
    ]

    for (const item of menuItems) {
      const productId = `${hxiEats.id}-product-${item.name.replace(/\s+/g, '-').toLowerCase()}`
      const product = await prisma.businessProducts.upsert({
        where: { id: productId },
        update: {
          description: `Delicious ${item.name}`,
          categoryId: categoryMap[item.category],
          basePrice: item.price,
          isActive: true,
          attributes: {
            menuCategory: item.category,
            foodType: item.type
          },
          updatedAt: new Date()
        },
        create: {
          id: productId,
          businessId: hxiEats.id,
          name: item.name,
          description: `Delicious ${item.name}`,
          categoryId: categoryMap[item.category],
          productType: 'PHYSICAL',
          basePrice: item.price,
          isActive: true,
          businessType: 'restaurant',
          attributes: {
            menuCategory: item.category,
            foodType: item.type
          },
          updatedAt: new Date()
        }
      })

      // Create a default variant
      const variantSku = `${item.name.replace(/\s+/g, '-').toUpperCase()}-DFT`
      const variant = await prisma.productVariants.upsert({
        where: { sku: variantSku },
        update: {
          price: item.price,
          stockQuantity: 100,
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          id: `${product.id}-variant-default`,
          productId: product.id,
          name: 'Default',
          sku: variantSku,
          price: item.price,
          stockQuantity: 100,
          isActive: true,
          updatedAt: new Date()
        }
      })

      products.push({ product, variant })
      console.log(`✅ Created menu item: ${product.name}`)
    }

    // Create real restaurant orders
    const orders = []
    const orderData = [
      {
        customerIndex: 0,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [
          { productIndex: 0, quantity: 2 }, // 2x Beef Burger
          { productIndex: 3, quantity: 2 }  // 2x Coca Cola
        ],
        hoursAgo: 2
      },
      {
        customerIndex: 1,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        items: [
          { productIndex: 1, quantity: 1 }, // 1x Chicken Wings
          { productIndex: 2, quantity: 1 }, // 1x Caesar Salad
          { productIndex: 3, quantity: 1 }  // 1x Coca Cola
        ],
        hoursAgo: 4
      },
      {
        customerIndex: 2,
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        items: [
          { productIndex: 4, quantity: 1 }, // 1x Fish & Chips
          { productIndex: 3, quantity: 1 }  // 1x Coca Cola
        ],
        hoursAgo: 1
      },
      {
        customerIndex: 0,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: [
          { productIndex: 0, quantity: 1 }, // 1x Beef Burger
          { productIndex: 1, quantity: 1 }  // 1x Chicken Wings
        ],
        hoursAgo: 0.5
      },
      {
        customerIndex: null, // Walk-in customer
        status: 'READY',
        paymentStatus: 'PAID',
        items: [
          { productIndex: 2, quantity: 2 }, // 2x Caesar Salad
        ],
        hoursAgo: 0.25
      }
    ]

    for (let i = 0; i < orderData.length; i++) {
      const orderInfo = orderData[i]
      const customer = orderInfo.customerIndex !== null ? customers[orderInfo.customerIndex] : null

      // Calculate totals
      let subtotal = 0
      const orderItems = orderInfo.items.map(item => {
        const productVariant = products[item.productIndex].variant
        const itemTotal = productVariant.price * item.quantity
        subtotal += itemTotal
        return {
          productVariantId: productVariant.id,
          quantity: item.quantity,
          unitPrice: productVariant.price,
          totalPrice: itemTotal
        }
      })

      const taxAmount = subtotal * 0.15 // 15% VAT
      const totalAmount = subtotal + taxAmount

      // Create order
      const orderNumber = `HXI-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`
      const order = await prisma.businessOrders.create({
        data: {
          id: `${hxiEats.id}-order-${orderNumber}-${Date.now()}`,
          businessId: hxiEats.id,
          customerId: customer?.id,
          employeeId: null, // No employee record needed for demo
          orderNumber,
          orderType: 'SALE',
          status: orderInfo.status,
          paymentStatus: orderInfo.paymentStatus,
          paymentMethod: orderInfo.paymentStatus === 'PAID' ? 'CASH' : null,
          subtotal: subtotal,
          taxAmount: taxAmount,
          totalAmount: totalAmount,
          businessType: 'restaurant',
          notes: customer ? `Order for ${customer.name}` : 'Walk-in customer order',
          attributes: {
            tableNumber: Math.floor(Math.random() * 10) + 1,
            orderType: customer ? 'DINE_IN' : 'TAKEOUT'
          },
          createdAt: new Date(Date.now() - (orderInfo.hoursAgo * 60 * 60 * 1000)),
          updatedAt: new Date(Date.now() - (orderInfo.hoursAgo * 60 * 60 * 1000))
        }
      })

      // Create order items
      for (const item of orderItems) {
        await prisma.businessOrderItems.create({
          data: {
            id: `${order.id}-item-${item.productVariantId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            orderId: order.id,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          }
        })
      }

      orders.push(order)
      console.log(`✅ Created order: ${order.orderNumber} (${order.status}) - $${order.totalAmount.toFixed(2)}`)
    }

    console.log('\n🎉 Real restaurant orders creation completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   🏢 Restaurant: HXI EATS`)
    console.log(`   👥 Customers: ${customers.length}`)
    console.log(`   🍽️ Menu Items: ${products.length}`)
    console.log(`   📋 Orders: ${orders.length}`)
    console.log(`   💰 Total Revenue: $${orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0).toFixed(2)}`)
    console.log('\n✨ You can now test the restaurant orders API with real data!')
    console.log('\n🔍 To view orders:')
    console.log('   - Restaurant Orders Page: http://localhost:8080/restaurant/orders')
    console.log('   - Recent Activity: Login as Mary or Admin and check dashboard')

  } catch (error) {
    console.error('❌ Error creating real restaurant orders:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createRealRestaurantOrders()
  .then(() => {
    console.log('\n🚀 Real restaurant orders script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Real restaurant orders script failed:', error)
    process.exit(1)
  })