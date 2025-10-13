import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, auditCreate } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

import { randomBytes } from 'crypto';
// Simple in-memory idempotency store: maps idempotencyKey -> response payload
// Note: this is ephemeral (process memory). It prevents duplicate orders for
// repeated client retries while the server process is running. For durable
// idempotency across restarts, a DB table or Redis would be needed.
const idempotencyStore = new Map<string, any>()

// Get restaurant business IDs that user can access
async function getRestaurantBusinessIds(session: any, request?: NextRequest) {

  // Check if user is system admin - they can see all restaurant orders
  // If session already indicates admin (useful for dev bypass), return all restaurant businesses
  if (session?.user?.role === 'admin') {
    const allRestaurantBusinesses = await prisma.businesses.findMany({
      where: { type: 'restaurant' },
      select: { id: true, name: true }
    })

    return allRestaurantBusinesses.map(b => b.id)
  }

  // Otherwise fetch the user record to determine memberships
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      businessMemberships: {
        where: {
          businesses: { type: 'restaurant' },
          isActive: true
        },
        include: {
          businesses: { select: { id: true, name: true } }
        }
      }
    }
  })

  // If user is admin in DB, return all restaurants
  if (user?.role === 'admin') {
    const allRestaurantBusinesses = await prisma.businesses.findMany({
      where: { type: 'restaurant' },
      select: { id: true }
    })
    return allRestaurantBusinesses.map(b => b.id)
  }

  // For non-admin users, only return businesses they have membership to
  return user?.businessMemberships?.map(m => m.businesses.id) || []
}

