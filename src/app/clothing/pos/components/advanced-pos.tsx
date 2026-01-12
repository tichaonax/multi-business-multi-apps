'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAlert } from '@/components/ui/confirm-modal'
import { useBusinessContext } from '@/components/universal'
import { BarcodeScanner, UniversalProduct } from '@/components/universal'
import { ReceiptPreview } from '@/components/printing/receipt-preview'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useCustomerDisplaySync } from '@/hooks/useCustomerDisplaySync'
import { SyncMode } from '@/lib/customer-display/sync-manager'
import type { ReceiptData } from '@/types/printing'

interface CartItem {
  id: string
  productId: string
  variantId?: string
  name: string
  sku: string
  price: number
  quantity: number
  originalPrice?: number
  discount?: number
  attributes?: {
    size?: string
    color?: string
    condition?: string
  }
  product?: UniversalProduct
  variant?: any
  isReturn?: boolean
  returnReason?: string
}

interface PaymentMethod {
  type: 'CASH' | 'CARD' | 'STORE_CREDIT' | 'GIFT_CARD' | 'SPLIT'
  amount: number
  reference?: string
}

interface SupervisorOverride {
  required: boolean
  reason: string
  employeeId?: string
  supervisorId?: string
  timestamp?: string
}

interface ClothingAdvancedPOSProps {
  businessId: string
  employeeId: string
  terminalId?: string
  onOrderComplete?: (orderId: string) => void
}

