import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Search products by SKU or name
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sku = searchParams.get('sku')
    const query = searchParams.get('query')
    const businessId = searchParams.get('businessId')
    const barcodeType = searchParams.get('barcodeType')
    const hasUpc = searchParams.get('hasUpc')
    const sortBy = searchParams.get('sortBy')

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

    // Filter by barcode type and UPC presence
    if (barcodeType || hasUpc !== null) {
      const barcodeFilter: any = {}

      if (barcodeType) {
        barcodeFilter.type = barcodeType
      }

      if (hasUpc !== null) {
        const hasUpcBool = hasUpc === 'true'
        barcodeFilter.type = hasUpcBool
          ? { in: ['UPC_A', 'EAN_13', 'EAN_8'] }
          : { notIn: ['UPC_A', 'EAN_13', 'EAN_8'] }
      }

      where.product_barcodes = {
        some: barcodeFilter
      }
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
        { barcode: { contains: query, mode: 'insensitive' } },
        // Search in ProductBarcodes table
        {
          product_barcodes: {
            some: {
              code: { contains: query, mode: 'insensitive' }
            }
          }
        },
        // Also search in variant barcodes
        {
          product_variants: {
            some: {
              product_barcodes: {
                some: {
                  code: { contains: query, mode: 'insensitive' }
                }
              }
            }
          }
        }
      ]
    }

    // Get products (limit to 20 for autocomplete)
    let products = await prisma.businessProducts.findMany({
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
        },
        product_barcodes: {
          select: {
            id: true,
            code: true,
            type: true,
            isPrimary: true,
            isUniversal: true,
            label: true
          }
        },
        product_variants: {
          include: {
            product_barcodes: {
              select: {
                id: true,
                code: true,
                type: true,
                isPrimary: true,
                isUniversal: true,
                label: true
              }
            }
          }
        }
      },
      orderBy: sortBy === 'sku' ? [{ sku: 'asc' }] : [{ name: 'asc' }],
      take: 20
    })

    // Sort products by UPC presence if requested
    if (sortBy === 'upc-first' || sortBy === 'no-upc-first') {
      products = products.sort((a, b) => {
        const aHasUpc = a.product_barcodes.some((bc: any) => ['UPC_A', 'EAN_13', 'EAN_8'].includes(bc.type))
        const bHasUpc = b.product_barcodes.some((bc: any) => ['UPC_A', 'EAN_13', 'EAN_8'].includes(bc.type))

        if (sortBy === 'upc-first') {
          if (aHasUpc && !bHasUpc) return -1
          if (!aHasUpc && bHasUpc) return 1
          return a.name.localeCompare(b.name)
        } else { // no-upc-first
          if (!aHasUpc && bHasUpc) return -1
          if (aHasUpc && !bHasUpc) return 1
          return a.name.localeCompare(b.name)
        }
      })
    }

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
