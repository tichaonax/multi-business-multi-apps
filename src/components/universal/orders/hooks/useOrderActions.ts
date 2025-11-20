'use client'

import { useState } from 'react'
import { OrderUpdateRequest } from '../types'

interface UseOrderActionsOptions {
  businessId: string
  businessType: string
  onOrderUpdated?: (orderId: string) => void
}

interface UseOrderActionsReturn {
  updating: boolean
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<boolean>
  updateOrder: (updateData: OrderUpdateRequest) => Promise<boolean>
  printReceipt: (orderId: string) => Promise<boolean>
  cancelOrder: (orderId: string, reason?: string) => Promise<boolean>
}

export function useOrderActions({
  businessId,
  businessType,
  onOrderUpdated
}: UseOrderActionsOptions): UseOrderActionsReturn {
  const [updating, setUpdating] = useState(false)

  const updateOrderStatus = async (orderId: string, newStatus: string): Promise<boolean> => {
    try {
      setUpdating(true)

      const response = await fetch('/api/universal/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          onOrderUpdated?.(orderId)
          return true
        } else {
          console.error('Failed to update order status:', data.error)
          return false
        }
      } else {
        console.error('Failed to update order status:', response.statusText)
        return false
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      return false
    } finally {
      setUpdating(false)
    }
  }

  const updateOrder = async (updateData: OrderUpdateRequest): Promise<boolean> => {
    try {
      setUpdating(true)

      const response = await fetch('/api/universal/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          onOrderUpdated?.(updateData.id)
          return true
        } else {
          console.error('Failed to update order:', data.error)
          return false
        }
      } else {
        console.error('Failed to update order:', response.statusText)
        return false
      }
    } catch (error) {
      console.error('Error updating order:', error)
      return false
    } finally {
      setUpdating(false)
    }
  }

  const printReceipt = async (orderId: string): Promise<boolean> => {
    try {
      setUpdating(true)

      // For now, just log that printing would happen
      // In a real implementation, this would integrate with a receipt printing service
      console.log(`Printing receipt for order ${orderId} in ${businessType} business`)

      // Simulate successful printing
      await new Promise(resolve => setTimeout(resolve, 1000))

      return true
    } catch (error) {
      console.error('Error printing receipt:', error)
      return false
    } finally {
      setUpdating(false)
    }
  }

  const cancelOrder = async (orderId: string, reason?: string): Promise<boolean> => {
    try {
      setUpdating(true)

      const updateData: OrderUpdateRequest = {
        id: orderId,
        status: 'CANCELLED'
      }

      if (reason) {
        updateData.notes = reason
      }

      return await updateOrder(updateData)
    } catch (error) {
      console.error('Error cancelling order:', error)
      return false
    } finally {
      setUpdating(false)
    }
  }

  return {
    updating,
    updateOrderStatus,
    updateOrder,
    printReceipt,
    cancelOrder
  }
}