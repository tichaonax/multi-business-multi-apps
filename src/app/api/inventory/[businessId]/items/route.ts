import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface UniversalInventoryItem {
  id: string
  businessId: string
  businessType: string
  name: string
  sku: string
  description?: string
  category: string
  currentStock: number
  unit: string
  costPrice: number
  sellPrice: number
  supplier?: string
  location?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Business-specific attributes stored as flexible JSON
  attributes?: {
    // Restaurant-specific
    ingredients?: string[]
    allergens?: string[]
    preparationTime?: number
    recipeYield?: number
    expirationDays?: number
    storageTemp?: 'room' | 'refrigerated' | 'frozen'

    // Grocery-specific
    pluCode?: string
    temperatureZone?: string
    organicCertified?: boolean
    expirationDate?: string
    batchNumber?: string

    // Clothing-specific
    sizes?: string[]
    colors?: string[]
    brand?: string
    season?: string
    material?: string

    // Hardware-specific
    manufacturer?: string
    model?: string
    warranty?: string
    specifications?: Record<string, any>
  }
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    // Query parameters
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const lowStock = searchParams.get('lowStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause for filtering
    const where: any = {
      businessId: businessId,
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category && category !== 'all') {
      where.category = {
        name: { contains: category, mode: 'insensitive' }
      }
    }

    // Get products from database with proper relationships
    const products = await prisma.businessProduct.findMany({
      where,
      include: {
        category: true,
        brand: true,
        variants: {
          include: {
            stockMovements: true
          }
        }
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await prisma.businessProduct.count({ where })

    // Transform to match the expected interface
    const items = products.map(product => {
      // Calculate current stock from stock movements
      const currentStock = product.variants.reduce((total, variant) => {
        const stockMovements = variant.stockMovements || []
        const variantStock = stockMovements.reduce((sum, movement) => {
          return movement.movementType === 'IN'
            ? sum + movement.quantity
            : sum - movement.quantity
        }, 0)
        return total + variantStock
      }, 0)

      return {
        id: product.id,
        businessId: product.businessId,
        businessType: product.businessType,
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        category: product.category?.name || 'Uncategorized',
        currentStock,
        unit: 'units',
        costPrice: parseFloat(product.costPrice?.toString() || '0'),
        sellPrice: parseFloat(product.basePrice?.toString() || '0'),
        supplier: '',
        location: '',
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        attributes: product.attributes || {}
      }
    })

    // Apply low stock filter if requested
    const filteredItems = lowStock
      ? items.filter(item => item.currentStock < 10)
      : items

    return NextResponse.json({
      items: filteredItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        category,
        search,
        isActive,
        lowStock
      }
    })

  } catch (error) {
    console.error('Error fetching inventory items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory items' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['name', 'basePrice']
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Verify business exists and user has access
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        businessMemberships: {
          some: {
            userId: session.user.id,
            isActive: true
          }
        }
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Get or create category
    let categoryId = body.categoryId
    if (!categoryId && body.category) {
      const category = await prisma.businessCategory.upsert({
        where: {
          businessId_name: {
            businessId,
            name: body.category
          }
        },
        update: {},
        create: {
          businessId,
          name: body.category,
          businessType: business.type
        }
      })
      categoryId = category.id
    }

    // Create the product
    const product = await prisma.businessProduct.create({
      data: {
        businessId,
        name: body.name,
        description: body.description || '',
        sku: body.sku || null,
        barcode: body.barcode || null,
        categoryId: categoryId || undefined,
        basePrice: parseFloat(body.basePrice),
        costPrice: body.costPrice ? parseFloat(body.costPrice) : null,
        businessType: business.type,
        isActive: body.isActive !== false,
        attributes: body.attributes || {}
      },
      include: {
        category: true
      }
    })

    // Create default variant
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        variantName: 'Default',
        sku: body.sku || product.sku || `${product.name.replace(/\s+/g, '-').toUpperCase()}-001`,
        currentStock: 0,
        lowStockThreshold: body.lowStockThreshold || 10,
        price: parseFloat(body.basePrice)
      }
    })

    // If initial stock is provided, create stock movement
    if (body.currentStock && parseFloat(body.currentStock) > 0) {
      await prisma.businessStockMovement.create({
        data: {
          businessId,
          productVariantId: variant.id,
          movementType: 'IN',
          quantity: parseInt(body.currentStock),
          unitCost: body.costPrice ? parseFloat(body.costPrice) : null,
          reference: 'Initial Stock',
          reason: 'Initial inventory setup',
          businessType: business.type
        }
      })

      // Update variant stock
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { currentStock: parseInt(body.currentStock) }
      })
    }

    // Create attributes if provided
    if (body.attributes) {
      const attributeData = Object.entries(body.attributes).map(([key, value]) => ({
        productId: product.id,
        key,
        value: String(value)
      }))

      await prisma.productAttribute.createMany({
        data: attributeData
      })
    }

    return NextResponse.json({
      message: 'Inventory item created successfully',
      item: {
        id: product.id,
        businessId: product.businessId,
        businessType: product.businessType,
        name: product.name,
        sku: variant.sku,
        description: product.description,
        category: product.category?.name || 'Uncategorized',
        currentStock: variant.currentStock,
        unit: 'units',
        costPrice: parseFloat(product.costPrice?.toString() || '0'),
        sellPrice: parseFloat(product.basePrice.toString()),
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        attributes: body.attributes || {}
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required for updates' },
        { status: 400 }
      )
    }

    // Find and update item in mock database
    const items = mockInventoryItems[businessId] || []
    const itemIndex = items.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Update item
    const updatedItem = {
      ...items[itemIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    mockInventoryItems[businessId][itemIndex] = updatedItem

    return NextResponse.json({
      message: 'Inventory item updated successfully',
      item: updatedItem
    })

  } catch (error) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}