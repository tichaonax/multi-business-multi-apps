import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)
    const productType = searchParams.get('productType')
    const user = session.user as SessionUser

    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Get products
    const products = await prisma.businessProducts.findMany({
      where: {
        businessId: businessId,
        ...(productType && { productType: productType as any })
      },
      include: {
        business_categories: {
          select: {
            id: true,
            name: true
          }
        },
        business_suppliers: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Transform response
    const items = products.map(product => ({
      id: product.id,
      businessId: product.businessId,
      sku: product.sku,
      name: product.name,
      description: product.description,
      productType: product.productType,
      sellingPrice: parseFloat(product.basePrice.toString()),
      cost: product.costPrice ? parseFloat(product.costPrice.toString()) : 0,
      isActive: product.isActive,
      business_categories: product.business_categories,
      business_suppliers: product.business_suppliers,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    }))

    return NextResponse.json(items)

  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()

    if (!body.name || !body.sku) {
      return NextResponse.json(
        { error: 'Product name and SKU are required' },
        { status: 400 }
      )
    }

    const user = session.user as SessionUser

    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Create product
    const product = await prisma.businessProducts.create({
      data: {
        businessId: businessId,
        businessType: business.type,
        sku: body.sku,
        name: body.name,
        description: body.description || null,
        categoryId: body.categoryId,
        supplierId: body.supplierId || null,
        productType: body.productType || 'SERVICE',
        basePrice: parseFloat(body.sellingPrice) || 0,
        costPrice: body.cost ? parseFloat(body.cost) : null,
        isActive: body.isActive !== false,
        updatedAt: new Date()
      },
      include: {
        business_categories: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      id: product.id,
      businessId: product.businessId,
      sku: product.sku,
      name: product.name,
      description: product.description,
      productType: product.productType,
      sellingPrice: parseFloat(product.basePrice.toString()),
      cost: product.costPrice ? parseFloat(product.costPrice.toString()) : 0,
      isActive: product.isActive,
      business_categories: product.business_categories,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString()
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating product:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A product with this SKU already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
