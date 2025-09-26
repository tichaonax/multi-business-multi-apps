// Inventory Integration Service
// Handles automatic inventory updates for sales, returns, waste, etc.

interface InventoryItem {
  id: string
  name: string
  sku: string
  quantity: number
  unit: string
  inventoryItemId?: string
}

interface SaleItem {
  id: string
  name: string
  quantity: number
  price: number
  ingredients?: InventoryItem[]
  variantId?: string
}

interface StockMovementData {
  businessId: string
  itemId: string
  itemName: string
  itemSku: string
  movementType: 'receive' | 'use' | 'waste' | 'adjustment' | 'transfer' | 'return'
  quantity: number
  unit: string
  unitCost?: number
  totalCost?: number
  reason?: string
  notes?: string
  employeeName?: string
  supplierName?: string
  referenceNumber?: string
  batchNumber?: string
  expirationDate?: string
  location?: string
}

interface InventoryUpdateResult {
  success: boolean
  itemId: string
  itemName: string
  quantityChanged: number
  error?: string
  movementId?: string
}

export class InventoryIntegrationService {
  private baseUrl: string

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  /**
   * Process inventory updates for a completed sale
   * Automatically reduces stock for ingredients used in sold items
   */
  async processSaleInventoryUpdates(
    businessId: string,
    saleItems: SaleItem[],
    referenceNumber: string,
    employeeName?: string,
    headers?: Record<string, string>
  ): Promise<InventoryUpdateResult[]> {
    const results: InventoryUpdateResult[] = []

    for (const saleItem of saleItems) {
      try {
        // Get product details including ingredients/recipe
        const productResponse = await fetch(`${this.baseUrl}/api/universal/products/${saleItem.id}`, {
          headers: headers || {}
        })

        if (!productResponse.ok) {
          results.push({
            success: false,
            itemId: saleItem.id,
            itemName: saleItem.name,
            quantityChanged: 0,
            error: 'Failed to fetch product details'
          })
          continue
        }

        const productData = await productResponse.json()
        const product = productData.data

        // Process ingredients if this is a recipe-based item
        if (product?.attributes?.ingredients) {
          for (const ingredient of product.attributes.ingredients) {
            const quantityUsed = (ingredient.quantity || 1) * saleItem.quantity

            const updateResult = await this.recordStockMovement(businessId, {
              itemId: ingredient.inventoryItemId || ingredient.id,
              itemName: ingredient.name,
              itemSku: ingredient.sku || `ING-${ingredient.id}`,
              movementType: 'use',
              quantity: -Math.abs(quantityUsed), // Negative for usage
              unit: ingredient.unit || 'units',
              reason: `Used in sale - ${product.name}`,
              notes: `Sale item: ${saleItem.quantity}x ${product.name}`,
              employeeName,
              referenceNumber
            }, headers)

            results.push(updateResult)
          }
        } else {
          // Direct inventory item (no recipe)
          const updateResult = await this.recordStockMovement(businessId, {
            itemId: product.inventoryItemId || saleItem.id,
            itemName: saleItem.name,
            itemSku: product.sku || saleItem.id,
            movementType: 'use',
            quantity: -Math.abs(saleItem.quantity),
            unit: product.unit || 'units',
            unitCost: product.costPrice,
            totalCost: (product.costPrice || 0) * saleItem.quantity,
            reason: 'Direct sale',
            notes: `Sold: ${saleItem.quantity}x ${saleItem.name}`,
            employeeName,
            referenceNumber
          }, headers)

          results.push(updateResult)
        }
      } catch (error) {
        results.push({
          success: false,
          itemId: saleItem.id,
          itemName: saleItem.name,
          quantityChanged: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Process inventory updates for returns
   * Increases stock for returned items
   */
  async processReturnInventoryUpdates(
    businessId: string,
    returnItems: SaleItem[],
    referenceNumber: string,
    employeeName?: string,
    headers?: Record<string, string>
  ): Promise<InventoryUpdateResult[]> {
    const results: InventoryUpdateResult[] = []

    for (const returnItem of returnItems) {
      try {
        const updateResult = await this.recordStockMovement(businessId, {
          itemId: returnItem.id,
          itemName: returnItem.name,
          itemSku: returnItem.id,
          movementType: 'return',
          quantity: Math.abs(returnItem.quantity), // Positive for returns
          unit: 'units',
          reason: 'Customer return',
          notes: `Returned: ${returnItem.quantity}x ${returnItem.name}`,
          employeeName,
          referenceNumber
        }, headers)

        results.push(updateResult)
      } catch (error) {
        results.push({
          success: false,
          itemId: returnItem.id,
          itemName: returnItem.name,
          quantityChanged: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Record waste/spoilage
   */
  async recordWaste(
    businessId: string,
    items: { id: string; name: string; quantity: number; reason: string; unit?: string }[],
    employeeName?: string,
    headers?: Record<string, string>
  ): Promise<InventoryUpdateResult[]> {
    const results: InventoryUpdateResult[] = []

    for (const wasteItem of items) {
      try {
        const updateResult = await this.recordStockMovement(businessId, {
          itemId: wasteItem.id,
          itemName: wasteItem.name,
          itemSku: wasteItem.id,
          movementType: 'waste',
          quantity: -Math.abs(wasteItem.quantity), // Negative for waste
          unit: wasteItem.unit || 'units',
          reason: wasteItem.reason,
          notes: `Waste recorded: ${wasteItem.quantity} ${wasteItem.unit || 'units'}`,
          employeeName
        }, headers)

        results.push(updateResult)
      } catch (error) {
        results.push({
          success: false,
          itemId: wasteItem.id,
          itemName: wasteItem.name,
          quantityChanged: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Record inventory adjustments
   */
  async recordAdjustment(
    businessId: string,
    itemId: string,
    itemName: string,
    currentStock: number,
    newStock: number,
    reason: string,
    employeeName?: string,
    headers?: Record<string, string>
  ): Promise<InventoryUpdateResult> {
    const quantityChange = newStock - currentStock

    return this.recordStockMovement(businessId, {
      itemId,
      itemName,
      itemSku: itemId,
      movementType: 'adjustment',
      quantity: quantityChange,
      unit: 'units',
      reason,
      notes: `Stock adjustment: ${currentStock} → ${newStock}`,
      employeeName
    }, headers)
  }

  /**
   * Record stock receiving
   */
  async recordReceiving(
    businessId: string,
    items: {
      id: string
      name: string
      quantity: number
      unitCost?: number
      unit?: string
      supplierName?: string
      batchNumber?: string
      expirationDate?: string
    }[],
    referenceNumber?: string,
    employeeName?: string,
    headers?: Record<string, string>
  ): Promise<InventoryUpdateResult[]> {
    const results: InventoryUpdateResult[] = []

    for (const item of items) {
      try {
        const updateResult = await this.recordStockMovement(businessId, {
          itemId: item.id,
          itemName: item.name,
          itemSku: item.id,
          movementType: 'receive',
          quantity: Math.abs(item.quantity), // Positive for receiving
          unit: item.unit || 'units',
          unitCost: item.unitCost,
          totalCost: item.unitCost ? item.unitCost * item.quantity : undefined,
          reason: 'Stock receiving',
          notes: `Received: ${item.quantity} ${item.unit || 'units'}`,
          employeeName,
          supplierName: item.supplierName,
          referenceNumber,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate
        }, headers)

        results.push(updateResult)
      } catch (error) {
        results.push({
          success: false,
          itemId: item.id,
          itemName: item.name,
          quantityChanged: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  /**
   * Core method to record a stock movement
   */
  private async recordStockMovement(
    businessId: string,
    movementData: StockMovementData,
    headers?: Record<string, string>
  ): Promise<InventoryUpdateResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/inventory/${businessId}/movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(movementData)
      })

      if (response.ok) {
        const result = await response.json()
        return {
          success: true,
          itemId: movementData.itemId,
          itemName: movementData.itemName,
          quantityChanged: movementData.quantity,
          movementId: result.movement?.id
        }
      } else {
        const errorData = await response.json()
        return {
          success: false,
          itemId: movementData.itemId,
          itemName: movementData.itemName,
          quantityChanged: 0,
          error: errorData.error || 'Failed to record stock movement'
        }
      }
    } catch (error) {
      return {
        success: false,
        itemId: movementData.itemId,
        itemName: movementData.itemName,
        quantityChanged: 0,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  /**
   * Check low stock alerts for a business
   */
  async checkLowStockAlerts(
    businessId: string,
    headers?: Record<string, string>
  ): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/inventory/${businessId}/alerts?acknowledged=false&alertType=low_stock`, {
        headers: headers || {}
      })

      if (response.ok) {
        const data = await response.json()
        return data.alerts || []
      }

      return []
    } catch (error) {
      console.error('Failed to check low stock alerts:', error)
      return []
    }
  }

  /**
   * Generate inventory reports
   */
  async generateInventoryReport(
    businessId: string,
    reportType: 'inventory_value' | 'turnover_analysis' | 'waste_report' | 'abc_analysis' | 'reorder_report' | 'expiration_report',
    startDate?: string,
    endDate?: string,
    headers?: Record<string, string>
  ) {
    try {
      const params = new URLSearchParams({
        reportType,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      })

      const response = await fetch(`${this.baseUrl}/api/inventory/${businessId}/reports?${params}`, {
        headers: headers || {}
      })

      if (response.ok) {
        return await response.json()
      }

      throw new Error('Failed to generate report')
    } catch (error) {
      console.error('Failed to generate inventory report:', error)
      throw error
    }
  }
}

// Export singleton instance
export const inventoryIntegration = new InventoryIntegrationService()