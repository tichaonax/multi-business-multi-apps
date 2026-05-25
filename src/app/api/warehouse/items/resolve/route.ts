import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'

// Resolve a scan input (barcode / order # / tracking # / short name) to a warehouse item
export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''
    if (!q) return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 })

    // Try exact match on order # or tracking # first, then partial on shortName
    let item = await (prisma as any).warehouseItems.findFirst({
      where: {
        OR: [
          { orderNumber: q },
          { trackingNumber: q },
        ],
        status: 'IN_WAREHOUSE',
      },
      include: { warehouse_batches: { select: { batchName: true, transportCostHarare: true, pickedUpFromHarare: true } } }
    })

    if (!item) {
      // Fallback: case-insensitive short name contains
      item = await (prisma as any).warehouseItems.findFirst({
        where: {
          shortName: { contains: q, mode: 'insensitive' },
          status: 'IN_WAREHOUSE',
        },
        include: { warehouse_batches: { select: { batchName: true, transportCostHarare: true, pickedUpFromHarare: true } } }
      })
    }

    if (!item) return NextResponse.json({ error: 'No matching warehouse item found', q }, { status: 404 })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    console.error('GET /api/warehouse/items/resolve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
