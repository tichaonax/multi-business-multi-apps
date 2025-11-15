'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext, useBusinessFeatures } from './business-context'
import { useAlert } from '@/components/ui/confirm-modal'
import { UniversalProduct } from './product-card'
import { BarcodeScanner } from './barcode-scanner'
import { ReceiptPreview } from '@/components/printing/receipt-preview'
import { usePrinterPermissions } from '@/hooks/use-printer-permissions'
import { usePrintJobMonitor } from '@/hooks/use-print-job-monitor'
import type { ReceiptData, NetworkPrinter } from '@/types/printing'

interface CartItem {
  productId: string
  variantId?: string
  product: UniversalProduct
  variant?: any
  quantity: number
  unitPrice: number
  discountAmount: number
  totalPrice: number
  scannedBarcode?: {
    code: string
    type: string
    isPrimary: boolean
    isUniversal: boolean
    label?: string
  }
}

interface UniversalPOSProps {
  businessId: string
  employeeId?: string
  onOrderComplete?: (orderId: string) => void
}

export function UniversalPOS({ businessId, employeeId, onOrderComplete }: UniversalPOSProps) {
  const { formatCurrency, config } = useBusinessContext()
  const customAlert = useAlert()
  const businessFeatures = useBusinessFeatures()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerInfo, setCustomerInfo] = useState<{
    id?: string
    name: string
    phone?: string
    email?: string
  }>({ name: '' })
  const [discountAmount, setDiscountAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [completedOrderReceipt, setCompletedOrderReceipt] = useState<ReceiptData | null>(null)

  // Printing hooks
  const { canPrintReceipts } = usePrinterPermissions()
  const { monitorJob, notifyJobQueued } = usePrintJobMonitor()
  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
  const taxRate = config?.general?.taxEnabled ? (config?.general?.taxRate || 0) / 100 : 0
  const taxAmount = subtotal * taxRate
  const totalAmount = subtotal + taxAmount - discountAmount

  const addToCart = (product: UniversalProduct, variantId?: string, quantity = 1, scannedBarcode?: { code: string; type: string; isPrimary: boolean; isUniversal: boolean; label?: string }) => {
    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined
    const unitPrice = variant?.price ?? product.basePrice

    setCart(currentCart => {
      const existingItemIndex = currentCart.findIndex(
        item => item.productId === product.id && item.variantId === variantId
      )

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedCart = [...currentCart]
        const existingItem = updatedCart[existingItemIndex]
        const newQuantity = existingItem.quantity + quantity

        updatedCart[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          totalPrice: (unitPrice * newQuantity) - existingItem.discountAmount
        }

        return updatedCart
      } else {
        // Add new item
        const newItem: CartItem = {
          productId: product.id,
          variantId,
          product,
          variant,
          quantity,
          unitPrice,
          discountAmount: 0,
          totalPrice: unitPrice * quantity,
          scannedBarcode
        }

        return [...currentCart, newItem]
      }
    })
  }

  const updateCartItem = (index: number, updates: Partial<CartItem>) => {
    setCart(currentCart => {
      const updatedCart = [...currentCart]
      const item = updatedCart[index]

      updatedCart[index] = {
        ...item,
        ...updates,
        totalPrice: ((updates.unitPrice ?? item.unitPrice) * (updates.quantity ?? item.quantity)) - (updates.discountAmount ?? item.discountAmount)
      }

      return updatedCart
    })
  }

  const removeFromCart = (index: number) => {
    setCart(currentCart => currentCart.filter((_, i) => i !== index))
  }

  const clearCart = () => {
    setCart([])
    setCustomerInfo({ name: '' })
    setDiscountAmount(0)
    setError(null)
  }

  // Handle receipt printing
  const handlePrintReceipt = async (printer: NetworkPrinter) => {
    if (!completedOrderReceipt) return

    try {
      const response = await fetch('/api/print/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId: printer.id,
          businessId,
          ...completedOrderReceipt
        })
      })

      if (!response.ok) {
        throw new Error('Failed to queue print job')
      }

      const data = await response.json()
      notifyJobQueued(data.printJob.id, printer.printerName)
      monitorJob({ jobId: data.printJob.id })

      setShowReceiptPreview(false)
      setCompletedOrderReceipt(null)

      // Show success message
      await customAlert({ title: 'Order completed', description: `Order ${completedOrderReceipt.receiptNumber} completed successfully!` })
    } catch (error) {
      console.error('Error printing receipt:', error)
      await customAlert({ title: 'Print error', description: 'Failed to print receipt. Order was still completed successfully.' })
    }
  }

  const processOrder = async () => {
    if (cart.length === 0) {
      setError('Cart is empty')
      return
    }

    if (!customerInfo.name.trim()) {
      setError('Customer name is required')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Create customer if needed
      let customerId = customerInfo.id
      if (!customerId && customerInfo.name.trim()) {
        const customerResponse = await fetch('/api/universal/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            name: customerInfo.name.trim(),
            phone: customerInfo.phone,
            email: customerInfo.email,
            customerType: 'INDIVIDUAL',
            businessType: config?.businessType || 'retail'
          })
        })

        const customerData = await customerResponse.json()
        if (customerResponse.ok && customerData.success) {
          customerId = customerData.data.id
        }
      }

      // Create order
      const orderData = {
        businessId,
        customerId,
        employeeId,
        orderType: businessFeatures.isRestaurant() ? 'SERVICE' : 'SALE',
        paymentMethod,
        discountAmount,
        taxAmount,
        businessType: config?.businessType || 'retail',
        attributes: {
          posOrder: true,
          customerInfo: customerInfo.name
        },
        items: cart.map(item => ({
          productVariantId: item.variantId || item.product.variants?.[0]?.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          attributes: {
            productName: (item as any).productName || item.product?.name || (item as any).name || 'Item',
            variantName: item.variant?.name,
            ...(item.scannedBarcode && { scannedBarcode: item.scannedBarcode })
          }
        }))
      }

      const response = await fetch('/api/universal/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process order')
      }

      if (result.success) {
        // Create receipt data
        const receiptData: ReceiptData = {
          receiptNumber: result.data.orderNumber || 'N/A',
          globalId: result.data.id,
          businessName: config?.businessName || 'Business',
          businessType: config?.businessType as any || 'retail',
          businessAddress: config?.general?.address,
          businessPhone: config?.general?.phone,
          businessTaxId: config?.general?.taxId,
          items: cart.map(item => ({
            name: item.product?.name || 'Item',
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.totalPrice
          })),
          subtotal,
          tax: taxAmount,
          discount: discountAmount,
          total: totalAmount,
          paymentMethod,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          date: new Date(),
          cashierName: employeeId ? 'Employee' : undefined,
          businessSpecificData: {
            orderType: orderData.orderType
          }
        }

        clearCart()
        onOrderComplete?.(result.data.id)

        // Show receipt preview if auto-print or if user has print permission
        if (canPrintReceipts && autoPrintReceipt) {
          setCompletedOrderReceipt(receiptData)
          setShowReceiptPreview(true)
        } else {
          // Show success message
          await customAlert({ title: 'Order completed', description: `Order ${result.data.orderNumber} completed successfully!` })
        }
      } else {
        throw new Error(result.error || 'Order processing failed')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process order')
    } finally {
      setIsProcessing(false)
    }
  }

  const getBusinessLabels = () => {
    if (businessFeatures.isRestaurant()) {
      return {
        title: 'Restaurant POS',
        addButton: 'Add to Order',
        processButton: 'Send to Kitchen',
        customer: 'Table/Customer',
        items: 'Order Items'
      }
    }

    if (businessFeatures.isConsulting()) {
      return {
        title: 'Service Booking',
        addButton: 'Book Service',
        processButton: 'Confirm Booking',
        customer: 'Client',
        items: 'Services'
      }
    }

    return {
      title: 'Point of Sale',
      addButton: 'Add to Cart',
      processButton: 'Process Sale',
      customer: 'Customer',
      items: 'Cart Items'
    }
  }

  const labels = getBusinessLabels()

  return (
    <div className="card rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-primary">{labels.title}</h2>
        <p className="text-sm text-secondary">
          {config?.businessName} - {config?.businessType}
        </p>
      </div>

      <div className="flex">
        {/* Left Panel - Cart */}
        <div className="flex-1 p-4">
          {/* Customer Info */}
          <div className="mb-4">
            <h3 className="font-semibold text-primary mb-2">{labels.customer} Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Customer Name *"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={customerInfo.phone || ''}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="input-field"
              />
              <input
                type="email"
                placeholder="Email"
                value={customerInfo.email || ''}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          {/* Barcode Scanner */}          <BarcodeScanner            onProductScanned={(product, variantId, scannedBarcode) => addToCart(product, variantId, 1, scannedBarcode)}            businessId={businessId}            showScanner={showBarcodeScanner}            onToggleScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}          />
          {/* Cart Items */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-primary">{labels.items} ({cart.length})</h3>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-secondary">
                <div className="text-4xl mb-2">🛒</div>
                <p>No items in {businessFeatures.isRestaurant() ? 'order' : 'cart'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={`${item.productId}-${item.variantId || 'default'}`} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-primary">{(item as any).productName || item.product?.name || (item as any).name || 'Item'}</h4>
                      {item.variant?.name && (
                        <p className="text-sm text-secondary">{item.variant.name}</p>
                      )}
                      <p className="text-sm text-secondary">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateCartItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-16 px-2 py-1 text-center input-field"
                      />
                      <span className="font-medium text-primary">
                        {formatCurrency(item.totalPrice)}
                      </span>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {config?.general?.taxEnabled && (
                  <div className="flex justify-between">
                    <span>Tax ({config.general.taxRate}%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Discount:</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-right input-field"
                  />
                </div>

                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          {cart.length > 0 && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  {businessFeatures.isConsulting() && <option value="NET_30">Net 30</option>}
                </select>
              </div>

              {/* Auto-print receipt option */}
              {canPrintReceipts && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoPrintReceipt"
                    checked={autoPrintReceipt}
                    onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="autoPrintReceipt" className="text-sm font-medium text-primary">
                    🧾 Print receipt after checkout
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Process Button */}
          {cart.length > 0 && (
            <button
              onClick={processOrder}
              disabled={isProcessing || !customerInfo.name.trim()}
              className="w-full mt-4 bg-primary text-white px-4 py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'Processing...' : labels.processButton}
            </button>
          )}
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {completedOrderReceipt && (
        <ReceiptPreview
          isOpen={showReceiptPreview}
          onClose={() => {
            setShowReceiptPreview(false)
            setCompletedOrderReceipt(null)
            // Show success message when user closes without printing
            customAlert({ title: 'Order completed', description: `Order ${completedOrderReceipt.receiptNumber} completed successfully!` })
          }}
          receiptData={completedOrderReceipt}
          onPrint={handlePrintReceipt}
        />
      )}
    </div>
  )
}

// Export a simplified hook for adding products to cart from other components
export function usePOSCart() {
  // This would be implemented with a global state manager like Zustand or Context
  // For now, this is just a placeholder to show the concept
  const addToCart = (product: UniversalProduct, variantId?: string, quantity = 1) => {
    // Implementation would depend on global state management solution
    console.log('Add to cart:', { product, variantId, quantity })
  }

  return { addToCart }
}