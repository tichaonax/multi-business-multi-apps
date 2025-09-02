import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { orders, orderItems } from '@/lib/schema'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'

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
    const { items, total, tableNumber } = await req.json()
    
    const orderNumber = `ORD-${Date.now()}`
    
    const newOrder = await db
      .insert(orders)
      .values({
        orderNumber,
        tableNumber,
        total,
        createdBy: session.user.id,
      })
      .returning()

    for (const item of items) {
      await db
        .insert(orderItems)
        .values({
          orderId: newOrder[0].id,
          menuItemId: item.id,
          quantity: item.quantity,
          price: item.price,
        })
    }

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      tableName: 'orders',
      recordId: newOrder[0].id,
      changes: { orderNumber, total, itemCount: items.length },
    })

    return NextResponse.json(newOrder[0])
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process order' },
      { status: 500 }
    )
  }
}