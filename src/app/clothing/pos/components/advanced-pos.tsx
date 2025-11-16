'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAlert } from '@/components/ui/confirm-modal'
import { useBusinessContext } from '@/components/universal'
import { BarcodeScanner, UniversalProduct } from '@/components/universal'

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
  onOrderComplete?: (orderId: string) => void
}

export function ClothingAdvancedPOS({ businessId, employeeId, onOrderComplete }: ClothingAdvancedPOSProps) {
  const { formatCurrency } = useBusinessContext()
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

  // Sample product data for quick add
  const [quickAddProducts] = useState([
    {
      id: 'prod1',
      name: "Men's T-Shirt",
      variants: [
        { id: 'var1', sku: 'MTS-001-M-BLK', price: 24.99, attributes: { size: 'M', color: 'Black' }, stock: 15 },
        { id: 'var2', sku: 'MTS-001-L-BLK', price: 24.99, attributes: { size: 'L', color: 'Black' }, stock: 8 },
        { id: 'var3', sku: 'MTS-001-M-WHT', price: 24.99, attributes: { size: 'M', color: 'White' }, stock: 12 }
      ]
    },
    {
      id: 'prod2',
      name: "Women's Dress",
      variants: [
        { id: 'var4', sku: 'WDR-002-8-FLR', price: 49.99, attributes: { size: '8', color: 'Floral' }, stock: 5 },
        { id: 'var5', sku: 'WDR-002-10-FLR', price: 49.99, attributes: { size: '10', color: 'Floral' }, stock: 3 }
      ]
    }
  ])

  const addToCart = (productId: string, variantId: string, quantity?: number) => {
    const product = quickAddProducts.find(p => p.id === productId)
    const variant = product?.variants.find(v => v.id === variantId)

    if (!product || !variant) return

    const existingItem = cart.find(item => item.variantId === variantId)

    if (existingItem) {
      setCart(cart.map(item =>
        item.variantId === variantId
          ? { ...item, quantity: item.quantity + (quantity || 1) }
          : item
      ))
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
      setCart([...cart, newItem])
    }
  }

  // Overloaded function for scanner integration
  const addToCartFromScanner = (product: UniversalProduct, variantId?: string, quantity = 1) => {
    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined
    const unitPrice = variant?.price ?? product.basePrice

    const existingItem = cart.find(item =>
      item.productId === product.id && item.variantId === variantId
    )

    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id && item.variantId === variantId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ))
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
      setCart([...cart, newItem])
    }
  }

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setCart(cart.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ))
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
          const targetBusinessId = queryBusinessId || businessId

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
  }, [searchParams, autoAddProcessed, businessId, router])

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
    return subtotal * 0.08 // 8% tax rate
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
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
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      const orderId = `ORD-${Date.now()}`

      // Clear cart and reset state
      setCart([])
      setPaymentMethods([])
      setSupervisorOverride(null)
      setCustomerInfo(null)

      if (printReceipt) {
        // In real implementation, would trigger receipt printing
      }

      onOrderComplete?.(orderId)
      setShowPaymentModal(false)
    } catch (error) {
      console.error('Payment failed:', error)
    } finally {
      setLoading(false)
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

        {/* Quick Add Products */}
        <div className="card p-4">
          <h3 className="font-semibold text-primary mb-4">Quick Add Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickAddProducts.map((product) => (
              <div key={product.id} className="border rounded-lg p-3">
                <h4 className="font-medium text-primary mb-2">{product.name}</h4>
                <div className="space-y-2">
                  {product.variants.map((variant) => (
                    <div key={variant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {variant.attributes.size && `${variant.attributes.size} `}
                          {variant.attributes.color}
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
        </div>

        {/* Barcode Scanner */}
        <BarcodeScanner
          onProductScanned={(product, variantId) => addToCartFromScanner(product, variantId)}
          businessId={businessId}
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
                <span>Tax:</span>
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
            <h3 className="text-lg font-semibold mb-4">Payment Processing</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                  <option value="GIFT_CARD">Gift Card</option>
                </select>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-bold">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2 px-4 border rounded-lg hover:bg-gray-50 dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
                      const supervisorId = ((e.target as HTMLInputElement).parentNode?.previousElementSibling?.querySelector('input') as HTMLInputElement)?.value
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
    </div>
  )
}