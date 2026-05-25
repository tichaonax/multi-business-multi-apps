import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { itemId } = params
    const body = await req.json()

    const item = await (prisma as any).warehouseItems.findUnique({ where: { id: itemId } })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    if (item.status !== 'IN_WAREHOUSE') {
      return NextResponse.json({ error: 'Only IN_WAREHOUSE items can be flagged' }, { status: 400 })
    }

    // Accept explicit value or toggle
    const isPersonal = typeof body.isPersonal === 'boolean' ? body.isPersonal : !item.isPersonal

    const updated = await (prisma as any).warehouseItems.update({
      where: { id: itemId },
      data: { isPersonal, updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, isPersonal: updated.isPersonal })
  } catch (error: any) {
    console.error('PATCH /api/warehouse/items/[itemId]/flag-personal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
