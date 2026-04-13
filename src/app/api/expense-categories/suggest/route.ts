import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-categories/suggest?q=petrol&domainId=domain-construction
 * Suggests Domain → Category → Sub-category (→ Sub-Sub-category) combinations
 * based on keyword matching across all four taxonomy levels.
 *
 * Query params:
 *  - q: keyword string (required, min 2 chars)
 *  - domainId: optional. When provided, only returns results from that specific domain.
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

    function countTokenMatches(text: string, tks: string[]): number {
      const lower = text.toLowerCase()
      return tks.filter(t => lower.includes(t)).length
    }

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
      subSubcategoryId: string | null
      subSubcategoryName: string | null
      subSubcategoryEmoji: string | null
      score: number
    }

    const scored: Suggestion[] = []

    // ── Level 1-3 search: match on domain/category/subcategory names ─────────
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
              select: { id: true, name: true, emoji: true },
            },
          },
        },
      },
    })

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
        subSubcategoryId: null,
        subSubcategoryName: null,
        subSubcategoryEmoji: null,
        score: total,
      })
    }

    // ── Level 4 search: match on sub-subcategory names ────────────────────────
    const subSubcategories = await prisma.expenseSubSubcategories.findMany({
      where: {
        subcategory: {
          category: {
            domainId: filterDomainId ? filterDomainId : { not: null },
            domain: { isActive: true },
          },
        },
      },
      select: {
        id: true,
        name: true,
        emoji: true,
        subcategory: {
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
                  select: { id: true, name: true, emoji: true },
                },
              },
            },
          },
        },
      },
    })

    for (const ssub of subSubcategories) {
      if (!ssub.subcategory?.category?.domain) continue
      const domain = ssub.subcategory.category.domain
      const cat = ssub.subcategory.category
      const sub = ssub.subcategory

      // Score: exact match on sub-subcategory name is highest priority
      const ssubScore = countTokenMatches(ssub.name, tokens) * 4
      const subScore = countTokenMatches(sub.name, tokens) * 2
      const catScore = countTokenMatches(cat.name, tokens) * 1
      const total = ssubScore + subScore + catScore

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
        subSubcategoryId: ssub.id,
        subSubcategoryName: ssub.name,
        subSubcategoryEmoji: ssub.emoji,
        score: total,
      })
    }

    // Sort by score desc, then alphabetically
    scored.sort((a, b) => b.score - a.score || a.subcategoryName.localeCompare(b.subcategoryName))

    // Deduplicate: prefer sub-subcategory hits over subcategory-only hits for same sub
    const seen = new Set<string>()
    const top = scored.filter(s => {
      // Key on subSubcategoryId if present, else subcategoryId
      const key = s.subSubcategoryId ?? s.subcategoryId
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 5)

    return NextResponse.json({ suggestions: top })
  } catch (error) {
    console.error('Error suggesting categories:', error)
    return NextResponse.json({ error: 'Failed to suggest categories' }, { status: 500 })
  }
}
