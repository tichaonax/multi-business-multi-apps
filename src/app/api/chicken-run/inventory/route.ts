import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const inventory = await prisma.chickenInventory.findMany({
      where: { businessId },
      include: {
        supplier: { select: { id: true, name: true } },
        movements: { orderBy: { movementDate: 'desc' } },
        birdWeights: { orderBy: { sequenceNo: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: inventory })
  } catch (error) {
    console.error('GET /api/chicken-run/inventory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
