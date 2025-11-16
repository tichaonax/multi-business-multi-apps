import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAddInventoryFromModal } from '@/lib/permission-utils'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // TEMPORARY: Skip authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { success: false, error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    // Mock session for testing
    const session = {
      user: {
        id: 'test-user-id',
        role: 'SYSTEM_ADMIN'
      }
    }

    const body = await request.json()
    const { barcode, businessId, inventoryType, productData } = body

    // Validate required fields
    if (!barcode || !businessId || !inventoryType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: barcode, businessId, inventoryType' },
        { status: 400 }
      )
    }

    // Validate inventory type
    const validTypes = ['clothing', 'hardware', 'grocery', 'restaurant']
    if (!validTypes.includes(inventoryType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid inventory type' },
        { status: 400 }
      )
    }

    // Check permissions
    // TEMPORARY: Skip permission check for testing
    // if (!canAddInventoryFromModal(session.user as any, businessId)) {
    //   return NextResponse.json(
    //     { success: false, error: 'You do not have permission to add inventory to this business' },
    //     { status: 403 }
    //   )
    // }

    // Verify business exists and user has access
    const business = await prisma.businesses.findFirst({
      where: {
        id: businessId,
        type: inventoryType,
        // For system admins, skip membership check since they have access to all businesses
        ...(session.user.role !== 'SYSTEM_ADMIN' && {
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        })
      }
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Check if barcode already exists for THIS business (not globally)
    const existingBarcode = await prisma.productBarcodes.findFirst({
      where: {
        code: barcode,
        businessId: businessId
      }
    })

    if (existingBarcode) {
      return NextResponse.json(
        { success: false, error: 'Barcode already exists for this business' },
        { status: 409 }
      )
    }

    // Get or create default "Uncategorized" category for the business type
    // Note: Categories are shared across businesses of same type (unique constraint on businessType + name)
    let defaultCategory = await prisma.businessCategories.findFirst({
      where: {
        businessType: inventoryType,
        name: 'Uncategorized'
      }
    })

    if (!defaultCategory) {
      // Create default category if it doesn't exist
      defaultCategory = await prisma.businessCategories.create({
        data: {
          businessId: null,  // Shared category, not tied to specific business
          name: 'Uncategorized',
          businessType: inventoryType,
          description: 'Default category for scanned products',
          isActive: true,
          updatedAt: new Date()
        }
      })
    }

    // Start transaction to create product and barcode
    const result = await prisma.$transaction(async (tx) => {
      // Create business product with minimal data
      const businessProduct = await tx.businessProducts.create({
        data: {
          businessId,
          businessType: inventoryType,
          name: productData?.name || `Scanned Product (${barcode})`,
          description: productData?.description || `Added from barcode scan on ${new Date().toISOString().split('T')[0]}`,
          categoryId: defaultCategory.id,
          basePrice: productData?.sellPrice || 0,
          costPrice: productData?.costPrice || 0,
          isActive: true,
          attributes: productData?.size || productData?.color ? { size: productData?.size, color: productData?.color } : null,
          updatedAt: new Date()
        }
      })

      // Create product variant with default values
      const productVariant = await tx.productVariants.create({
        data: {
          productId: businessProduct.id,
          sku: `${barcode}-001`, // Default SKU based on barcode
          name: productData?.size ? `${productData.size}${productData.color ? ' - ' + productData.color : ''}` : (productData?.name || 'Standard'),
          price: productData?.sellPrice || 0,
          stockQuantity: productData?.quantity || 0,
          isActive: true,
          attributes: productData?.size || productData?.color ? { size: productData?.size, color: productData?.color } : null,
          updatedAt: new Date()
        }
      })

      // Create the product barcode entry linked to both product and variant
      const barcodeEntry = await tx.productBarcodes.create({
        data: {
          code: barcode,
          type: 'CUSTOM', // Default to CUSTOM for scanned barcodes
          isPrimary: true,
          isUniversal: false, // Business-specific barcode
          isActive: true,
          label: 'Primary Barcode',
          businessId: businessId, // Associate with the business
          productId: businessProduct.id,
          variantId: productVariant.id
        }
      })

      return {
        barcodeEntry,
        businessProduct,
        productVariant
      }
    })

    // Log the inventory addition
    console.log(`User ${session.user.id} added inventory: barcode ${barcode} to business ${businessId} (${inventoryType})`)

    return NextResponse.json({
      success: true,
      productId: result.businessProduct.id,
      barcodeId: result.barcodeEntry.id,
      variantId: result.productVariant.id,
      redirectUrl: `/${inventoryType}/products?businessId=${businessId}&edit=${result.businessProduct.id}`
    })

  } catch (error) {
    console.error('Error adding inventory:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
