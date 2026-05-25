import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/contractor-categories
 * Returns all active contractor category groups with their nested categories.
 * Used by the contractor create/edit category picker.
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const groups = await prisma.contractorCategoryGroups.findMany({
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
    console.error('Error fetching contractor categories:', error)
    return NextResponse.json({ error: 'Failed to fetch contractor categories' }, { status: 500 })
  }
}
