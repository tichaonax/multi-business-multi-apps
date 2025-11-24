import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper function to check admin access
function isAdmin(session: any): boolean {
  return session?.user?.role === 'admin';
}

// Helper functions
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    // Get all demo businesses
    const demoBusinesses = await prisma.businesses.findMany({
      where: { isDemo: true },
      select: { id: true, name: true, type: true }
    });

    // Check for existing demo business orders
    const existingOrdersCount = await prisma.businessOrders.count({
      where: {
        businessId: {
          in: demoBusinesses.map(b => b.id)
        }
      }
    });

    let cleanupCount = 0;
    if (existingOrdersCount > 0) {
      // Get all order IDs
      const demoOrders = await prisma.businessOrders.findMany({
        where: {
          businessId: {
            in: demoBusinesses.map(b => b.id)
          }
        },
        select: { id: true }
      });

      const orderIds = demoOrders.map(o => o.id);

      // Delete order items first
      if (orderIds.length > 0) {
        await prisma.businessOrderItems.deleteMany({
          where: {
            orderId: {
              in: orderIds
            }
          }
        });
      }

      // Delete orders
      await prisma.businessOrders.deleteMany({
        where: {
          businessId: {
            in: demoBusinesses.map(b => b.id)
          }
        }
      });

      cleanupCount = existingOrdersCount;
    }

    const businessResults: any[] = [];
    let totalOrdersCreated = 0;

    // Category data by business type
    const categoryData: Record<string, Array<{ name: string; price: number }>> = {
      restaurant: [
        { name: 'Sadza & Chicken', price: 8.50 },
        { name: 'Rice & Chicken', price: 9.00 },
        { name: 'Sadza & Fish', price: 10.00 },
        { name: 'Fish & Chips', price: 11.50 },
        { name: 'Sadza & Beef', price: 12.00 },
        { name: 'Beverages', price: 2.50 },
        { name: 'Desserts', price: 4.50 },
        { name: 'Appetizers', price: 5.00 }
      ],
      grocery: [
        { name: 'Fresh Produce', price: 15.00 },
        { name: 'Dairy & Eggs', price: 12.00 },
        { name: 'Meat & Poultry', price: 25.00 },
        { name: 'Bakery', price: 8.00 },
        { name: 'Canned Goods', price: 6.00 },
        { name: 'Beverages', price: 10.00 },
        { name: 'Snacks & Candy', price: 5.00 },
        { name: 'Frozen Foods', price: 18.00 }
      ],
      clothing: [
        { name: 'Shirts & Tops', price: 25.00 },
        { name: 'Pants & Jeans', price: 45.00 },
        { name: 'Dresses & Skirts', price: 55.00 },
        { name: 'Outerwear & Jackets', price: 85.00 },
        { name: 'Shoes & Footwear', price: 65.00 },
        { name: 'Accessories', price: 15.00 },
        { name: 'Underwear & Socks', price: 12.00 },
        { name: 'Activewear', price: 40.00 }
      ],
      hardware: [
        { name: 'Power Tools', price: 120.00 },
        { name: 'Hand Tools', price: 35.00 },
        { name: 'Building Materials', price: 75.00 },
        { name: 'Plumbing Supplies', price: 45.00 },
        { name: 'Electrical Supplies', price: 50.00 },
        { name: 'Paint & Supplies', price: 40.00 },
        { name: 'Fasteners & Hardware', price: 15.00 },
        { name: 'Safety Equipment', price: 30.00 }
      ]
    };

    const paymentMethods = ['CASH', 'CARD', 'MOBILE_MONEY'];
    const orderStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PROCESSING'];

    // Process each business
    for (const business of demoBusinesses) {
      const categories = categoryData[business.type] || categoryData.grocery;

      // Get employees for this business
      const employees = await prisma.employees.findMany({
        where: { primaryBusinessId: business.id },
        include: { job_titles: true }
      });

      if (employees.length === 0) {
        businessResults.push({
          businessId: business.id,
          businessName: business.name,
          businessType: business.type,
          ordersCreated: 0,
          error: 'No employees found'
        });
        continue;
      }

      // Weight employees by role
      const weightedEmployees: any[] = [];
      for (const emp of employees) {
        const jobTitle = emp.job_titles?.title?.toLowerCase() || '';
        const isManager = jobTitle.includes('manager') || jobTitle.includes('supervisor');
        const isStaff = jobTitle.includes('clerk') || jobTitle.includes('stock');
        const weight = isManager ? 1 : isStaff ? 0 : 4;

        for (let i = 0; i < weight; i++) {
          weightedEmployees.push(emp);
        }
      }

      let businessOrderCount = 0;
      const now = new Date();

      // Create orders for last 30 days
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const orderDate = new Date(now);
        orderDate.setDate(now.getDate() - dayOffset);
        orderDate.setHours(0, 0, 0, 0);

        const ordersPerDay = randomInt(5, 20);

        for (let orderNum = 0; orderNum < ordersPerDay; orderNum++) {
          const orderTime = new Date(orderDate);
          orderTime.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));

          const dateStr = orderDate.toISOString().split('T')[0].replace(/-/g, '');
          const orderNumber = `${business.type.toUpperCase().slice(0, 3)}-${dateStr}-${String(orderNum + 1).padStart(4, '0')}`;

          const itemCount = randomInt(1, 5);
          const orderItems: any[] = [];
          let subtotal = 0;

          for (let i = 0; i < itemCount; i++) {
            const category = randomItem(categories);
            const quantity = randomInt(1, 3);
            const unitPrice = category.price;
            const totalPrice = parseFloat((unitPrice * quantity).toFixed(2));

            orderItems.push({
              categoryName: category.name,
              quantity,
              unitPrice,
              totalPrice
            });

            subtotal += totalPrice;
          }

          subtotal = parseFloat(subtotal.toFixed(2));
          const taxAmount = parseFloat((subtotal * 0.15).toFixed(2));
          const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

          const status = randomItem(orderStatuses);
          const paymentMethod = randomItem(paymentMethods);
          const salesPerson = weightedEmployees.length > 0 ? randomItem(weightedEmployees) : null;

          try {
            const order = await prisma.businessOrders.create({
              data: {
                businessId: business.id,
                orderNumber,
                orderType: 'SALE',
                status,
                paymentStatus: status === 'COMPLETED' ? 'PAID' : 'PENDING',
                paymentMethod: status === 'COMPLETED' ? paymentMethod : null,
                subtotal,
                taxAmount,
                totalAmount,
                businessType: business.type,
                employeeId: salesPerson?.id || null,
                notes: `Seed order - ${orderItems.map(i => `${i.quantity}x ${i.categoryName}`).join(', ')}`,
                attributes: {
                  demoSeed: true,
                  categories: orderItems.map(i => ({
                    name: i.categoryName,
                    quantity: i.quantity,
                    total: i.totalPrice
                  }))
                },
                createdAt: orderTime,
                updatedAt: orderTime
              }
            });

            // Create order items
            for (const item of orderItems) {
              await prisma.businessOrderItems.create({
                data: {
                  id: `${order.id}-item-${Math.random().toString(36).slice(2, 10)}`,
                  orderId: order.id,
                  productVariantId: null,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  attributes: { categoryName: item.categoryName },
                  createdAt: orderTime
                }
              });
            }

            businessOrderCount++;
            totalOrdersCreated++;
          } catch (error) {
            // Skip duplicates
          }
        }
      }

      businessResults.push({
        businessId: business.id,
        businessName: business.name,
        businessType: business.type,
        ordersCreated: businessOrderCount,
        employees: employees.length,
        weightedPool: weightedEmployees.length
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Demo business orders seeded successfully',
      data: {
        cleanedUp: cleanupCount,
        totalOrders: totalOrdersCreated,
        businesses: businessResults,
        dateRange: '30 days',
        averagePerBusiness: Math.round(totalOrdersCreated / demoBusinesses.length)
      }
    });

  } catch (error: any) {
    console.error('Error seeding demo orders:', error);
    return NextResponse.json(
      { error: 'Failed to seed demo orders', details: error.message },
      { status: 500 }
    );
  }
}
