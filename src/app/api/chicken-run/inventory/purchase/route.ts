import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { businessId, supplierId, entryDate, weightEntryMode, notes } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!entryDate) return NextResponse.json({ error: 'entryDate is required' }, { status: 400 })
    if (!weightEntryMode) return NextResponse.json({ error: 'weightEntryMode is required' }, { status: 400 })

    const inventory = await prisma.chickenInventory.create({
      data: {
        businessId,
        source: 'PURCHASED',
        supplierId: supplierId || null,
        entryDate: new Date(entryDate),
        weighingStatus: 'OPEN',
        weightEntryMode,
        quantityWhole: 0,
        totalWeightKg: 0,
        costPerBird: 0,
        costPerKg: 0,
        quantityInFreezer: 0,
        notes: notes || null,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, data: inventory })
  } catch (error) {
    console.error('POST /api/chicken-run/inventory/purchase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
