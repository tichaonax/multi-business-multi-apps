import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params

    // Get today's date range
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    // 1. Calculate Daily Sales (total amount from orders today)
    const todayOrders = await prisma.businessOrders.findMany({
      where: {
        businessId,
        businessType: 'hardware',
        createdAt: {
          gte: todayStart,
          lt: todayEnd
        },
        status: {
          in: ['COMPLETED', 'PENDING', 'PROCESSING']
        }
      },
      select: {
        totalAmount: true
      }
    })

    const dailySales = todayOrders.reduce((sum, order) => {
      return sum + parseFloat(order.totalAmount.toString())
    }, 0)

    // 2. Count Orders Today
    const ordersToday = todayOrders.length

    // 3. Calculate Inventory Value (total value of all products)
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId,
        isActive: true
      },
      include: {
        product_variants: {
          where: {
            isActive: true
          },
          select: {
            price: true,
            stockQuantity: true
          }
        }
      }
    })

    let inventoryValue = 0
    for (const product of products) {
      for (const variant of product.product_variants) {
        const price = parseFloat(variant.price?.toString() || '0')
        const stock = variant.stockQuantity || 0
        inventoryValue += price * stock
      }
    }

    // 4. Count Low Stock Items (stock below reorder level or stock < 5 if no reorder level)
    // Get all products with their variants to check stock levels
    const productsWithVariants = await prisma.businessProducts.findMany({
      where: {
        businessId,
        isActive: true
      },
      include: {
        product_variants: {
          where: {
            isActive: true
          },
          select: {
            stockQuantity: true,
            reorderLevel: true
          }
        }
      }
    })

    // Count products that have at least one low-stock variant
    const lowStockItems = productsWithVariants.filter(product => {
      return product.product_variants.some(variant => {
        const stock = variant.stockQuantity || 0
        const reorderLevel = variant.reorderLevel || 5 // Default to 5 if not set
        return stock <= reorderLevel
      })
    }).length

    // 5. Count Cut-to-Size Orders (orders with attributes containing cut-to-size info)
    // Looking for orders with attributes.isCutToSize = true or notes containing "cut"
    const allOrders = await prisma.businessOrders.findMany({
      where: {
        businessId,
        businessType: 'hardware',
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      },
      select: {
        attributes: true,
        notes: true
      }
    })

    const cutToSizeOrders = allOrders.filter(order => {
      const attrs = order.attributes as any
      const hasCutToSizeAttr = attrs?.isCutToSize === true || attrs?.cutToSize === true
      const hasCutInNotes = order.notes?.toLowerCase().includes('cut') || 
                           order.notes?.toLowerCase().includes('cutting')
      return hasCutToSizeAttr || hasCutInNotes
    }).length

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      data: {
        dailySales: Math.round(dailySales * 100) / 100,
        ordersToday,
        inventoryValue: Math.round(inventoryValue * 100) / 100,
        lowStockItems,
        cutToSizeOrders
      }
    })

  } catch (error) {
    console.error('Error fetching hardware dashboard stats:', error)
    await prisma.$disconnect()
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
