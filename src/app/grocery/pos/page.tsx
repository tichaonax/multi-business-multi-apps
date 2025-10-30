'use client'

import { useState, useRef, useEffect } from 'react'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider, useBusinessContext, BarcodeScanner } from '@/components/universal'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface POSItem {
  id: string
  name: string
  barcode?: string
  pluCode?: string
  category: string
  unitType: 'each' | 'weight' | 'volume'
  price: number
  unit: string
  taxable: boolean
  weightRequired: boolean
  ageRestricted?: boolean
  snapEligible?: boolean
  organicCertified?: boolean
  loyaltyPoints?: number
}

interface CartItem extends POSItem {
  quantity: number
  weight?: number
  subtotal: number
  discountAmount?: number
}

interface Customer {
  id: string
  name: string
  phone: string
  loyaltyNumber: string
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  pointsBalance: number
  snapBalance?: number
  preferredPaymentMethod?: string
}

// Main POS content component that uses the business context
function GroceryPOSContent() {
  const { formatCurrency } = useBusinessContext()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [pluInput, setPluInput] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'snap' | 'loyalty'>('card')
  const [isScaleConnected, setIsScaleConnected] = useState(true)
  const [currentWeight, setCurrentWeight] = useState(0)
  const [showCustomerLookup, setShowCustomerLookup] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const pluInputRef = useRef<HTMLInputElement>(null)

  // Use the business permissions context for proper business management
  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading
  } = useBusinessPermissionsContext()

  // Get user info
  const { data: session, status } = useSession()
  const sessionUser = session?.user as SessionUser
  const employeeId = sessionUser?.id

  // Check if current business is a grocery business
  const isGroceryBusiness = currentBusiness?.businessType === 'grocery'

  // Sample product database
  const productDatabase: POSItem[] = [
    {
      id: 'p1',
      name: 'Organic Bananas',
      pluCode: '94011',
      category: 'Produce',
      unitType: 'weight',
      price: 1.29,
      unit: 'lb',
      taxable: false,
      weightRequired: true,
      snapEligible: true,
      organicCertified: true,
      loyaltyPoints: 2
    },
    {
      id: 'p2',
      name: 'Whole Milk 1 Gallon',
      barcode: '071600006009',
      category: 'Dairy',
      unitType: 'each',
      price: 4.99,
      unit: 'gallon',
      taxable: false,
      weightRequired: false,
      snapEligible: true,
      loyaltyPoints: 5
    },
    {
      id: 'p3',
      name: 'Ground Beef 80/20',
      barcode: '123456789012',
      category: 'Meat',
      unitType: 'weight',
      price: 6.49,
      unit: 'lb',
      taxable: false,
      weightRequired: true,
      snapEligible: true,
      loyaltyPoints: 8
    },
    {
      id: 'p4',
      name: 'Beer 6-Pack',
      barcode: '012000123456',
      category: 'Alcohol',
      unitType: 'each',
      price: 12.99,
      unit: 'pack',
      taxable: true,
      weightRequired: false,
      ageRestricted: true,
      loyaltyPoints: 10
    },
    {
      id: 'p5',
      name: 'Tomatoes',
      pluCode: '4664',
      category: 'Produce',
      unitType: 'weight',
      price: 2.99,
      unit: 'lb',
      taxable: false,
      weightRequired: true,
      snapEligible: true,
      loyaltyPoints: 3
    }
  ]

  const sampleCustomer: Customer = {
    id: 'c1',
    name: 'Sarah Johnson',
    phone: '(555) 123-4567',
    loyaltyNumber: 'LOY123456',
    loyaltyTier: 'Gold',
    pointsBalance: 2450,
    snapBalance: 150.00,
    preferredPaymentMethod: 'card'
  }

  // Simulate scale weight updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (isScaleConnected) {
        // Simulate slight weight fluctuations
        setCurrentWeight(prev => prev + (Math.random() - 0.5) * 0.1)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isScaleConnected])

  const findProductByBarcode = (barcode: string) => {
    return productDatabase.find(p => p.barcode === barcode)
  }

  const findProductByPLU = (plu: string) => {
    return productDatabase.find(p => p.pluCode === plu)
  }

  const addToCart = (product: POSItem, quantity = 1, weight?: number) => {
    const existingItem = cart.find(item => item.id === product.id)
    const actualQuantity = product.weightRequired ? (weight || currentWeight) : quantity
    const subtotal = product.price * actualQuantity

    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + actualQuantity, subtotal: item.subtotal + subtotal }
          : item
      ))
    } else {
      const cartItem: CartItem = {
        ...product,
        quantity: actualQuantity,
        weight: product.weightRequired ? actualQuantity : undefined,
        subtotal
      }
      setCart([...cart, cartItem])
    }

    // Clear inputs
    setBarcodeInput('')
    setPluInput('')
    setWeightInput('')
    setCurrentWeight(0)
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    ))
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (barcodeInput) {
      const product = findProductByBarcode(barcodeInput)
      if (product) {
        if (product.weightRequired) {
          // Need to weigh the item
          alert('Please place item on scale and confirm weight')
        } else {
          addToCart(product)
        }
      } else {
        alert('Product not found')
      }
    }
  }

  const handlePLUSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pluInput) {
      const product = findProductByPLU(pluInput)
      if (product) {
        if (product.weightRequired && currentWeight === 0) {
          alert('Please place item on scale to get weight')
        } else {
          addToCart(product, 1, currentWeight)
        }
      } else {
        alert('PLU code not found')
      }
    }
  }

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
    const taxableAmount = cart.filter(item => item.taxable).reduce((sum, item) => sum + item.subtotal, 0)
    const tax = taxableAmount * 0.08 // 8% tax rate
    const snapEligibleAmount = cart.filter(item => item.snapEligible).reduce((sum, item) => sum + item.subtotal, 0)
    const loyaltyPoints = cart.reduce((sum, item) => sum + (item.loyaltyPoints || 0) * Math.ceil(item.quantity), 0)
    const total = subtotal + tax

    return { subtotal, tax, total, snapEligibleAmount, loyaltyPoints }
  }

  const handlePayment = async () => {
    const totals = calculateTotals()

    if (cart.length === 0) {
      alert('Cart is empty!')
      return
    }

    if (paymentMethod === 'snap' && customer?.snapBalance) {
      if (customer.snapBalance < totals.snapEligibleAmount) {
        alert('Insufficient SNAP balance. Please use another payment method for remaining amount.')
        return
      }
    }

    try {
      // Create order using universal orders API
      const orderData = {
        businessId: currentBusinessId,
        businessType: 'grocery',
        customerId: customer?.id,
        orderType: 'SALE',
        paymentMethod: paymentMethod.toUpperCase(),
        discountAmount: 0,
        taxAmount: totals.tax,
        attributes: {
          paymentMethod: paymentMethod,
          loyaltyPointsEarned: totals.loyaltyPoints,
          snapEligibleAmount: totals.snapEligibleAmount,
          customerInfo: customer ? {
            name: customer.name,
            phone: customer.phone,
            loyaltyNumber: customer.loyaltyNumber,
            tier: customer.loyaltyTier
          } : null
        },
        notes: customer ? `Loyalty member: ${customer.loyaltyNumber}` : 'Walk-in customer',
        items: cart.map(item => ({
          productVariantId: item.id, // Using item ID as variant ID for now
          quantity: item.quantity,
          unitPrice: item.price,
          discountAmount: item.discountAmount || 0,
          attributes: {
            weight: item.weight,
            unitType: item.unitType,
            category: item.category,
            barcode: item.barcode,
            pluCode: item.pluCode,
            organicCertified: item.organicCertified,
            snapEligible: item.snapEligible
          }
        }))
      }

      const response = await fetch('/api/universal/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const result = await response.json()

      if (result.success) {
        // Payment processed successfully
        alert(`Payment processed: ${formatCurrency(totals.total)} via ${paymentMethod.toUpperCase()}\nOrder #: ${result.data.orderNumber}`)

        // Add loyalty points if customer is logged in
        if (customer) {
          alert(`${totals.loyaltyPoints} loyalty points added to your account!`)
        }

        // Clear cart after successful payment
        setCart([])
        setCustomer(null)
      } else {
        throw new Error(result.error || 'Failed to process order')
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const totals = calculateTotals()

  return (
    <ContentLayout
      title="Grocery Point of Sale"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Grocery', href: '/grocery' },
        { label: 'Point of Sale', isActive: true }
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main POS Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product Entry */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Product Entry</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Barcode Scanner */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  📷 Barcode Scanner
                </label>
                    <div>
                      <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          placeholder="Scan or enter barcode"
                          className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </form>

                      {/* Scanner placed below the manual input to avoid layout squish.
                          On small screens it will be full-width; on larger screens it will
                          naturally size to its content. */}
                      <div className="mt-4">
                        <button
                          onClick={() => setShowScanner(!showScanner)}
                          className="mb-2 px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                        >
                          {showScanner ? 'Hide Scanner' : 'Show Scanner'}
                        </button>

                        {showScanner && (
                          <div className="w-full md:w-80">
                            <BarcodeScanner
                              onProductScanned={(product: any, variantId?: string) => {
                                // Map UniversalProduct -> POSItem shape expected by addToCart
                                const price = variantId && product?.variants?.length
                                  ? (product.variants.find((v: any) => v.id === variantId)?.price ?? product.basePrice)
                                  : (product.basePrice ?? 0)
                                const posItem: POSItem = {
                                  id: product.id,
                                  name: product.name,
                                  barcode: product.sku ?? product.barcode ?? undefined,
                                  category: product.businessType || 'General',
                                  unitType: 'each',
                                  price,
                                  unit: 'each'
                                }
                                addToCart(posItem)
                              }}
                              businessId={currentBusinessId!}
                              showScanner={showScanner}
                              onToggleScanner={() => setShowScanner(!showScanner)}
                              minBarcodeLength={6}
                            />
                          </div>
                        )}
                      </div>
                    </div>
              </div>

              {/* PLU Entry */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  🏷️ PLU Code
                </label>
                <form onSubmit={handlePLUSubmit} className="flex gap-2">
                  <input
                    ref={pluInputRef}
                    type="text"
                    value={pluInput}
                    onChange={(e) => setPluInput(e.target.value)}
                    placeholder="Enter PLU code"
                    className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            {/* Scale Display */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚖️</span>
                  <span className="font-medium">Digital Scale</span>
                  <span className={`inline-block w-2 h-2 rounded-full ${isScaleConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <div className="text-2xl font-mono font-bold">
                  {currentWeight.toFixed(2)} lbs
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setCurrentWeight(0)}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                >
                  Tare
                </button>
                <button
                  onClick={() => setCurrentWeight(Math.random() * 5 + 0.1)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Simulate Weight
                </button>
              </div>
            </div>

            {/* Quick Add Buttons for Common Items */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {productDatabase.slice(0, 4).map((product) => (
                <button
                  key={product.id}
                  onClick={() => product.weightRequired ?
                    (currentWeight > 0 ? addToCart(product, 1, currentWeight) : alert('Please weigh item first')) :
                    addToCart(product)
                  }
                  className="p-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm text-primary"
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="text-secondary">
                    {product.pluCode && `PLU: ${product.pluCode}`}
                    {product.barcode && !product.pluCode && `Barcode`}
                  </div>
                  <div className="font-semibold text-green-600">
                    {formatCurrency(product.price)}/{product.unit}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Shopping Cart */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Shopping Cart</h3>

            {cart.length === 0 ? (
              <div className="text-secondary text-center py-8">
                Cart is empty. Scan or enter items to begin.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-secondary flex gap-4">
                        <span>{item.quantity.toFixed(item.weightRequired ? 2 : 0)} {item.unit}</span>
                        <span>{formatCurrency(item.price)}/{item.unit}</span>
                        {item.organicCertified && <span className="text-green-600">🌱 Organic</span>}
                        {item.snapEligible && <span className="text-blue-600">SNAP ✓</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{formatCurrency(item.subtotal)}</div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Customer & Payment */}
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Customer</h3>
              <button
                onClick={() => setShowCustomerLookup(!showCustomerLookup)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {customer ? 'Change' : 'Add Customer'}
              </button>
            </div>

            {customer ? (
              <div className="space-y-3">
                <div>
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-secondary">{customer.phone}</div>
                  <div className="text-sm text-secondary">Loyalty: {customer.loyaltyNumber}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs ${
                    customer.loyaltyTier === 'Platinum' ? 'bg-gray-100 text-gray-800' :
                    customer.loyaltyTier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                    customer.loyaltyTier === 'Silver' ? 'bg-gray-100 text-secondary' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {customer.loyaltyTier} Member
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    {customer.pointsBalance} pts
                  </span>
                </div>
                {customer.snapBalance && (
                  <div className="text-sm">
                    <span className="text-secondary">SNAP Balance:</span>
                    <span className="font-medium ml-1">{formatCurrency(customer.snapBalance)}</span>
                  </div>
                )}
              </div>
            ) : showCustomerLookup ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Phone number or loyalty ID"
                  className="w-full border rounded-lg px-3 py-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCustomer(sampleCustomer)
                      setShowCustomerLookup(false)
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Load Demo Customer
                  </button>
                  <button
                    onClick={() => setShowCustomerLookup(false)}
                    className="px-3 py-2 bg-gray-300 text-secondary rounded-lg hover:bg-gray-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-secondary text-sm">No customer selected</div>
            )}
          </div>

          {/* Order Summary */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Order Summary</h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              {totals.snapEligibleAmount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>SNAP Eligible:</span>
                  <span>{formatCurrency(totals.snapEligibleAmount)}</span>
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
              {customer && totals.loyaltyPoints > 0 && (
                <div className="text-sm text-green-600">
                  Earning {totals.loyaltyPoints} loyalty points
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Method</h3>

            <div className="space-y-2 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mr-2"
                />
                💳 Credit/Debit Card
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="mr-2"
                />
                💵 Cash
              </label>
              {totals.snapEligibleAmount > 0 && (
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="snap"
                    checked={paymentMethod === 'snap'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-2"
                    disabled={!customer?.snapBalance}
                  />
                  🍎 SNAP/EBT {!customer?.snapBalance && '(Customer Required)'}
                </label>
              )}
              {customer && customer.pointsBalance >= totals.total * 100 && (
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="loyalty"
                    checked={paymentMethod === 'loyalty'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-2"
                  />
                  ⭐ Loyalty Points ({Math.ceil(totals.total * 100)} pts needed)
                </label>
              )}
            </div>

            <button
              onClick={handlePayment}
              disabled={cart.length === 0}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
            >
              Process Payment - {formatCurrency(totals.total)}
            </button>
          </div>
        </div>
      </div>
    </ContentLayout>
  )
}

// Main export component that wraps everything with providers
export default function GroceryPOSPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Use the business permissions context for proper business management
  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  // Get user info
  const sessionUser = session?.user as SessionUser
  const employeeId = sessionUser?.id

  // Check if current business is a grocery business
  const isGroceryBusiness = currentBusiness?.businessType === 'grocery'

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Show loading while session or business context is loading
  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Don't render if no session or no business access
  if (!session || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to use the POS system.</p>
        </div>
      </div>
    )
  }

  // Check if user has any grocery businesses
  const groceryBusinesses = businesses.filter(b => b.businessType === 'grocery' && b.isActive)
  const hasGroceryBusinesses = groceryBusinesses.length > 0

  // If no current business selected and user has grocery businesses, show selection prompt
  if (!currentBusiness && hasGroceryBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Grocery Business</h2>
          <p className="text-gray-600 mb-4">
            You have access to {groceryBusinesses.length} grocery business{groceryBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to use the POS system.
          </p>
          <div className="space-y-2">
            {groceryBusinesses.slice(0, 3).map(business => (
              <div key={business.businessId} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{business.businessName}</p>
                <p className="text-sm text-gray-600">Role: {business.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // If current business is not grocery, show error
  if (currentBusiness && !isGroceryBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 mb-4">
            The Grocery POS is only available for grocery businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
          </p>
          <p className="text-sm text-gray-500">
            Please select a grocery business from the sidebar to use this POS system.
          </p>
        </div>
      </div>
    )
  }

  // If no grocery businesses at all, show message
  if (!hasGroceryBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Grocery Businesses</h2>
          <p className="text-gray-600 mb-4">
            You don't have access to any grocery businesses. The Grocery POS system requires access to at least one grocery business.
          </p>
          <p className="text-sm text-gray-500">
            Contact your administrator if you need access to grocery businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid grocery business selected
  const businessId = currentBusinessId!

  return (
    <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType="grocery">
        <GroceryPOSContent />
      </BusinessTypeRoute>
    </BusinessProvider>
  )
}