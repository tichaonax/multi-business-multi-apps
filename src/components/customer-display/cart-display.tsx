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
  isAYLICombo?: boolean
  aylicData?: any
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
  ecocashFee?: number
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

// Returns a density level based on item count so rows shrink to fit without scrolling
function getDensity(count: number): 'lg' | 'md' | 'sm' | 'xs' {
  if (count <= 3) return 'lg'
  if (count <= 6) return 'md'
  if (count <= 9) return 'sm'
  return 'xs'
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
  paymentMethod,
  ecocashFee = 0
}: CartDisplayProps) {
  const isEcocash = paymentMethod?.toUpperCase() === 'ECOCASH'
  const density = getDensity(items.length)

  const headerSize = density === 'lg' ? 'text-4xl' : density === 'md' ? 'text-3xl' : 'text-2xl'
  const itemCountSize = density === 'lg' ? 'text-3xl' : 'text-2xl'

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between pb-2 border-b-4 border-blue-600 ${density === 'lg' ? 'mb-3' : 'mb-1.5'}`}>
        <h1 className={`${headerSize} font-bold text-gray-900 tracking-tight`}>
          Your Order
        </h1>
        <div className="text-right">
          <div className="text-lg text-gray-600">Items</div>
          <div className={`${itemCountSize} font-bold text-blue-600`}>{items.length}</div>
        </div>
      </div>

      {/* Items List — flex-1 + overflow-hidden means it never scrolls, rows shrink to fit */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-start gap-1">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-8xl mb-4">🛒</div>
              <div className="text-4xl">Your cart is empty</div>
            </div>
          </div>
        ) : (
          items.map((item, idx) => (
            <CartItemRow key={`${item.id}-${idx}`} item={item} density={density} />
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
              <div className={`rounded-2xl p-6 border-2 ${isEcocash ? 'bg-orange-50 border-orange-500' : 'bg-green-50 border-green-600'}`}>
                <div className="text-center mb-6">
                  <div className={`text-5xl font-bold mb-2 ${isEcocash ? 'text-orange-700' : 'text-green-700'}`}>
                    {isEcocash ? '📱 EcoCash Payment' : '💳 Payment in Progress'}
                  </div>
                  {paymentMethod && !isEcocash && (
                    <div className="text-3xl text-gray-600">
                      Method: {paymentMethod}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* EcoCash: show fee breakdown then prominent "Please send" total */}
                  {isEcocash && shortfall > 0 && (
                    <>
                      {ecocashFee > 0 && (
                        <div className="bg-orange-100 rounded-xl p-4 space-y-2 text-orange-800">
                          <div className="flex justify-between text-3xl">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(shortfall - ecocashFee)}</span>
                          </div>
                          <div className="flex justify-between text-3xl">
                            <span>EcoCash fee (3.5%):</span>
                            <span>{formatCurrency(ecocashFee)}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center bg-orange-500 rounded-xl p-6">
                        <span className="text-4xl font-semibold text-white">Please send:</span>
                        <span className="text-6xl font-bold text-white">
                          {formatCurrency(shortfall)}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Cash: Amount Tendered */}
                  {!isEcocash && (
                    <div className="flex justify-between items-center bg-white rounded-xl p-4">
                      <span className="text-4xl font-semibold text-gray-700">Amount Tendered:</span>
                      <span className="text-5xl font-bold text-blue-600">
                        {formatCurrency(amountTendered)}
                      </span>
                    </div>
                  )}

                  {/* Change Due (cash only) */}
                  {!isEcocash && changeDue > 0 && (
                    <div className="flex justify-between items-center bg-green-100 rounded-xl p-4">
                      <span className="text-4xl font-semibold text-green-700">Change Due:</span>
                      <span className="text-5xl font-bold text-green-700">
                        {formatCurrency(changeDue)}
                      </span>
                    </div>
                  )}

                  {/* Shortfall (cash only) */}
                  {!isEcocash && shortfall > 0 && (
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
function CartItemRow({ item, density = 'lg' }: { item: CartItem; density?: 'lg' | 'md' | 'sm' | 'xs' }) {
  // Weight items: price IS the line total (weight × $/kg), quantity is always 1
  const isWeightLine = item.variant?.includes('/kg')
  const lineTotal = isWeightLine ? item.price : item.quantity * item.price

  const imgSize = density === 'lg' ? 'w-14 h-14' : density === 'md' ? 'w-10 h-10' : 'w-8 h-8'
  const nameSize = density === 'lg' ? 'text-2xl' : density === 'md' ? 'text-xl' : density === 'sm' ? 'text-lg' : 'text-base'
  const subSize = density === 'lg' ? 'text-lg' : 'text-sm'
  const numSize = density === 'lg' ? 'text-3xl' : density === 'md' ? 'text-2xl' : 'text-xl'
  const padding = density === 'lg' ? 'px-4 py-2' : density === 'md' ? 'px-3 py-1.5' : 'px-2 py-1'

  return (
    <div className={`bg-white rounded-xl shadow ${padding} border border-gray-200`}>
      <div className="flex items-center gap-3">
        {/* Product Image / Emoji */}
        {item.imageUrl ? (
          <div className={`relative ${imgSize} flex-shrink-0 rounded-lg overflow-hidden bg-gray-100`}>
            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="56px" />
          </div>
        ) : (
          <div className={`${imgSize} flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center`}>
            <div className={density === 'lg' ? 'text-2xl' : 'text-lg'}>
              {item.isAYLICombo ? '🥗' : item.isCombo ? '🍽️' : '📦'}
            </div>
          </div>
        )}

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className={`${nameSize} font-bold text-gray-900 leading-tight truncate`}>{item.name}</div>
          <div className={`${subSize} text-gray-400`}>
            {item.variant && item.variant !== 'each' && item.variant !== 'units' && item.variant !== ''
              ? item.variant
              : `${formatCurrency(item.price)} each`}
          </div>
        </div>

        {/* Quantity */}
        <div className="flex-shrink-0 text-center">
          <div className="text-xs text-gray-500">Qty</div>
          <div className={`${numSize} font-bold text-blue-600 bg-blue-50 rounded-lg px-2 py-0.5`}>
            {item.quantity}
          </div>
        </div>

        {/* Line Total */}
        <div className="flex-shrink-0 text-right min-w-[90px]">
          <div className="text-xs text-gray-500">Total</div>
          <div className={`${numSize} font-bold text-gray-900`}>{formatCurrency(lineTotal)}</div>
        </div>
      </div>

      {/* AYLI combo breakdown */}
      {item.isAYLICombo && item.aylicData?.lines && (
        <div className="mt-1 ml-1 space-y-0.5">
          <div className={`${subSize} text-gray-400`}>Base ({item.aylicData.size}): {formatCurrency(item.aylicData.basePrice)}</div>
          {item.aylicData.lines.map((l: any, i: number) => (
            <div key={i} className={`${subSize} text-gray-600 flex justify-between`}>
              <span>{l.emoji || '🍽️'} {l.productName} {Number(l.weightKg).toFixed(3)} kg × ${Number(l.pricePerKg).toFixed(2)}/kg</span>
              <span className="font-semibold ml-2">{formatCurrency(l.linePrice)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
