'use client'

import { useState, useEffect, useRef } from 'react'
import { Gift, X, Tag } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useBusinessContext, useBusinessFeatures } from './business-context'
import { useAlert } from '@/components/ui/confirm-modal'
import { UniversalProduct } from './product-card'
import { BarcodeScanner } from './barcode-scanner'
import { ReceiptPreview } from '@/components/printing/receipt-preview'
import { CustomerLookup } from '@/components/pos/customer-lookup'
import { useCustomerRewards } from '@/app/universal/pos/hooks/useCustomerRewards'
import type { CustomerReward } from '@/app/universal/pos/hooks/useCustomerRewards'
import { AddCustomerModal } from '@/components/customers/add-customer-modal'
import { usePrinterPermissions } from '@/hooks/use-printer-permissions'
import { usePrintJobMonitor } from '@/hooks/use-print-job-monitor'
import { useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
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
  terminalId?: string
  onOrderComplete?: (orderId: string) => void
}

export function UniversalPOS({ businessId, employeeId, terminalId, onOrderComplete }: UniversalPOSProps) {
  const { formatCurrency, config } = useBusinessContext()
  const customAlert = useAlert()
  const businessFeatures = useBusinessFeatures()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string
    customerNumber: string
    name: string
    email?: string
    phone?: string
    customerType: string
  } | null>(null)
  const [customerInfo, setCustomerInfo] = useState<{
    id?: string
    name: string
    phone?: string
    email?: string
  }>({ name: '' })
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [appliedReward, setAppliedReward] = useState<CustomerReward | null>(null)
  const [skipRewardThisTime, setSkipRewardThisTime] = useState(false)
  const autoAppliedForRef = useRef<string | null>(null)
  const { rewards: customerRewards, usedRewards: customerUsedRewards } = useCustomerRewards(
    selectedCustomer?.id ?? null,
    businessId ?? null
  )
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH')
  const [cashTendered, setCashTendered] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoAddProcessed, setAutoAddProcessed] = useState<string | null>(null)

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [completedOrderReceipt, setCompletedOrderReceipt] = useState<ReceiptData | null>(null)

  // Printing hooks
  const { canPrintReceipts } = usePrinterPermissions()
  const { monitorJob, notifyJobQueued } = usePrintJobMonitor()

  // Customer Display Sync (only if terminalId is provided)
  const { send: sendToDisplay } = useCustomerDisplaySync({
    businessId,
    terminalId: terminalId || '',
    mode: SyncMode.BROADCAST, // Force BroadcastChannel for same-origin communication
    autoConnect: !!terminalId,
    onError: (error) => console.error('[Customer Display] Sync error:', error)
  })

  // Track if cart has been loaded from localStorage to prevent overwriting on mount
  const [cartLoaded, setCartLoaded] = useState(false)

  // Load cart from localStorage on mount (per-business persistence)
  useEffect(() => {
    if (!businessId) return

    try {
      const savedCart = localStorage.getItem(`cart-${businessId}`)
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart)
        setCart(parsedCart)
        console.log('✅ Cart restored from localStorage:', parsedCart.length, 'items')
      } else {
        // CRITICAL: Clear cart when switching to a business with no saved cart
        setCart([])
        console.log('🔄 Switched to business with no saved cart - cart cleared')
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error)
      setCart([]) // Clear cart on error
    } finally {
      setCartLoaded(true)
    }
  }, [businessId])

  // Save cart to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (!businessId || !cartLoaded) return

    try {
      localStorage.setItem(`cart-${businessId}`, JSON.stringify(cart))
      console.log('💾 Cart saved to localStorage:', cart.length, 'items')
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error)
    }
  }, [cart, businessId, cartLoaded])

  // Auto-apply first available reward when customer is selected
  useEffect(() => {
    if (!selectedCustomer || appliedReward || customerRewards.length === 0) return
    if (autoAppliedForRef.current === selectedCustomer.id) return
    autoAppliedForRef.current = selectedCustomer.id
    setAppliedReward(customerRewards[0])
  }, [customerRewards, selectedCustomer, appliedReward])

  // Broadcast cart state to customer display
  const broadcastCartState = (cartItems: CartItem[]) => {
    if (!terminalId) return // Skip if no terminal ID

    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)

    // Get tax config from business config (at root level, not nested in general)
    const taxIncludedInPrice = config?.taxIncludedInPrice ?? true
    const taxRate = config?.taxRate ?? 0

    // Calculate tax based on business config
    let taxAmount: number
    let total: number

    if (taxIncludedInPrice) {
      // Tax is embedded in prices - calculate for display
      taxAmount = subtotal * (taxRate / (100 + taxRate))
      total = subtotal - discountAmount // Total equals subtotal (tax already included)
    } else {
      // Tax not included - add to subtotal
      taxAmount = subtotal * (taxRate / 100)
      total = subtotal + taxAmount - discountAmount
    }

    sendToDisplay('CART_STATE', {
      items: cartItems.map(item => ({
        id: item.productId,
        name: item.product?.name || 'Item',
        quantity: item.quantity,
        price: item.unitPrice,
        variant: item.variant?.name || ''
      })),
      subtotal,
      tax: taxAmount,
      total,
      rewardPending: !!appliedReward && !skipRewardThisTime,
      rewardAmount: (appliedReward && !skipRewardThisTime) ? Number(appliedReward.rewardAmount) : undefined
    })
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)

  // Get tax config from business config (at root level, not nested in general)
  const taxIncludedInPrice = config?.taxIncludedInPrice ?? true
  const taxRate = config?.taxRate ?? 0

  // Calculate tax and total based on config
  const rewardCredit = (appliedReward && !skipRewardThisTime) ? Math.min(Number(appliedReward.rewardAmount), subtotal) : 0
  let taxAmount: number
  let totalAmount: number

  if (taxIncludedInPrice) {
    // Tax is embedded in prices
    taxAmount = subtotal * (taxRate / (100 + taxRate))
    totalAmount = Math.max(0, subtotal - discountAmount - rewardCredit)
  } else {
    // Tax not included - add to subtotal
    taxAmount = subtotal * (taxRate / 100)
    totalAmount = Math.max(0, subtotal + taxAmount - discountAmount - rewardCredit)
  }

  const addToCart = (product: UniversalProduct, variantId?: string, quantity = 1, scannedBarcode?: { code: string; type: string; isPrimary: boolean; isUniversal: boolean; label?: string }) => {
    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined
    const unitPrice = variant?.price ?? product.basePrice

    // Prevent adding $0 items to cart (except WiFi tokens)
    const isWiFiToken = product.attributes?.isWiFiToken === true || product.name?.toLowerCase().includes('wifi')
    if (!isWiFiToken && (!unitPrice || unitPrice <= 0)) {
      alert('Cannot add product with $0 price to cart. Please set a price first or use discounts for price reductions.')
      return
    }

    setCart(currentCart => {
      const existingItemIndex = currentCart.findIndex(
        item => item.productId === product.id && item.variantId === variantId
      )

      let newCart: CartItem[]
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

        newCart = updatedCart
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

        newCart = [...currentCart, newItem]
      }

      // Broadcast updated cart to customer display
      broadcastCartState(newCart)
      return newCart
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

      // Broadcast updated cart to customer display
      broadcastCartState(updatedCart)
      return updatedCart
    })
  }

  const removeFromCart = (index: number) => {
    setCart(currentCart => {
      const newCart = currentCart.filter((_, i) => i !== index)
      // Broadcast updated cart to customer display
      broadcastCartState(newCart)
      return newCart
    })
  }

  const clearCart = () => {
    setCart([])
    setSelectedCustomer(null)
    setCustomerInfo({ name: '' })
    setDiscountAmount(0)
    setAppliedReward(null)
    setSkipRewardThisTime(false)
    autoAppliedForRef.current = null
    setError(null)

    // Send CLEAR_CART to customer display
    if (terminalId) {
      sendToDisplay('CLEAR_CART', {
        subtotal: 0,
        tax: 0,
        total: 0
      })
    }
  }

  // Auto-add product from query parameters (from barcode scanner navigation or inventory)
  useEffect(() => {
    const addProductId = searchParams?.get('addProduct')
    const variantId = searchParams?.get('variantId')
    const queryBusinessId = searchParams?.get('businessId')
    const autoAdd = searchParams?.get('autoAdd')

    // Only process if addProduct parameter exists and we haven't already processed THIS specific product
    if (addProductId && autoAddProcessed !== addProductId) {
      console.log('🔄 Processing auto-add for product:', addProductId)
      setAutoAddProcessed(addProductId)

      // Fetch the product and optionally add it to cart
      const fetchAndAddProduct = async () => {
        try {
          // Use businessId from query params (the business where product was found)
          // Fall back to current businessId if not in query
          const targetBusinessId = queryBusinessId || businessId

          const response = await fetch(`/api/admin/products/${addProductId}?businessId=${targetBusinessId}`)
          if (!response.ok) {
            console.error('❌ Failed to fetch product for auto-add')
            // Clean up URL even on error
            const currentPath = window.location.pathname
            router.replace(currentPath)
            return
          }

          const data = await response.json()
          if (data.success && data.product) {
            console.log('✅ Product fetched:', data.product.name)
            // Auto-add to cart only if autoAdd=true (for "each" unit type items)
            // Otherwise, the product is just loaded but not added (user can add manually)
            if (autoAdd === 'true') {
              console.log('➕ Adding to cart')
              addToCart(data.product, variantId || undefined, 1)
            }

            // Clean up the URL
            const currentPath = window.location.pathname
            router.replace(currentPath)
          } else {
            console.error('❌ Product not found in response')
            const currentPath = window.location.pathname
            router.replace(currentPath)
          }
        } catch (err) {
          console.error('❌ Error auto-adding product:', err)
          const currentPath = window.location.pathname
          router.replace(currentPath)
        }
      }

      fetchAndAddProduct()
    }
  }, [searchParams, autoAddProcessed, businessId, router])

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

    // Customer is optional (walk-in customers allowed)

    setIsProcessing(true)
    setError(null)

    try {
      // Use selected customer ID if available (walk-in customers have null ID)
      const customerId = selectedCustomer?.id || null

      // Create order
      const orderData = {
        businessId,
        customerId,
        employeeId,
        orderType: businessFeatures.isRestaurant() ? 'SERVICE' : 'SALE',
        paymentMethod,
        discountAmount: discountAmount + rewardCredit,
        taxAmount,
        rewardId: (appliedReward && !skipRewardThisTime) ? appliedReward.id : undefined,
        businessType: config?.businessType || 'retail',
        attributes: {
          posOrder: true,
          customerInfo: selectedCustomer?.name || 'Walk-in Customer',
          cashTendered: paymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) : undefined,
          change: paymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) - totalAmount : undefined
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
        // Create receipt data with business configuration
        const receiptData: ReceiptData = {
          receiptNumber: result.data.orderNumber || 'N/A',
          globalId: result.data.id,
          businessName: config?.businessName || 'Business',
          businessType: config?.businessType as any || 'retail',
          businessAddress: config?.address || config?.general?.address,
          businessPhone: config?.phone || config?.general?.phone,
          businessTaxId: config?.general?.taxId,
          items: cart.map(item => ({
            name: item.product?.name || 'Item',
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.totalPrice
          })),
          subtotal,
          tax: taxAmount,
          discount: discountAmount + rewardCredit,
          discountLabel: rewardCredit > 0 ? `Reward (${appliedReward!.couponCode})` : undefined,
          total: totalAmount,
          paymentMethod,
          cashTendered: paymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) : undefined,
          change: paymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) - totalAmount : undefined,
          customerName: selectedCustomer?.name || 'Walk-in Customer',
          customerPhone: customerInfo.phone,
          date: new Date(),
          cashierName: employeeId ? 'Employee' : undefined,
          // Receipt configuration from business
          returnPolicy: config?.receiptReturnPolicy || undefined,
          taxIncludedInPrice: config?.taxIncludedInPrice ?? true,
          taxRate: config?.taxRate ? Number(config.taxRate) : undefined,
          taxLabel: config?.taxLabel || undefined,
          businessSpecificData: {
            orderType: orderData.orderType
          }
        }

        clearCart()
        setCashTendered('')

        // Send CLEAR_CART to customer display after successful checkout
        if (terminalId) {
          sendToDisplay('CLEAR_CART', {
            subtotal: 0,
            tax: 0,
            total: 0
          })
        }

        onOrderComplete?.(result.data.id)

        // Always show receipt preview with print option
        setCompletedOrderReceipt(receiptData)
        setShowReceiptPreview(true)
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
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-850">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{labels.title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {config?.businessName} - {config?.businessType}
        </p>
      </div>

      <div className="flex">
        {/* Left Panel - Cart */}
        <div className="flex-1 p-6">
          {/* Customer Lookup */}
          <div className="mb-4">
            <CustomerLookup
              businessId={businessId}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={(customer) => {
                setSelectedCustomer(customer)
                setAppliedReward(null)
                setSkipRewardThisTime(false)
                autoAppliedForRef.current = null
              }}
              onCreateCustomer={() => setShowAddCustomerModal(true)}
              allowWalkIn={true}
            />

            {/* Applied Reward Banner */}
            {appliedReward && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-green-800 dark:text-green-300">
                        {Number(appliedReward.rewardAmount) > 0
                          ? `$${Number(appliedReward.rewardAmount).toFixed(2)} credit`
                          : 'Reward'} available
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-500 font-mono">{appliedReward.couponCode}</div>
                    </div>
                  </div>
                  <button onClick={() => setAppliedReward(null)} className="text-green-500 hover:text-green-700 dark:hover:text-green-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer px-1">
                  <input
                    type="checkbox"
                    checked={skipRewardThisTime}
                    onChange={e => setSkipRewardThisTime(e.target.checked)}
                    className="rounded w-3.5 h-3.5"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Don&apos;t apply reward this time</span>
                </label>
              </div>
            )}

            {/* Available Rewards */}
            {selectedCustomer && !appliedReward && customerRewards.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Available Rewards</p>
                {customerRewards.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <div>
                        <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                          {Number(r.rewardAmount) > 0 ? `$${Number(r.rewardAmount).toFixed(2)} Credit` : 'Reward'} — {r.promo_campaigns.name}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-500 font-mono">{r.couponCode}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setAppliedReward(r)}
                      className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Used Rewards */}
            {selectedCustomer && !appliedReward && customerRewards.length === 0 && customerUsedRewards.length > 0 && (
              <div className="space-y-1 mt-2">
                {customerUsedRewards.map(r => (
                  <div key={r.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                    <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {r.promo_campaigns.name} —{' '}
                        {r.status === 'REDEEMED' ? 'Reward already used' :
                         r.status === 'DEACTIVATED' ? 'Reward deactivated' : 'Reward expired'}
                      </div>
                      {r.redeemedAt && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          Redeemed {new Date(r.redeemedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barcode Scanner */}          <BarcodeScanner            onProductScanned={(product, variantId, scannedBarcode) => addToCart(product, variantId, 1, scannedBarcode)}            businessId={businessId}            showScanner={showBarcodeScanner}            onToggleScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}          />
          {/* Cart Items */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {labels.items} <span className="text-blue-600 dark:text-blue-400">({cart.length})</span>
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                <div className="text-5xl mb-3">🛒</div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">No items in {businessFeatures.isRestaurant() ? 'order' : 'cart'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Scan a barcode or select products to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {cart.map((item, index) => (
                  <div key={item.id || `cart-item-${index}`} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">{(item as any).productName || item.product?.name || (item as any).name || 'Item'}</h4>
                      {item.variant?.name && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">{item.variant.name}</p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateCartItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-16 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="font-bold text-gray-900 dark:text-white min-w-[80px] text-right">
                        {formatCurrency(item.totalPrice)}
                      </span>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove item"
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
            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6 mt-4 bg-gray-50 dark:bg-gray-800/50 -mx-6 px-6 pb-6 rounded-b-xl">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>

                {taxRate > 0 && (
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span className="font-medium">
                      {config?.taxLabel || 'Tax'} ({taxRate}%)
                      {taxIncludedInPrice && <span className="text-xs text-gray-500 ml-1">(included)</span>}
                      :
                    </span>
                    <span className="font-semibold">{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                {rewardCredit > 0 && (
                  <div className="flex justify-between text-green-700 dark:text-green-400">
                    <span className="font-medium flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Reward Credit:</span>
                    <span className="font-semibold">-{formatCurrency(rewardCredit)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Discount:</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-28 px-3 py-1.5 text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                  />
                </div>

                <div className="flex justify-between text-2xl font-bold pt-3 border-t-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                  <span>Total:</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method */}
          {cart.length > 0 && (
            <div className="mt-6 space-y-4 bg-gray-50 dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  💳 Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-field w-full text-base font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="CARD">💳 Card</option>
                  <option value="MOBILE_MONEY">📱 Mobile Money</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                  {businessFeatures.isConsulting() && <option value="NET_30">📄 Net 30</option>}
                </select>
              </div>

              {/* Cash Tender Input - only show if total > 0 */}
              {paymentMethod === 'CASH' && totalAmount > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    💵 Cash Tendered
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter amount received"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="input-field w-full text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    autoFocus
                  />
                  {cashTendered && parseFloat(cashTendered) >= totalAmount && (
                    <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700">
                      <div className="flex justify-between text-green-800 dark:text-green-200 font-bold text-lg">
                        <span>Change Due:</span>
                        <span>{formatCurrency(parseFloat(cashTendered) - totalAmount)}</span>
                      </div>
                    </div>
                  )}
                  {cashTendered && parseFloat(cashTendered) < totalAmount && (
                    <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-sm font-medium">
                      ⚠️ Amount tendered is less than total
                    </div>
                  )}
                </div>
              )}

              {/* Free item notice */}
              {paymentMethod === 'CASH' && totalAmount === 0 && (
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-800 dark:text-green-200">
                  ✅ Free item - no payment required
                </div>
              )}

              {/* Auto-print receipt option */}
              {canPrintReceipts && (
                <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-600">
                  <input
                    type="checkbox"
                    id="autoPrintReceipt"
                    checked={autoPrintReceipt}
                    onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    className="rounded w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="autoPrintReceipt" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
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
              disabled={isProcessing || (paymentMethod === 'CASH' && totalAmount > 0 && (!cashTendered || parseFloat(cashTendered) < totalAmount))}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing Order...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>✓</span>
                  <span>{labels.processButton}</span>
                </div>
              )}
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

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onCustomerCreated={() => {
            setShowAddCustomerModal(false)
            // Optionally refresh customer list or show success message
            customAlert({ title: 'Success', description: 'Customer created successfully! You can now search for them.' })
          }}
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