// GET - Fetch restaurant orders using universal orders API
export async function GET(request: NextRequest) {
  try {
    let session = await getServerSession(authOptions)

    // Dev-only bypass: allow passing _devUserId for local testing when not in production
    if ((!session || !session?.user?.id) && process.env.NODE_ENV !== 'production') {
      const { searchParams } = new URL(request.url)
      const devUserId = searchParams.get('_devUserId')
      if (devUserId) {
        const devUser = await prisma.users.findUnique({ where: { id: devUserId } })
        if (devUser) {
          // Check if caller asked to be treated as admin for local testing
          const devAdminFlag = searchParams.get('_devAdmin')
          const role = devAdminFlag === '1' ? 'admin' : ((devUser.role as any) || 'user')

          // Build a minimal session-like object expected by the rest of the handler
          session = { user: { id: devUser.id, name: (devUser.name as any) || devUser.email || 'dev', role, permissions: (devUser.permissions as any) || {} } } as any
        }
      }
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const orderType = searchParams.get('orderType')
    const paymentStatus = searchParams.get('paymentStatus')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'

    // Get restaurant business IDs that user can access
    const restaurantBusinessIds = await getRestaurantBusinessIds(session, request)

    if (!restaurantBusinessIds.length) {
      return NextResponse.json({
        success: false,
        error: 'No restaurant business access found for user'
      }, { status: 403 })
    }

  // Fetch orders directly from businessOrder table (use top-level prisma import)

    // Build where clause for database query
    const whereClause: any = {
      businessId: { in: restaurantBusinessIds },
      businessType: 'restaurant'
    }

    if (status && status !== 'all') {
      // Map restaurant-specific statuses to database statuses
      const statusMap: Record<string, string> = {
        'PENDING': 'PENDING',
        'CONFIRMED': 'CONFIRMED',
        'PREPARING': 'PROCESSING',
        'READY': 'READY',
        'SERVED': 'COMPLETED',
        'COMPLETED': 'COMPLETED',
        'CANCELLED': 'CANCELLED'
      }
      whereClause.status = statusMap[status] || status
    }

    if (paymentStatus && paymentStatus !== 'all') {
      // Map restaurant payment statuses to database payment statuses
      const paymentStatusMap: Record<string, string> = {
        'PENDING': 'PENDING',
        'PAID': 'PAID',
        'PARTIAL': 'PARTIALLY_PAID',
        'REFUNDED': 'REFUNDED'
      }
      whereClause.paymentStatus = paymentStatusMap[paymentStatus] || paymentStatus
    }

    const orders = await prisma.businessOrders.findMany({
      where: whereClause,
      include: {
        businesses: {
          select: {
            name: true,
            type: true
          }
        },
        employee: {
          select: {
            fullName: true
          }
        },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            productVariant: {
              select: {
                name: true,
                product: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    })

    // Transform businessOrder data to restaurant-specific format
    const transformedOrders = orders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: 'Walk-in Customer', // businessOrder doesn't have customer info
      customerPhone: '',
      customerEmail: '',
      tableNumber: order.attributes?.tableNumber || '',
  orderType: mapOrderType(order.orderType || 'SALE'),
  // Mark kitchen tickets explicitly if the record uses the KITCHEN_TICKET enum or has ticketType attribute
  isKitchenTicket: (order.orderType === 'KITCHEN_TICKET') || (order.attributes && order.attributes.ticketType === 'KITCHEN'),
      status: mapStatus(order.status),
      subtotal: Number(order.subtotal || 0),
      taxAmount: Number(order.taxAmount || 0),
      tipAmount: order.attributes?.tipAmount || 0,
      totalAmount: Number(order.totalAmount),
      paymentStatus: mapPaymentStatus(order.paymentStatus),
      paymentMethod: order.paymentMethod || '',
      notes: order.notes || '',
      estimatedReadyTime: order.attributes?.estimatedReadyTime || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        productName: item.productVariant?.product?.name || item.productVariant?.name || 'Unknown Item'
      }))
    }))

    // Apply restaurant-specific filters
    let filteredOrders = transformedOrders

    if (orderType && orderType !== 'all') {
      filteredOrders = filteredOrders.filter((order: any) => order.orderType === orderType)
    }

    // Calculate pagination metadata
    const totalCount = await prisma.businessOrders.count({
      where: whereClause
    })

    return NextResponse.json({
      success: true,
      data: filteredOrders,
      meta: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    })

  } catch (error) {
    console.error('Error fetching restaurant orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper functions to map between universal and restaurant-specific values
function mapOrderType(universalType: string): string {
  const typeMap: Record<string, string> = {
    'SALE': 'DINE_IN',
    'TAKEOUT': 'TAKEOUT',
    'DELIVERY': 'DELIVERY'
  }
  return typeMap[universalType] || 'DINE_IN'
}

function mapStatus(universalStatus: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'PENDING',
    'CONFIRMED': 'CONFIRMED',
    'PROCESSING': 'PREPARING',
    'READY': 'READY',
    'COMPLETED': 'SERVED',
    'CANCELLED': 'CANCELLED'
  }
  return statusMap[universalStatus] || universalStatus
}

function mapPaymentStatus(universalPaymentStatus: string): string {
  const paymentStatusMap: Record<string, string> = {
    'PENDING': 'PENDING',
    'PAID': 'PAID',
    'PARTIALLY_PAID': 'PARTIAL',
    'REFUNDED': 'REFUNDED',
    'FAILED': 'PENDING'
  }
  return paymentStatusMap[universalPaymentStatus] || universalPaymentStatus
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userPermissions = session.user.permissions || {}
  if (!hasPermission(userPermissions, 'restaurant', 'pos')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { items, total, tableNumber, businessId = 'restaurant-demo', idempotencyKey } = await req.json()

    // If client provided an idempotencyKey, and we've already processed it, return stored result
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      const existing = idempotencyStore.get(idempotencyKey)
      if (existing) {
        // Return a clone to avoid accidental mutation by callers
        return NextResponse.json({ ...existing })
      }
    }

    const orderNumber = `ORD-${Date.now()}`

    // Create the order first
    const newOrder = await prisma.orders.create({
      data: {
        orderNumber,
        status: 'pending',
        total: total,
        tableNumber: tableNumber || null,
        createdBy: session.user.id,
      }
    })

    // Process each order item and update inventory
    const inventoryUpdates = []

    for (const item of items) {
      const itemPrice = Number(item.price);

      // Resolve menuItemId. The frontend should ideally send MenuItem IDs, but sometimes
      // product/variant IDs are sent. Try to find a MenuItem first; if missing, create one
      // from BusinessProduct or ProductVariant information.
      let menuItemId = item.id
      const existingMenuItem = await prisma.menuItems.findUnique({ where: { id: item.id } })
      if (!existingMenuItem) {
        const bp = await prisma.businessProducts.findUnique({ where: { id: item.id } }).catch(() => null)
        let variant = null
        if (!bp) {
          variant = await prisma.productVariants.findUnique({ where: { id: item.id } }).catch(() => null)
        }

        if (bp || variant) {
          try {
            // If variant exists, fetch its parent business product for richer data
            let sourceProduct = bp
            if (variant && !bp) {
              sourceProduct = await prisma.businessProducts.findUnique({ where: { id: variant.productId } }).catch(() => null)
            }

            const created = await prisma.menuItems.create({
              data: {
                name: sourceProduct?.name || variant?.name || item.name || 'Menu Item',
                description: sourceProduct?.description || null,
                price: Number(sourceProduct?.basePrice ?? variant?.price ?? item.price ?? 0),
                category: item.category || 'Unassigned',
                barcode: sourceProduct?.barcode ?? variant?.barcode ?? null,
                isAvailable: sourceProduct ? !!sourceProduct.isActive : true
              }
            })
            menuItemId = created.id
          } catch (err) {
            console.warn('Failed to auto-create MenuItem for order item', item.id, err)
          }
        }
      }

      await prisma.orderItems.create({
        data: {
          orderId: newOrder.id,
          menuItemId: menuItemId,
          quantity: item.quantity,
          price: itemPrice,
        }
      })

      // Get menu item ingredients to update inventory
      try {
        const menuItemResponse = await fetch(`${req.nextUrl.origin}/api/universal/products/${item.id}`)
        if (menuItemResponse.ok) {
          const menuItemData = await menuItemResponse.json()
          const menuItem = menuItemData.data

          // If menu item has ingredients (recipe), update inventory for each ingredient
          if (menuItem?.attributes?.ingredients) {
            for (const ingredient of menuItem.attributes.ingredients) {
              const quantityUsed = (ingredient.quantity || 1) * item.quantity

              // Create stock movement for ingredient usage
              const movementData = {
                businessId,
                itemId: ingredient.inventoryItemId || ingredient.id,
                itemName: ingredient.name,
                itemSku: ingredient.sku || `ING-${ingredient.id}`,
                movementType: 'use',
                quantity: -Math.abs(quantityUsed), // Negative for usage
                unit: ingredient.unit || 'units',
                reason: `Used in order ${orderNumber} - ${menuItem.name}`,
                notes: `Order item: ${item.quantity}x ${menuItem.name}`,
                employeeName: session.user.name,
                referenceNumber: orderNumber
              }

              // Call inventory movements API to record usage
              const movementResponse = await fetch(`${req.nextUrl.origin}/api/inventory/${businessId}/movements`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cookie': req.headers.get('cookie') || ''
                },
                body: JSON.stringify(movementData)
              })

              if (movementResponse.ok) {
                inventoryUpdates.push({
                  ingredientId: ingredient.id,
                  quantityUsed,
                  success: true
                })
              } else {
                console.warn(`Failed to update inventory for ingredient ${ingredient.name}`)
                inventoryUpdates.push({
                  ingredientId: ingredient.id,
                  quantityUsed,
                  success: false,
                  error: 'Failed to record stock movement'
                })
              }
            }
          }
        }
      } catch (inventoryError) {
        console.error(`Inventory update failed for item ${item.id}:`, inventoryError)
        inventoryUpdates.push({
          itemId: item.id,
          success: false,
          error: 'Inventory update failed'
        })
      }
    }

    // Record audit entry for order creation
    try {
      await auditCreate({ userId: session.user.id }, 'Business', newOrder.id, {
        orderNumber,
        total,
        itemCount: items.length,
        inventoryUpdates: inventoryUpdates.length
      }, { tableName: 'orders', recordId: newOrder.id })
    } catch (auditErr) {
      console.warn('Audit log failed for order creation', auditErr)
    }

    const responsePayload = {
      ...newOrder,
      inventoryUpdates,
      message: inventoryUpdates.some(u => !u.success)
        ? 'Order created with some inventory update warnings'
        : 'Order created and inventory updated successfully'
    }

    // Store idempotency result for future deduplication (ephemeral)
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      try {
        idempotencyStore.set(idempotencyKey, responsePayload)
      } catch (err) {
        console.warn('Failed to store idempotency key', err)
      }
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Order processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process order' },
      { status: 500 }
    )
  }
}