import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const BulkPriceUpdateSchema = z.object({
  action: z.literal('update_price'),
  productIds: z.array(z.string()).min(1),
  basePrice: z.number().min(0).nullable().optional(),
  costPrice: z.number().min(0).nullable().optional(),
  priceMultiplier: z.number().min(0).optional() // e.g., 1.5 for 50% markup
})

const BulkBarcodeUpdateSchema = z.object({
  action: z.literal('update_barcode'),
  productIds: z.array(z.string()).min(1),
  barcodePrefix: z.string().optional(), // Auto-generate with prefix
  barcodes: z.array(z.object({
    productId: z.string(),
    barcode: z.string()
  })).optional()
})

const BulkAvailabilityUpdateSchema = z.object({
  action: z.literal('update_availability'),
  productIds: z.array(z.string()).min(1),
  isAvailable: z.boolean()
})

const BulkUpdateSchema = z.discriminatedUnion('action', [
  BulkPriceUpdateSchema,
  BulkBarcodeUpdateSchema,
  BulkAvailabilityUpdateSchema
])

// POST - Bulk operations on products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = BulkUpdateSchema.parse(body)

    let result: any
    let message: string

    switch (validatedData.action) {
      case 'update_price': {
        const updates: any = {}

        if (validatedData.basePrice !== undefined) {
          updates.basePrice = validatedData.basePrice
        }

        if (validatedData.costPrice !== undefined) {
          updates.costPrice = validatedData.costPrice
        }

        // If price multiplier provided, calculate basePrice from costPrice
        if (validatedData.priceMultiplier) {
          // Get products to calculate individual prices
          const products = await prisma.businessProducts.findMany({
            where: {
              id: { in: validatedData.productIds },
              businessType: 'clothing'
            },
            select: { id: true, costPrice: true }
          })

          // Update each product with calculated price
          const updatePromises = products.map(product => {
            if (product.costPrice) {
              const newPrice = Number(product.costPrice) * validatedData.priceMultiplier!
              return prisma.businessProducts.update({
                where: { id: product.id },
                data: {
                  basePrice: newPrice,
                  updatedAt: new Date()
                }
              })
            }
            return null
          })

          result = await Promise.all(updatePromises.filter(p => p !== null))
          message = `Bulk price update completed for ${result.length} products`
        } else {
          // Simple bulk update with fixed values
          result = await prisma.businessProducts.updateMany({
            where: {
              id: { in: validatedData.productIds },
              businessType: 'clothing'
            },
            data: {
              ...updates,
              updatedAt: new Date()
            }
          })
          message = `Bulk price update completed for ${result.count} products`
        }

        break
      }

      case 'update_barcode': {
        if (validatedData.barcodes) {
          // Update with specific barcodes
          const updatePromises = validatedData.barcodes.map(({ productId, barcode }) =>
            prisma.businessProducts.update({
              where: { id: productId },
              data: {
                barcode,
                updatedAt: new Date()
              }
            })
          )

          result = await Promise.all(updatePromises)
          message = `Bulk barcode assignment completed for ${result.length} products`
        } else if (validatedData.barcodePrefix) {
          // Auto-generate barcodes with prefix
          const products = await prisma.businessProducts.findMany({
            where: {
              id: { in: validatedData.productIds },
              businessType: 'clothing'
            },
            select: { id: true, sku: true }
          })

          const updatePromises = products.map((product, index) => {
            const barcode = `${validatedData.barcodePrefix}${String(index + 1).padStart(6, '0')}`
            return prisma.businessProducts.update({
              where: { id: product.id },
              data: {
                barcode,
                updatedAt: new Date()
              }
            })
          })

          result = await Promise.all(updatePromises)
          message = `Auto-generated barcodes for ${result.length} products`
        } else {
          return NextResponse.json(
            { success: false, error: 'Either barcodes or barcodePrefix must be provided' },
            { status: 400 }
          )
        }

        break
      }

      case 'update_availability': {
        result = await prisma.businessProducts.updateMany({
          where: {
            id: { in: validatedData.productIds },
            businessType: 'clothing'
          },
          data: {
            isAvailable: validatedData.isAvailable,
            updatedAt: new Date()
          }
        })

        message = `Bulk availability update completed for ${result.count} products`
        break
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message
    })
  } catch (error: any) {
    console.error('Error in bulk operation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid bulk operation data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
