import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

import { randomBytes } from 'crypto';
// Validation schemas
const CreateProductSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  sku: z.string().min(1).max(50),
  barcode: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().min(1),
  productType: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE', 'COMBO']).default('PHYSICAL'),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED', 'DAMAGED', 'EXPIRED']).default('NEW'),
  basePrice: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  businessType: z.string().min(1),
  attributes: z.record(z.string(), z.any()).optional(),
  variants: z.array(z.object({
    name: z.string().optional(),
    sku: z.string().min(1),
    barcode: z.string().optional(),
    price: z.number().min(0).optional(),
    stockQuantity: z.number().int().min(0).default(0),
    reorderLevel: z.number().int().min(0).default(0),
  attributes: z.record(z.string(), z.any()).optional()
  })).optional()
})

const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: z.string().min(1)
})

// Normalize a product record returned by Prisma to the legacy API shape
function normalizeProduct(product: any) {
  // map schema relation names back to legacy keys expected by the frontend
  product.brand = product.brand || (product.businessBrand ? { id: product.businessBrand.id, name: product.businessBrand.name } : null)
  product.category = product.category || (product.businessCategory ? { id: product.businessCategory.id, name: product.businessCategory.name } : null)
  product.variants = product.variants || product.productVariants || []
  product.images = product.images || product.productImages || []
  product.business = product.business || null

  // remove internal/plural fields so responses match previous shape
  delete product.businessBrand
  delete product.businessCategory
  delete product.productVariants
  delete product.productImages

  return product
}

// GET - Fetch products for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const businessType = searchParams.get('businessType')
    const categoryId = searchParams.get('categoryId')
    const brandId = searchParams.get('brandId')
    const productType = searchParams.get('productType')
    const condition = searchParams.get('condition')
    const search = searchParams.get('search')
    const isAvailable = searchParams.get('isAvailable')
    const isActive = searchParams.get('isActive')
    const includeVariants = searchParams.get('includeVariants') === 'true'
    const includeImages = searchParams.get('includeImages') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    // If businessId is provided, filter by business
    if (businessId) {
      where.businessId = businessId
    }

    // If businessType is provided without businessId, filter by businessType
    if (businessType && !businessId) {
      where.businessType = businessType
    }

    // Default to active products unless explicitly specified
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    } else {
      where.isActive = true
    }

    // Filter by availability if specified
    if (isAvailable !== null) {
      where.isAvailable = isAvailable === 'true'
    }

    if (categoryId) where.categoryId = categoryId
    if (brandId) where.brandId = brandId
    if (productType) where.productType = productType as any
    if (condition) where.condition = condition as any

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [products, totalCount] = await Promise.all([
      prisma.businessProducts.findMany({
        where,
        include: {
          businesses: {
            select: { name: true, type: true }
          },
          businessBrand: {
            select: { id: true, name: true }
          },
          businessCategory: {
            select: { id: true, name: true }
          },
          ...(includeVariants && {
            productVariants: {
              where: { isActive: true },
              orderBy: { name: 'asc' }
            }
          }),
          ...(includeImages && {
            productImages: {
              orderBy: [
                { isPrimary: 'desc' },
                { sortOrder: 'asc' }
              ]
            }
          })
        },
        orderBy: [
          { name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.businessProducts.count({ where })
    ])

    // normalize products to legacy API shape
    const normalizedProducts = products.map(normalizeProduct)

    return NextResponse.json({
      success: true,
      data: normalizedProducts,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + normalizedProducts.length < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateProductSchema.parse(body)

    const { variants, ...productData } = validatedData

    // Verify business exists
    const business = await prisma.businesses.findUnique({
      where: { id: productData.businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Verify category exists
    const category = await prisma.businessCategories.findFirst({
      where: {
        id: productData.categoryId,
        businessId: productData.businessId
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Verify brand exists if specified
    if (productData.brandId) {
      const brand = await prisma.businessBrands.findFirst({
        where: {
          id: productData.brandId,
          businessId: productData.businessId
        }
      })

      if (!brand) {
        return NextResponse.json(
          { error: 'Brand not found' },
          { status: 404 }
        )
      }
    }

    // Check for duplicate SKU
    const existingProduct = await prisma.businessProducts.findFirst({
      where: {
        businessId: productData.businessId,
        sku: productData.sku
      }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 409 }
      )
    }

    // Create product with variants in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the product
      const product = await tx.businessProduct.create({
          data: {
            ...productData,
            businessType: productData.businessType || business.type
          },
          include: {
            businesses: { select: { name: true, type: true } },
            businessBrand: { select: { id: true, name: true } },
            businessCategory: { select: { id: true, name: true } }
          }
      })

      // Create variants if provided
      if (variants && variants.length > 0) {
        // Check for duplicate variant SKUs
        const variantSkus = variants.map((v: any) => v.sku)
        const existingVariants = await tx.productVariant.findMany({
          where: {
            sku: { in: variantSkus }
          }
        })

        if (existingVariants.length > 0) {
          throw new Error(`Variant SKUs already exist: ${existingVariants.map(v => v.sku).join(', ')}`)
        }

        const createdVariants = await Promise.all(
          variants.map((variant: any) =>
            tx.productVariant.create({
              data: {
                ...variant,
                productId: product.id
              }
            })
          )
        )

        return {
          ...product,
          variants: createdVariants
        }
      }

      return product
    })

    // normalize before returning
    const normalizedResult = normalizeProduct(result as any)

    return NextResponse.json({
      success: true,
      data: normalizedResult,
      message: 'Product created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = UpdateProductSchema.parse(body)

    const { id, variants, ...updateData } = validatedData

    // Verify product exists
    const existingProduct = await prisma.businessProducts.findUnique({
      where: { id },
      include: { productVariants: true }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check for duplicate SKU if SKU is being updated
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const duplicateProduct = await prisma.businessProducts.findFirst({
        where: {
          businessId: existingProduct.businessId,
          sku: updateData.sku,
          id: { not: id }
        }
      })

      if (duplicateProduct) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 409 }
        )
      }
    }

    // Update product
    const product = await prisma.businessProducts.update({
      where: { id },
      // cast to any to keep incremental changes small; we'll tighten types later
      data: updateData as any,
      include: {
        businesses: { select: { name: true, type: true } },
        businessBrand: { select: { id: true, name: true } },
        businessCategory: { select: { id: true, name: true } },
        productVariants: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: normalizeProduct(product as any),
      message: 'Product updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check if product has active orders
    const productWithOrders = await prisma.businessProducts.findUnique({
      where: { id },
      include: {
        productVariants: {
          include: {
            businessOrderItems: {
              include: {
                businessOrder: {
                  select: { id: true, status: true }
                }
              }
            }
          }
        }
      }
    })

    if (!productWithOrders) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check for active orders
    const hasActiveOrders = productWithOrders.productVariants.some((variant: any) =>
      variant.businessOrderItems.some((orderItem: any) =>
        !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(orderItem.businessOrder.status)
      )
    )

    if (hasActiveOrders) {
      return NextResponse.json(
        { error: 'Cannot delete product with active orders' },
        { status: 409 }
      )
    }

    // Soft delete product and its variants
    await prisma.$transaction([
      prisma.productVariants.updateMany({
        where: { productId: id },
        data: { isActive: false }
      }),
      prisma.businessProducts.update({
        where: { id },
        data: { isActive: false }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Product deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}