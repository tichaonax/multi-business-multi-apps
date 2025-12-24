'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { buildReceiptWithBusinessInfo } from '@/lib/printing/receipt-builder'
import { printReceipt } from '@/lib/printing/print-receipt'
import type { UniversalCartItem, CartTotals } from './useUniversalCart'
import type { ReceiptData } from '@/types/printing'

export interface BusinessInfo {
  businessId: string
  businessName: string
  businessType: string
  address?: string
  phone?: string
}

export interface PaymentProcessorOptions {
  autoPrint?: boolean
  printCopies?: number
  onSuccess?: (orderId: string, receiptData: ReceiptData) => void
  onError?: (error: Error) => void
}

export interface CheckoutData {
  paymentMethod: 'cash' | 'card' | 'mobile' | 'snap' | 'loyalty'
  amountPaid?: number
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  notes?: string
  attributes?: Record<string, any>
}

/**
 * Payment Processor Hook
 * Handles checkout, order creation, and receipt generation
 */
export function usePaymentProcessor(
  businessInfo: BusinessInfo | null,
  options: PaymentProcessorOptions = {}
) {
  const { data: session } = useSession()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null)

  /**
   * Process checkout and generate receipt
   * CRITICAL: Uses correct BusinessMembership fields (businessName, address, phone)
   */
  const processCheckout = useCallback(
    async (
      cart: UniversalCartItem[],
      totals: CartTotals,
      checkoutData: CheckoutData
    ) => {
      if (!businessInfo) {
        toast.error('No business selected')
        return null
      }

      if (cart.length === 0) {
        toast.error('Cart is empty')
        return null
      }

      setIsProcessing(true)

      try {
        console.log('🧾 [Payment] Processing checkout:', {
          businessId: businessInfo.businessId,
          businessType: businessInfo.businessType,
          itemCount: cart.length,
          total: totals.total
        })

        // Separate WiFi tokens from regular items
        const wifiTokenItems = cart.filter((item) => item.isWiFiToken)
        const regularItems = cart.filter((item) => !item.isWiFiToken)

        // Build order items
        const orderItems = regularItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          name: item.name,
          sku: item.sku,
          attributes: {
            weight: item.weight,
            size: item.size,
            color: item.color,
            projectRef: item.projectRef,
            vin: item.vin,
            hours: item.hours
          }
        }))

        // Build WiFi token requests
        const wifiTokenRequests = wifiTokenItems.map((item) => ({
          tokenConfigId: item.tokenConfigId!,
          quantity: item.quantity
        }))

        // Submit order to API
        const orderPayload = {
          businessId: businessInfo.businessId,
          businessType: businessInfo.businessType,
          items: orderItems,
          wifiTokens: wifiTokenRequests,
          subtotal: totals.subtotal,
          taxAmount: totals.tax,
          discountAmount: totals.discount,
          totalAmount: totals.total,
          paymentMethod: checkoutData.paymentMethod.toUpperCase(),
          paymentStatus: 'PAID',
          orderType: 'SALE',
          customerName: checkoutData.customerName,
          customerPhone: checkoutData.customerPhone,
          customerEmail: checkoutData.customerEmail,
          notes: checkoutData.notes,
          attributes: checkoutData.attributes,
          amountPaid: checkoutData.amountPaid || totals.total
        }

        console.log('📤 [Payment] Submitting order:', orderPayload)

        const response = await fetch('/api/universal/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create order')
        }

        const result = await response.json()

        console.log('✅ [Payment] Order created:', result.data)

        // Build receipt data with CORRECT BusinessMembership fields
        const receiptData = buildReceiptWithBusinessInfo(
          {
            id: result.data.id,
            orderNumber: result.data.orderNumber,
            orderDate: new Date().toISOString(),
            orderType: 'SALE',
            status: result.data.status,
            subtotal: totals.subtotal,
            taxAmount: totals.tax,
            discountAmount: totals.discount,
            totalAmount: totals.total,
            paymentMethod: checkoutData.paymentMethod.toUpperCase(),
            paymentStatus: result.data.paymentStatus,
            customerName: checkoutData.customerName,
            employeeName: session?.user?.name,
            employeeId: session?.user?.id,
            notes: checkoutData.notes,
            items: cart.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            })),
            wifiTokens: result.data.wifiTokens?.map((token: any) => ({
              itemName: token.itemName || token.packageName || 'WiFi Access',
              tokenCode: token.tokenCode || token.token,
              packageName: token.packageName || 'WiFi Access',
              duration: token.duration || token.durationMinutes || 0,
              bandwidthDownMb: token.bandwidthDownMb || 0,
              bandwidthUpMb: token.bandwidthUpMb || 0,
              ssid: token.ssid,
              portalUrl: token.portalUrl || 'http://192.168.4.1',
              instructions: token.instructions,
              success: token.success !== false,
              error: token.error
            })),
            attributes: checkoutData.attributes
          },
          {
            id: businessInfo.businessId,
            name: businessInfo.businessName,  // ← CRITICAL: businessName (not just name)
            type: businessInfo.businessType,
            address: businessInfo.address,    // ← CRITICAL: Direct from BusinessMembership
            phone: businessInfo.phone         // ← CRITICAL: Direct from BusinessMembership
          }
        )

        console.log('🧾 [Payment] Receipt data built:', receiptData)

        setLastReceipt(receiptData)

        // Auto-print if enabled
        if (options.autoPrint) {
          const printCopies = options.printCopies || 1
          for (let i = 0; i < printCopies; i++) {
            await printReceipt(receiptData)
          }
          toast.success(`Receipt printed (${printCopies} ${printCopies === 1 ? 'copy' : 'copies'})`)
        }

        // Call success callback
        if (options.onSuccess) {
          options.onSuccess(result.data.id, receiptData)
        }

        toast.success('Order completed successfully!')

        return {
          orderId: result.data.id,
          receiptData
        }
      } catch (error) {
        console.error('❌ [Payment] Checkout error:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to process payment')

        if (options.onError) {
          options.onError(error instanceof Error ? error : new Error('Unknown error'))
        }

        return null
      } finally {
        setIsProcessing(false)
      }
    },
    [businessInfo, session, options]
  )

  /**
   * Reprint last receipt
   */
  const reprintLastReceipt = useCallback(async () => {
    if (!lastReceipt) {
      toast.error('No receipt to reprint')
      return
    }

    try {
      // Add reprint metadata
      const reprintData: ReceiptData = {
        ...lastReceipt,
        isReprint: true,
        originalPrintDate: lastReceipt.transactionDate,
        reprintedBy: session?.user?.name || 'Unknown',
        transactionDate: new Date() // Update print time
      }

      await printReceipt(reprintData)
      toast.success('Receipt reprinted')
    } catch (error) {
      console.error('❌ [Payment] Reprint error:', error)
      toast.error('Failed to reprint receipt')
    }
  }, [lastReceipt, session])

  return {
    processCheckout,
    reprintLastReceipt,
    isProcessing,
    lastReceipt
  }
}
