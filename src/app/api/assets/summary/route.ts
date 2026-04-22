import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageAssets && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const startOfYear = new Date(new Date().getFullYear(), 0, 1)

    const [assets, ytdDepreciation] = await Promise.all([
      prisma.businessAsset.findMany({
        where: { businessId },
        select: { status: true, currentBookValue: true, purchasePrice: true },
      }),
      prisma.assetDepreciationEntry.aggregate({
        where: {
          asset: { businessId },
          periodDate: { gte: startOfYear },
        },
        _sum: { amount: true },
      }),
    ])

    const active = assets.filter(a => a.status === 'ACTIVE' || a.status === 'MAINTENANCE')
    const disposed = assets.filter(a => a.status === 'DISPOSED' || a.status === 'WRITTEN_OFF')
    const totalBookValue = active.reduce((sum, a) => sum + parseFloat(a.currentBookValue.toString()), 0)
    const totalPurchaseValue = active.reduce((sum, a) => sum + parseFloat(a.purchasePrice.toString()), 0)

    return NextResponse.json({
      success: true,
      data: {
        totalAssets: active.length,
        disposedCount: disposed.length,
        totalBookValue,
        totalPurchaseValue,
        ytdDepreciation: parseFloat(ytdDepreciation._sum.amount?.toString() ?? '0'),
      },
    })
  } catch (error) {
    console.error('GET /api/assets/summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
