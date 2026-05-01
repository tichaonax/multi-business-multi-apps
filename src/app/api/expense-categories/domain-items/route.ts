import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domainId = searchParams.get('domainId')

  if (!domainId) {
    return NextResponse.json({ items: [] })
  }

  // Fetch all subcategories under this domain category, with their sub-subcategories
  const subcategories = await prisma.expenseSubcategories.findMany({
    where: { categoryId: domainId },
    select: {
      id: true,
      name: true,
      emoji: true,
      expense_sub_subcategories: {
        select: { id: true, name: true, emoji: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const items: { id: string; name: string; emoji: string; groupName: string }[] = []

  for (const sub of subcategories) {
    items.push({ id: sub.id, name: sub.name, emoji: sub.emoji ?? '', groupName: '' })
    for (const subsub of sub.expense_sub_subcategories) {
      items.push({ id: subsub.id, name: subsub.name, emoji: subsub.emoji ?? '', groupName: sub.name })
    }
  }

  return NextResponse.json({ items })
}
