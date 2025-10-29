import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
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
    const currentStock = product.product_variants.reduce((total, variant) => {
      const stockMovements = variant.business_stock_movements || []
      const variantStock = stockMovements.reduce((sum, movement) => {
        return sum + Number(movement.quantity)
      }, 0)
      return total + variantStock
    }, 0)

    return NextResponse.json({
      item: {
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
        attributes: product.attributes || {}
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params
    const body = await request.json()

    // Verify product exists and belongs to business
    const existingProduct = await prisma.businessProducts.findFirst({
      where: {
        id: itemId,
        businessId
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

    // Validate supplier if provided
    if (body.supplierId) {
      const supplier = await prisma.businessSuppliers.findFirst({
        where: {
          id: body.supplierId,
          businessId
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

    // Update the product
    const updatedProduct = await prisma.businessProducts.update({
      where: { id: itemId },
      data: updateData,
      include: {
        business_categories: true,
        inventory_subcategory: true,
        business_suppliers: true,
        business_locations: true,
        product_variants: {
          include: {
            business_stock_movements: true
          }
        }
      }
    })

    // Calculate current stock
    const currentStock = updatedProduct.product_variants.reduce((total, variant) => {
      const stockMovements = variant.business_stock_movements || []
      const variantStock = stockMovements.reduce((sum, movement) => {
        return sum + Number(movement.quantity)
      }, 0)
      return total + variantStock
    }, 0)

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
        attributes: updatedProduct.attributes || {}
      }
    })

  } catch (error) {
    console.error('Error updating product:', error)
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
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