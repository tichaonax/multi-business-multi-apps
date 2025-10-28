import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; itemId: string }> }
)
 {

    const { businessId, itemId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params

    // Find the specific item
    const items = mockInventoryItems[businessId] || []
    const item = items.find(item => item.id === itemId)

    if (!item) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      item,
      // Include related data for detailed view
      relatedData: {
        recentMovements: [], // Stock movements history
        recipes: [], // Recipes using this ingredient
        suppliers: [], // Alternative suppliers
        analytics: {
          averageUsage: 0,
          turnoverRate: 0,
          costTrend: 'stable'
        }
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
)
 {

    const { businessId, itemId } = await params
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
        inventory_subcategory: true
      }
    })

    return NextResponse.json({
      message: 'Product updated successfully',
      item: updatedProduct
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
)
 {

    const { businessId, itemId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, itemId } = await params

    // Find and remove the specific item
    const items = mockInventoryItems[businessId] || []
    const itemIndex = items.findIndex(item => item.id === itemId)

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Remove item (or mark as inactive in real implementation)
    const deletedItem = items.splice(itemIndex, 1)[0]

    return NextResponse.json({
      message: 'Inventory item deleted successfully',
      item: deletedItem
    })

  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}