export function ClothingAdvancedPOS({ businessId, employeeId, terminalId, onOrderComplete }: ClothingAdvancedPOSProps) {
  const { formatCurrency } = useBusinessContext()
  const { currentBusiness } = useBusinessPermissionsContext()
  const customAlert = useAlert()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [mode, setMode] = useState<'sale' | 'return' | 'exchange'>('sale')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [supervisorOverride, setSupervisorOverride] = useState<SupervisorOverride | null>(null)
  const [loading, setLoading] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'none'>('none')
  const [discountValue, setDiscountValue] = useState(0)
  const [customerInfo, setCustomerInfo] = useState<{
    id?: string
    email?: string
    phone?: string
    loyaltyPoints?: number
  } | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSupervisorModal, setShowSupervisorModal] = useState(false)
  const [printReceipt, setPrintReceipt] = useState(true)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [autoAddProcessed, setAutoAddProcessed] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [completedOrderReceipt, setCompletedOrderReceipt] = useState<ReceiptData | null>(null)
  const [defaultPrinter, setDefaultPrinter] = useState<{ id: string; name: string } | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'CARD' | 'STORE_CREDIT' | 'GIFT_CARD'>('CASH')
  const [cashTendered, setCashTendered] = useState('')

  // Product data loaded from database
  const [quickAddProducts, setQuickAddProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Business tax configuration
  const [businessConfig, setBusinessConfig] = useState<{
    taxIncludedInPrice: boolean
    taxRate: number
    taxLabel: string
  }>({
    taxIncludedInPrice: true,
    taxRate: 8.0,
    taxLabel: 'Tax'
  })

  // Customer Display Sync (only if terminalId is provided)
  const { send: sendToDisplay } = useCustomerDisplaySync({
    businessId,
    terminalId: terminalId || '',
    mode: SyncMode.BROADCAST, // Force BroadcastChannel for same-origin communication
    autoConnect: !!terminalId,
    onError: (error) => console.error('[Customer Display] Sync error:', error)
  })

  // Broadcast cart state to customer display
  const broadcastCartState = (cartItems: CartItem[]) => {
    if (!terminalId) return // Skip if no terminal ID

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity - (item.discount || 0)), 0)

    // Calculate tax based on business config
    let tax: number
    let total: number

    if (businessConfig.taxIncludedInPrice) {
      // Tax is embedded in prices - calculate for display
      tax = subtotal * (businessConfig.taxRate / (100 + businessConfig.taxRate))
      total = subtotal // Total equals subtotal (tax already included)
    } else {
      // Tax is added on top
      tax = subtotal * (businessConfig.taxRate / 100)
      total = subtotal + tax
    }

    sendToDisplay('CART_STATE', {
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variant: item.attributes?.size && item.attributes?.color
          ? `${item.attributes.size} - ${item.attributes.color}`
          : item.attributes?.size || item.attributes?.color || ''
      })),
      subtotal,
      tax,
      total
    })
  }

  // Fetch business configuration on mount
  useEffect(() => {
    async function fetchBusinessConfig() {
      if (!businessId) return

      try {
        const response = await fetch(`/api/universal/business-config?businessId=${businessId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setBusinessConfig({
              taxIncludedInPrice: result.data.taxIncludedInPrice ?? true,
              taxRate: result.data.taxRate ?? 8.0,
              taxLabel: result.data.taxLabel || 'Tax'
            })
            console.log('✅ Business config loaded:', {
              taxIncludedInPrice: result.data.taxIncludedInPrice,
              taxRate: result.data.taxRate
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch business config:', error)
      }
    }

    fetchBusinessConfig()
  }, [businessId])

  // Track if cart has been loaded from localStorage to prevent overwriting on mount
  const [cartLoaded, setCartLoaded] = useState(false)

  // Load cart from localStorage on mount
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

  // Fetch default printer on component mount
  useEffect(() => {
    async function fetchDefaultPrinter() {
      try {
        const response = await fetch('/api/printers?printerType=receipt&isOnline=true')
        if (response.ok) {
          const data = await response.json()
          const printers = data.printers || []

          // Use first available online receipt printer as default
          if (printers.length > 0) {
            setDefaultPrinter({
              id: printers[0].id,
              name: printers[0].printerName
            })
            console.log('✅ Default printer set:', printers[0].printerName)
          } else {
            console.log('⚠️ No printers configured')
          }
        }
      } catch (error) {
        console.error('Failed to fetch default printer:', error)
      }
    }

    fetchDefaultPrinter()
  }, [])

  // Load products from database
  const loadProducts = useCallback(async () => {
    if (!currentBusiness?.businessId) return

    setProductsLoading(true)
    try {
      const response = await fetch(
        `/api/universal/products?businessId=${currentBusiness.businessId}&businessType=clothing&includeVariants=true&isAvailable=true&limit=50`
      )

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Map API products to QuickAddProduct format
          const products = result.data
            .filter((p: any) => p.variants && p.variants.length > 0)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              variants: p.variants
                .filter((v: any) => parseFloat(v.price) > 0) // Only include variants with selling price > 0
                .map((v: any) => ({
                  id: v.id,
                  sku: v.sku,
                  price: parseFloat(v.price),
                  attributes: v.attributes || {},
                  stock: v.stockQuantity || 0
                }))
            }))
            .filter((p: any) => p.variants.length > 0) // Remove products with no valid variants

          setQuickAddProducts(products.slice(0, 20)) // Show first 20 products
          console.log('✅ Products loaded:', products.length)
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setProductsLoading(false)
    }
  }, [currentBusiness?.businessId])

  // Load products on mount and when business changes
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Auto-reload products when window regains focus (e.g., after seeding)
  // DISABLED: This was causing issues when switching between businesses
  // Products are loaded when business changes, so focus reload is unnecessary
  // useEffect(() => {
  //   const handleFocus = () => {
  //     console.log('🔄 Window focused, reloading products...')
  //     loadProducts()
  //   }

  //   window.addEventListener('focus', handleFocus)
  //   return () => window.removeEventListener('focus', handleFocus)
  // }, [loadProducts])

  // Search products with debounce
  useEffect(() => {
    const searchProducts = async () => {
      if (!productSearchTerm.trim() || !currentBusiness?.businessId) {
        setSearchResults([])
        return
      }

      setSearchLoading(true)
      try {
        const response = await fetch(
          `/api/universal/products?businessId=${currentBusiness.businessId}&businessType=clothing&includeVariants=true&isAvailable=true&search=${encodeURIComponent(productSearchTerm)}&limit=10`
        )

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            // Map API products to same format as quick add products
            const products = result.data
              .filter((p: any) => p.variants && p.variants.length > 0)
              .map((p: any) => ({
                id: p.id,
                name: p.name,
                variants: p.variants
                  .filter((v: any) => parseFloat(v.price) > 0)
                  .map((v: any) => ({
                    id: v.id,
                    sku: v.sku,
                    price: parseFloat(v.price),
                    attributes: v.attributes || {},
                    stock: v.stockQuantity || 0
                  }))
              }))
              .filter((p: any) => p.variants.length > 0)

            setSearchResults(products)
          }
        }
      } catch (error) {
        console.error('Failed to search products:', error)
      } finally {
        setSearchLoading(false)
      }
    }

    const timer = setTimeout(searchProducts, 500)
    return () => clearTimeout(timer)
  }, [productSearchTerm, currentBusiness?.businessId])

  const addToCart = (productId: string, variantId: string, quantity?: number) => {
    // Search in both quick add products and search results
    const product = quickAddProducts.find(p => p.id === productId) || searchResults.find(p => p.id === productId)
    const variant = product?.variants.find(v => v.id === variantId)

    if (!product || !variant) return

    const existingItem = cart.find(item => item.variantId === variantId)

    let newCart: CartItem[]
    if (existingItem) {
      newCart = cart.map(item =>
        item.variantId === variantId
          ? { ...item, quantity: item.quantity + (quantity || 1) }
          : item
      )
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        productId,
        variantId,
        name: product.name,
        sku: variant.sku,
        price: variant.price,
        quantity: quantity || 1,
        attributes: variant.attributes,
        isReturn: mode === 'return'
      }
      newCart = [...cart, newItem]
    }

    setCart(newCart)
    // Broadcast updated cart to customer display
    broadcastCartState(newCart)
  }

  // Overloaded function for scanner integration
  const addToCartFromScanner = (product: UniversalProduct, variantId?: string, quantity = 1) => {
    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined
    const unitPrice = variant?.price ?? product.basePrice

    const existingItem = cart.find(item =>
      item.productId === product.id && item.variantId === variantId
    )

    let newCart: CartItem[]
    if (existingItem) {
      newCart = cart.map(item =>
        item.productId === product.id && item.variantId === variantId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      )
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        productId: product.id,
        variantId,
        name: product.name,
        sku: variant?.sku || product.sku || `SKU-${product.id}`,
        price: unitPrice,
        quantity,
        attributes: variant?.attributes || {},
        product,
        variant,
        isReturn: mode === 'return'
      }
      newCart = [...cart, newItem]
    }

    setCart(newCart)
    // Broadcast updated cart to customer display
    broadcastCartState(newCart)
  }

  const removeFromCart = (itemId: string) => {
    const newCart = cart.filter(item => item.id !== itemId)
    setCart(newCart)
    // Broadcast updated cart to customer display
    broadcastCartState(newCart)
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    const newCart = cart.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    )
    setCart(newCart)
    // Broadcast updated cart to customer display
    broadcastCartState(newCart)
  }

  const applyDiscount = (itemId: string, discountAmount: number) => {
    // Check if supervisor override is required for discounts > 20%
    const item = cart.find(item => item.id === itemId)
    if (item && (discountAmount / item.price) > 0.20) {
      setSupervisorOverride({
        required: true,
        reason: `Discount over 20% (${((discountAmount / item.price) * 100).toFixed(1)}%) requires supervisor approval`,
        employeeId
      })
      setShowSupervisorModal(true)
      return
    }

    setCart(cart.map(item =>
      item.id === itemId ? { ...item, discount: discountAmount } : item
    ))
  }

  // Auto-add product from query parameters (from barcode scanner navigation)
  useEffect(() => {
    const addProductId = searchParams?.get('addProduct')
    const variantId = searchParams?.get('variantId')
    const queryBusinessId = searchParams?.get('businessId')

    if (addProductId && !autoAddProcessed) {
      setAutoAddProcessed(true)

      // Fetch the product and add it to cart
      const fetchAndAddProduct = async () => {
        try {
          // Use businessId from query params (the business where product was found)
          // Fall back to current businessId if not in query
          const targetBusinessId = queryBusinessId || currentBusiness?.businessId

          if (!targetBusinessId) return

          const response = await fetch(`/api/admin/products/${addProductId}?businessId=${targetBusinessId}`)
          if (!response.ok) {
            console.error('Failed to fetch product for auto-add')
            return
          }

          const data = await response.json()
          if (data.success && data.product) {
            // Add to cart with variant if specified
            addToCartFromScanner(data.product, variantId || undefined, 1)

            // Clean up the URL
            const currentPath = window.location.pathname
            router.replace(currentPath)
          }
        } catch (err) {
          console.error('Error auto-adding product:', err)
        }
      }

      fetchAndAddProduct()
    }
  }, [searchParams, autoAddProcessed, currentBusiness?.businessId, router])

  const handleReturn = (originalOrderId: string, reason: string) => {
    // In a real implementation, this would fetch the original order
    // and add items to cart with return flag
    const returnItem: CartItem = {
      id: Date.now().toString(),
      productId: 'return_prod',
      name: 'Return Item',
      sku: 'RETURN-001',
      price: -25.00, // Negative for return
      quantity: 1,
      isReturn: true,
      returnReason: reason
    }
    setCart([...cart, returnItem])
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const itemPrice = item.price - (item.discount || 0)
      return sum + (itemPrice * item.quantity)
    }, 0)
  }

  const calculateTax = () => {
    const subtotal = calculateSubtotal()

    // If tax is included in price, don't add additional tax
    if (businessConfig.taxIncludedInPrice) {
      // Calculate the embedded tax amount for display purposes
      // If price includes 8% tax: tax = subtotal * (0.08 / 1.08)
      return subtotal * (businessConfig.taxRate / (100 + businessConfig.taxRate))
    }

    // Tax not included - add tax to subtotal
    return subtotal * (businessConfig.taxRate / 100)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax()

    // If tax is included, total equals subtotal (tax is embedded)
    // If tax is not included, total = subtotal + tax
    return businessConfig.taxIncludedInPrice ? subtotal : subtotal + tax
  }

  const requiresSupervisorOverride = () => {
    // Check various conditions that require supervisor override
    const hasLargeDiscount = cart.some(item => item.discount && (item.discount / item.price) > 0.20)
    const hasReturn = cart.some(item => item.isReturn)
    const totalAmount = Math.abs(calculateTotal())
    const isLargeTransaction = totalAmount > 500

    return hasLargeDiscount || (hasReturn && totalAmount > 100) || isLargeTransaction
  }

  const processPayment = async () => {
    if (requiresSupervisorOverride() && !supervisorOverride?.supervisorId) {
      setSupervisorOverride({
        required: true,
        reason: 'Transaction requires supervisor approval',
        employeeId
      })
      setShowSupervisorModal(true)
      return
    }

    setLoading(true)
    try {
      // Calculate totals
      const subtotal = calculateSubtotal()
      const tax = calculateTax()
      const total = calculateTotal()
      const discount = cart.reduce((sum, item) => sum + (item.discount || 0) * item.quantity, 0)

      const totals = {
        subtotal,
        tax,
        discount,
        total
      }

      // Prepare order data
      const orderData = {
        businessId: currentBusiness?.businessId,
        customerId: customerInfo?.id || null,
        employeeId,
        orderType: mode === 'return' ? 'RETURN' : mode === 'exchange' ? 'EXCHANGE' : 'SALE',
        paymentMethod: selectedPaymentMethod,
        discountAmount: totals.discount,
        taxAmount: totals.tax,
        businessType: 'clothing',
        attributes: {
          posOrder: true,
          mode,
          supervisorOverride: supervisorOverride || undefined,
          customerInfo: customerInfo || undefined,
          cashTendered: selectedPaymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) : undefined,
          change: selectedPaymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) - totals.total : undefined
        },
        items: cart.map(item => ({
          productVariantId: item.variantId || item.id,
          quantity: item.isReturn ? -item.quantity : item.quantity,
          unitPrice: item.price,
          discountAmount: item.discount || 0,
          attributes: {
            productName: item.name,
            variantName: item.attributes?.size || item.attributes?.color ?
              `${item.attributes.size || ''} ${item.attributes.color || ''}`.trim() : null,
            sku: item.sku,
            isReturn: item.isReturn || false,
            returnReason: item.returnReason || null,
            ...item.attributes
          }
        }))
      }

      // Create order via API
      const response = await fetch('/api/universal/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to process order')
      }

      // Create receipt data
      const receiptData: ReceiptData = {
        receiptNumber: result.data.orderNumber || 'N/A',
        globalId: result.data.id,
        businessId: currentBusiness?.businessId || '',
        businessName: currentBusiness?.businessName || 'Clothing Store',
        businessType: 'clothing',
        items: cart.map(item => ({
          name: `${item.name}${item.attributes?.size ? ` (${item.attributes.size})` : ''}${item.attributes?.color ? ` - ${item.attributes.color}` : ''}`,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity - (item.discount || 0)
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        paymentMethod: selectedPaymentMethod,
        cashTendered: selectedPaymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) : undefined,
        change: selectedPaymentMethod === 'CASH' && cashTendered ? parseFloat(cashTendered) - totals.total : undefined,
        customerName: customerInfo?.email || 'Walk-in Customer',
        date: new Date(),
        cashierName: employeeId ? 'Employee' : undefined,
        businessSpecificData: {
          supervisorOverride: supervisorOverride?.supervisorId ? 'Yes' : 'No'
        }
      }

      // Clear cart and reset state
      setCart([])
      setPaymentMethods([])
      setSupervisorOverride(null)
      setCustomerInfo(null)
      setShowPaymentModal(false)
      setCashTendered('')
      setSelectedPaymentMethod('CASH')

      // Send CLEAR_CART to customer display after successful checkout
      if (terminalId) {
        sendToDisplay('CLEAR_CART', {
          subtotal: 0,
          tax: 0,
          total: 0
        })
      }

      // Auto-print to default printer if configured, otherwise show preview
      if (defaultPrinter) {
        console.log(`🖨️ Auto-printing to ${defaultPrinter.name}...`)
        try {
          await handlePrintReceipt(receiptData, defaultPrinter.id)
          console.log('✅ Receipt printed successfully')
        } catch (printError) {
          console.error('Auto-print failed, showing manual selection:', printError)
          // Fall back to manual selection if auto-print fails
          setCompletedOrderReceipt(receiptData)
          setShowReceiptPreview(true)
        }
      } else {
        // No default printer - show manual selection
        setCompletedOrderReceipt(receiptData)
        setShowReceiptPreview(true)
      }

      onOrderComplete?.(result.data.id)
    } catch (error) {
      console.error('Payment failed:', error)
      await customAlert({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle printing receipt to configured printer
  const handlePrintReceipt = async (receiptData: ReceiptData, printerId?: string) => {
    try {
      if (!printerId) {
        throw new Error('No printer selected')
      }

      const response = await fetch('/api/print/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          printerId,
          businessId: receiptData.businessId,
          businessType: receiptData.businessType,
          receiptNumber: receiptData.receiptNumber,
          transactionId: receiptData.transactionId,
          transactionDate: receiptData.transactionDate,
          salespersonName: receiptData.salespersonName,
          salespersonId: receiptData.salespersonId,
          businessName: receiptData.businessName,
          businessAddress: receiptData.businessAddress,
          businessPhone: receiptData.businessPhone,
          businessEmail: receiptData.businessEmail,
          items: receiptData.items,
          subtotal: receiptData.subtotal,
          tax: receiptData.tax,
          discount: receiptData.discount,
          total: receiptData.total,
          paymentMethod: receiptData.paymentMethod,
          amountPaid: receiptData.amountPaid,
          changeDue: receiptData.changeDue,
          businessSpecificData: receiptData.businessSpecificData,
          footerMessage: receiptData.footerMessage,
          returnPolicy: receiptData.returnPolicy,
          copies: 1,
          autoPrint: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Print request failed' }))
        throw new Error(errorData.error || `Print failed with status ${response.status}`)
      }

      const result = await response.json()
      console.log('Receipt printed successfully, job ID:', result.jobId)
    } catch (error) {
      console.error('Print error:', error)
      throw error
    }
  }

  const handleSupervisorAuth = (supervisorId: string, pin: string) => {
    // In real implementation, would validate supervisor credentials
    if (pin === '1234') { // Demo PIN
      setSupervisorOverride(prev => prev ? {
        ...prev,
        supervisorId,
        timestamp: new Date().toISOString()
      } : null)
      setShowSupervisorModal(false)
    } else {
      void customAlert({ title: 'Invalid supervisor PIN' })
    }
  }

  const getModeColor = () => {
    const colors = {
      sale: 'bg-green-50 text-green-800 border-green-200',
      return: 'bg-red-50 text-red-800 border-red-200',
      exchange: 'bg-blue-50 text-blue-800 border-blue-200'
    }
    return colors[mode]
  }

  const getReturnReasons = () => [
    'Defective item',
    'Wrong size',
    'Wrong color',
    'Not as described',
    'Customer dissatisfaction',
    'Damaged in shipping',
    'Other'
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Main POS Interface */}
      <div className="xl:col-span-2 space-y-6">
        {/* Mode Selection */}
        <div className={`p-4 rounded-lg border ${getModeColor()}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Advanced POS System</h2>
            <div className="flex gap-2">
              {(['sale', 'return', 'exchange'] as const).map((modeOption) => (
                <button
                  key={modeOption}
                  onClick={() => setMode(modeOption)}
                  className={`px-3 py-1 text-sm rounded capitalize ${
                    mode === modeOption ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                  }`}
                >
                  {modeOption}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Search */}
        <div className="card p-4">
          <h3 className="font-semibold text-primary mb-4">Search Products</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search products by name, SKU, or barcode..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {productSearchTerm && (
              <button
                onClick={() => setProductSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results */}
          {productSearchTerm.trim() && (
            <div className="mt-4">
              {searchLoading ? (
                <div className="text-center py-4 text-secondary">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-secondary">
                  No products found for "{productSearchTerm}"
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((product) => (
                    <div key={product.id} className="border rounded-lg p-3">
                      <h4 className="font-medium text-primary mb-2">{product.name}</h4>
                      <div className="space-y-2">
                        {product.variants.map((variant: any) => (
                          <div key={variant.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {variant.attributes?.size && `${variant.attributes.size} `}
                                {variant.attributes?.color}
                              </span>
                              <span className="text-sm text-secondary">({variant.stock} left)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{formatCurrency(variant.price)}</span>
                              <button
                                onClick={() => addToCart(product.id, variant.id)}
                                disabled={variant.stock === 0}
                                className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90 disabled:opacity-50"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Add Products */}
        <div className="card p-4">
          <h3 className="font-semibold text-primary mb-4">
            Quick Add Products
            {!productsLoading && quickAddProducts.length > 0 && (
              <span className="text-sm text-secondary ml-2">({quickAddProducts.length} available)</span>
            )}
          </h3>
          {productsLoading ? (
            <div className="text-center py-8 text-secondary">
              Loading products...
            </div>
          ) : quickAddProducts.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <div className="text-4xl mb-2">📦</div>
              <div className="font-medium">No products available</div>
              <div className="text-sm mt-1">Add clothing products with variants in the Inventory page</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {quickAddProducts.map((product) => (
                <div key={product.id} className="border rounded-lg p-3">
                  <h4 className="font-medium text-primary mb-2">{product.name}</h4>
                  <div className="space-y-2">
                    {product.variants.map((variant: any) => (
                      <div key={variant.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {variant.attributes?.size && `${variant.attributes.size} `}
                            {variant.attributes?.color}
                          </span>
                          <span className="text-sm text-secondary">({variant.stock} left)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatCurrency(variant.price)}</span>
                          <button
                            onClick={() => addToCart(product.id, variant.id)}
                            disabled={variant.stock === 0}
                            className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90 disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Barcode Scanner */}
        <BarcodeScanner
          onProductScanned={(product, variantId) => addToCartFromScanner(product, variantId)}
          businessId={currentBusiness?.businessId || ''}
          showScanner={showBarcodeScanner}
          onToggleScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}
        />

        {/* Return Processing */}
        {mode === 'return' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-4">Process Return</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Original Order ID or Receipt #"
                className="px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                onChange={(e) => e.target.value && handleReturn('ORD-123', e.target.value)}
                className="px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select return reason</option>
                {getReturnReasons().map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Cart and Checkout */}
      <div className="space-y-6">
        {/* Cart */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-primary">Cart ({cart.length})</h3>
            <button
              onClick={() => setCart([])}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-secondary">
                Cart is empty
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                  item.isReturn ? 'bg-red-50 border-red-200' : 'bg-gray-50 dark:bg-gray-800'
                }`}>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-secondary">
                      SKU: {item.sku}
                      {item.attributes?.size && ` • Size: ${item.attributes.size}`}
                      {item.attributes?.color && ` • ${item.attributes.color}`}
                      {item.variant?.name && ` • ${item.variant.name}`}
                      {item.isReturn && item.returnReason && ` • Return: ${item.returnReason}`}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                        className="w-16 px-2 py-1 text-xs border rounded"
                      />
                      <span className="text-sm">× {formatCurrency(item.price - (item.discount || 0))}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency((item.price - (item.discount || 0)) * item.quantity)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totals */}
        {cart.length > 0 && (
          <div className="card p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {businessConfig.taxLabel || 'Tax'}
                  {businessConfig.taxIncludedInPrice && <span className="text-xs text-gray-500 ml-1">(included)</span>}
                  :
                </span>
                <span>{formatCurrency(calculateTax())}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* Supervisor Override Indicator */}
            {requiresSupervisorOverride() && (
              <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Supervisor override required</span>
                  {supervisorOverride?.supervisorId && (
                    <span className="text-green-600">✓ Approved</span>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full mt-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === 'return' ? 'Process Return' : 'Proceed to Payment'}
            </button>
          </div>
        )}

        {/* Customer Info */}
        <div className="card p-4">
          <h3 className="font-semibold text-primary mb-3">Customer Info</h3>
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Customer email"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <input
              type="tel"
              placeholder="Phone number"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="printReceipt"
                checked={printReceipt}
                onChange={(e) => setPrintReceipt(e.target.checked)}
              />
              <label htmlFor="printReceipt" className="text-sm">Print receipt</label>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-primary mb-4">Payment Processing</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                  <option value="GIFT_CARD">Gift Card</option>
                </select>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-bold text-green-600">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              {/* Cash Tender Input */}
              {selectedPaymentMethod === 'CASH' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Cash Tendered</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter amount received"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-lg font-semibold"
                    autoFocus
                  />
                  {cashTendered && parseFloat(cashTendered) >= calculateTotal() && (
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded">
                      <div className="flex justify-between text-green-800 dark:text-green-200 font-semibold">
                        <span>Change:</span>
                        <span>{formatCurrency(parseFloat(cashTendered) - calculateTotal())}</span>
                      </div>
                    </div>
                  )}
                  {cashTendered && parseFloat(cashTendered) < calculateTotal() && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-red-800 dark:text-red-200 text-sm">
                      ⚠️ Amount tendered is less than total
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setCashTendered('')
                  }}
                  className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={loading || (selectedPaymentMethod === 'CASH' && (!cashTendered || parseFloat(cashTendered) < calculateTotal()))}
                  className="flex-1 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Complete Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supervisor Override Modal */}
      {showSupervisorModal && supervisorOverride && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Supervisor Override Required</h3>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                <p className="text-sm">{supervisorOverride.reason}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Supervisor ID</label>
                <input
                  type="text"
                  placeholder="Enter supervisor ID"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Supervisor PIN</label>
                <input
                  type="password"
                  placeholder="Enter PIN"
                  className="w-full px-3 py-2 border rounded-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const pin = (e.target as HTMLInputElement).value
                      const supervisorId = ((e.target as HTMLInputElement).parentNode?.previousSibling?.querySelector('input') as HTMLInputElement)?.value
                      if (supervisorId && pin) {
                        handleSupervisorAuth(supervisorId, pin)
                      }
                    }
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSupervisorModal(false)}
                  className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50 dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const supervisorId = (document.querySelector('input[placeholder="Enter supervisor ID"]') as HTMLInputElement)?.value
                    const pin = (document.querySelector('input[placeholder="Enter PIN"]') as HTMLInputElement)?.value
                    if (supervisorId && pin) {
                      handleSupervisorAuth(supervisorId, pin)
                    }
                  }}
                  className="flex-1 py-2 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Authorize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && completedOrderReceipt && (
        <ReceiptPreview
          isOpen={showReceiptPreview}
          onClose={() => {
            setShowReceiptPreview(false)
            setCompletedOrderReceipt(null)
          }}
          receiptData={completedOrderReceipt}
          onPrint={(printer) => handlePrintReceipt(completedOrderReceipt, printer.id)}
        />
      )}
    </div>
  )
}