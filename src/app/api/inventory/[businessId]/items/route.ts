import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { randomBytes } from 'crypto'
import { randomUUID } from 'crypto'

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

    // Note: We'll filter by category/ingredientType after fetching since ingredientType is in JSON
    // Only add category filter to where clause if we're sure it's a regular category
    const shouldFilterByCategory = category && category !== 'all'

    // Get products from database with proper relationships
    // Don't apply category filter in where clause - we'll do it after transformation
    const products = await prisma.businessProducts.findMany({
      where,
      include: {
        business_categories: true,
        inventory_subcategory: true,
        business_brands: true,
        business_suppliers: true,
        business_locations: true,
        product_variants: {
          include: {
            business_stock_movements: true
          }
        }
      },
      orderBy: { name: 'asc' },
      // Fetch more items before pagination to account for filtering by ingredientType
      skip: shouldFilterByCategory ? 0 : (page - 1) * limit,
      take: shouldFilterByCategory ? 1000 : limit
    })

    // Transform to match the expected interface
    const items = products.map(product => {
      // Calculate current stock from variants
      // Use stockQuantity directly from variants (which is maintained by the system)
      const currentStock = product.product_variants.reduce((total, variant) => {
        return total + (Number(variant.stockQuantity) || 0)
      }, 0)

      return {
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

    // Apply category/ingredientType filter
    let filteredItems = items
    if (shouldFilterByCategory) {
      filteredItems = items.filter(item => {
        // Check if item has ingredientType in attributes (for ingredients)
        const ingredientType = item.attributes?.ingredientType as string | undefined
        // Match by ingredientType OR regular category
        return (
          (ingredientType && ingredientType.toLowerCase() === category!.toLowerCase()) ||
          (item.category && item.category.toLowerCase().includes(category!.toLowerCase()))
        )
      })
    }

    // Apply low stock filter if requested
    if (lowStock) {
      filteredItems = filteredItems.filter(item => item.currentStock < 10)
    }

    // Apply pagination after filtering
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = filteredItems.slice(startIndex, endIndex)
    const totalFiltered = filteredItems.length

    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit)
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
  let requestBody: any = null

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    requestBody = await request.json()
    const body = requestBody

    // Validate required fields
    // Accept either basePrice or sellPrice (UI compatibility)
    const requiredFields = ['name']
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Ensure we have a price (basePrice or sellPrice)
    if (!body.basePrice && !body.sellPrice && body.basePrice !== 0 && body.sellPrice !== 0) {
      return NextResponse.json(
        { error: 'Missing required field: basePrice or sellPrice' },
        { status: 400 }
      )
    }

    // Use sellPrice if basePrice not provided (UI compatibility)
    const basePrice = body.basePrice ?? body.sellPrice

    const user = session.user as SessionUser

    // Verify business exists and user has access
    let business: any = null
    if (isSystemAdmin(user)) {
      // For admin, just verify the business exists
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      // For regular users, check business membership
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Get or create category
    let categoryId = body.categoryId
    if (!categoryId && body.category) {
      const category = await prisma.businessCategories.upsert({
        where: {
          businessId_name: {
            businessId,
            name: body.category
          }
        },
        update: {},
        create: {
          id: randomUUID(),
          businessId,
          name: body.category,
          businessType: business.type,
          updatedAt: new Date()
        }
      })
      categoryId = category.id
    }

    // Validate subcategory if provided
    let subcategoryId = body.subcategoryId || null
    if (subcategoryId) {
      const subcategory = await prisma.inventorySubcategories.findUnique({
        where: { id: subcategoryId },
        include: { category: true }
      })

      if (!subcategory) {
        return NextResponse.json(
          { error: 'Invalid subcategory' },
          { status: 400 }
        )
      }

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
          businessType: business.type
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

    // Create the product
    const product = await prisma.businessProducts.create({
      data: {
        id: randomUUID(),
        businessId,
        name: body.name,
        description: body.description || '',
        sku: body.sku || null,
        barcode: body.barcode || null,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId,
        supplierId: body.supplierId || null,
        locationId: body.locationId || null,
        basePrice: parseFloat(basePrice),
        costPrice: body.costPrice ? parseFloat(body.costPrice) : null,
        businessType: business.type,
        isActive: body.isActive !== false,
        attributes: body.attributes || {},
        updatedAt: new Date()
      },
      include: {
        business_categories: true,
        inventory_subcategory: true,
        business_suppliers: true,
        business_locations: true
      }
    })

    // Create default variant
    const variant = await prisma.productVariants.create({
      data: {
        id: randomUUID(),
        productId: product.id,
        name: 'Default',
        sku: body.sku || product.sku || `${product.name.replace(/\s+/g, '-').toUpperCase()}-001`,
        stockQuantity: 0,
        reorderLevel: body.lowStockThreshold || 10,
        price: parseFloat(basePrice),
        updatedAt: new Date()
      }
    })

    // If initial stock is provided, create stock movement
    if (body.currentStock && parseFloat(body.currentStock) > 0) {
      await prisma.businessStockMovements.create({
        data: {
          id: randomUUID(),
          businessId,
          productVariantId: variant.id,
          movementType: 'PURCHASE_RECEIVED',
          quantity: parseInt(body.currentStock),
          unitCost: body.costPrice ? parseFloat(body.costPrice) : null,
          reference: 'Initial Stock',
          reason: 'Initial inventory setup',
          businessType: business.type,
          createdAt: new Date()
        }
      })

      // Update variant stock
      await prisma.productVariants.update({
        where: { id: variant.id },
        data: { stockQuantity: parseInt(body.currentStock), updatedAt: new Date() }
      })
    }

    // Create attributes if provided
    if (body.attributes) {
      const attributeData = Object.entries(body.attributes).map(([key, value]) => ({
        id: randomUUID(),
        productId: product.id,
        key,
        value: String(value)
      }))

      await prisma.productAttributes.createMany({
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
        category: (product as any).business_categories?.name || 'Uncategorized',
  currentStock: (variant as any).stockQuantity,
        unit: 'units',
        costPrice: parseFloat(product.costPrice?.toString() || '0'),
        sellPrice: parseFloat(product.basePrice.toString()),
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        attributes: body.attributes || {}
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating inventory item:', error)

    // Handle Prisma unique constraint violation
    if (error.code === 'P2002') {
      const fields = error.meta?.target || []
      const skuValue = requestBody?.sku || 'unknown'

      if (fields.includes('sku')) {
        return NextResponse.json(
          {
            error: 'Duplicate SKU',
            message: `A product with SKU "${skuValue}" already exists in this business. Please use a different SKU.`
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        {
          error: 'Duplicate entry',
          message: 'This item already exists in the system. Please check your input and try again.'
        },
        { status: 409 }
      )
    }

    // Return user-friendly error message
    return NextResponse.json(
      {
        error: 'Failed to create item',
        message: 'Unable to create the inventory item. Please check your input and try again.'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required for updates' },
        { status: 400 }
      )
    }

    // Find and update item in mock database
    // PUT not implemented for inventory items via mock storage in this API.
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 })

  } catch (error) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}