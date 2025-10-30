import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

// GET - Lookup product by barcode/SKU scoped to a specific business
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ businessId: string; barcode: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, barcode } = await context.params

    // Quick debug shortcuts:
    // ?_dbg=1 -> confirm route match (minimal)
    // ?_dbg=2 -> run the same DB queries used by the handler and return raw candidates so we can see what exists in the DB
    try {
      const dbg = request.nextUrl.searchParams.get('_dbg')
      if (dbg === '1') {
        return NextResponse.json({ ok: true, businessId, barcode })
      }

      if (dbg === '2') {
        // Run the queries used below but return raw results for debugging (dev only)
        const variantCandidates = await prisma.productVariants.findMany({
          where: {
            AND: [
              {
                OR: [
                  { sku: barcode },
                  { barcode: barcode }
                ]
              },
              { business_products: { businessId } }
            ]
          },
          include: {
            business_products: true
          }
        })

        const parentCandidates = await prisma.businessProducts.findMany({
          where: {
            businessId,
            OR: [
              { sku: barcode },
              { barcode: barcode }
            ]
          },
          include: {
            product_variants: true,
            product_images: true
          }
        })
        // Also include any inventory records for this business that reference
        // these variants or the parent product. There is no `inventoryItems`
        // model in Prisma schema; inventory is represented via
        // ProductVariants.stockQuantity and BusinessStockMovements.
        let inventoryRecords: any[] = []
        try {
          const variantIds = variantCandidates.map((v: any) => v.id)
          const parentIds = parentCandidates.map((p: any) => p.id)
          // Use businessStockMovements as the inventory/movements table
          inventoryRecords = await prisma.businessStockMovements.findMany({
            where: {
              businessId,
              OR: [
                { productVariantId: { in: variantIds.length ? variantIds : [''] } },
                { businessProductId: { in: parentIds.length ? parentIds : [''] } }
              ]
            },
            take: 200
          })
        } catch (e) {
          // ignore debug lookup errors
        }

        return NextResponse.json({
          dbg: true,
          businessId,
          barcode,
          variantCandidates,
          parentCandidates,
          inventoryRecords
        })
      }
      if (dbg === '3') {
        // Dump all variants and parent products (limited) for this business to inspect
        const allVariants = await prisma.productVariants.findMany({
          where: { business_products: { businessId } },
          include: { business_products: true },
          take: 200
        })

        const allParents = await prisma.businessProducts.findMany({
          where: { businessId },
          include: { product_variants: true, product_images: true },
          take: 200
        })

        const allInventory = await prisma.businessStockMovements.findMany({
          where: { businessId },
          take: 500
        })

        return NextResponse.json({ dbg: 3, businessId, totalVariants: allVariants.length, totalParents: allParents.length, totalInventory: allInventory.length, variants: allVariants, parents: allParents, inventory: allInventory })
      }
    } catch (e) {
      // ignore URL parsing or DB debug errors and continue to normal flow
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    if (!barcode) {
      return NextResponse.json({ error: 'Barcode is required' }, { status: 400 })
    }

    const user = session.user as SessionUser

    // Verify user has access to this business unless they're a system admin
    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId,
          isActive: true
        }
      })
      if (!membership) {
        return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
      }
    }

    // First try an exact variant-level match constrained to the requested business
    const variantWhere: any = {
      AND: [
        {
          OR: [
            { sku: barcode },
            { barcode: barcode }
          ]
        },
        { business_products: { businessId } }
      ]
    }

    let productVariant = await prisma.productVariants.findFirst({
      where: variantWhere,
      include: {
        business_products: {
          include: {
            business_categories: true,
            product_images: true,
            product_variants: true
          }
        }
      }
    })

    // If no variant-level match within the business, try matching the parent product record
    // strictly within the same business. Instead of always returning the first variant
    // (which can have a different SKU), return the parent product details when the
    // parent SKU/barcode matches. For stock we aggregate across all variants.
    let parentMatched: any = null
    if (!productVariant) {
      const parent = await prisma.businessProducts.findFirst({
        where: {
          businessId,
          OR: [
            { sku: barcode },
            { barcode: barcode }
          ]
        },
        include: {
          business_categories: true,
          product_images: true,
          product_variants: true
        }
      })

      if (parent) {
        parentMatched = parent

        // Aggregate stock across all variants for the parent product.
        // Prefer the ProductVariants.stockQuantity field (authoritative),
        // falling back to summing BusinessStockMovements quantities if needed.
        const variantList = parent.product_variants || []
        let stockLevelSum = variantList.reduce((s: number, v: any) => s + (v.stockQuantity || 0), 0)
        if (stockLevelSum === 0 && variantList.length > 0) {
          try {
            const variantIds = variantList.map((v: any) => v.id)
            const movements = await prisma.businessStockMovements.findMany({
              where: { productVariantId: { in: variantIds } },
              select: { quantity: true }
            })
            stockLevelSum = movements.reduce((s: number, m: any) => s + Number(m.quantity || 0), 0)
          } catch (e) {
            // ignore and leave stockLevelSum as-is
          }
        }

        // Build UniversalProduct-shaped object from parent metadata so the
        // front-end components (which expect basePrice/variants) can format prices
        // and display correctly.
        const productFromParent = {
          id: parent.id,
          name: parent.name,
          description: parent.description || null,
          sku: parent.sku || null,
          barcode: parent.barcode || null,
          productType: parent.productType || 'PHYSICAL',
          condition: parent.condition || 'NEW',
          basePrice: parseFloat((parent.basePrice ?? 0).toString()),
          costPrice: parent.costPrice ? parseFloat(parent.costPrice.toString()) : undefined,
          businessType: parent.businessType || null,
          attributes: parent.attributes || {},
          isActive: parent.isActive,
          images: (parent.product_images || []).map((img: any) => ({ id: img.id, imageUrl: img.imageUrl, altText: img.altText || null, isPrimary: !!img.isPrimary })),
          variants: (parent.product_variants || []).map((v: any) => ({
            id: v.id,
            name: v.name || null,
            sku: v.sku || '',
            price: v.price ? parseFloat(v.price.toString()) : parseFloat((parent.basePrice ?? 0).toString()),
            stockQuantity: typeof v.stockQuantity === 'number' ? v.stockQuantity : 0,
            attributes: v.attributes || {}
          }))
        }

        // Return parent-shaped UniversalProduct. Since the barcode matched the
        // parent product record (not a variant), do NOT return a variantId so
        // calling clients will use the parent SKU and basePrice. If callers
        // still want to attach a variant, they can pick one from
        // product.variants on the client side.
        return NextResponse.json({ success: true, data: { product: productFromParent, variantId: null, matchedByParent: true } })
      }
    }

    if (!productVariant) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Get current stock level for the chosen variant. Prefer the variant's
    // stockQuantity column, otherwise fall back to summing movements.
    let stockLevel = 0
    try {
      if (typeof productVariant.stockQuantity === 'number') {
        stockLevel = productVariant.stockQuantity
      } else {
        const movements = await prisma.businessStockMovements.findMany({
          where: { productVariantId: productVariant.id },
          select: { quantity: true }
        })
        stockLevel = movements.reduce((s: number, m: any) => s + Number(m.quantity || 0), 0)
      }
    } catch (error) {
      // ignore inventory lookup failures quietly
    }

    // Build UniversalProduct-shaped object using parent product as the primary
    // product record and include variants (so UI can pick basePrice/variant.price)
    const parent = productVariant.business_products
    const product = {
      id: parent.id,
      name: parent.name,
      description: parent.description || null,
      sku: parent.sku || null,
      barcode: parent.barcode || null,
      productType: parent.productType || 'PHYSICAL',
      condition: parent.condition || 'NEW',
      basePrice: parseFloat((parent.basePrice ?? 0).toString()),
      costPrice: parent.costPrice ? parseFloat(parent.costPrice.toString()) : undefined,
      businessType: parent.businessType || null,
      attributes: parent.attributes || {},
      isActive: parent.isActive,
      images: (parent.product_images || []).map((img: any) => ({ id: img.id, imageUrl: img.imageUrl, altText: img.altText || null, isPrimary: !!img.isPrimary })),
      variants: (parent.product_variants || []).map((v: any) => ({
        id: v.id,
        name: v.name || null,
        sku: v.sku || '',
        price: v.price ? parseFloat(v.price.toString()) : parseFloat((parent.basePrice ?? 0).toString()),
        stockQuantity: typeof v.stockQuantity === 'number' ? v.stockQuantity : 0,
        attributes: v.attributes || {}
      }))
    }

    return NextResponse.json({ success: true, data: { product, variantId: productVariant.id } })

  } catch (error) {
    console.error('Error looking up product by barcode (scoped):', error)
    return NextResponse.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    )
  }
}
