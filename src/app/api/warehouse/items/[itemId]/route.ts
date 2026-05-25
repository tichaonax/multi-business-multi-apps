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

    const updateData: any = {}
    if ('costUsd' in body) {
      const v = body.costUsd === null || body.costUsd === '' ? null : Number(body.costUsd)
      updateData.costUsd = (v === null || isNaN(v)) ? null : v
    }
    if ('exchangeRate' in body) {
      const v = body.exchangeRate === null || body.exchangeRate === '' ? null : Number(body.exchangeRate)
      updateData.exchangeRate = (v === null || isNaN(v)) ? null : v
    }
    if ('shortName' in body) {
      updateData.shortName = typeof body.shortName === 'string' ? body.shortName.trim().slice(0, 100) : null
    }
    if ('notes' in body) {
      updateData.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await (prisma as any).warehouseItems.update({
      where: { id: itemId },
      data: { ...updateData, updatedAt: new Date() },
    })

    return NextResponse.json({ success: true, item: updated })
  } catch (error: any) {
    console.error('PATCH /api/warehouse/items/[itemId] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
