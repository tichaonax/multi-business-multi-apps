import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params

    // Find the specific product
    const product = await prisma.businessProducts.findFirst({
      where: {
        id: itemId,
        businessId
      },
      include: {
        business_categories: true,
        inventory_subcategory: true,
        business_suppliers: true,
        business_locations: true,
        product_barcodes: true,
        product_variants: {
          include: {
            business_stock_movements: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Calculate current stock
    const currentStock = product.product_variants.reduce((total: number, variant: any) => {
      const stockMovements: any[] = variant.business_stock_movements || []
      const variantStock = stockMovements.reduce((sum: number, movement: any) => {
        return sum + Number(movement.quantity)
      }, 0)
      return total + variantStock
    }, 0)

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        businessId: product.businessId,
        businessType: product.businessType,
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        category: product.business_categories?.name || 'Uncategorized',
        categoryId: product.categoryId || null,
        categoryEmoji: product.business_categories?.emoji || '📦',
        subcategory: product.inventory_subcategory?.name || null,
        subcategoryId: product.subcategoryId || null,
        subcategoryEmoji: product.inventory_subcategory?.emoji || null,
        currentStock,
        unit: 'units',
        costPrice: parseFloat(product.costPrice?.toString() || '0'),
        sellPrice: parseFloat(product.basePrice?.toString() || '0'),
        supplier: product.business_suppliers?.name || '',
        supplierId: product.supplierId || null,
        location: product.business_locations?.name || '',
        locationId: product.locationId || null,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        attributes: product.attributes || {},
        barcodes: (product.product_barcodes || []).map((bc: any) => ({
          id: bc.id,
          code: bc.code,
          type: bc.type || 'CODE128',
          label: bc.label || 'Product Barcode',
          isPrimary: bc.isPrimary || false,
          isUniversal: bc.isUniversal || false,
          isActive: bc.isActive !== false,
          notes: bc.notes || null
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params
    const body = await request.json()

    // Verify product exists and belongs to business
    const existingProduct = await prisma.businessProducts.findFirst({
      where: {
        id: itemId,
        businessId
      },
      include: {
        businesses: {
          select: { type: true }
        }
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Validate subcategory if provided
    if (body.subcategoryId) {
      const subcategory = await prisma.inventorySubcategories.findUnique({
        where: { id: body.subcategoryId }
      })

      if (!subcategory) {
        return NextResponse.json(
          { error: 'Invalid subcategory' },
          { status: 400 }
        )
      }

      // Verify subcategory belongs to the category
      const categoryId = body.categoryId || existingProduct.categoryId
      if (subcategory.categoryId !== categoryId) {
        return NextResponse.json(
          { error: 'Subcategory does not belong to the selected category' },
          { status: 400 }
        )
      }
    }

    // Validate supplier if provided (check by businessType for shared suppliers)
    if (body.supplierId) {
      const supplier = await prisma.businessSuppliers.findFirst({
        where: {
          id: body.supplierId,
          businessType: existingProduct.businesses.type
        }
      })
      if (!supplier) {
        return NextResponse.json(
          { error: 'Invalid supplier' },
          { status: 400 }
        )
      }
    }

    // Validate location if provided
    if (body.locationId) {
      const location = await prisma.businessLocations.findFirst({
        where: {
          id: body.locationId,
          businessId
        }
      })
      if (!location) {
        return NextResponse.json(
          { error: 'Invalid location' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.name) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.sku) updateData.sku = body.sku
    if (body.barcode) updateData.barcode = body.barcode
    if (body.categoryId) updateData.categoryId = body.categoryId
    if (body.subcategoryId !== undefined) updateData.subcategoryId = body.subcategoryId
    if (body.supplierId !== undefined) updateData.supplierId = body.supplierId || null
    if (body.locationId !== undefined) updateData.locationId = body.locationId || null
    if (body.basePrice) updateData.basePrice = parseFloat(body.basePrice)
    if (body.sellPrice) updateData.basePrice = parseFloat(body.sellPrice) // Accept sellPrice for compatibility
    if (body.costPrice !== undefined) updateData.costPrice = body.costPrice ? parseFloat(body.costPrice) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.attributes) updateData.attributes = body.attributes

    // Validate price is greater than 0 (except for WiFi promotional items)
    const finalPrice = updateData.basePrice ?? existingProduct.basePrice
    const mergedAttributes = { ...existingProduct.attributes, ...updateData.attributes }
    const isWiFiToken = mergedAttributes?.isWiFiToken === true ||
                        existingProduct.name?.toLowerCase().includes('wifi') ||
                        updateData.name?.toLowerCase().includes('wifi')

    if (!isWiFiToken && updateData.basePrice !== undefined && updateData.basePrice <= 0) {
      return NextResponse.json(
        { error: 'Product price must be greater than $0. Use discounts or promotions for price reductions.' },
        { status: 400 }
      )
    }

    // If SKU is being changed, ensure uniqueness within the business
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const conflict = await prisma.businessProducts.findFirst({
        where: {
          businessId,
          sku: updateData.sku,
          NOT: { id: itemId }
        }
      })

      if (conflict) {
        return NextResponse.json({ error: 'SKU already exists for this business' }, { status: 400 })
      }
    }
    // Update the product
    const updatedProduct = await prisma.businessProducts.update({
      where: { id: itemId },
      data: updateData,
      include: {
        business_categories: true,
        inventory_subcategory: true,
        business_suppliers: true,
        business_locations: true,
        product_barcodes: true,
        product_variants: {
          include: {
            business_stock_movements: true
          }
        }
      }
    })

    // Update default variant price if basePrice was changed
    if (updateData.basePrice !== undefined) {
      const defaultVariant = await prisma.productVariants.findFirst({
        where: { productId: itemId, name: 'Default' }
      })

      if (defaultVariant) {
        await prisma.productVariants.update({
          where: { id: defaultVariant.id },
          data: {
            price: updateData.basePrice,
            updatedAt: new Date()
          }
        })
      }
    }

    // Handle stock adjustment if provided
    if (body._stockAdjustment && body._stockAdjustment !== 0) {
      // Get or create default variant for this product
      let variant = await prisma.productVariants.findFirst({
        where: { productId: itemId }
      })

      if (!variant) {
        // Create default variant if it doesn't exist
        variant = await prisma.productVariants.create({
          data: {
            productId: itemId,
            sku: updatedProduct.sku || `${itemId}-default`,
            name: 'Default',
            price: updatedProduct.basePrice || 0,
            stockQuantity: 0
          }
        })
      }

      // Create stock movement for the adjustment
      // Note: employees relation is optional - we don't track who made manual adjustments
      await prisma.businessStockMovements.create({
        data: {
          product_variants: {
            connect: { id: variant.id }
          },
          businesses: {
            connect: { id: businessId }
          },
          businessType: updatedProduct.businessType,
          quantity: parseInt(body._stockAdjustment),
          movementType: 'ADJUSTMENT',
          reason: `Stock adjustment: ${body._stockAdjustment > 0 ? '+' : ''}${body._stockAdjustment} units`
        }
      })

      // Update variant's stockQuantity
      const newStockQuantity = (variant.stockQuantity || 0) + parseInt(body._stockAdjustment)
      await prisma.productVariants.update({
        where: { id: variant.id },
        data: {
          stockQuantity: newStockQuantity,
          updatedAt: new Date()
        }
      })
    }

    // Handle barcodes if provided in the new multi-barcode format
    if (body.barcodes && Array.isArray(body.barcodes)) {
      // Delete existing barcodes for this product
      await prisma.productBarcodes.deleteMany({
        where: { productId: itemId }
      })

      // Create new barcodes
      if (body.barcodes.length > 0) {
        const barcodeData = body.barcodes
          .filter((bc: any) => bc.code && bc.code.trim()) // Only include barcodes with valid codes
          .map((barcode: any) => ({
            id: barcode.id?.startsWith('temp-') ? undefined : barcode.id, // Let Prisma generate ID for temp IDs
            productId: itemId,
            businessId: barcode.isUniversal ? null : businessId,
            code: barcode.code,
            type: barcode.type || 'CODE128',
            label: barcode.label || 'Product Barcode',
            isPrimary: barcode.isPrimary || false,
            isUniversal: barcode.isUniversal || false,
            isActive: barcode.isActive !== false,
            notes: barcode.notes || null
          }))

        if (barcodeData.length > 0) {
          await prisma.productBarcodes.createMany({
            data: barcodeData,
            skipDuplicates: true
          })
        }
      }
    }

    // Calculate current stock
    const currentStock = updatedProduct.product_variants.reduce((total: number, variant: any) => {
      const stockMovements: any[] = variant.business_stock_movements || []
      const variantStock = stockMovements.reduce((sum: number, movement: any) => {
        return sum + Number(movement.quantity)
      }, 0)
      return total + variantStock
    }, 0)

    // Fetch updated barcodes after barcode operations
    const finalProduct = await prisma.businessProducts.findUnique({
      where: { id: itemId },
      include: { product_barcodes: true }
    })

    // Return response in same format as GET endpoint
    return NextResponse.json({
      message: 'Product updated successfully',
      item: {
        id: updatedProduct.id,
        businessId: updatedProduct.businessId,
        businessType: updatedProduct.businessType,
        name: updatedProduct.name,
        sku: updatedProduct.sku || '',
        description: updatedProduct.description || '',
        category: updatedProduct.business_categories?.name || 'Uncategorized',
        categoryId: updatedProduct.categoryId || null,
        categoryEmoji: updatedProduct.business_categories?.emoji || '📦',
        subcategory: updatedProduct.inventory_subcategory?.name || null,
        subcategoryId: updatedProduct.subcategoryId || null,
        subcategoryEmoji: updatedProduct.inventory_subcategory?.emoji || null,
        currentStock,
        unit: 'units',
        costPrice: parseFloat(updatedProduct.costPrice?.toString() || '0'),
        sellPrice: parseFloat(updatedProduct.basePrice?.toString() || '0'),
        supplier: updatedProduct.business_suppliers?.name || '',
        supplierId: updatedProduct.supplierId || null,
        location: updatedProduct.business_locations?.name || '',
        locationId: updatedProduct.locationId || null,
        isActive: updatedProduct.isActive,
        createdAt: updatedProduct.createdAt.toISOString(),
        updatedAt: updatedProduct.updatedAt.toISOString(),
        attributes: updatedProduct.attributes || {},
        barcodes: (finalProduct?.product_barcodes || []).map((bc: any) => ({
          id: bc.id,
          code: bc.code,
          type: bc.type || 'CODE128',
          label: bc.label || 'Product Barcode',
          isPrimary: bc.isPrimary || false,
          isUniversal: bc.isUniversal || false,
          isActive: bc.isActive !== false,
          notes: bc.notes || null
        }))
      }
    })

  } catch (error) {
    console.error('Error updating product:', error)
    // Handle Prisma unique constraint error explicitly
    // PrismaClientKnownRequestError has code 'P2002' for unique constraint violations
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json({ error: 'Unique constraint failed (possible duplicate SKU)' }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params

    // Verify product exists
    const product = await prisma.businessProducts.findFirst({
      where: {
        id: itemId,
        businessId
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Delete the product (this will cascade to variants and movements)
    await prisma.businessProducts.delete({
      where: { id: itemId }
    })

    return NextResponse.json({
      message: 'Inventory item deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}