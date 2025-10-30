'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { BarcodeScanner } from '@/components/universal/barcode-scanner'
import { UniversalProduct } from '@/components/universal/product-card'
import { useState, useEffect, useRef } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  // optional/extended fields mapped from UniversalProduct
  isAvailable?: boolean
  originalPrice?: number | null
  discountPercent?: number | null
  spiceLevel?: number | null
  preparationTime?: number | null
  variants?: Array<{ id: string; name?: string; price?: number; isAvailable?: boolean }>
}

interface CartItem extends MenuItem {
  quantity: number
}

export default function RestaurantPOS() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const submitInFlightRef = useRef<{ current: boolean } | any>({ current: false })
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
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

  // Toast context (hook) must be called unconditionally to preserve hooks order
  const toast = useToastContext()

  // Check if current business is a restaurant business
  const isRestaurantBusiness = currentBusiness?.businessType === 'restaurant'

  const categories = ['all', 'appetizers', 'mains', 'desserts', 'beverages']

  // Load menu items (defined early so hooks order is stable).
  const loadMenuItems = async () => {
    try {
      const response = await fetch('/api/universal/products?businessType=restaurant&isAvailable=true&isActive=true')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Transform universal products to menu items format
          const items = data.data
            .filter((product: any) => product.isAvailable && product.isActive)
            .map((product: any) => ({
              id: product.id,
              name: product.name,
              price: product.basePrice,
              category: product.category?.name || 'uncategorized',
              isAvailable: product.isAvailable,
              originalPrice: product.originalPrice,
              discountPercent: product.discountPercent,
              spiceLevel: product.spiceLevel,
              preparationTime: product.preparationTime
            }))
          setMenuItems(items)
        }
      }
    } catch (error) {
      console.error('Failed to load menu items:', error)
      // Fallback to demo data
      setMenuItems([
        { id: '1', name: 'Caesar Salad', price: 12.99, category: 'appetizers' },
        { id: '2', name: 'Grilled Chicken', price: 18.99, category: 'mains' },
        { id: '3', name: 'Chocolate Cake', price: 8.99, category: 'desserts' },
        { id: '4', name: 'Coffee', price: 3.99, category: 'beverages' },
      ])
    }
  }

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Trigger loading of menu items when we have a selected restaurant business.
  useEffect(() => {
    if (status === 'loading' || businessLoading) return
    if (!currentBusinessId || !isRestaurantBusiness) return
    loadMenuItems()
    // Intentionally depend on currentBusinessId and isRestaurantBusiness
  }, [currentBusinessId, isRestaurantBusiness, status, businessLoading])

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

  // Check if user has any restaurant businesses
  const restaurantBusinesses = businesses.filter(b => b.businessType === 'restaurant' && b.isActive)
  const hasRestaurantBusinesses = restaurantBusinesses.length > 0

  // If no current business selected and user has restaurant businesses, show selection prompt
  if (!currentBusiness && hasRestaurantBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Restaurant Business</h2>
          <p className="text-gray-600 mb-4">
            You have access to {restaurantBusinesses.length} restaurant business{restaurantBusinesses.length > 1 ? 'es' : ''}.
            Please select one from the sidebar to use the POS system.
          </p>
          <div className="space-y-2">
            {restaurantBusinesses.slice(0, 3).map(business => (
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

  // If current business is not restaurant, show error
  if (currentBusiness && !isRestaurantBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600 mb-4">
            The Restaurant POS is only available for restaurant businesses. Your current business "{currentBusiness.businessName}" is a {currentBusiness.businessType} business.
          </p>
          <p className="text-sm text-gray-500">
            Please select a restaurant business from the sidebar to use this POS system.
          </p>
        </div>
      </div>
    )
  }

  // If no restaurant businesses at all, show message
  if (!hasRestaurantBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Restaurant Businesses</h2>
          <p className="text-gray-600 mb-4">
            You don't have access to any restaurant businesses. The Restaurant POS system requires access to at least one restaurant business.
          </p>
          <p className="text-sm text-gray-500">
            Contact your administrator if you need access to restaurant businesses.
          </p>
        </div>
      </div>
    )
  }

  // At this point, we have a valid restaurant business selected
  const businessId = currentBusinessId!

  

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const handleProductScanned = (product: any, variantId?: string) => {
    // Check if product is available
    if (!(product as any).isAvailable) {
      toast.push(`${product.name} is currently unavailable`)
      return
    }

    // If variant is specified, check variant availability
    const variant = variantId ? (product.variants || []).find((v: any) => v.id === variantId) : undefined
    if (variant && !(variant as any).isAvailable) {
      toast.push(`${product.name} (${variant.name}) is currently unavailable`)
      return
    }

    // Convert UniversalProduct to MenuItem format
    const menuItem: MenuItem = {
      id: variantId ? `${product.id}-${variantId}` : product.id,
      name: product.name + (variant?.name ? ` (${variant.name})` : ''),
      price: variant?.price || product.basePrice,
      category: 'scanned',
      isAvailable: true, // We've already checked availability
      originalPrice: (product as any).originalPrice,
      discountPercent: (product as any).discountPercent,
      spiceLevel: (product as any).spiceLevel,
      preparationTime: (product as any).preparationTime
    }

    addToCart(menuItem)
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    setCart(prev => 
      prev.map(i => i.id === itemId ? { ...i, quantity } : i)
    )
  }

  const total = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory)

  const processOrder = async () => {
    if (cart.length === 0) return

    // Prevent duplicate concurrent submissions
    if (submitInFlightRef.current) return
    submitInFlightRef.current = true

    try {
      // Generate a simple idempotency key per submission
      const idempotencyKey = generateUuid()

      const response = await fetch('/api/restaurant/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          total,
          businessId: businessId,
          idempotencyKey
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setCart([])

        // Show success message with inventory update info
        if (result.inventoryUpdates && result.inventoryUpdates.length > 0) {
          const failedUpdates = result.inventoryUpdates.filter((u: any) => !u.success)
          if (failedUpdates.length > 0) {
            toast.push('Order processed successfully! Note: Some inventory updates failed. Please check inventory manually.')
          } else {
            toast.push(`Order processed successfully! Inventory updated: ${result.inventoryUpdates.length} items`)
          }
        } else {
          toast.push('Order processed successfully!')
        }
      }
    } catch (error) {
      toast.push('Failed to process order')
    }
    finally {
      submitInFlightRef.current = false
    }
  }

  // Simple UUID generator (v4-like). Good enough for client-side idempotency keys.
  const generateUuid = () => {
    // Return a RFC4122 v4 compliant UUID via simple random approach
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <div className="min-h-screen page-background bg-white dark:bg-gray-900">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 p-2 lg:p-4">
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-2xl font-bold text-primary">Point of Sale</h1>

            <BarcodeScanner
              onProductScanned={handleProductScanned}
              businessId={businessId}
              showScanner={showBarcodeScanner}
              onToggleScanner={() => setShowBarcodeScanner(!showBarcodeScanner)}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'card text-primary dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4">
              {filteredItems.map(item => {
                const hasDiscount = item.originalPrice && Number(item.originalPrice) > Number(item.price)
                const isUnavailable = item.isAvailable === false

                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    disabled={isUnavailable}
                      className={`card bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left min-h-[80px] touch-manipulation relative ${
                      isUnavailable ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {/* Unavailable indicator */}
                    {isUnavailable && (
                      <div className="absolute top-1 right-1">
                        <span className="text-red-500 text-xs">❌</span>
                      </div>
                    )}

                    {/* Discount indicator */}
                    {hasDiscount && !isUnavailable && (
                      <div className="absolute top-1 right-1">
                        <span className="bg-red-500 text-white text-xs px-1 rounded">
                          {item.discountPercent ? `-${item.discountPercent}%` : 'SALE'}
                        </span>
                      </div>
                    )}

                    {/* Spice level indicator */}
                    {item.spiceLevel && item.spiceLevel > 0 && (
                      <div className="absolute top-1 left-1">
                        <span className="text-xs">{'🌶️'.repeat(Math.min(item.spiceLevel, 3))}</span>
                      </div>
                    )}

                    <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mt-2">{item.name}</h3>

                    <div className="flex items-center gap-1 mt-1">
                      <p className={`text-base sm:text-lg font-bold ${hasDiscount ? 'text-red-600' : 'text-green-600'}`}>
                        ${Number(item.price).toFixed(2)}
                      </p>
                      {hasDiscount && (
                        <p className="text-xs text-secondary line-through">
                          ${Number(item.originalPrice || 0).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Preparation time */}
                    {item.preparationTime && item.preparationTime > 0 && (
                      <p className="text-xs text-secondary mt-1">
                        ⏱️ {item.preparationTime}min
                      </p>
                    )}

                    {isUnavailable && (
                      <p className="text-xs text-red-500 mt-1 font-medium">Unavailable</p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="card bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
            <h2 className="text-xl font-bold text-primary mb-4">Order Summary</h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-green-600">${Number(item.price).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-200 dark:bg-gray-600 rounded text-center hover:bg-gray-300 dark:hover:bg-gray-500 text-primary dark:text-gray-100 touch-manipulation"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-200 dark:bg-gray-600 rounded text-center hover:bg-gray-300 dark:hover:bg-gray-500 text-primary dark:text-gray-100 touch-manipulation"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {cart.length === 0 && (
              <p className="text-secondary text-center py-8">No items in cart</p>
            )}
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-xl text-green-600">${total.toFixed(2)}</span>
              </div>
              
              <button
                onClick={processOrder}
                disabled={cart.length === 0}
                className="w-full py-4 sm:py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-lg sm:text-base"
              >
                Process Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </BusinessTypeRoute>
  )
}