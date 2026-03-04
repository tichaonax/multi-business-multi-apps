import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/inventory/product-definitions
 *
 * MBM-133: Returns paginated, searchable product template definitions for the
 * "Link Existing" tab in QuickStockFromScanModal (clothing businesses only).
 *
 * Only surfaces products where isProductTemplate = true — these are pre-seeded
 * definitions that have never been stocked or sold. Live products that happen
 * to be sold out are correctly excluded.
 *
 * Query params:
 *   businessId    — required
 *   businessType  — required (typically 'clothing')
 *   search?       — ILIKE filter on product name
 *   page?         — page number (default: 1)
 *   limit?        — items per page (default: 20)
 *
 * Returns:
 *   { definitions: [...], pagination: { page, limit, total, totalPages } }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const businessType = searchParams.get('businessType')
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    if (!businessId || !businessType) {
      return NextResponse.json(
        { success: false, error: 'Missing required query params: businessId, businessType' },
        { status: 400 }
      )
    }

    // ── Verify business exists and user has access ────────────────────────────
    let business = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findFirst({ where: { id: businessId, type: businessType } })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          type: businessType,
          business_memberships: { some: { userId: user.id, isActive: true } },
        },
      })
    }
    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found or access denied.' },
        { status: 404 }
      )
    }

    // ── Build where clause ────────────────────────────────────────────────────
    const baseWhere = {
      businessId,
      isProductTemplate: true,
      isActive: true,
    }

    const where = search.trim()
      ? {
          ...baseWhere,
          OR: [
            { name: { contains: search.trim(), mode: 'insensitive' as const } },
            { sku: { contains: search.trim(), mode: 'insensitive' as const } },
          ],
        }
      : baseWhere

    // ── Fetch with pagination ─────────────────────────────────────────────────
    const [total, definitions] = await Promise.all([
      prisma.businessProducts.count({ where }),
      prisma.businessProducts.findMany({
        where,
        select: {
          id: true,
          name: true,
          sku: true,
          description: true,
          attributes: true,
          business_categories: { select: { id: true, name: true, emoji: true } },
          product_variants: {
            select: { id: true, sku: true, name: true, attributes: true },
            take: 5,
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const formatted = (definitions as Array<{
      id: string
      name: string
      sku: string | null
      description: string | null
      attributes: unknown
      business_categories: { id: string; name: string; emoji: string | null } | null
      product_variants: Array<{ id: string; sku: string; name: string | null; attributes: unknown }>
    }>).map((d) => ({
      id: d.id,
      name: d.name,
      sku: d.sku,
      description: d.description,
      attributes: d.attributes,
      category: d.business_categories
        ? { id: d.business_categories.id, name: d.business_categories.name, emoji: d.business_categories.emoji }
        : null,
      // Expose first variant id for the activate-definition call
      variantId: d.product_variants[0]?.id ?? null,
      variants: d.product_variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        attributes: v.attributes,
      })),
    }))

    return NextResponse.json({
      success: true,
      definitions: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[product-definitions] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
