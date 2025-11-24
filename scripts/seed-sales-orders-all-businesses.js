const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed sales orders for all business types (restaurant, grocery, clothing, hardware)
 * Creates 30 days of historical data for testing charts and reports
 */

// Helper: Get random item from array
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Helper: Get random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper: Get random float between min and max
function randomFloat(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

/**
 * Create sales orders for a business with realistic category distribution
 */
async function createSalesOrders(businessId, businessType, categories, daysBack = 30) {
  console.log(`\n📊 Creating sales orders for ${businessType} business (${businessId})...`)

  const paymentMethods = ['CASH', 'CARD', 'MOBILE_MONEY']
  const orderStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PROCESSING'] // 80% completed

  let totalOrders = 0
  const now = new Date()

  // Get employees for this business
  const employees = await prisma.employees.findMany({
    where: { primaryBusinessId: businessId },
    include: { job_titles: true }
  })

  console.log(`  Found ${employees.length} employees`)

  // Get available product variants for this business
  const productVariants = await prisma.productVariants.findMany({
    where: {
      productId: {
        in: (await prisma.businessProducts.findMany({
          where: { businessId, isActive: true },
          select: { id: true }
        })).map(p => p.id)
      },
      isActive: true,
      stockQuantity: { gt: 0 } // Only use variants with stock
    },
    include: {
      business_products: {
        select: { name: true, categoryId: true }
      }
    }
  })

  console.log(`  Found ${productVariants.length} available product variants`)

  // Weight employees by role (sales staff get more orders than managers/staff)
  const weightedEmployees = []
  for (const emp of employees) {
    const jobTitle = emp.job_titles?.title?.toLowerCase() || ''
    const isManager = jobTitle.includes('manager') || jobTitle.includes('supervisor')
    const isStaff = jobTitle.includes('clerk') || jobTitle.includes('stock')

    // Sales get 4x weight, managers get 1x weight, staff get 0x (don't sell)
    const weight = isManager ? 1 : isStaff ? 0 : 4

    for (let i = 0; i < weight; i++) {
      weightedEmployees.push(emp)
    }
  }

  console.log(`  Weighted employee pool size: ${weightedEmployees.length}`)

  // Create orders for each of the last N days
  for (let dayOffset = 0; dayOffset < daysBack; dayOffset++) {
    const orderDate = new Date(now)
    orderDate.setDate(now.getDate() - dayOffset)
    orderDate.setHours(0, 0, 0, 0)

    // Varying number of orders per day (5-20 orders)
    const ordersPerDay = randomInt(5, 20)

    for (let orderNum = 0; orderNum < ordersPerDay; orderNum++) {
      // Random time during business hours (8 AM - 8 PM)
      const orderTime = new Date(orderDate)
      orderTime.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59))

      // Generate unique order number
      const dateStr = orderDate.toISOString().split('T')[0].replace(/-/g, '')
      const orderNumber = `${businessType.toUpperCase().slice(0, 3)}-${dateStr}-${String(orderNum + 1).padStart(4, '0')}`

      // Select 1-5 items for this order
      const itemCount = randomInt(1, 5)
      const orderItems = []
      let subtotal = 0

      for (let i = 0; i < itemCount; i++) {
        // Select random product variant instead of just category
        if (productVariants.length === 0) {
          // Fallback to category-based if no variants available
          const category = randomItem(categories)
          const quantity = randomInt(1, 3)
          const unitPrice = category.price
          const totalPrice = parseFloat((unitPrice * quantity).toFixed(2))

          orderItems.push({
            categoryName: category.name,
            quantity,
            unitPrice,
            totalPrice,
            productVariantId: null,
            productName: category.name
          })

          subtotal += totalPrice
        } else {
          // Use actual product variant
          const variant = randomItem(productVariants)
          const quantity = randomInt(1, Math.min(3, variant.stockQuantity || 3)) // Don't exceed stock
          const unitPrice = variant.price
          const totalPrice = parseFloat((unitPrice * quantity).toFixed(2))

          orderItems.push({
            categoryName: variant.business_products?.name || 'Unknown Product',
            quantity,
            unitPrice,
            totalPrice,
            productVariantId: variant.id,
            productName: variant.business_products?.name || variant.name
          })

          subtotal += totalPrice
        }
      }

      subtotal = parseFloat(subtotal.toFixed(2))
      const taxAmount = parseFloat((subtotal * 0.15).toFixed(2)) // 15% tax
      const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2))

      const status = randomItem(orderStatuses)
      const paymentMethod = randomItem(paymentMethods)

      // Assign to random sales person (weighted by role)
      const salesPerson = weightedEmployees.length > 0 ? randomItem(weightedEmployees) : null

      // Create order
      try {
        const order = await prisma.businessOrders.create({
          data: {
            businessId,
            orderNumber,
            orderType: 'SALE',
            status,
            paymentStatus: status === 'COMPLETED' ? 'PAID' : 'PENDING',
            paymentMethod: status === 'COMPLETED' ? paymentMethod : null,
            subtotal,
            taxAmount,
            totalAmount,
            businessType,
            employeeId: salesPerson?.id || null,
            notes: `Seed order - ${orderItems.map(i => `${i.quantity}x ${i.productName}`).join(', ')}`,
            attributes: {
              demoSeed: true,
              categories: orderItems.map(i => ({ name: i.productName, quantity: i.quantity, total: i.totalPrice }))
            },
            createdAt: orderTime,
            updatedAt: orderTime
          }
        })

        totalOrders++

        // Create order items with proper product variant links
        for (let i = 0; i < orderItems.length; i++) {
          const item = orderItems[i]
          await prisma.businessOrderItems.create({
            data: {
              id: `${order.id}-item-${i + 1}`,
              orderId: order.id,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: 0,
              totalPrice: item.totalPrice,
              attributes: {
                productName: item.productName,
                categoryName: item.categoryName
              },
              createdAt: orderTime
            }
          })

          // Update stock if variant exists
          if (item.productVariantId) {
            await prisma.productVariants.update({
              where: { id: item.productVariantId },
              data: {
                stockQuantity: {
                  decrement: item.quantity
                }
              }
            })

            // Create stock movement
            await prisma.businessStockMovements.create({
              data: {
                businessId,
                productVariantId: item.productVariantId,
                movementType: 'SALE',
                quantity: -item.quantity,
                unitCost: item.unitPrice,
                reference: orderNumber,
                employeeId: salesPerson?.id || null,
                businessType,
                attributes: {
                  orderId: order.id
                },
                createdAt: orderTime
              }
            })
          }
        }

      } catch (err) {
        if (err.code === 'P2002') {
          // Duplicate order number, skip
          console.log(`⚠️  Skipping duplicate order: ${orderNumber}`)
        } else {
          console.error(`❌ Error creating order ${orderNumber}:`, err.message)
        }
      }
    }
  }

  console.log(`✅ Created ${totalOrders} sales orders for ${businessType}`)
  return totalOrders
}

