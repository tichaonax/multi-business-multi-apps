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
    const { periodDate, amount, notes } = await request.json()

    if (!periodDate || amount == null) {
      return NextResponse.json({ error: 'periodDate and amount are required' }, { status: 400 })
    }

    const asset = await prisma.businessAsset.findUnique({ where: { id } })
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    if (asset.status === 'DISPOSED' || asset.status === 'WRITTEN_OFF') {
      return NextResponse.json({ error: 'Cannot depreciate a disposed asset' }, { status: 400 })
    }

    const depAmount = parseFloat(amount)
    const currentValue = parseFloat(asset.currentBookValue.toString())
    const salvage = parseFloat(asset.salvageValue.toString())
    const bookValueAfter = Math.max(currentValue - depAmount, salvage)

    const [entry] = await prisma.$transaction([
      prisma.assetDepreciationEntry.create({
        data: {
          assetId: id,
          periodDate: new Date(periodDate),
          amount: depAmount,
          bookValueAfter,
          notes: notes || null,
          createdBy: user.id,
        },
      }),
      prisma.businessAsset.update({
        where: { id },
        data: { currentBookValue: bookValueAfter },
      }),
    ])

    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (error) {
    console.error('POST /api/assets/[id]/depreciate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
