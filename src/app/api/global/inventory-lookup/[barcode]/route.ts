import { NextRequest, NextResponse } from 'next/server'
import { getGlobalBarcodeScanningAccess } from '@/lib/permission-utils'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { barcode } = await params
    if (!barcode || barcode.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Invalid barcode' },
        { status: 400 }
      )
    }

    const access = getGlobalBarcodeScanningAccess(user)
    if (!access.canScan) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for global barcode scanning' },
        { status: 403 }
      )
    }

    // Get user's business memberships for filtering
    const businessMemberships = await prisma.businessMemberships.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    })

    const accessibleBusinessIds = businessMemberships.map(m => m.businessId)

    // Find products with this barcode across all businesses
    const productBarcodes = await prisma.productBarcodes.findMany({
      where: {
        code: barcode,
        isActive: true
      },
      include: {
        business_product: {
          include: {
            businesses: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        product_variant: {
          include: {
            business_products: {
              include: {
                businesses: {
                  select: {
                    id: true,
                    name: true,
                    type: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Group results by business
    const businessInventory: any[] = []
    const matchedProductIds = new Set<string>()

    for (const productBarcode of productBarcodes) {
      let businessId: string
      let businessName: string
      let businessType: string
      let product: any
      let variant: any

      if (productBarcode.productId && productBarcode.business_product) {
        // This is a product-level barcode
        businessId = productBarcode.business_product.businesses.id
        businessName = productBarcode.business_product.businesses.name
        businessType = productBarcode.business_product.businesses.type
        product = productBarcode.business_product
        variant = null
      } else if (productBarcode.variantId && productBarcode.product_variant?.business_products) {
        // This is a variant-level barcode
        businessId = productBarcode.product_variant.business_products.businesses.id
        businessName = productBarcode.product_variant.business_products.businesses.name
        businessType = productBarcode.product_variant.business_products.businesses.type
        product = productBarcode.product_variant.business_products
        variant = productBarcode.product_variant
      } else {
        continue // Skip orphaned barcodes
      }

      matchedProductIds.add(product.id)

      // Check if user has access to this business
      const hasAccess = accessibleBusinessIds.includes(businessId)
      const isInformational = access.canViewAcrossBusinesses && !hasAccess

      // Skip businesses user can't see at all
      if (!hasAccess && !isInformational) {
        continue
      }

      // Get inventory data
      let stockQuantity = 0
      let price = 0

      if (variant) {
        // Get variant inventory
        const inventory = await prisma.inventory.findFirst({
          where: {
            variantId: variant.id,
            businessId: businessId
          }
        })
        stockQuantity = inventory?.quantity || 0
        price = variant.price || product.basePrice || 0
      } else {
        // Get product inventory (sum of all variants)
        const inventories = await prisma.productVariants.findMany({
          where: {
            productId: product.id
          },
          select: {
            stockQuantity: true,
            price: true
          }
        })
        stockQuantity = inventories.reduce((sum: number, inv: any) => sum + (inv.stockQuantity || 0), 0)
        price = inventories[0]?.price || product.basePrice || 0
      }

      businessInventory.push({
        businessId,
        businessName,
        businessType,
        productId: product.id,
        variantId: variant?.id || null,
        productName: product.name,
        variantName: variant?.name || null,
        description: product.description,
        productAttributes: product.attributes || {},
        variantAttributes: variant?.attributes || {},
        stockQuantity,
        price: Number(price),
        hasAccess,
        isInformational,
        barcodeType: productBarcode.type,
        barcodeLabel: productBarcode.label
      })
    }

    // Fallback: also search by SKU if no barcode matches found
    // Products may have SKU set but no entry in product_barcodes table
    if (businessInventory.length === 0) {
      const skuProducts = await prisma.businessProducts.findMany({
        where: {
          sku: { equals: barcode, mode: 'insensitive' },
          isActive: true
        },
        include: {
          businesses: { select: { id: true, name: true, type: true } },
          product_variants: {
            where: { isActive: true },
            select: { id: true, name: true, price: true, stockQuantity: true, attributes: true }
          }
        }
      })

      for (const product of skuProducts) {
        const businessId = product.businesses.id
        const hasAccess = accessibleBusinessIds.includes(businessId)
        const isInformational = access.canViewAcrossBusinesses && !hasAccess

        if (!hasAccess && !isInformational) continue

        const stockQuantity = product.product_variants.reduce((sum: number, v: any) => sum + (v.stockQuantity || 0), 0)
        const price = product.product_variants[0]?.price || product.basePrice || 0
        const variant = product.product_variants.length === 1 ? product.product_variants[0] : null

        businessInventory.push({
          businessId,
          businessName: product.businesses.name,
          businessType: product.businesses.type,
          productId: product.id,
          variantId: variant?.id || null,
          productName: product.name,
          variantName: variant?.name || null,
          description: product.description,
          productAttributes: product.attributes || {},
          variantAttributes: variant?.attributes || {},
          stockQuantity,
          price: Number(price),
          hasAccess,
          isInformational,
          barcodeType: 'SKU',
          barcodeLabel: 'Matched by SKU'
        })
      }
    }

    // Sort by accessibility (accessible businesses first, then informational)
    businessInventory.sort((a, b) => {
      if (a.hasAccess && !b.hasAccess) return -1
      if (!a.hasAccess && b.hasAccess) return 1
      return a.businessName.localeCompare(b.businessName)
    })

    return NextResponse.json({
      success: true,
      data: {
        barcode,
        businesses: businessInventory,
        totalBusinesses: businessInventory.length,
        accessibleBusinesses: businessInventory.filter(b => b.hasAccess).length,
        informationalBusinesses: businessInventory.filter(b => b.isInformational).length
      }
    })

  } catch (error) {
    console.error('Error in global inventory lookup:', error)

    // Provide user-friendly error messages
    let userMessage = 'Unable to search for this product. Please try again.'

    if (error instanceof Error) {
      if (error.message.includes('connect') || error.message.includes('network')) {
        userMessage = 'Connection issue. Please check your internet connection and try again.'
      } else if (error.message.includes('timeout')) {
        userMessage = 'Search timed out. Please try again.'
      } else if (error.message.includes('validation')) {
        userMessage = 'Invalid search criteria. Please check the barcode and try again.'
      }
    }

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: 500 }
    )
  }
}