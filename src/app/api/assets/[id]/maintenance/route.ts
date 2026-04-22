import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { maintenanceDate, maintenanceType, description, cost, vendor, nextMaintenanceDate, notes } = await request.json()

    if (!maintenanceDate || !maintenanceType || !description) {
      return NextResponse.json({ error: 'maintenanceDate, maintenanceType and description are required' }, { status: 400 })
    }

    const asset = await prisma.businessAsset.findUnique({ where: { id } })
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

    const log = await prisma.assetMaintenanceLog.create({
      data: {
        assetId: id,
        maintenanceDate: new Date(maintenanceDate),
        maintenanceType,
        description,
        cost: cost != null ? parseFloat(cost) : null,
        vendor: vendor || null,
        nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : null,
        notes: notes || null,
        createdBy: user.id,
      },
    })

    // Mark asset as ACTIVE if it was in MAINTENANCE
    if (asset.status === 'MAINTENANCE') {
      await prisma.businessAsset.update({ where: { id }, data: { status: 'ACTIVE' } })
    }

    return NextResponse.json({ success: true, data: log }, { status: 201 })
  } catch (error) {
    console.error('POST /api/assets/[id]/maintenance error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
