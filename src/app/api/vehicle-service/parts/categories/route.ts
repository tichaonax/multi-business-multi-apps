import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/vehicle-service/parts/categories
// Returns the parts/workshop domain -> category -> subcategory tree
// (vsdom_parts + vsdom_workshop only — the labour-service catalog's own
// domains are deliberately excluded, this is for stocked items, not services).
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const domains = await prisma.inventoryDomains.findMany({
      where: { id: { in: ['vsdom_parts', 'vsdom_workshop'] } },
      include: {
        business_categories: {
          where: { businessId: null },
          orderBy: { name: 'asc' },
          include: {
            inventory_subcategories: { orderBy: { displayOrder: 'asc' } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, domains })
  } catch (error) {
    console.error('List vehicle service part categories error:', error)
    return NextResponse.json({ error: 'Failed to list categories' }, { status: 500 })
  }
}
