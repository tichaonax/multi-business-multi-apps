import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-categories/sub-subcategories/[subSubcategoryId]/items
 * Fetch expense_sub_subcategories for a given expense_subcategory ID
 * Used by the domain-override mode in the Quick Payment modal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subSubcategoryId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subSubcategoryId: subcategoryId } = await params

    const items = await prisma.expenseSubSubcategories.findMany({
      where: { subcategoryId },
      select: { id: true, name: true, emoji: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ items, count: items.length })
  } catch (error) {
    console.error('Error fetching sub-subcategory items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}
