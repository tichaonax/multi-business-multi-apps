import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domainId = searchParams.get('domainId')

  if (!domainId) {
    return NextResponse.json({ items: [] })
  }

  // Resolve to an ExpenseDomains.id:
  // 1. If domainId is an ExpenseDomains.id directly → use it
  // 2. If domainId is an ExpenseCategories.id (isDomainCategory=true) → get its domainId field
  let resolvedDomainId: string | null = null

  const asDomain = await prisma.expenseDomains.findUnique({
    where: { id: domainId },
    select: { id: true },
  })

  if (asDomain) {
    resolvedDomainId = asDomain.id
  } else {
    const asCategory = await prisma.expenseCategories.findUnique({
      where: { id: domainId },
      select: { domainId: true },
    })
    resolvedDomainId = asCategory?.domainId ?? null
  }

  if (!resolvedDomainId) {
    return NextResponse.json({ items: [] })
  }

  // Get ALL isDomainCategory categories under this domain
  const domainCategories = await prisma.expenseCategories.findMany({
    where: { domainId: resolvedDomainId },
    select: {
      id: true,
      name: true,
      expense_subcategories: {
        select: {
          id: true,
          name: true,
          emoji: true,
          expense_sub_subcategories: {
            select: { id: true, name: true, emoji: true },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Flatten all subcategories + sub-subcategories into a single list, deduplicated by name
  const seenNames = new Set<string>()
  const items: { id: string; name: string; emoji: string; groupName: string }[] = []

  for (const cat of domainCategories) {
    for (const sub of cat.expense_subcategories) {
      const subKey = sub.name.toLowerCase()
      if (!seenNames.has(subKey)) {
        seenNames.add(subKey)
        items.push({ id: sub.id, name: sub.name, emoji: sub.emoji ?? '', groupName: cat.name })
      }
      for (const subsub of sub.expense_sub_subcategories) {
        const subsubKey = subsub.name.toLowerCase()
        if (!seenNames.has(subsubKey)) {
          seenNames.add(subsubKey)
          items.push({ id: subsub.id, name: subsub.name, emoji: subsub.emoji ?? '', groupName: sub.name })
        }
      }
    }
  }

  return NextResponse.json({ items })
}
