import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Search products by SKU or name
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sku = searchParams.get('sku')
    const query = searchParams.get('query')
    const businessId = searchParams.get('businessId')

    if (!sku && !query) {
      return NextResponse.json(
        { success: false, error: 'Either sku or query parameter is required' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = {
      businessType: 'clothing'
    }

    if (businessId) {
      where.businessId = businessId
    }

    // Search by SKU (exact or partial match)
    if (sku) {
      where.sku = {
        contains: sku,
        mode: 'insensitive'
      }
    }
    // Search by name or SKU
    else if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } }
      ]
    }

    // Get products (limit to 20 for autocomplete)
    const products = await prisma.businessProducts.findMany({
      where,
      include: {
        businesses: {
          select: { id: true, name: true }
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
        { sku: 'asc' }
      ],
      take: 20
    })

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length
    })
  } catch (error: any) {
    console.error('Error searching products:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
