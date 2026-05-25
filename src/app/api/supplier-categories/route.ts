import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/supplier-categories
 * Returns all active supplier category groups with their nested categories.
 * Used by the SupplierEditor category picker.
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const groups = await prisma.supplierCategoryGroups.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        emoji: true,
        displayOrder: true,
        categories: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          select: { id: true, name: true, emoji: true, displayOrder: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: groups })
  } catch (error) {
    console.error('Error fetching supplier categories:', error)
    return NextResponse.json({ error: 'Failed to fetch supplier categories' }, { status: 500 })
  }
}
