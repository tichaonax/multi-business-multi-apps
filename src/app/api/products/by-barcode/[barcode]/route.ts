import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Lookup product by barcode/SKU
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ barcode: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { barcode } = await context.params

    if (!barcode) {
      return NextResponse.json({ error: 'Barcode is required' }, { status: 400 })
    }

    // Determine current business context for scoping the lookup.
    // Priority: explicit `?businessId=` query param from client -> user's lastAccessedBusinessId -> no scoping
    let scopedBusinessId: string | null = null
    const explicitBusinessId = request.nextUrl?.searchParams?.get('businessId') || null
    if (explicitBusinessId) {
      scopedBusinessId = explicitBusinessId
    } else {
      try {
        const userRecord = await prisma.users.findUnique({
          where: { id: session.user.id },
          select: { lastAccessedBusinessId: true }
        })
        scopedBusinessId = userRecord?.lastAccessedBusinessId || null
      } catch (err) {
        // ignore and proceed without scoping
      }
    }

    // Search for product variant by SKU or barcode
    // Note: Prisma model is ProductVariants and the relation to the parent
    // product is exposed as `business_products` in the schema. Use that
    // relation when including product metadata.
    // Prefer exact matches on the VARIANT itself (sku or barcode). This avoids
    // accidentally returning a variant from another product when the parent
    // product record contains the same sku/barcode.
    const variantWhere: any = {
      OR: [
        { sku: barcode },
        { barcode: barcode }
      ]
    }
    if (scopedBusinessId) {
      variantWhere.AND = [{ business_products: { businessId: scopedBusinessId } }]
    }

    let productVariant = await prisma.productVariants.findFirst({
      where: variantWhere,
      include: {
        business_products: {
          include: {
            business_categories: true,
            product_images: true
          }
        }
      }
    })

    // If no variant-level match, fall back to matching the parent BusinessProducts
    if (!productVariant) {
      const parentWhere: any = {
        OR: [
          { business_products: { sku: barcode } },
          { business_products: { barcode: barcode } }
        ]
      }
      if (scopedBusinessId) parentWhere.AND = [{ business_products: { businessId: scopedBusinessId } }]

      productVariant = await prisma.productVariants.findFirst({
        where: parentWhere,
        include: {
          business_products: {
            include: {
              business_categories: true,
              product_images: true
            }
          }
        }
      })
    }

    if (!productVariant) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Get current stock level
    let stockLevel = 0
    try {
      const inventory = await prisma.inventoryItems.findFirst({
        where: {
          productVariantId: productVariant.id
        },
        select: {
          quantity: true,
          reservedQuantity: true
        }
      })

      if (inventory) {
        stockLevel = inventory.quantity - (inventory.reservedQuantity || 0)
      }
    } catch (error) {
      // Inventory might not exist, default to 0
      console.warn('No inventory found for product variant:', productVariant.id)
    }

    // Return product details mapped from productVariant + parent product
    const product = {
      id: productVariant.id,
      // Parent product name followed by variant name (if present)
      name: `${productVariant.business_products.name}${productVariant.name ? ` - ${productVariant.name}` : ''}`,
      sku: productVariant.sku,
      barcode: productVariant.barcode,
      price: parseFloat((productVariant.price ?? productVariant.business_products.basePrice ?? 0).toString()),
      stock: stockLevel,
      imageUrl: productVariant.business_products.product_images?.[0]?.imageUrl || productVariant.imageUrl || null,
      category: productVariant.business_products.business_categories?.name || null,
      description: productVariant.business_products.description || null
    }

    // Keep compatibility with older clients expecting { success, data }
    return NextResponse.json({ success: true, data: { product, variantId: productVariant.id } })

  } catch (error) {
    console.error('Error looking up product by barcode:', error)
    return NextResponse.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    )
  }
}
