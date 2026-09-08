import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get all clothing categories and subcategories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domainId = searchParams.get('domainId')
    const includeGroups = searchParams.get('includeGroups') === 'true'

    const where: any = {
      businessType: 'clothing'
    }

    if (domainId) {
      where.domainId = domainId
    }

    // Get all categories with their subcategories, domains, and parent group
    let categories = await prisma.businessCategories.findMany({
      where,
      include: {
        domain: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        },
        business_categories: {
          select: {
            id: true,
            name: true,
            emoji: true
          }
        },
        inventory_subcategories: {
          select: {
            id: true,
            name: true,
            emoji: true
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: [
        { domain: { name: 'asc' } },
        { name: 'asc' }
      ]
    })

    // "Group" categories (e.g. Tops, Bottoms) are organizational parents used
    // to group the flat category list -- not selectable product categories
    // themselves. Excluded by default so pickers only offer real leaf
    // categories; pass includeGroups=true for a tree-style UI that wants them
    // too. Filtered in JS rather than the Prisma where clause because a JSON
    // path filter's NOT would also exclude every row with no `attributes` at
    // all (SQL's NULL semantics), which is most rows here.
    if (!includeGroups) {
      categories = categories.filter(c => !(c.attributes && (c.attributes as any).isGroup === true))
    }

    // Alias the self-relation to `parent`, matching /api/universal/categories'
    // shape, so shared client-side grouping helpers work against either.
    const categoriesWithParent = categories.map((c: any) => {
      const { business_categories, ...rest } = c
      return { ...rest, parent: business_categories ?? null }
    })

    // Also get all domains for filtering
    const domains = await prisma.inventoryDomains.findMany({
      where: {
        businessType: 'clothing',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        emoji: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        categories: categoriesWithParent,
        domains
      }
    })
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
