import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface StockMovement {
  id: string
  businessId: string
  itemId: string
  itemName: string
  itemSku: string
  movementType: 'receive' | 'use' | 'waste' | 'adjustment' | 'transfer' | 'return'
  quantity: number
  unit: string
  unitCost?: number
  totalCost?: number
  previousStock: number
  newStock: number
  reason?: string
  notes?: string
  employeeId?: string
  employeeName?: string
  supplierId?: string
  supplierName?: string
  referenceNumber?: string
  batchNumber?: string
  expirationDate?: string
  location?: string
  scannedBarcode?: {
    code: string
    type: string
    isPrimary: boolean
    isUniversal: boolean
    label?: string
  }
  createdAt: string
}



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    // Query parameters
    const itemId = searchParams.get('itemId')
    const movementType = searchParams.get('movementType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeName = searchParams.get('employeeName')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause
    const where: any = {
      businessId: businessId
    }

    if (itemId) {
      // Find the variant by product ID or variant ID
      const variant = await prisma.productVariants.findFirst({
        where: {
          OR: [
            { id: itemId },
            { productId: itemId }
          ],
          business_products: {
            businessId: businessId
          }
        }
      })
      if (variant) {
        where.productVariantId = variant.id
      }
    }

    if (movementType) {
      where.movementType = movementType.toUpperCase()
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    if (employeeName) {
      where.employees = {
        fullName: {
          contains: employeeName,
          mode: 'insensitive'
        }
      }
    }

    // Get movements with related data
    const movements = await prisma.businessStockMovements.findMany({
      where,
      include: {
        product_variants: {
          include: {
            business_products: true
          }
        },
        employees: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await prisma.businessStockMovements.count({ where })

    // Transform to match the expected interface
    const transformedMovements: StockMovement[] = movements.map(movement => {
      const attributes = movement.attributes as any
      const scannedBarcode = attributes?.scannedBarcode

      return {
        id: movement.id,
        businessId: movement.businessId,
        itemId: movement.productVariantId,
        itemName: movement.product_variants?.business_products?.name || 'Unknown Product',
        itemSku: movement.product_variants?.sku || 'Unknown SKU',
        movementType: movement.movementType.toLowerCase() as any,
        quantity: Number(movement.quantity),
        unit: 'units', // Default unit
        unitCost: movement.unitCost ? Number(movement.unitCost) : undefined,
        totalCost: movement.unitCost ? Number(movement.unitCost) * Math.abs(Number(movement.quantity)) : undefined,
        previousStock: 0, // Would need to calculate from movement history
        newStock: 0, // Would need to calculate from movement history
        reason: movement.reason || undefined,
        notes: attributes?.notes || undefined,
        employeeId: movement.employeeId || undefined,
        employeeName: movement.employees?.fullName || undefined,
        supplierName: undefined, // Not stored in current schema
        referenceNumber: movement.reference || undefined,
        batchNumber: undefined, // Not stored in current schema
        expirationDate: undefined, // Not stored in current schema
        location: undefined, // Not stored in current schema
        scannedBarcode: scannedBarcode ? {
          code: scannedBarcode.code,
          type: scannedBarcode.type,
          isPrimary: scannedBarcode.isPrimary || false,
          isUniversal: scannedBarcode.isUniversal || false,
          label: scannedBarcode.label
        } : undefined,
        createdAt: movement.createdAt.toISOString()
      }
    })

    // Calculate summary statistics
    const summary = {
      totalMovements: totalCount,
      byType: {
        receive: movements.filter(m => m.movementType === 'PURCHASE_RECEIVED').length,
        use: movements.filter(m => m.movementType === 'SALE').length,
        waste: movements.filter(m => m.movementType === 'DAMAGE').length,
        adjustment: movements.filter(m => m.movementType === 'ADJUSTMENT').length,
        transfer: movements.filter(m => m.movementType === 'TRANSFER_IN' || m.movementType === 'TRANSFER_OUT').length,
        return: movements.filter(m => m.movementType === 'RETURN_IN' || m.movementType === 'RETURN_OUT').length
      },
      totalValue: movements
        .filter(m => m.unitCost)
        .reduce((sum, m) => sum + (Number(m.unitCost) * Math.abs(Number(m.quantity))), 0)
    }

    return NextResponse.json({
      movements: transformedMovements,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      summary,
      filters: {
        itemId,
        movementType,
        startDate,
        endDate,
        employeeName
      }
    })

  } catch (error) {
    console.error('Error fetching stock movements:', error)
    // For businesses with no inventory, return empty gracefully
    return NextResponse.json({
      movements: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      },
      summary: {
        totalMovements: 0,
        byType: {
          receive: 0,
          use: 0,
          waste: 0,
          adjustment: 0,
          transfer: 0,
          return: 0
        },
        totalValue: 0
      },
      filters: {}
    })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
)
 {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['itemId', 'itemName', 'itemSku', 'movementType', 'quantity', 'unit', 'previousStock', 'newStock']
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Get the product variant to ensure it exists
    const variant = await prisma.productVariants.findFirst({
      where: {
        id: body.itemId,
        business_products: {
          businessId: businessId
        }
      },
      include: {
        business_products: true
      }
    })

    if (!variant) {
      return NextResponse.json(
        { error: 'Product variant not found' },
        { status: 404 }
      )
    }

    // Calculate the actual stock change
    const quantityChange = parseFloat(body.quantity)

    // Create stock movement record
    const stockMovement = await prisma.businessStockMovements.create({
      data: {
        businessId,
        productVariantId: variant.id,
        movementType: body.movementType.toUpperCase(),
        quantity: quantityChange,
        unitCost: body.unitCost ? parseFloat(body.unitCost) : null,
        reference: body.referenceNumber || body.reference || null,
        reason: body.reason || null,
        employeeId: body.employeeId || user.id,
        businessType: variant.business_products.businessType,
        attributes: body.scannedBarcode ? {
          scannedBarcode: body.scannedBarcode,
          notes: body.notes || null
        } : body.notes ? { notes: body.notes } : null,
        createdAt: new Date()
      }
    })

    // Update the variant's stock quantity
    const newStockQuantity = variant.stockQuantity + quantityChange
    await prisma.productVariants.update({
      where: { id: variant.id },
      data: {
        stockQuantity: newStockQuantity,
        updatedAt: new Date()
      }
    })

    // Create the response movement object
    const newMovement: StockMovement = {
      id: stockMovement.id,
      businessId,
      itemId: variant.id,
      itemName: variant.business_products.name,
      itemSku: variant.sku,
      movementType: body.movementType,
      quantity: quantityChange,
      unit: body.unit,
      unitCost: body.unitCost ? parseFloat(body.unitCost) : undefined,
      totalCost: body.totalCost ? parseFloat(body.totalCost) : undefined,
      previousStock: parseFloat(body.previousStock),
      newStock: parseFloat(body.newStock),
      reason: body.reason || '',
      notes: body.notes || '',
      employeeName: body.employeeName || user.name || '',
      supplierName: body.supplierName || '',
      referenceNumber: body.referenceNumber || '',
      batchNumber: body.batchNumber || '',
      expirationDate: body.expirationDate || '',
      location: body.location || '',
      scannedBarcode: body.scannedBarcode,
      createdAt: stockMovement.createdAt.toISOString()
    }

    return NextResponse.json({
      message: 'Stock movement recorded successfully',
      movement: newMovement
    }, { status: 201 })

  } catch (error) {
    console.error('Error recording stock movement:', error)
    return NextResponse.json(
      { error: 'Failed to record stock movement' },
      { status: 500 }
    )
  }
}