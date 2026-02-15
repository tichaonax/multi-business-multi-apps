'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { buildReceiptWithBusinessInfo } from '@/lib/printing/receipt-builder'
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
 * Handles checkout, order creation, and receipt generation.
 * Printing is handled by the page via UnifiedReceiptPreviewModal.
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

        // Build order items - include ALL items (regular + WiFi tokens)
        const orderItems = cart.map((item) => {
          if (item.isWiFiToken) {
            const isR710 = item.id.startsWith('r710_')
            return {
              productVariantId: null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: 0,
              attributes: {
                ...(isR710 ? { r710Token: true } : { wifiToken: true }),
                tokenConfigId: item.tokenConfigId,
                productName: item.name,
                packageName: item.packageName,
                duration: item.duration,
                bandwidthDownMb: item.bandwidthDownMb,
                bandwidthUpMb: item.bandwidthUpMb
              }
            }
          }

          if (item.isService) {
            return {
              productVariantId: item.variantId || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: 0,
              attributes: {
                businessService: true,
                productName: item.name,
                hours: item.hours
              }
            }
          }

          // Bale items (clothing) — no productVariantId
          if (item.baleId) {
            return {
              productVariantId: null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: 0,
              attributes: {
                baleId: item.baleId,
                productName: item.name,
                condition: item.condition,
                isBOGOFree: item.isBOGOFree || false
              }
            }
          }

          return {
            productVariantId: item.variantId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: 0,
            attributes: {
              productId: item.productId,
              productName: item.name,
              categoryId: item.categoryId,
              weight: item.weight,
              size: item.size,
              color: item.color,
              projectRef: item.projectRef,
              vin: item.vin,
              hours: item.hours
            }
          }
        })

        // Submit order to API
        const orderPayload = {
          businessId: businessInfo.businessId,
          businessType: businessInfo.businessType,
          items: orderItems,
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

        // Check for failed R710 tokens and warn user
        const failedR710Tokens = result.data.r710Tokens?.filter((t: any) => t.success === false) || []
        if (failedR710Tokens.length > 0) {
          const errorMsg = failedR710Tokens[0]?.error || 'No available tokens'
          toast.warning(`WiFi token issue: ${errorMsg}. Please request more tokens.`, { duration: 8000 })
        }

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
            r710Tokens: result.data.r710Tokens?.map((token: any) => ({
              itemName: token.itemName || token.packageName || 'R710 WiFi Access',
              username: token.username,
              password: token.password,
              packageName: token.packageName || 'R710 WiFi Access',
              durationValue: token.durationValue || 0,
              durationUnit: token.durationUnit || '',
              deviceLimit: token.deviceLimit || 1,
              ssid: token.ssid,
              expiresAt: token.expiresAt,
              success: token.success !== false,
              error: token.error
            })),
            attributes: checkoutData.attributes
          },
          {
            id: businessInfo.businessId,
            name: businessInfo.businessName,
            type: businessInfo.businessType,
            address: businessInfo.address,
            phone: businessInfo.phone
          }
        )

        console.log('🧾 [Payment] Receipt data built:', receiptData)

        setLastReceipt(receiptData)

        // Call success callback (page handles printing via modal)
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

  return {
    processCheckout,
    isProcessing,
    lastReceipt
  }
}
