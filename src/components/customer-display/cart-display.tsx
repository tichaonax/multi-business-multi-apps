/**
 * Cart Display Component
 *
 * Large, high-visibility display of current cart items for customer-facing screens.
 * Optimized for viewing from a distance with large fonts and high contrast.
 */

'use client'

import Image from 'next/image'

interface ComboItem {
  productId?: string
  tokenConfigId?: string
  quantity?: number
  product?: { name: string }
  wifiToken?: { name: string }
  name?: string
}

interface CartItem {
  id: string
  name: string
  quantity: number
  price: number
  variant?: string
  imageUrl?: string
  isCombo?: boolean
  comboItems?: ComboItem[]
}

interface CartDisplayProps {
  items: CartItem[]
  subtotal: number
  tax: number
  total: number
  taxIncludedInPrice?: boolean
  taxRate?: number
  taxLabel?: string
  discountAmount?: number
  discountLabel?: string
  rewardAvailableMessage?: string
  // Payment props
  paymentInProgress?: boolean
  amountTendered?: number
  changeDue?: number
  shortfall?: number
  paymentMethod?: string
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

export function CartDisplay({
  items,
  subtotal,
  tax,
  total,
  taxIncludedInPrice = false,
  taxRate = 0,
  taxLabel = 'Tax',
  discountAmount,
  discountLabel,
  rewardAvailableMessage,
  paymentInProgress = false,
  amountTendered = 0,
  changeDue = 0,
  shortfall = 0,
  paymentMethod
}: CartDisplayProps) {
  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b-4 border-blue-600">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Your Order
        </h1>
        <div className="text-right">
          <div className="text-xl text-gray-600">Items</div>
          <div className="text-3xl font-bold text-blue-600">{items.length}</div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
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
        <div className="border-t-4 border-gray-300 pt-3">
          {/* Reward available notification */}
          {rewardAvailableMessage && (
            <div className="mb-3 rounded-3xl bg-yellow-400 border-4 border-yellow-500 shadow-xl px-6 py-4 text-center animate-pulse">
              <p className="text-3xl font-extrabold text-yellow-900 leading-tight">{rewardAvailableMessage}</p>
            </div>
          )}
          <div className="space-y-2">
            {/* Subtotal - show if tax not included OR if there's a discount */}
            {(!taxIncludedInPrice || (discountAmount && discountAmount > 0)) && (
              <div className="flex justify-between items-center">
                <span className="text-2xl text-gray-700">Subtotal:</span>
                <span className="text-2xl font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
            )}

            {/* Tax */}
            {!taxIncludedInPrice && tax > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-2xl text-gray-700">{taxLabel}{taxRate > 0 ? ` (${taxRate}%)` : ''}:</span>
                <span className="text-2xl font-semibold text-gray-900">{formatCurrency(tax)}</span>
              </div>
            )}

            {/* Reward / Discount */}
            {discountAmount && discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-2xl text-green-600">🎁 {discountLabel || 'Discount'}:</span>
                <span className="text-2xl font-semibold text-green-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            {/* Total */}
            <div className={`flex justify-between items-center ${!taxIncludedInPrice || discountAmount ? 'pt-2 border-t-4 border-blue-600' : ''}`}>
              <span className="text-5xl font-bold text-gray-900">Total:</span>
              <span className="text-5xl font-bold text-blue-600">{formatCurrency(total)}</span>
            </div>

            {/* Tax Included Notice */}
            {taxIncludedInPrice && (
              <div className="text-center text-lg text-gray-500 italic">
                (Tax included in prices)
              </div>
            )}
          </div>

          {/* Payment Section */}
          {paymentInProgress && (
            <div className="mt-8 pt-8 border-t-4 border-green-600">
              <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-600">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-green-700 mb-2">
                    💳 Payment in Progress
                  </div>
                  {paymentMethod && (
                    <div className="text-3xl text-gray-600">
                      Method: {paymentMethod}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Amount Tendered */}
                  <div className="flex justify-between items-center bg-white rounded-xl p-4">
                    <span className="text-4xl font-semibold text-gray-700">Amount Tendered:</span>
                    <span className="text-5xl font-bold text-blue-600">
                      {formatCurrency(amountTendered)}
                    </span>
                  </div>

                  {/* Change or Shortfall */}
                  {changeDue > 0 && (
                    <div className="flex justify-between items-center bg-green-100 rounded-xl p-4">
                      <span className="text-4xl font-semibold text-green-700">Change Due:</span>
                      <span className="text-5xl font-bold text-green-700">
                        {formatCurrency(changeDue)}
                      </span>
                    </div>
                  )}

                  {shortfall > 0 && (
                    <div className="flex justify-between items-center bg-red-100 rounded-xl p-4">
                      <span className="text-4xl font-semibold text-red-700">Shortfall:</span>
                      <span className="text-5xl font-bold text-red-700">
                        {formatCurrency(shortfall)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
    <div className="bg-white rounded-xl shadow px-4 py-2 border border-gray-200">
      <div className="flex items-center gap-3">
        {/* Product Image */}
        {item.imageUrl ? (
          <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="56px" />
          </div>
        ) : (
          <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <div className="text-2xl">{item.isCombo ? '🍽️' : '📦'}</div>
          </div>
        )}

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold text-gray-900 leading-tight">{item.name}</div>
          {item.variant && !item.isCombo && (
            <div className="text-lg text-gray-500">{item.variant}</div>
          )}
          {item.isCombo && item.comboItems && item.comboItems.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {item.comboItems.map((ci, idx) => {
                const isWiFiToken = ci.tokenConfigId || ci.wifiToken
                const itemName = ci.wifiToken?.name || ci.product?.name || ci.name || 'Item'
                return (
                  <span key={idx} className="text-sm text-gray-500">
                    {isWiFiToken ? `📶 ${itemName}` : `• ${itemName}`}
                    {ci.quantity && ci.quantity > 1 ? ` x${ci.quantity}` : ''}
                  </span>
                )
              })}
            </div>
          )}
          <div className="text-lg text-gray-400">{formatCurrency(item.price)} each</div>
        </div>

        {/* Quantity */}
        <div className="flex-shrink-0 text-center">
          <div className="text-sm text-gray-500">Qty</div>
          <div className="text-3xl font-bold text-blue-600 bg-blue-50 rounded-lg px-3 py-1">
            {item.quantity}
          </div>
        </div>

        {/* Line Total */}
        <div className="flex-shrink-0 text-right min-w-[120px]">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(lineTotal)}</div>
        </div>
      </div>
    </div>
  )
}
