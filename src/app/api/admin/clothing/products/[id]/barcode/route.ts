import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for barcode assignment
const BarcodeUpdateSchema = z.object({
  code: z.string().min(1).max(100),
  type: z.enum(['UPC_A', 'UPC_E', 'EAN_13', 'EAN_8', 'CODE128', 'CODE39', 'ITF', 'CODABAR', 'QR_CODE', 'DATA_MATRIX', 'PDF417', 'CUSTOM', 'SKU_BARCODE']).optional().default('CUSTOM'),
  label: z.string().optional(),
  isPrimary: z.boolean().optional().default(true),
  isUniversal: z.boolean().optional().default(false)
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
    const { code, type, label, isPrimary, isUniversal } = BarcodeUpdateSchema.parse(body)

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

    // Check if barcode already exists for this product
    const existingBarcode = await prisma.productBarcodes.findFirst({
      where: {
        code,
        type,
        productId: id
      }
    })

    if (existingBarcode) {
      return NextResponse.json(
        {
          success: false,
          error: 'This barcode is already assigned to this product'
        },
        { status: 409 }
      )
    }

    // Check if barcode exists for another product in same business
    const existingBarcodeOtherProduct = await prisma.productBarcodes.findFirst({
      where: {
        code,
        type,
        OR: [
          { businessId: product.businessId },
          { isUniversal: true }
        ],
        productId: { not: id }
      },
      include: {
        business_product: {
          select: { id: true, sku: true, name: true }
        }
      }
    })

    if (existingBarcodeOtherProduct) {
      return NextResponse.json(
        {
          success: false,
          error: 'Barcode already assigned to another product',
          existingProduct: existingBarcodeOtherProduct.business_product
        },
        { status: 409 }
      )
    }

    // Create barcode entry
    const newBarcode = await prisma.productBarcodes.create({
      data: {
        code,
        type,
        label: label || 'Product Barcode',
        isPrimary,
        isUniversal,
        isActive: true,
        productId: id,
        businessId: isUniversal ? null : product.businessId
      }
    })

    // Fetch updated product
    const updatedProduct = await prisma.businessProducts.findUnique({
      where: { id },
      include: {
        businesses: {
          select: { id: true, name: true }
        },
        business_categories: {
          select: { id: true, name: true, emoji: true }
        },
        product_barcodes: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        product: updatedProduct,
        barcode: newBarcode
      },
      message: `Barcode ${code} (${type}) assigned to ${product.sku} - ${product.name}`
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
    const { searchParams } = new URL(request.url)
    const barcodeId = searchParams.get('barcodeId')

    if (!barcodeId) {
      return NextResponse.json(
        { success: false, error: 'Barcode ID is required' },
        { status: 400 }
      )
    }

    // Verify barcode belongs to this product
    const barcode = await prisma.productBarcodes.findFirst({
      where: {
        id: barcodeId,
        productId: id
      }
    })

    if (!barcode) {
      return NextResponse.json(
        { success: false, error: 'Barcode not found for this product' },
        { status: 404 }
      )
    }

    // Delete the barcode
    await prisma.productBarcodes.delete({
      where: { id: barcodeId }
    })

    // Fetch updated product
    const updatedProduct = await prisma.businessProducts.findUnique({
      where: { id },
      include: {
        product_barcodes: true
      },
      select: {
        id: true,
        sku: true,
        name: true,
        product_barcodes: true
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
