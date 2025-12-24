/**
 * Unified Receipt Print Manager
 *
 * Central service for all receipt printing across all business types.
 * Provides consistent interface and handles preview, auto-print, dual receipts.
 *
 * Design Decisions:
 * - Use grocery receipt format as standard base
 * - All business types use API-based printing (no browser print)
 * - Restaurant supports dual receipts: business copy (always) + customer copy (optional)
 * - Single preview modal for all business types
 * - Centralized error handling and logging
 */

import { printReceipt, type PrintReceiptResult } from '@/lib/printing/print-receipt'
import type { ReceiptData, BusinessType } from '@/types/printing'

export interface PrintReceiptOptions {
  /** Auto-print without showing preview modal */
  autoPrint?: boolean

  /** Specific printer ID to use (optional) */
  printerId?: string

  /** Number of copies to print (default: 1) */
  copies?: number

  /** For restaurant: print customer copy in addition to business copy */
  printCustomerCopy?: boolean

  /** Success callback with print job ID */
  onSuccess?: (jobId: string, receiptType: 'business' | 'customer') => void

  /** Error callback */
  onError?: (error: Error, receiptType?: 'business' | 'customer') => void

  /** Show preview modal callback (for non-auto-print) */
  onShowPreview?: (receiptData: ReceiptData, options: PrintReceiptOptions) => void
}

export interface DualReceiptResult {
  businessCopy: PrintReceiptResult
  customerCopy?: PrintReceiptResult
}

/**
 * Unified Receipt Print Manager
 * Single entry point for all receipt printing
 */
export class ReceiptPrintManager {
  /**
   * Print receipt with unified flow
   *
   * @param receiptData - Standard receipt data structure
   * @param businessType - Type of business (grocery, restaurant, hardware, clothing)
   * @param options - Print options including dual receipt support
   * @returns Print result(s)
   */
  static async printReceipt(
    receiptData: ReceiptData,
    businessType: BusinessType,
    options: PrintReceiptOptions = {}
  ): Promise<DualReceiptResult> {
    console.log(`📄 [ReceiptPrintManager] Printing ${businessType} receipt`, {
      receiptNumber: receiptData.receiptNumber,
      autoPrint: options.autoPrint,
      printCustomerCopy: options.printCustomerCopy,
    })

    // Validate receipt data
    this.validateReceiptData(receiptData)

    // If not auto-print, show preview modal
    if (!options.autoPrint && options.onShowPreview) {
      console.log('👁️  [ReceiptPrintManager] Showing preview modal')
      options.onShowPreview(receiptData, options)

      // Return empty result - actual printing happens from modal
      return {
        businessCopy: { success: true, jobId: 'pending-preview' }
      }
    }

    // Auto-print flow
    return await this.executePrint(receiptData, businessType, options)
  }

  /**
   * Execute the actual print operation(s)
   * Handles dual receipts for restaurant
   */
  private static async executePrint(
    receiptData: ReceiptData,
    businessType: BusinessType,
    options: PrintReceiptOptions
  ): Promise<DualReceiptResult> {
    const result: DualReceiptResult = {
      businessCopy: { success: false, jobId: '' }
    }

    try {
      // ALWAYS print business copy
      console.log('🖨️  [ReceiptPrintManager] Printing BUSINESS copy')

      const businessReceiptData = {
        ...receiptData,
        receiptType: 'business' as const,
        // Business copy gets full details
      }

      result.businessCopy = await printReceipt(businessReceiptData, {
        printerId: options.printerId,
        copies: 1, // Always 1 copy for business records
        autoPrint: true,
      })

      if (!result.businessCopy.success) {
        throw new Error(result.businessCopy.error || 'Business copy print failed')
      }

      console.log('✅ [ReceiptPrintManager] Business copy printed:', result.businessCopy.jobId)

      // Call success callback for business copy
      if (options.onSuccess) {
        options.onSuccess(result.businessCopy.jobId!, 'business')
      }

      // RESTAURANT ONLY: Print customer copy if requested
      if (businessType === 'restaurant' && options.printCustomerCopy) {
        console.log('🖨️  [ReceiptPrintManager] Printing CUSTOMER copy')

        const customerReceiptData = {
          ...receiptData,
          receiptType: 'customer' as const,
          // Customer copy can have simplified details if needed
        }

        result.customerCopy = await printReceipt(customerReceiptData, {
          printerId: options.printerId,
          copies: options.copies || 1, // Customer copy uses the copies setting
          autoPrint: true,
        })

        if (result.customerCopy.success) {
          console.log('✅ [ReceiptPrintManager] Customer copy printed:', result.customerCopy.jobId)

          if (options.onSuccess) {
            options.onSuccess(result.customerCopy.jobId!, 'customer')
          }
        } else {
          console.warn('⚠️  [ReceiptPrintManager] Customer copy failed:', result.customerCopy.error)

          // Don't fail entire operation if customer copy fails
          // Business copy already printed successfully
          if (options.onError) {
            options.onError(new Error(result.customerCopy.error || 'Customer copy failed'), 'customer')
          }
        }
      }

      return result

    } catch (error) {
      console.error('❌ [ReceiptPrintManager] Print failed:', error)

      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error('Print failed'))
      }

