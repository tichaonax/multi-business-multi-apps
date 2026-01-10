/**
 * Cart Display Component
 *
 * Large, high-visibility display of current cart items for customer-facing screens.
 * Optimized for viewing from a distance with large fonts and high contrast.
 */

'use client'

import Image from 'next/image'

interface CartItem {
  id: string
  name: string
  quantity: number
  price: number
  variant?: string
  imageUrl?: string
}

interface CartDisplayProps {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  taxIncludedInPrice?: boolean
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function CartDisplay({ items, subtotal, tax, total, taxIncludedInPrice = false }: CartDisplayProps) {
  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b-4 border-blue-600">
        <h1 className="text-6xl font-bold text-gray-900 tracking-tight">
          Your Order
        </h1>
        <div className="text-right">
          <div className="text-3xl text-gray-600">Items</div>
          <div className="text-5xl font-bold text-blue-600">{items.length}</div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-8">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-8xl mb-4">🛒</div>
              <div className="text-4xl">Your cart is empty</div>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Totals Section */}
      {items.length > 0 && (
        <div className="border-t-4 border-gray-300 pt-6">
          <div className="space-y-4">
            {/* Subtotal - Only show if tax is NOT included */}
            {!taxIncludedInPrice && (
              <div className="flex justify-between items-center">
                <span className="text-4xl text-gray-700">Subtotal:</span>
                <span className="text-4xl font-semibold text-gray-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            )}

            {/* Tax - Only show if tax is NOT included in prices */}
            {!taxIncludedInPrice && (
              <div className="flex justify-between items-center">
                <span className="text-4xl text-gray-700">Tax:</span>
                <span className="text-4xl font-semibold text-gray-900">
                  {formatCurrency(tax)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className={`flex justify-between items-center ${!taxIncludedInPrice ? 'pt-4 border-t-4 border-blue-600' : ''}`}>
              <span className="text-6xl font-bold text-gray-900">Total:</span>
              <span className="text-6xl font-bold text-blue-600">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Tax Included Notice */}
            {taxIncludedInPrice && (
              <div className="text-center text-2xl text-gray-500 italic mt-2">
                (Tax included in prices)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual cart item row
 */
function CartItemRow({ item }: { item: CartItem }) {
  const lineTotal = item.quantity * item.price

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200 hover:border-blue-400 transition-all">
      <div className="flex items-center gap-6">
        {/* Product Image */}
        {item.imageUrl ? (
          <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        ) : (
          <div className="w-24 h-24 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <div className="text-4xl">📦</div>
          </div>
        )}

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          {/* Item Name */}
          <div className="text-4xl font-bold text-gray-900 mb-1 truncate">
            {item.name}
          </div>

          {/* Variant (if exists) */}
          {item.variant && (
            <div className="text-2xl text-gray-600 mb-2">
              {item.variant}
            </div>
          )}

          {/* Price per unit */}
          <div className="text-2xl text-gray-500">
            {formatCurrency(item.price)} each
          </div>
        </div>

        {/* Quantity */}
        <div className="flex-shrink-0 text-center px-4">
          <div className="text-2xl text-gray-600 mb-1">Qty</div>
          <div className="text-5xl font-bold text-blue-600 bg-blue-50 rounded-xl px-6 py-2">
            {item.quantity}
          </div>
        </div>

        {/* Line Total */}
        <div className="flex-shrink-0 text-right min-w-[200px]">
          <div className="text-2xl text-gray-600 mb-1">Total</div>
          <div className="text-5xl font-bold text-gray-900">
            {formatCurrency(lineTotal)}
          </div>
        </div>
      </div>
    </div>
  )
}
