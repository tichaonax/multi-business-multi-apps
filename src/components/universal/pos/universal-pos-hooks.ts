// Universal POS Hooks for Inventory Integration
// Provides reusable hooks for POS systems across all business types

import { useState, useEffect, useCallback } from 'react'
import { inventoryIntegration } from '@/lib/inventory-integration'

interface Product {
  id: string
  name: string
  price: number
  category: string
  isAvailable: boolean
  currentStock?: number
  businessType?: string
  unit?: string
  costPrice?: number
  variants?: Array<{
    id: string
    name: string
    price: number
    isAvailable: boolean
  }>
  attributes?: {
    ingredients?: Array<{
      id: string
      name: string
      quantity: number
      unit: string
      inventoryItemId?: string
    }>
    weight?: number
    unit?: string
    ageRestricted?: boolean
    snapEligible?: boolean
  }
}

interface CartItem extends Product {
  quantity: number
  variantId?: string
  notes?: string
}

interface InventoryStatus {
  hasStock: boolean
  currentStock: number
  isLowStock: boolean
  isOutOfStock: boolean
  threshold?: number
}

interface POSOrder {
  items: CartItem[]
  total: number
  subtotal: number
  tax: number
  businessId: string
  employeeName?: string
  customerId?: string
  notes?: string
}

interface InventoryCheckResult {
  canFulfill: boolean
  insufficientItems: Array<{
    itemId: string
    itemName: string
    requested: number
    available: number
  }>
  warnings: string[]
}

// Hook for checking inventory availability
export function useInventoryCheck(businessId: string) {
  const checkInventoryAvailability = useCallback(async (
    items: CartItem[]
  ): Promise<InventoryCheckResult> => {
    try {
      const result: InventoryCheckResult = {
        canFulfill: true,
        insufficientItems: [],
        warnings: []
      }

      for (const item of items) {
        // Get current inventory status
        const inventoryResponse = await fetch(
          `/api/inventory/${businessId}/items/${item.id}`
        )

        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json()
          const inventoryItem = inventoryData.item

          if (inventoryItem) {
            // Check if we have enough stock
            if (inventoryItem.currentStock < item.quantity) {
              result.canFulfill = false
              result.insufficientItems.push({
                itemId: item.id,
                itemName: item.name,
                requested: item.quantity,
                available: inventoryItem.currentStock
              })
            }

            // Check for low stock warnings
            const threshold = inventoryItem.reorderLevel || 10
            if (inventoryItem.currentStock - item.quantity <= threshold) {
              result.warnings.push(
                `${item.name} will be low stock after this sale (${inventoryItem.currentStock - item.quantity} remaining)`
              )
            }
          }
        }
      }

      return result
    } catch (error) {
      console.error('Error checking inventory:', error)
      return {
        canFulfill: true, // Default to allowing sale if check fails
        insufficientItems: [],
        warnings: ['Unable to verify inventory levels']
      }
    }
  }, [businessId])

  return { checkInventoryAvailability }
}

// Hook for processing POS orders with inventory integration
export function usePOSOrderProcessing(
  businessId: string,
  businessType: string,
  employeeName?: string
) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastOrderResult, setLastOrderResult] = useState<any>(null)

  const processOrder = useCallback(async (
    order: POSOrder
  ): Promise<{
    success: boolean
    orderId?: string
    inventoryUpdates?: any[]
    message: string
    warnings?: string[]
  }> => {
    setIsProcessing(true)

    try {
      // First, submit the order to the business-specific API
      const orderResponse = await fetch(`/api/${businessType}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...order,
          businessId,
          employeeName: employeeName || order.employeeName
        })
      })

      if (!orderResponse.ok) {
        throw new Error('Failed to process order')
      }

      const orderResult = await orderResponse.json()

      // Process inventory updates using the integration service
      const inventoryUpdates = await inventoryIntegration.processSaleInventoryUpdates(
        businessId,
        order.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          variantId: item.variantId
        })),
        orderResult.orderNumber || `ORDER-${Date.now()}`,
        employeeName
      )

      // Check for any failed inventory updates
      const failedUpdates = inventoryUpdates.filter(update => !update.success)
      const warnings = failedUpdates.map(update =>
        `Failed to update inventory for ${update.itemName}: ${update.error}`
      )

      const result = {
        success: true,
        orderId: orderResult.id,
        inventoryUpdates,
        message: failedUpdates.length > 0
          ? 'Order processed with inventory update warnings'
          : 'Order processed successfully with inventory updated',
        warnings: warnings.length > 0 ? warnings : undefined
      }

      setLastOrderResult(result)
      return result

    } catch (error) {
      const errorResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process order'
      }

      setLastOrderResult(errorResult)
      return errorResult
    } finally {
      setIsProcessing(false)
    }
  }, [businessId, businessType, employeeName])

  return {
    processOrder,
    isProcessing,
    lastOrderResult
  }
}

// Hook for real-time inventory status
export function useInventoryStatus(businessId: string, itemIds: string[]) {
  const [inventoryStatus, setInventoryStatus] = useState<Record<string, InventoryStatus>>({})
  const [loading, setLoading] = useState(false)

  const refreshInventoryStatus = useCallback(async () => {
    if (itemIds.length === 0) return

    setLoading(true)
    try {
      const statusPromises = itemIds.map(async (itemId) => {
        const response = await fetch(`/api/inventory/${businessId}/items/${itemId}`)
        if (response.ok) {
          const data = await response.json()
          const item = data.item
          return {
            itemId,
            status: {
              hasStock: item.currentStock > 0,
              currentStock: item.currentStock,
              isLowStock: item.currentStock <= (item.reorderLevel || 10),
              isOutOfStock: item.currentStock === 0,
              threshold: item.reorderLevel
            }
          }
        }
        return {
          itemId,
          status: {
            hasStock: true, // Default if can't check
            currentStock: 0,
            isLowStock: false,
            isOutOfStock: false
          }
        }
      })

      const results = await Promise.all(statusPromises)
      const statusMap = results.reduce((acc, { itemId, status }) => {
        acc[itemId] = status
        return acc
      }, {} as Record<string, InventoryStatus>)

      setInventoryStatus(statusMap)
    } catch (error) {
      console.error('Error refreshing inventory status:', error)
    } finally {
      setLoading(false)
    }
  }, [businessId, itemIds])

  useEffect(() => {
    refreshInventoryStatus()
  }, [refreshInventoryStatus])

  return {
    inventoryStatus,
    loading,
    refreshInventoryStatus
  }
}

// Hook for low stock alerts during POS operations
export function useLowStockAlerts(businessId: string) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkLowStockAlerts = useCallback(async () => {
    try {
      const alertsData = await inventoryIntegration.checkLowStockAlerts(businessId)
      setAlerts(alertsData)
      setLastCheck(new Date())
    } catch (error) {
      console.error('Error checking low stock alerts:', error)
    }
  }, [businessId])

  useEffect(() => {
    checkLowStockAlerts()

    // Check every 5 minutes
    const interval = setInterval(checkLowStockAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [checkLowStockAlerts])

  return {
    alerts,
    lastCheck,
    checkLowStockAlerts
  }
}

// Utility function for formatting inventory warnings
export function formatInventoryWarnings(warnings: string[]): string {
  if (warnings.length === 0) return ''

  if (warnings.length === 1) {
    return warnings[0]
  }

  return `Multiple inventory issues:\n${warnings.map(w => `• ${w}`).join('\n')}`
}