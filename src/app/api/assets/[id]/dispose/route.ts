import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ id: string }> }

const VALID_METHODS = ['SALE', 'GIFT', 'TRADE_IN', 'SCRAP', 'WRITTEN_OFF']

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { disposalMethod, disposedAt, disposalValue, disposalRecipient, disposalNotes } = await request.json()

    if (!disposalMethod || !disposedAt) {
      return NextResponse.json({ error: 'disposalMethod and disposedAt are required' }, { status: 400 })
    }
    if (!VALID_METHODS.includes(disposalMethod)) {
      return NextResponse.json({ error: 'Invalid disposal method' }, { status: 400 })
    }

    const asset = await prisma.businessAsset.findUnique({ where: { id } })
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    if (asset.status === 'DISPOSED' || asset.status === 'WRITTEN_OFF') {
      return NextResponse.json({ error: 'Asset is already disposed' }, { status: 400 })
    }

    const newStatus = disposalMethod === 'WRITTEN_OFF' ? 'WRITTEN_OFF' : 'DISPOSED'

    const updated = await prisma.businessAsset.update({
      where: { id },
      data: {
        status: newStatus,
        disposedAt: new Date(disposedAt),
        disposalMethod,
        disposalValue: disposalValue != null ? parseFloat(disposalValue) : null,
        disposalRecipient: disposalRecipient || null,
        disposalNotes: disposalNotes || null,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('POST /api/assets/[id]/dispose error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
