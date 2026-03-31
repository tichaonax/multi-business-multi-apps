import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-categories/suggest?q=petrol&domainId=domain-construction
 * Suggests Domain → Category → Sub-category combinations based on keyword matching.
 * Returns up to 5 ranked suggestions matching the query against the taxonomy names.
 *
 * Query params:
 *  - q: keyword string (required, min 2 chars)
 *  - domainId: optional. When provided, only returns results from that specific domain
 *    (used in domain-override mode where the business domain group is already selected).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    const filterDomainId = request.nextUrl.searchParams.get('domainId')?.trim() || null

    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    // Tokenize — split on spaces/punctuation, lowercase, drop short tokens
    const tokens = q.toLowerCase().split(/[\s,./\\-]+/).filter(t => t.length >= 2)
    if (tokens.length === 0) return NextResponse.json({ suggestions: [] })

    // Load subcategories with full chain. If domainId given, restrict to that domain only.
    const subcategories = await prisma.expenseSubcategories.findMany({
      where: {
        category: {
          domainId: filterDomainId ? filterDomainId : { not: null },
          domain: { isActive: true },
        },
      },
      select: {
        id: true,
        name: true,
        emoji: true,
        category: {
          select: {
            id: true,
            name: true,
            emoji: true,
            domain: {
              select: {
                id: true,
                name: true,
                emoji: true,
              },
            },
          },
        },
      },
    })

    type Suggestion = {
      domainId: string
      domainName: string
      domainEmoji: string | null
      categoryId: string
      categoryName: string
      categoryEmoji: string | null
      subcategoryId: string
      subcategoryName: string
      subcategoryEmoji: string | null
      score: number
    }

    function countTokenMatches(text: string, tks: string[]): number {
      const lower = text.toLowerCase()
      return tks.filter(t => lower.includes(t)).length
    }

    const scored: Suggestion[] = []

    for (const sub of subcategories) {
      if (!sub.category?.domain) continue
      const domain = sub.category.domain
      const cat = sub.category

      const subScore = countTokenMatches(sub.name, tokens) * 3
      const catScore = countTokenMatches(cat.name, tokens) * 2
      const domScore = countTokenMatches(domain.name, tokens) * 1
      const total = subScore + catScore + domScore

      if (total === 0) continue

      scored.push({
        domainId: domain.id,
        domainName: domain.name,
        domainEmoji: domain.emoji,
        categoryId: cat.id,
        categoryName: cat.name,
        categoryEmoji: cat.emoji,
        subcategoryId: sub.id,
        subcategoryName: sub.name,
        subcategoryEmoji: sub.emoji,
        score: total,
      })
    }

    // Sort by score desc, then alphabetically for ties
    scored.sort((a, b) => b.score - a.score || a.subcategoryName.localeCompare(b.subcategoryName))

    // Deduplicate: keep first (best-scored) per subcategoryId
    const seen = new Set<string>()
    const top = scored.filter(s => {
      if (seen.has(s.subcategoryId)) return false
      seen.add(s.subcategoryId)
      return true
    }).slice(0, 5)

    return NextResponse.json({ suggestions: top })
  } catch (error) {
    console.error('Error suggesting categories:', error)
    return NextResponse.json({ error: 'Failed to suggest categories' }, { status: 500 })
  }
}
