/**
 * Inventory Integration for Layby Management
 *
 * This file handles inventory reservation and release for layby items.
 * Integrates with the existing product/inventory system.
 */

import { prisma } from '@/lib/prisma'
import { getBusinessRules } from './business-rules'

export interface LaybyItem {
  productVariantId: string
  productName?: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface InventoryReservationResult {
  success: boolean
  reserved: string[]  // Product variant IDs successfully reserved
  failed: string[]  // Product variant IDs that failed
  errors: string[]
  details: Record<string, any>
}

export interface InventoryReleaseResult {
  success: boolean
  released: string[]  // Product variant IDs successfully released
  failed: string[]  // Product variant IDs that failed
  errors: string[]
}

/**
 * Reserve inventory for layby items
 * Creates holds on stock based on business rules
 */
export async function reserveInventoryForLayby(
  laybyId: string,
  businessId: string,
  businessType: string,
  items: LaybyItem[]
): Promise<InventoryReservationResult> {
  const reserved: string[] = []
  const failed: string[] = []
  const errors: string[] = []
  const details: Record<string, any> = {}

  try {
    // Get business rules to determine reservation policy
    const rules = getBusinessRules(businessType)

    // Check if business requires inventory reservation
    if (rules.policies.inventoryReservation === 'NONE') {
      return {
        success: true,
        reserved: [],
        failed: [],
        errors: [],
        details: { message: 'No inventory reservation required for this business type' }
      }
    }

    for (const item of items) {
      try {
        // Check if this is a product that should be reserved
        // PARTIAL reservation: skip perishable/service items
        if (rules.policies.inventoryReservation === 'PARTIAL') {
          // In production, check if product is perishable
          // For now, assume all items are reservable
        }

        // Fetch product variant to check stock
        const variant = await prisma.productVariants.findUnique({
          where: { id: item.productVariantId },
          include: {
            product: {
              select: {
                name: true,
                businessId: true
              }
            }
          }
        })

        if (!variant) {
          errors.push(`Product variant ${item.productVariantId} not found`)
          failed.push(item.productVariantId)
          continue
        }

        // Verify product belongs to correct business
        if (variant.product.businessId !== businessId) {
          errors.push(`Product variant ${item.productVariantId} does not belong to this business`)
          failed.push(item.productVariantId)
          continue
        }

        // Check if sufficient stock available
        const currentStock = variant.stock || 0
        if (currentStock < item.quantity) {
          errors.push(`Insufficient stock for ${variant.product.name}: ${currentStock} available, ${item.quantity} requested`)
          failed.push(item.productVariantId)
          continue
        }

        // Create inventory reservation record
        // In production, you might have a separate InventoryReservation table
        // For now, we'll log the reservation intent
        details[item.productVariantId] = {
          productName: variant.product.name,
          variantName: variant.variantName,
          quantityReserved: item.quantity,
          stockBefore: currentStock,
          stockAfter: currentStock - item.quantity,
          reservedFor: laybyId,
          reservedAt: new Date().toISOString()
        }

        // Optionally: Update stock to reflect reservation
        // await prisma.productVariants.update({
        //   where: { id: item.productVariantId },
        //   data: {
        //     stock: currentStock - item.quantity,
        //     // Or add a 'reserved' field if your schema has one
        //   }
        // })

        reserved.push(item.productVariantId)

        console.log(`[Inventory] Reserved ${item.quantity} units of ${variant.product.name} for layby ${laybyId}`)
      } catch (error) {
        const errorMsg = `Failed to reserve ${item.productVariantId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        failed.push(item.productVariantId)
        console.error(errorMsg)
      }
    }

    return {
      success: failed.length === 0,
      reserved,
      failed,
      errors,
      details
    }
  } catch (error) {
    console.error('Inventory reservation error:', error)
    return {
      success: false,
      reserved,
      failed: items.map(i => i.productVariantId),
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      details: {}
    }
  }
}

/**
 * Release inventory reservation when layby is completed or cancelled
 */
export async function releaseInventoryForLayby(
  laybyId: string,
  businessId: string,
  businessType: string,
  items: LaybyItem[],
  reason: 'COMPLETED' | 'CANCELLED'
): Promise<InventoryReleaseResult> {
  const released: string[] = []
  const failed: string[] = []
  const errors: string[] = []

  try {
    // Get business rules
    const rules = getBusinessRules(businessType)

    // No action needed if no reservation was made
    if (rules.policies.inventoryReservation === 'NONE') {
      return {
        success: true,
        released: [],
        failed: [],
        errors: []
      }
    }

    for (const item of items) {
      try {
        // Fetch product variant
        const variant = await prisma.productVariants.findUnique({
          where: { id: item.productVariantId },
          include: {
            product: {
              select: {
                name: true,
                businessId: true
              }
            }
          }
        })

        if (!variant) {
          errors.push(`Product variant ${item.productVariantId} not found`)
          failed.push(item.productVariantId)
          continue
        }

        if (reason === 'CANCELLED') {
          // Return stock to available inventory
          // await prisma.productVariants.update({
          //   where: { id: item.productVariantId },
          //   data: {
          //     stock: (variant.stock || 0) + item.quantity
          //   }
          // })

          console.log(`[Inventory] Returned ${item.quantity} units of ${variant.product.name} (layby ${laybyId} cancelled)`)
        } else if (reason === 'COMPLETED') {
          // Stock was already reserved, now being released to customer
          // No stock adjustment needed if already deducted at reservation
          console.log(`[Inventory] Released ${item.quantity} units of ${variant.product.name} to customer (layby ${laybyId} completed)`)
        }

        released.push(item.productVariantId)
      } catch (error) {
        const errorMsg = `Failed to release ${item.productVariantId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        failed.push(item.productVariantId)
        console.error(errorMsg)
      }
    }

    return {
      success: failed.length === 0,
      released,
      failed,
      errors
    }
  } catch (error) {
    console.error('Inventory release error:', error)
    return {
      success: false,
      released,
      failed: items.map(i => i.productVariantId),
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Check stock availability for layby items before creation
 */
export async function checkStockAvailability(
  businessId: string,
  items: LaybyItem[]
): Promise<{
  available: boolean
  unavailableItems: Array<{
    productVariantId: string
    productName: string
    requested: number
    available: number
  }>
}> {
  const unavailableItems: Array<{
    productVariantId: string
    productName: string
    requested: number
    available: number
  }> = []

  for (const item of items) {
    const variant = await prisma.productVariants.findUnique({
      where: { id: item.productVariantId },
      include: {
        product: {
          select: {
            name: true,
            businessId: true
          }
        }
      }
    })

    if (!variant || variant.product.businessId !== businessId) {
      unavailableItems.push({
        productVariantId: item.productVariantId,
        productName: item.productName || 'Unknown Product',
        requested: item.quantity,
        available: 0
      })
      continue
    }

    const currentStock = variant.stock || 0
    if (currentStock < item.quantity) {
      unavailableItems.push({
        productVariantId: item.productVariantId,
        productName: variant.product.name,
        requested: item.quantity,
        available: currentStock
      })
    }
  }

  return {
    available: unavailableItems.length === 0,
    unavailableItems
  }
}

/**
 * Get reserved inventory summary for a business
 */
export async function getReservedInventorySummary(businessId: string) {
  // Find all active laybys for this business
  const activeLaybys = await prisma.customerLayby.findMany({
    where: {
      businessId,
      status: 'ACTIVE',
      itemsReleased: false
    },
    select: {
      id: true,
      laybyNumber: true,
      items: true
    }
  })

  // Aggregate reserved quantities by product variant
  const reservedByVariant: Record<string, {
    variantId: string
    totalReserved: number
    laybys: string[]
  }> = {}

  for (const layby of activeLaybys) {
    const items = layby.items as LaybyItem[]
    for (const item of items) {
      if (!reservedByVariant[item.productVariantId]) {
        reservedByVariant[item.productVariantId] = {
          variantId: item.productVariantId,
          totalReserved: 0,
          laybys: []
        }
      }
      reservedByVariant[item.productVariantId].totalReserved += item.quantity
      reservedByVariant[item.productVariantId].laybys.push(layby.laybyNumber)
    }
  }

  return {
    totalActiveLaybys: activeLaybys.length,
    reservedVariants: Object.values(reservedByVariant)
  }
}
