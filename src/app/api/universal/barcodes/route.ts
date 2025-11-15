import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { z } from 'zod'

// Validation schema for barcode creation
const BarcodeCreateSchema = z.object({
  code: z.string().min(1).max(100),
  type: z.enum(['UPC_A', 'UPC_E', 'EAN_13', 'EAN_8', 'CODE128', 'CODE39', 'ITF', 'CODABAR', 'QR_CODE', 'DATA_MATRIX', 'PDF417', 'CUSTOM', 'SKU_BARCODE']),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  businessId: z.string(),
  label: z.string().optional(),
  notes: z.string().optional(),
  isPrimary: z.boolean().optional().default(false),
  isUniversal: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true)
})

// GET - List all barcodes for a business or product
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const productId = searchParams.get('productId')
    const variantId = searchParams.get('variantId')
    const code = searchParams.get('code')

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
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

    // Build query filter
    const where: any = {
      OR: [
        { businessId: businessId },
        { isUniversal: true }
      ]
    }

    if (productId) {
      where.productId = productId
    }

    if (variantId) {
      where.variantId = variantId
    }

    if (code) {
      where.code = code
    }

    const barcodes = await prisma.productBarcodes.findMany({
      where,
      include: {
        business_product: {
          select: {
            id: true,
            name: true,
            sku: true,
            businessType: true
          }
        },
        product_variant: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        },
        business: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: barcodes,
      count: barcodes.length
    })
  } catch (error: any) {
    console.error('Error fetching barcodes:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create a new barcode
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = BarcodeCreateSchema.parse(body)

    const user = session.user as SessionUser

    // Verify user has access to this business
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: data.businessId,
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

    // Validate that at least one of productId or variantId is provided
    if (!data.productId && !data.variantId) {
      return NextResponse.json(
        { error: 'Either productId or variantId must be provided' },
        { status: 400 }
      )
    }

    // Check if barcode already exists
    const existing = await prisma.productBarcodes.findFirst({
      where: {
        code: data.code,
        type: data.type,
        OR: [
          { productId: data.productId },
          { variantId: data.variantId }
        ]
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This barcode already exists for this product/variant' },
        { status: 409 }
      )
    }

    // Check if code conflicts with existing barcode in same business
    const conflicting = await prisma.productBarcodes.findFirst({
      where: {
        code: data.code,
        type: data.type,
        OR: [
          { businessId: data.businessId },
          { isUniversal: true }
        ]
      },
      include: {
        business_product: {
          select: { id: true, name: true, sku: true }
        },
        product_variant: {
          select: { id: true, name: true, sku: true }
        }
      }
    })

    if (conflicting) {
      return NextResponse.json(
        {
          error: 'Barcode already assigned to another product/variant',
          existing: conflicting
        },
        { status: 409 }
      )
    }

    // Create barcode
    const barcode = await prisma.productBarcodes.create({
      data: {
        code: data.code,
        type: data.type,
        productId: data.productId || null,
        variantId: data.variantId || null,
        businessId: data.isUniversal ? null : data.businessId,
        label: data.label || null,
        notes: data.notes || null,
        isPrimary: data.isPrimary,
        isUniversal: data.isUniversal,
        isActive: data.isActive
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
      data: barcode,
      message: 'Barcode created successfully'
    })
  } catch (error: any) {
    console.error('Error creating barcode:', error)

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
