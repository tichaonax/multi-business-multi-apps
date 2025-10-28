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

    // Search for product variant by SKU or barcode
    const productVariant = await prisma.productVariants.findFirst({
      where: {
        OR: [
          { sku: barcode },
          { barcode: barcode }
        ]
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            imageUrl: true
          }
        }
      }
    })

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

    // Return product details
    return NextResponse.json({
      product: {
        id: productVariant.id,
        name: `${productVariant.products.name}${productVariant.variantName ? ` - ${productVariant.variantName}` : ''}`,
        sku: productVariant.sku,
        barcode: productVariant.barcode,
        price: parseFloat(productVariant.price.toString()),
        stock: stockLevel,
        imageUrl: productVariant.products.imageUrl || productVariant.imageUrl,
        category: productVariant.products.category,
        description: productVariant.products.description
      }
    })

  } catch (error) {
    console.error('Error looking up product by barcode:', error)
    return NextResponse.json(
      { error: 'Failed to lookup product' },
      { status: 500 }
    )
  }
}