      throw error
    }
  }

  /**
   * Validate receipt data before printing
   * Ensures all required fields are present
   */
  private static validateReceiptData(receiptData: ReceiptData): void {
    const required = [
      'businessName',
      'receiptNumber',
      'transactionDate',
      'items',
      'total',
      'paymentMethod'
    ]

    for (const field of required) {
      if (!(field in receiptData) || receiptData[field as keyof ReceiptData] === undefined) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Validate items array
    if (!Array.isArray(receiptData.items) || receiptData.items.length === 0) {
      throw new Error('Receipt must have at least one item')
    }

    // Validate total is a number
    if (typeof receiptData.total !== 'number' || receiptData.total < 0) {
      throw new Error('Invalid total amount')
    }
  }

  /**
   * Reprint existing receipt
   * Used from receipt history/search
   */
  static async reprintReceipt(
    receiptId: string,
    businessType: BusinessType,
    options: PrintReceiptOptions = {}
  ): Promise<DualReceiptResult> {
    console.log(`🔄 [ReceiptPrintManager] Reprinting receipt: ${receiptId}`)

    try {
      // Fetch receipt data from API
      const response = await fetch(`/api/receipts/${receiptId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch receipt for reprint')
      }

      const { receipt } = await response.json()

      if (!receipt || !receipt.receiptData) {
        throw new Error('Receipt data not found')
      }

      // Print using existing receipt data
      return await this.printReceipt(receipt.receiptData, businessType, {
        ...options,
        autoPrint: true, // Reprints always auto-print
      })

    } catch (error) {
      console.error('❌ [ReceiptPrintManager] Reprint failed:', error)

      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error('Reprint failed'))
      }

      throw error
    }
  }

  /**
   * Get print preferences from localStorage
   * Returns default preferences if not found
   */
  static getPrintPreferences() {
    if (typeof window === 'undefined') {
      return this.getDefaultPreferences()
    }

    try {
      const stored = localStorage.getItem('print-preferences')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load print preferences:', error)
    }

    return this.getDefaultPreferences()
  }

  /**
   * Save print preferences to localStorage
   */
  static savePrintPreferences(preferences: any) {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem('print-preferences', JSON.stringify(preferences))
      console.log('✅ Print preferences saved')
    } catch (error) {
      console.error('Failed to save print preferences:', error)
    }
  }

  /**
   * Default print preferences
   */
  private static getDefaultPreferences() {
    return {
      autoPrintReceipt: false,
      printCustomerCopy: true, // Restaurant: print customer copy by default
      defaultPrinterId: null,
      defaultCopies: 1,
    }
  }
}

/**
 * React hook for using ReceiptPrintManager
 */
export function useReceiptPrinting() {
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
  const [pendingReceipt, setPendingReceipt] = React.useState<{
    data: ReceiptData
    businessType: BusinessType
    options: PrintReceiptOptions
  } | null>(null)

  const printReceipt = async (
    receiptData: ReceiptData,
    businessType: BusinessType,
    options: PrintReceiptOptions = {}
  ) => {
    return await ReceiptPrintManager.printReceipt(receiptData, businessType, {
      ...options,
      onShowPreview: (data, opts) => {
        setPendingReceipt({ data, businessType, options: opts })
        setIsPreviewOpen(true)
      }
    })
  }

  const closePreview = () => {
    setIsPreviewOpen(false)
    setPendingReceipt(null)
  }

  const confirmPrint = async () => {
    if (!pendingReceipt) return

    const result = await ReceiptPrintManager.executePrint(
      pendingReceipt.data,
      pendingReceipt.businessType,
      pendingReceipt.options
    )

    closePreview()
    return result
  }

  return {
    printReceipt,
    reprintReceipt: ReceiptPrintManager.reprintReceipt,
    isPreviewOpen,
    pendingReceipt,
    closePreview,
    confirmPrint,
  }
}

// Re-export for convenience
import React from 'react'
export type { PrintReceiptOptions, DualReceiptResult }
