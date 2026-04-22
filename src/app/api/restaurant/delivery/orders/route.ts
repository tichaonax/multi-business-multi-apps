import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// POST — attach delivery metadata to an existing order and handle credit deduction
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { orderId, customerId, deliveryNote } = body

    // Resolve businessId from the order for permission check
    const orderForPerms = orderId
      ? await prisma.businessOrders.findUnique({ where: { id: orderId }, select: { businessId: true } })
      : null
    const perms = getEffectivePermissions(user, orderForPerms?.businessId ?? undefined)
    if (!perms.canCreateDeliveryOrders) {
      return NextResponse.json({ error: 'Forbidden: canCreateDeliveryOrders required' }, { status: 403 })
    }

    if (!orderId || !customerId) {
      return NextResponse.json({ error: 'orderId and customerId are required' }, { status: 400 })
    }

    // Check blacklist
    const account = await prisma.deliveryCustomerAccounts.findUnique({
      where: { customerId },
    })
    if (account?.isBlacklisted) {
      return NextResponse.json(
        { error: 'Customer is blacklisted from delivery', reason: account.blacklistReason },
        { status: 403 }
      )
    }

    // Fetch order total
    const order = await prisma.businessOrders.findUnique({
      where: { id: orderId },
      select: { id: true, totalAmount: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const orderTotal = Number(order.totalAmount) || 0
    const availableCredit = Number(account?.balance || 0)

    let creditUsed = 0
    let paymentMode: string

    if (availableCredit >= orderTotal) {
      creditUsed = orderTotal
      paymentMode = 'PREPAID'
    } else if (availableCredit > 0) {
      creditUsed = availableCredit
      paymentMode = 'PARTIAL'
    } else {
      creditUsed = 0
      paymentMode = 'ON_DELIVERY'
    }

    const newBalance = availableCredit - creditUsed

    // Deduct credit and record transaction in a single transaction
    await prisma.$transaction(async (tx) => {
      if (creditUsed > 0 && account) {
        await tx.deliveryCustomerAccounts.update({
          where: { customerId },
          data: { balance: newBalance, updatedAt: new Date() },
        })
        await tx.deliveryAccountTransactions.create({
          data: {
            accountId: account.id,
            type: 'DEBIT',
            amount: creditUsed,
            orderId,
            notes: `Delivery order ${orderId}`,
            createdBy: user.id,
          },
        })
      }

      await tx.deliveryOrderMeta.create({
        data: {
          orderId,
          deliveryNote: deliveryNote || null,
          creditUsed,
          creditBalance: newBalance,
          paymentMode,
          status: 'PENDING',
          updatedAt: new Date(),
        },
      })
    })

    // Check delivery window (12:00–14:00) — warning only
    const now = new Date()
    const hour = now.getHours()
    const outsideWindow = hour < 12 || hour >= 14

    return NextResponse.json({
      success: true,
      creditUsed,
      creditBalance: newBalance,
      paymentMode,
      outsideDeliveryWindow: outsideWindow,
    })
  } catch (error) {
    console.error('Error creating delivery order meta:', error)
    return NextResponse.json({ error: 'Failed to create delivery order' }, { status: 500 })
  }
}

// GET — list delivery orders with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    const perms = getEffectivePermissions(user, businessId ?? undefined)
    if (!perms.canViewDeliveryQueue) {
      return NextResponse.json({ error: 'Forbidden: canViewDeliveryQueue required' }, { status: 403 })
    }
    const status = searchParams.get('status')
    const runId = searchParams.get('runId')
    const date = searchParams.get('date') // YYYY-MM-DD
    const customerId = searchParams.get('customerId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Build date filter
    let dateFilter: { gte?: Date; lt?: Date } | undefined
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`)
      const end = new Date(`${date}T23:59:59.999Z`)
      dateFilter = { gte: start, lt: end }
    }

    const metas = await prisma.deliveryOrderMeta.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(runId ? { runId } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch corresponding orders
    const orderIds = metas.map((m) => m.orderId)
    const orders = await prisma.businessOrders.findMany({
      where: {
        id: { in: orderIds },
        businessId,
        ...(customerId ? { customerId } : {}),
      },
      include: {
        business_customers: { select: { id: true, name: true, phone: true } },
        business_order_items: { select: { quantity: true, unitPrice: true, totalPrice: true } },
      },
    })

    const orderMap = new Map(orders.map((o) => [o.id, o]))

    const result = metas
      .filter((m) => orderMap.has(m.orderId))
      .map((m) => ({ ...m, order: orderMap.get(m.orderId) }))

    return NextResponse.json({ success: true, orders: result, total: result.length })
  } catch (error) {
    console.error('Error fetching delivery orders:', error)
    return NextResponse.json({ error: 'Failed to fetch delivery orders' }, { status: 500 })
  }
}
