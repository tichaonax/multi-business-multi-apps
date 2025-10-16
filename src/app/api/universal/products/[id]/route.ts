import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for updates
const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  sku: z.string().min(1).max(50).optional(),
  barcode: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  productType: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE', 'COMBO']).optional(),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED', 'DAMAGED', 'EXPIRED']).optional(),
  basePrice: z.number().min(0).optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  costPrice: z.number().min(0).optional(),
  businessType: z.string().optional(),
  attributes: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number().int().min(0).nullable().optional(),
  spiceLevel: z.number().int().min(0).max(5).optional(),
  calories: z.number().int().min(0).nullable().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  images: z.array(z.any()).optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    price: z.number().min(0),
    isAvailable: z.boolean().optional()
  })).optional()
})

// Normalize a product record returned by Prisma to the legacy API shape
function normalizeProduct(product: any) {
  if (!product) return product
  product.brand = product.brand || (product.business_brands ? { id: product.business_brands.id, name: product.business_brands.name } : null)
  product.category = product.category || (product.business_categories ? { id: product.business_categories.id, name: product.business_categories.name } : null)
  product.variants = product.variants || product.product_variants || []
  product.images = product.images || product.product_images || []
  product.business = product.business || null

  delete product.business_brands
  delete product.business_categories
  delete product.product_variants
  delete product.product_images

  return product
}

// GET - Get single product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)
 {

    const { id } = await params
  try {
    const { id } = await params

    const product = await prisma.businessProducts.findUnique({
      where: { id },
      include: {
        businesses: {
          select: { name: true, type: true }
        },
        businessBrand: { select: { id: true, name: true } },
        businessCategory: { select: { id: true, name: true } },
        productVariants: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        },
        productImages: {
          orderBy: [
            { isPrimary: 'desc' },
            { sortOrder: 'asc' }
          ]
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: normalizeProduct(product as any)
    })

  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update single product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)
 {

    const { id } = await params
  try {
    const { id } = await params
    const body = await request.json()

    // Parse and validate the request data
    const validatedData = UpdateProductSchema.parse(body)
    const { variants, images, ...updateData } = validatedData

    // Verify product exists
    const existingProduct = await prisma.businessProducts.findUnique({
      where: { id },
      include: {
          product_variants: true,
          product_images: true
        }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Prepare attributes for restaurant items
    const attributes: any = {}
    if (body.preparationTime !== undefined) attributes.preparationTime = body.preparationTime
    if (body.spiceLevel !== undefined) attributes.spiceLevel = body.spiceLevel
    if (body.calories !== undefined) attributes.calories = body.calories
    if (body.dietaryRestrictions !== undefined) attributes.dietaryRestrictions = body.dietaryRestrictions
    if (body.allergens !== undefined) attributes.allergens = body.allergens

    // Merge attributes with existing ones
    const finalAttributes = {
      ...existingProduct.attributes,
      ...attributes
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

    // Update product in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the main product
      const updatedProduct = await tx.businessProduct.update({
        where: { id },
        data: {
          ...updateData,
          attributes: Object.keys(finalAttributes).length > 0 ? finalAttributes : undefined
        },
        include: {
          businesses: { select: { name: true, type: true } },
          businessBrand: { select: { id: true, name: true } },
          businessCategory: { select: { id: true, name: true } },
          productVariants: {
            where: { isActive: true },
            orderBy: { name: 'asc' }
          },
          productImages: {
            orderBy: [
              { isPrimary: 'desc' },
              { sortOrder: 'asc' }
            ]
          }
        }
      })

      // Handle variants updates if provided
      if (variants && Array.isArray(variants)) {
        // For now, we'll skip complex variant updates
        // This can be enhanced later if needed
        console.log('Variant updates not yet implemented')
      }

      return updatedProduct
    })

    return NextResponse.json({
      success: true,
      data: normalizeProduct(result as any),
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

// DELETE - Delete single product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)
 {

    const { id } = await params
  try {
    const { id } = await params

    // Check if product has active orders
    const productWithOrders = await prisma.businessProducts.findUnique({
      where: { id },
      include: {
        product_variants: {
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
    const hasActiveOrders = productWithOrders.product_variants.some((variant: any) =>
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
      prisma.product_variants.updateMany({
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
      message: 'Product deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}