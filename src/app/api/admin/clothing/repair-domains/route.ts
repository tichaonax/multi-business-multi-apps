import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * POST /api/admin/clothing/repair-domains
 *
 * One-time repair for clothing inventory domain assignments.
 *
 * Background: Domains were introduced later, but old category hierarchies used
 * `parentId` pointing to what became domain IDs (top-level categories converted
 * to domains with the same UUIDs). This means:
 *   - Sub-categories have  parentId = domain.id  but  domainId = null
 *   - Items using those categories have domainId = null → invisible in domain filters
 *
 * Repair steps:
 *   1. Collect all InventoryDomains IDs for clothing.
 *   2. Find BusinessCategories where domainId IS NULL and parentId IN (domain IDs).
 *      → Set their domainId = parentId.
 *   3. Find BarcodeInventoryItems where domainId IS NULL and categoryId references a
 *      category that now has a domainId.
 *      → Set their domainId = category.domainId.
 *
 * Safe to run repeatedly — only touches rows that still have null domainId.
 * System admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') // optional; repairs all if omitted

    // ── Step 1: get all clothing domain IDs ────────────────────────────────────
    const domains = await prisma.inventoryDomains.findMany({
      where: { businessType: 'clothing', isActive: true },
      select: { id: true, name: true },
    })
    const domainIds = domains.map(d => d.id)

    if (domainIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No clothing domains found', categoriesFixed: 0, itemsFixed: 0 })
    }

    // ── Step 2: fix categories where parentId = a domain ID ────────────────────
    const categoryWhere: any = {
      domainId: null,
      parentId: { in: domainIds },
      businessType: 'clothing',
    }
    if (businessId) categoryWhere.businessId = businessId

    const danglingCategories = await prisma.businessCategories.findMany({
      where: categoryWhere,
      select: { id: true, name: true, parentId: true },
    })

    let categoriesFixed = 0
    for (const cat of danglingCategories) {
      await prisma.businessCategories.update({
        where: { id: cat.id },
        data: { domainId: cat.parentId },
      })
      categoriesFixed++
    }

    // ── Step 3: fix items whose category now has a domainId ────────────────────
    // Re-fetch all categories that have domainId set (including ones just fixed)
    const categoriesWithDomain = await prisma.businessCategories.findMany({
      where: {
        domainId: { not: null },
        businessType: 'clothing',
        ...(businessId ? { businessId } : {}),
      },
      select: { id: true, domainId: true },
    })

    let itemsFixed = 0
    for (const cat of categoriesWithDomain) {
      const result = await prisma.barcodeInventoryItems.updateMany({
        where: {
          categoryId: cat.id,
          domainId: null,
          ...(businessId ? { businessId } : {}),
        },
        data: { domainId: cat.domainId },
      })
      itemsFixed += result.count
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    const domainSummary = domains.map(d => ({
      id: d.id,
      name: d.name,
      categoriesFixed: danglingCategories.filter(c => c.parentId === d.id).length,
    }))

    return NextResponse.json({
      success: true,
      categoriesFixed,
      itemsFixed,
      domains: domainSummary,
    })
  } catch (error: any) {
    console.error('[repair-domains]', error)
    return NextResponse.json({ error: error.message || 'Repair failed' }, { status: 500 })
  }
}
