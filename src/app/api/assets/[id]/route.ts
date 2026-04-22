import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const asset = await prisma.businessAsset.findUnique({
      where: { id },
      include: {
        category: true,
        depreciationEntries: { orderBy: { periodDate: 'desc' } },
        maintenanceLogs: { orderBy: { maintenanceDate: 'desc' } },
      },
    })

    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: asset })
  } catch (error) {
    console.error('GET /api/assets/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const asset = await prisma.businessAsset.findUnique({ where: { id } })
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    if (asset.status === 'DISPOSED' || asset.status === 'WRITTEN_OFF') {
      return NextResponse.json({ error: 'Cannot edit a disposed asset' }, { status: 400 })
    }

    const updatable: Record<string, unknown> = {}
    const fields = [
      'categoryId', 'name', 'description', 'serialNumber', 'manufacturer',
      'model', 'location', 'salvageValue', 'depreciationMethod', 'usefulLifeYears',
      'status', 'notes',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) updatable[f] = body[f]
    }
    if (body.purchaseDate) updatable.purchaseDate = new Date(body.purchaseDate)

    const updated = await prisma.businessAsset.update({
      where: { id },
      data: updatable,
      include: { category: { select: { id: true, name: true, icon: true } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/assets/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
