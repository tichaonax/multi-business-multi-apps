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

    // If categoryId specified, include products from this category AND its subcategories
    if (categoryId) {
      // Find all subcategories of the selected category
      const subcategories = await prisma.businessCategories.findMany({
        where: { parentId: categoryId },
        select: { id: true }
      })

      // Include the parent category and all subcategories
      const categoryIds = [categoryId, ...subcategories.map(c => c.id)]
      where.categoryId = {
        in: categoryIds
      }
    }
    // If domainId specified (and no specific categoryId), filter by categories in that domain
    else if (domainId) {
      const categoriesInDomain = await prisma.businessCategories.findMany({
        where: { domainId },
        select: { id: true }
      })
      where.categoryId = {
        in: categoriesInDomain.map(c => c.id)
      }
    }

    // Search by name or SKU
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get products with includes
    const [products, total] = await Promise.all([
      prisma.businessProducts.findMany({
        where,
        include: {
          businesses: {
            select: { id: true, name: true, type: true }
          },
          business_categories: {
            select: {
              id: true,
              name: true,
              emoji: true,
              domain: {
                select: { id: true, name: true, emoji: true }
              }
            }
          },
          inventory_subcategory: {
            select: { id: true, name: true }
          }
        },
        orderBy: [
          { updatedAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.businessProducts.count({ where })
    ])

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
