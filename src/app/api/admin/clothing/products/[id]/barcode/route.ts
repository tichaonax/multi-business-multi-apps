import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for barcode assignment
const BarcodeUpdateSchema = z.object({
  barcode: z.string().min(1).max(100)
})

// PUT - Assign barcode to product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate input
    const { barcode } = BarcodeUpdateSchema.parse(body)

    // Check if product exists and is clothing type
    const product = await prisma.businessProducts.findUnique({
      where: { id },
      select: { id: true, businessType: true, businessId: true, sku: true, name: true }
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

    // Check if barcode already exists for this business
    const existingBarcode = await prisma.businessProducts.findFirst({
      where: {
        businessId: product.businessId,
        barcode,
        id: { not: id } // Exclude current product
      },
      select: { id: true, sku: true, name: true }
    })

    if (existingBarcode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Barcode already assigned to another product',
          existingProduct: existingBarcode
        },
        { status: 409 }
      )
    }

    // Update product barcode
    const updatedProduct = await prisma.businessProducts.update({
      where: { id },
      data: {
        barcode,
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
      message: `Barcode ${barcode} assigned to ${product.sku} - ${product.name}`
    })
  } catch (error: any) {
    console.error('Error assigning barcode:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid barcode data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Remove barcode from product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const updatedProduct = await prisma.businessProducts.update({
      where: { id },
      data: {
        barcode: null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        sku: true,
        name: true,
        barcode: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Barcode removed successfully'
    })
  } catch (error: any) {
    console.error('Error removing barcode:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