async function seed() {
  try {
    console.log('🌱 Seeding sales orders for all business types...\n')

    // Check for existing demo business orders and clean up for fresh seed
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true }
    })

    const existingOrdersCount = await prisma.businessOrders.count({
      where: {
        businessId: {
          in: demoBusinesses.map(b => b.id)
        }
      }
    })

    if (existingOrdersCount > 0) {
      console.log(`⚠️  Found ${existingOrdersCount} existing demo business orders`)
      console.log('🗑️  Cleaning up existing demo order data to ensure fresh seed...\n')

      // Get all order IDs for demo businesses
      const demoOrders = await prisma.businessOrders.findMany({
        where: {
          businessId: {
            in: demoBusinesses.map(b => b.id)
          }
        },
        select: { id: true }
      })

      const orderIds = demoOrders.map(o => o.id)

      // Delete order items first (foreign key constraint)
      if (orderIds.length > 0) {
        await prisma.businessOrderItems.deleteMany({
          where: {
            orderId: {
              in: orderIds
            }
          }
        })
      }

      // Then delete orders
      await prisma.businessOrders.deleteMany({
        where: {
          businessId: {
            in: demoBusinesses.map(b => b.id)
          }
        }
      })

      console.log('✅ Cleanup complete\n')
    } else {
      console.log('✅ No existing demo orders found\n')
    }

    // ========================================
    // RESTAURANT BUSINESS
    // ========================================
    const restaurantCategories = [
      { name: 'Sadza & Chicken', price: 8.50 },
      { name: 'Rice & Chicken', price: 9.00 },
      { name: 'Sadza & Fish', price: 10.00 },
      { name: 'Fish & Chips', price: 11.50 },
      { name: 'Sadza & Beef', price: 12.00 },
      { name: 'Beverages', price: 2.50 },
      { name: 'Desserts', price: 4.50 },
      { name: 'Appetizers', price: 5.00 }
    ]

    const restaurantBusiness = await prisma.businesses.findFirst({
      where: { type: 'restaurant', isDemo: true }
    })

    if (restaurantBusiness) {
      await createSalesOrders(restaurantBusiness.id, 'restaurant', restaurantCategories, 30)
    } else {
      console.log('⚠️  No restaurant demo business found, skipping...')
    }

    // ========================================
    // GROCERY BUSINESS
    // ========================================
    const groceryCategories = [
      { name: 'Fresh Produce', price: 15.00 },
      { name: 'Dairy & Eggs', price: 12.00 },
      { name: 'Meat & Poultry', price: 25.00 },
      { name: 'Bakery', price: 8.00 },
      { name: 'Canned Goods', price: 6.00 },
      { name: 'Beverages', price: 10.00 },
      { name: 'Snacks & Candy', price: 5.00 },
      { name: 'Frozen Foods', price: 18.00 }
    ]

    const groceryBusiness = await prisma.businesses.findFirst({
      where: { type: 'grocery', isDemo: true }
    })

    if (groceryBusiness) {
      await createSalesOrders(groceryBusiness.id, 'grocery', groceryCategories, 30)
    } else {
      console.log('⚠️  No grocery demo business found, skipping...')
    }

    // ========================================
    // CLOTHING BUSINESS
    // ========================================
    const clothingCategories = [
      { name: "Men's Shirts", price: 35.00 },
      { name: "Women's Dresses", price: 55.00 },
      { name: "Men's Pants", price: 45.00 },
      { name: "Women's Tops", price: 30.00 },
      { name: 'Shoes', price: 65.00 },
      { name: 'Accessories', price: 20.00 },
      { name: "Children's Clothing", price: 25.00 },
      { name: 'Outerwear', price: 80.00 }
    ]

    const clothingBusiness = await prisma.businesses.findFirst({
      where: { type: 'clothing', isDemo: true }
    })

    if (clothingBusiness) {
      await createSalesOrders(clothingBusiness.id, 'clothing', clothingCategories, 30)
    } else {
      console.log('⚠️  No clothing demo business found, skipping...')
    }

    // ========================================
    // HARDWARE BUSINESS
    // ========================================
    const hardwareCategories = [
      { name: 'Hand Tools', price: 35.00 },
      { name: 'Power Tools', price: 125.00 },
      { name: 'Plumbing', price: 45.00 },
      { name: 'Electrical', price: 30.00 },
      { name: 'Paint & Supplies', price: 50.00 },
      { name: 'Building Materials', price: 75.00 },
      { name: 'Fasteners & Hardware', price: 15.00 },
      { name: 'Lawn & Garden', price: 40.00 }
    ]

    const hardwareBusiness = await prisma.businesses.findFirst({
      where: { type: 'hardware', isDemo: true }
    })

    if (hardwareBusiness) {
      await createSalesOrders(hardwareBusiness.id, 'hardware', hardwareCategories, 30)
    } else {
      console.log('⚠️  No hardware demo business found, skipping...')
    }

    console.log('\n✅ Sales order seeding complete!')
    console.log('\n📊 You can now test the charts at:')
    console.log('   - http://localhost:8080/restaurant/reports/dashboard')
    console.log('   - Use the sidebar to switch between business types')

  } catch (err) {
    console.error('❌ Seed failed:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seed()
}

module.exports = { seed }
