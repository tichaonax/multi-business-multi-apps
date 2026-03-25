import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List products with filters (universal - works for any businessType)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessType = searchParams.get('businessType')
    const businessId = searchParams.get('businessId')
    const domainId = searchParams.get('domainId')
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // BusinessType is required
    if (!businessType) {
      return NextResponse.json(
        { success: false, error: 'businessType parameter is required' },
        { status: 400 }
      )
    }
    where.businessType = businessType

    if (businessId) {
      where.businessId = businessId
    }

    // Resolve category IDs (used for both product tables)
    let categoryIds: string[] | null = null
    if (categoryId) {
      const subcategories = await prisma.businessCategories.findMany({
        where: { parentId: categoryId },
        select: { id: true }
      })
      categoryIds = [categoryId, ...subcategories.map(c => c.id)]
      where.categoryId = { in: categoryIds }
    } else if (domainId) {
      const categoriesInDomain = await prisma.businessCategories.findMany({
        where: { domainId },
        select: { id: true }
      })
      categoryIds = categoriesInDomain.map(c => c.id)
      where.categoryId = { in: categoryIds }
    }

    // Search by name or SKU
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Build barcodeInventoryItems where clause (same filters, different field names)
    const barcodeWhere: any = { isActive: true, business: { type: businessType } }
    if (businessId) barcodeWhere.businessId = businessId
    if (categoryIds) barcodeWhere.categoryId = { in: categoryIds }
    if (search) {
      barcodeWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ]
    }

    const categoryInclude = {
      select: {
        id: true, name: true, emoji: true,
        domain: { select: { id: true, name: true, emoji: true } }
      }
    }

    // Fetch from both tables
    const [stdProducts, barcodeItems] = await Promise.all([
      prisma.businessProducts.findMany({
        where,
        include: {
          businesses: { select: { id: true, name: true, type: true } },
          business_categories: categoryInclude,
          inventory_subcategory: { select: { id: true, name: true } }
        },
        orderBy: [{ updatedAt: 'desc' }]
      }),
      prisma.barcodeInventoryItems.findMany({
        where: barcodeWhere,
        include: {
          business: { select: { id: true, name: true, type: true } },
          business_category: categoryInclude
        },
        orderBy: [{ updatedAt: 'desc' }]
      })
    ])

    // Normalize barcodeInventoryItems to same shape as businessProducts
    const normalizedBarcodeItems = barcodeItems.map(item => ({
      id: `inv_${item.id}`,
      name: item.name,
      sku: item.sku || '',
      barcode: item.barcodeData || null,
      basePrice: item.sellingPrice ? Number(item.sellingPrice) : 0,
      costPrice: item.costPrice ? Number(item.costPrice) : null,
      isAvailable: item.isActive,
      businessType: (item.business as any)?.type || businessType,
      businesses: item.business,
      business_categories: item.business_category,
      inventory_subcategory: null,
      _source: 'barcode' as const,
    }))

    // Merge, sort by updatedAt desc (barcodeItems already sorted, interleave by position)
    const allProducts = [...stdProducts, ...normalizedBarcodeItems]
    const total = allProducts.length
    const products = allProducts.slice(skip, skip + limit)

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
