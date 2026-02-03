import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'businessId is required' },
        { status: 400 }
      )
    }

    // Fetch the product with its variants
    const product = await prisma.businessProducts.findFirst({
      where: {
        id,
        businessId,
        isActive: true
      },
      include: {
        business_categories: {
          select: {
            id: true,
            name: true,
            businessType: true
          }
        },
        product_variants: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stockQuantity: true,
            attributes: true,
            isActive: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Transform to the format expected by the POS system
    const transformedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      basePrice: Number(product.basePrice),
      costPrice: Number(product.costPrice || 0),
      businessType: product.businessType,
      categoryId: product.categoryId,
      category: product.business_categories ? {
        id: product.business_categories.id,
        name: product.business_categories.name,
        businessType: product.business_categories.businessType
      } : null,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      attributes: product.attributes,
      variants: product.product_variants.map((variant: any) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        price: Number(variant.price),
        stockQuantity: variant.stockQuantity,
        attributes: variant.attributes,
        isActive: variant.isActive
      }))
    }

    return NextResponse.json({
      success: true,
      product: transformedProduct
    })

  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
