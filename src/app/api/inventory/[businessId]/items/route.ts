import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin} from '@/lib/permission-utils'
import { randomBytes } from 'crypto'
import { randomUUID } from 'crypto'
import { generateSKU } from '@/lib/sku-generator'
import { getServerUser } from '@/lib/get-server-user'

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
  barcodes?: Array<{
    id: string
    code: string
    type: string
    isPrimary: boolean
    isUniversal: boolean
    isActive: boolean
    label?: string
    notes?: string
  }>
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
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    // Query parameters
    const category = searchParams.get('category')
    const domainId = searchParams.get('domainId')
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const condition = searchParams.get('condition')
    const lowStock = searchParams.get('lowStock') === 'true'
    const inMenu = searchParams.get('inMenu')   // 'true' = items with a sell price (on menu)
    const posTracked = searchParams.get('posTracked') // 'true' = isInventoryTracked items only
    const priceFilter = searchParams.get('priceFilter') // 'with' | 'without'
    const businessType = searchParams.get('businessType') // e.g. 'restaurant'
    const includeTemplates = searchParams.get('includeTemplates') === 'true' // default false
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause for filtering
    const where: any = {
      businessId: businessId,
      // By default hide template-only catalogue entries — they have no real stock/price yet.
      // Pass includeTemplates=true to surface them (e.g. for the "Show Templates" toggle).
      ...(includeTemplates ? {} : { isProductTemplate: false }),
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

    // Filter by condition (NEW, USED, etc.) if specified
    if (condition && condition !== 'all') {
      where.condition = condition
    }

    // Filter by domain (department) if specified
    if (domainId && domainId !== 'all') {
      where.business_categories = {
        domainId: domainId
      }
    }

    // Filter to items that are on the menu (have a sell price > 0)
    if (inMenu === 'true') {
      where.basePrice = { gt: 0 }
    }

    // Filter to items with POS inventory tracking enabled
    if (posTracked === 'true') {
      where.isInventoryTracked = true
    }

    // Filter by whether items have prices set.
    // For restaurant: items are prepared menu items — only basePrice matters (no concept of costPrice).
    //   'with'    → basePrice > 0   (has a menu/selling price)
    //   'without' → basePrice = 0   (no selling price set yet)
    // For all other business types:
    //   'with'    → costPrice > 0 OR basePrice > 0
    //   'without' → basePrice = 0 AND (costPrice IS NULL OR costPrice = 0)
    //   Note: Prisma comparison operators (lte/gt) silently exclude NULL, so null must be handled explicitly.
    if (priceFilter === 'with') {
      const withConditions = businessType === 'restaurant'
        ? { basePrice: { gt: 0 } }
        : { OR: [{ costPrice: { gt: 0 } }, { basePrice: { gt: 0 } }] }

      if (search) {
        const searchOr = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
        delete where.OR
        where.AND = [{ OR: searchOr }, withConditions]
      } else {
        delete where.OR
        Object.assign(where, withConditions)
      }
    } else if (priceFilter === 'without') {
      const withoutConditions = businessType === 'restaurant'
        ? { basePrice: { lte: 0 } }
        : { AND: [{ basePrice: { lte: 0 } }, { OR: [{ costPrice: null }, { costPrice: { lte: 0 } }] }] }

      if (search) {
        const searchOr = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
        delete where.OR
        where.AND = [{ OR: searchOr }, withoutConditions]
      } else {
        delete where.OR
        Object.assign(where, withoutConditions)
      }
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
        },
        product_barcodes: true
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
        condition: product.condition || 'NEW',
        isActive: product.isActive,
        isProductTemplate: (product as any).isProductTemplate ?? false,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        barcodes: (product as any).product_barcodes || [],
        attributes: product.attributes || {},
        isInventoryTracked: (product as any).isInventoryTracked ?? false
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

    // Also fetch BarcodeInventoryItems that have a categoryId (individually stocked items)
    // These are merged into the results so they appear alongside BusinessProducts
    // Include items with a category OR a direct domainId assignment
    // (allows items whose category has null domainId to still surface via item.domainId)
    const barcodeItemsWhere: any = {
      businessId,
      isActive: true,
      OR: [{ categoryId: { not: null } }, { domainId: { not: null } }],
    }
    if (search) {
      barcodeItemsWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }
    const barcodeItems = await prisma.barcodeInventoryItems.findMany({
      where: barcodeItemsWhere,
      include: {
        business_category: true,
        business_supplier: true,
        inventory_subcategory: true,
        business_location: true,
        business: { select: { type: true } },
      },
    })
    const barcodeItemsMapped = barcodeItems.map(item => ({
      id: `inv_${item.id}`,
      businessId: item.businessId,
      businessType: (item as any).business?.type || businessType || 'grocery',
      name: item.name,
      sku: item.sku || '',
      description: item.customLabel || '',
      category: (item as any).business_category?.name || 'Uncategorized',
      categoryId: item.categoryId || null,
      categoryEmoji: (item as any).business_category?.emoji || '📦',
      domainId: (item as any).business_category?.domainId || (item as any).domainId || null,
      subcategory: (item as any).inventory_subcategory?.name || null,
      subcategoryId: (item as any).subcategoryId || null,
      subcategoryEmoji: (item as any).inventory_subcategory?.emoji || null,
      currentStock: item.stockQuantity,
      unit: 'units',
      costPrice: parseFloat(item.costPrice?.toString() || '0'),
      sellPrice: parseFloat(item.sellingPrice?.toString() || '0'),
      supplier: (item as any).business_supplier?.name || '',
      supplierId: item.supplierId || null,
      location: (item as any).business_location?.name || '',
      locationId: (item as any).locationId || null,
      condition: 'NEW',
      isActive: item.isActive,
      isProductTemplate: false,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      barcodes: item.barcodeData
        ? [{ id: `barcode-${item.id}`, code: item.barcodeData, type: 'EAN-13', label: 'Product Barcode', isPrimary: true, isUniversal: false, isActive: true, notes: null }]
        : [],
      attributes: { isInventoryItem: true },
      isInventoryTracked: true,
      barcodeData: item.barcodeData,
    }))

    // Merge barcodeItems into filteredItems (apply domainId filter only to businessProducts)
    // BarcodeInventoryItems: clothing uses domainId on the category; other types use parentId
    // Also check item.domainId directly (set when stocked via bulk stocking with a department)
    let mergedBarcodeItems = barcodeItemsMapped
    if (domainId && domainId !== 'all') {
      mergedBarcodeItems = barcodeItemsMapped.filter(item => {
        const rawItem = barcodeItems.find(b => `inv_${b.id}` === item.id)
        const bc = (rawItem as any)?.business_category
        // Check item's direct domainId first, then the category's domainId FK.
        // NOTE: do NOT check bc?.parentId here — parentId is for category hierarchy,
        // not domain assignment, and would incorrectly match all sub-categories that
        // share a parent whose UUID happens to equal the domain ID.
        return (rawItem as any)?.domainId === domainId
          || bc?.domainId === domainId
      })
    }
    const allFilteredItems = [
      ...filteredItems,
      ...(lowStock ? mergedBarcodeItems.filter(item => item.currentStock < 10) : mergedBarcodeItems),
    ]

    // Apply pagination after filtering
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = allFilteredItems.slice(startIndex, endIndex)
    const totalFiltered = allFilteredItems.length

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
        domainId,
        search,
        isActive,
        lowStock
      }
    })

  } catch (error) {
    console.error('Error fetching inventory items:', error)
    // For businesses with no inventory, return empty gracefully
    return NextResponse.json({
      items: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      },
      filters: {}
    })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  let requestBody: any = null

  try {
    const user = await getServerUser()
    if (!user) {
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

    // Validate price is greater than 0 (except for WiFi promotional items)
    const isWiFiToken = body.attributes?.isWiFiToken === true || body.name?.toLowerCase().includes('wifi')
    if (!isWiFiToken && (!basePrice || basePrice <= 0)) {
      return NextResponse.json(
        { error: 'Product price must be greater than $0. Use discounts or promotions for price reductions.' },
        { status: 400 }
      )
    }
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
              userId: user.id,
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
          businessType_name: {
            businessType: business.type,
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

    // Generate SKU: always call generate_next_sku() in auto mode to properly increment the sequence
    let sku: string | null = null
    if (body.skuMode === 'manual' && body.sku) {
      sku = body.sku
    } else {
      try {
        const categoryName = categoryId
          ? (await prisma.businessCategories.findUnique({ where: { id: categoryId }, select: { name: true } }))?.name ?? null
          : null

        // Generate SKU and verify it doesn't already exist.
        // generate_next_sku() increments the DB sequence on every call, so each retry
        // produces the next value in order.
        const MAX_ATTEMPTS = 10
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          const result = await prisma.$queryRaw<Array<{ generate_next_sku: string }>>`
            SELECT generate_next_sku(${businessId}::TEXT, ${categoryName}::VARCHAR, NULL::VARCHAR)
          `
          const candidate = result[0]?.generate_next_sku ?? null
          if (!candidate) break

          const existing = await prisma.businessProducts.findFirst({
            where: { businessId, sku: candidate },
            select: { id: true }
          })
          if (!existing) {
            sku = candidate
            break
          }
          console.log(`[SKU] ${candidate} already exists, advancing sequence (attempt ${attempt + 1}/${MAX_ATTEMPTS})`)
        }

        // Hard fallback: if all attempts were duplicates, sync the sequence to the actual
        // max used in the DB then generate once more — guarantees a unique value.
        if (!sku) {
          console.warn(`[SKU] Sequence still behind after ${MAX_ATTEMPTS} attempts — force-syncing sequence`)
          const bizSettings = await prisma.businesses.findUnique({
            where: { id: businessId },
            select: { sku_prefix: true, sku_digits: true }
          })
          const prefix = bizSettings?.sku_prefix ?? 'GRC'
          const digits = bizSettings?.sku_digits ?? 5

          // Find the highest sequence number currently used for this prefix
          const maxProduct = await prisma.businessProducts.findFirst({
            where: { businessId, sku: { startsWith: `${prefix}-` } },
            orderBy: { sku: 'desc' },
            select: { sku: true }
          })
          const maxSeq = maxProduct?.sku
            ? parseInt(maxProduct.sku.replace(`${prefix}-`, ''), 10) || 0
            : 0

          // Advance the DB sequence past the max in use
          await prisma.$executeRaw`
            INSERT INTO sku_sequences ("businessId", prefix, "currentSequence", "updatedAt")
            VALUES (${businessId}::TEXT, ${prefix}::VARCHAR, ${maxSeq}, NOW())
            ON CONFLICT ("businessId", prefix)
            DO UPDATE SET
              "currentSequence" = GREATEST(sku_sequences."currentSequence", ${maxSeq}),
              "updatedAt" = NOW()
          `

          // Now generate — sequence is guaranteed to be past all existing SKUs
          const result = await prisma.$queryRaw<Array<{ generate_next_sku: string }>>`
            SELECT generate_next_sku(${businessId}::TEXT, ${categoryName}::VARCHAR, NULL::VARCHAR)
          `
          sku = result[0]?.generate_next_sku ?? `${prefix}-${String(maxSeq + 1).padStart(digits, '0')}`
          console.log(`[SKU] Force-synced and generated: ${sku}`)
        }

        console.log(`[SKU Auto-generated] ${sku} for product "${body.name}"`)
      } catch (error) {
        console.error('Failed to auto-generate SKU, falling back to provided value:', error)
        sku = body.sku || null
      }
    }

    // Create or update the product (handle partial updates during form filling)
    const productId = body.id || randomUUID()
    const productData = {
      businessId,
      name: body.name,
      description: body.description || '',
      sku,
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
    }

    const product = await prisma.businessProducts.upsert({
      where: { id: productId },
      create: {
        id: productId,
        ...productData
      },
      update: productData,
      include: {
        business_categories: true,
        inventory_subcategory: true,
        business_suppliers: true,
        business_locations: true
      }
    })

    // If a domainId was submitted and the category has no domain yet, assign it now
    if (body.domainId && categoryId) {
      await prisma.businessCategories.updateMany({
        where: { id: categoryId, domainId: null },
        data: { domainId: body.domainId }
      })
    }

    // Create or update default variant (handle partial updates)
    const existingVariant = await prisma.productVariants.findFirst({
      where: { productId: product.id, name: 'Default' }
    })

    const variantData = {
      productId: product.id,
      name: 'Default',
      sku: body.sku || product.sku || `${product.name.replace(/\s+/g, '-').toUpperCase()}-001`,
      stockQuantity: existingVariant?.stockQuantity || 0,
      reorderLevel: body.lowStockThreshold || 10,
      price: parseFloat(basePrice),
      updatedAt: new Date()
    }

    const variant = existingVariant
      ? await prisma.productVariants.update({
          where: { id: existingVariant.id },
          data: variantData
        })
      : await prisma.productVariants.create({
          data: {
            id: randomUUID(),
            ...variantData
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

    // Create barcodes if provided in the new multi-barcode format
    if (body.barcodes && Array.isArray(body.barcodes) && body.barcodes.length > 0) {
      const barcodeData = body.barcodes.map((barcode: any) => ({
        id: barcode.id?.startsWith('temp-') ? randomUUID() : (barcode.id || randomUUID()),
        productId: product.id,
        businessId: barcode.isUniversal ? null : businessId,
        code: barcode.code,
        type: barcode.type || 'CODE128',
        label: barcode.label || 'Product Barcode',
        isPrimary: barcode.isPrimary || false,
        isUniversal: barcode.isUniversal || false,
        isActive: barcode.isActive !== false,
        notes: barcode.notes || null
      }))

      await prisma.productBarcodes.createMany({
        data: barcodeData,
        skipDuplicates: true // Skip if barcode already exists
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

      if (fields.includes('sku')) {
        return NextResponse.json(
          {
            error: 'Duplicate SKU',
            message: `A product with SKU "${requestBody?.sku || 'unknown'}" already exists in this business. Please use a different SKU.`
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
    const user = await getServerUser()
    if (!user) {
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