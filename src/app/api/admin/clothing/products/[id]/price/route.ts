import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for price update
const PriceUpdateSchema = z.object({
  basePrice: z.number().min(0).nullable(),
  costPrice: z.number().min(0).nullable().optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  discountPercent: z.number().min(0).max(100).nullable().optional()
})

// PUT - Update product price
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validatedData = PriceUpdateSchema.parse(body)

    // Check if product exists and is clothing type
    const product = await prisma.businessProducts.findUnique({
      where: { id },
      select: { id: true, businessType: true, sku: true, name: true }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.businessType !== 'clothing') {
      return NextResponse.json(
        { success: false, error: 'Product is not a clothing item' },
        { status: 400 }
      )
    }

    // Update product price
    const updatedProduct = await prisma.businessProducts.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      include: {
        businesses: {
          select: { id: true, name: true }
        },
        business_categories: {
          select: { id: true, name: true, emoji: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: `Price updated for ${product.sku} - ${product.name}`
    })
  } catch (error: any) {
    console.error('Error updating product price:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid price data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Quick price update (basePrice only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { basePrice } = body

    if (typeof basePrice !== 'number' || basePrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid basePrice value' },
        { status: 400 }
      )
    }

    const updatedProduct = await prisma.businessProducts.update({
      where: { id },
      data: {
        basePrice,
        updatedAt: new Date()
      },
      select: {
        id: true,
        sku: true,
        name: true,
        basePrice: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Price updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating product price:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
