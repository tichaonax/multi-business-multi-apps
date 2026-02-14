'use client'

import { useState } from 'react'
import { useGlobalCart } from '@/contexts/global-cart-context'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useRouter } from 'next/navigation'

export function MiniCart() {
  const { cart, removeFromCart, updateQuantity, clearCart, getCartItemCount, getCartSubtotal, isCartEmpty } = useGlobalCart()
  const { currentBusiness, currentBusinessId } = useBusinessPermissionsContext()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // Clear cart from both global context and POS-specific localStorage
  const handleClearCart = () => {
    clearCart()
    if (currentBusinessId) {
      // Also clear POS-specific localStorage keys so POS pages pick up the empty state
      try {
        localStorage.removeItem(`cart-${currentBusinessId}`)
        localStorage.removeItem(`global-cart-${currentBusinessId}`)
      } catch {}
    }
  }

  const handleRemoveItem = (itemId: string) => {
    removeFromCart(itemId)
  }

  const itemCount = getCartItemCount()
  const subtotal = getCartSubtotal()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleGoToPOS = () => {
    console.log('[MiniCart] Go to Checkout clicked', {
      currentPath: window.location.pathname,
      businessType: currentBusiness?.businessType,
      targetPath: `/${currentBusiness?.businessType}/pos`
    })
    setIsOpen(false)
    // Navigate to the appropriate POS based on business type
    const businessType = currentBusiness?.businessType || 'retail'
    router.push(`/${businessType}/pos`)
  }

  if (!currentBusiness) {
    return null
  }

  return (
    <div className="relative">
      {/* Cart Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Shopping Cart"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {/* Item Count Badge */}
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {itemCount}
          </span>
        )}
      </button>

      {/* Mini Cart Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div
            className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Shopping Cart
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {currentBusiness.businessName}
              </p>
              {!isCartEmpty && (
                <button
                  onClick={handleClearCart}
                  className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Clear All Items
                </button>
              )}
            </div>

            {/* Cart Items */}
            {isCartEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <p className="text-gray-500 dark:text-gray-400 mb-2">Your cart is empty</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Add items to get started</p>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      {/* Item Image */}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center text-2xl">
                          {(item as any).isCombo ? '🍽️' : '📦'}
                        </div>
                      )}

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {item.name}
                        </h4>
                        {item.sku && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.sku}
                          </p>
                        )}
                        {item.attributes && Object.keys(item.attributes).length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {Object.entries(item.attributes)
                              .filter(([key]) => ['size', 'color'].includes(key))
                              .map(([_, value]) => value)
                              .join(' • ')}
                          </p>
                        )}
                        {/* Combo Contents */}
                        {(item as any).isCombo && (item as any).comboItems && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600/50 rounded p-1.5">
                            <div className="font-medium text-gray-600 dark:text-gray-300 mb-0.5">Includes:</div>
                            {(item as any).comboItems.map((ci: any, idx: number) => {
                              const isWiFiToken = ci.tokenConfigId || ci.wifiToken
                              const itemName = ci.wifiToken?.name || ci.product?.name || ci.name || 'Item'
                              return (
                                <div key={idx} className="flex items-center gap-1 ml-1">
                                  {isWiFiToken ? (
                                    <>
                                      <span>📶</span>
                                      <span className="text-blue-600 dark:text-blue-400">{itemName}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>•</span>
                                      <span>{itemName}</span>
                                      {ci.quantity > 1 && <span className="text-gray-400">x{ci.quantity}</span>}
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity - 1) }}
                              className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold text-lg leading-none"
                            >
                              −
                            </button>
                            <span className="px-2 text-sm font-medium text-gray-900 dark:text-white min-w-[24px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity + 1) }}
                              className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-bold text-lg leading-none"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id) }}
                            className="ml-auto text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Subtotal
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <button
                    onClick={handleGoToPOS}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Go to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
