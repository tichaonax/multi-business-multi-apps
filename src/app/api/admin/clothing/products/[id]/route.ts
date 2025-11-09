import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ProductUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().nullable().optional(),
  isAvailable: z.boolean().optional()
})

// PUT - Update product details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const validatedData = ProductUpdateSchema.parse(body)

    // Check if product exists
    const product = await prisma.businessProducts.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Update product
    const updatedProduct = await prisma.businessProducts.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        business_categories: {
          include: {
            domain: true
          }
        },
        inventory_subcategory: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: `Product updated: ${updatedProduct.sku} - ${updatedProduct.name}`
    })
  } catch (error: any) {
    console.error('Error updating product:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
