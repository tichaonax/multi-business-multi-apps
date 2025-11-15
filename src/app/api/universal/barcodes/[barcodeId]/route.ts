import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { z } from 'zod'

// Validation schema for barcode update
const BarcodeUpdateSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  type: z.enum(['UPC_A', 'UPC_E', 'EAN_13', 'EAN_8', 'CODE128', 'CODE39', 'ITF', 'CODABAR', 'QR_CODE', 'DATA_MATRIX', 'PDF417', 'CUSTOM', 'SKU_BARCODE']).optional(),
  label: z.string().optional(),
  notes: z.string().optional(),
  isPrimary: z.boolean().optional(),
  isUniversal: z.boolean().optional(),
  isActive: z.boolean().optional()
})

// GET - Get single barcode details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcodeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { barcodeId } = await params

    const barcode = await prisma.productBarcodes.findUnique({
      where: { id: barcodeId },
      include: {
        business_product: {
          select: {
            id: true,
            name: true,
            sku: true,
            businessType: true,
            businessId: true
          }
        },
        product_variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            business_products: {
              select: {
                id: true,
                name: true,
                businessId: true
              }
            }
          }
        },
        business: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode not found' },
        { status: 404 }
      )
    }

    // Get businessId from the barcode's associated product or variant
    const businessId = barcode.businessId ||
                      barcode.business_product?.businessId ||
                      barcode.product_variant?.business_products?.businessId

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID not found for this barcode' },
        { status: 400 }
      )
    }

    const user = session.user as SessionUser

    // Verify user has access to this business
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId,
          isActive: true
        }
      })
      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this business' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: barcode
    })
  } catch (error: any) {
    console.error('Error fetching barcode:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update barcode
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ barcodeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { barcodeId } = await params
    const body = await request.json()
    const data = BarcodeUpdateSchema.parse(body)

    // Get existing barcode
    const existing = await prisma.productBarcodes.findUnique({
      where: { id: barcodeId },
      include: {
        business_product: {
          select: { businessId: true }
        },
        product_variant: {
          select: {
            business_products: {
              select: { businessId: true }
            }
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Barcode not found' },
        { status: 404 }
      )
    }

    const businessId = existing.businessId ||
                      existing.business_product?.businessId ||
                      existing.product_variant?.business_products?.businessId

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID not found for this barcode' },
        { status: 400 }
      )
    }

    const user = session.user as SessionUser

    // Verify user has access to this business
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId,
          isActive: true
        }
      })
      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this business' },
          { status: 403 }
        )
      }
    }

    // If code or type is being changed, check for conflicts
    if (data.code || data.type) {
      const newCode = data.code || existing.code
      const newType = data.type || existing.type

      const conflicting = await prisma.productBarcodes.findFirst({
        where: {
          code: newCode,
          type: newType,
          id: { not: barcodeId },
          OR: [
            { businessId: businessId },
            { isUniversal: true }
          ]
        }
      })

      if (conflicting) {
        return NextResponse.json(
          { error: 'Barcode with this code and type already exists' },
          { status: 409 }
        )
      }
    }

    // Update barcode
    const updated = await prisma.productBarcodes.update({
      where: { id: barcodeId },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.type && { type: data.type }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.isUniversal !== undefined && {
          isUniversal: data.isUniversal,
          businessId: data.isUniversal ? null : (existing.businessId || businessId)
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date()
      },
      include: {
        business_product: {
          select: { id: true, name: true, sku: true }
        },
        product_variant: {
          select: { id: true, name: true, sku: true }
        },
        business: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Barcode updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating barcode:', error)

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

// DELETE - Delete barcode
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ barcodeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { barcodeId } = await params

    // Get existing barcode
    const existing = await prisma.productBarcodes.findUnique({
      where: { id: barcodeId },
      include: {
        business_product: {
          select: { businessId: true, name: true }
        },
        product_variant: {
          select: {
            business_products: {
              select: { businessId: true, name: true }
            }
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Barcode not found' },
        { status: 404 }
      )
    }

    const businessId = existing.businessId ||
                      existing.business_product?.businessId ||
                      existing.product_variant?.business_products?.businessId

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID not found for this barcode' },
        { status: 400 }
      )
    }

    const user = session.user as SessionUser

    // Verify user has access to this business
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId,
          isActive: true
        }
      })
      if (!membership) {
        return NextResponse.json(
          { error: 'Access denied to this business' },
          { status: 403 }
        )
      }
    }

    // Delete barcode
    await prisma.productBarcodes.delete({
      where: { id: barcodeId }
    })

    return NextResponse.json({
      success: true,
      message: 'Barcode deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting barcode:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
