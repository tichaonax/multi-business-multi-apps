import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/payee-categories
 * Returns all active individual payee category groups with their nested categories.
 * Used by the payee/person create/edit category picker.
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const groups = await prisma.payeeCategoryGroups.findMany({
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
    console.error('Error fetching payee categories:', error)
    return NextResponse.json({ error: 'Failed to fetch payee categories' }, { status: 500 })
  }
}
