'use client'

import { useState } from 'react'
import { BusinessOrder } from './types'
import { formatCurrency, getStatusColor, getStatusIcon } from './utils'
import { BUSINESS_ORDER_CONFIGS } from './BusinessOrderConfig'

interface OrderCardProps {
  order: BusinessOrder
  onStatusUpdate: (orderId: string, status: string) => void
  onPrintReceipt: (order: BusinessOrder) => void
  onRefund?: (order: BusinessOrder) => void
  canRefund?: boolean
  businessType: string
}

export function OrderCard({ order, onStatusUpdate, onPrintReceipt, onRefund, canRefund, businessType }: OrderCardProps) {
  const config = BUSINESS_ORDER_CONFIGS[businessType]
  const [expanded, setExpanded] = useState(false)

  const handleStatusChange = (newStatus: string) => {
    onStatusUpdate(order.id, newStatus)
  }

  const getBusinessSpecificInfo = () => {
    const info = []

    if (config.features.tableNumbers && order.tableNumber) {
      info.push(`Table ${order.tableNumber}`)
    }

    if (config.features.sizeTracking && order.items && order.items.some(item => item.attributes?.size)) {
      const sizes = order.items.map(item => item.attributes?.size).filter(Boolean).join(', ')
      if (sizes) info.push(`Sizes: ${sizes}`)
    }

    return info
  }

  const businessSpecificInfo = getBusinessSpecificInfo()
  const items = order.items || []
  const displayedItems = expanded ? items : items.slice(0, 3)
  const hasMoreItems = items.length > 3

  return (
    <div className="card p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-primary">
              Order #{order.id.slice(-8)}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)} {order.status}
            </span>
          </div>

          <div className="text-sm text-secondary space-y-1">
            <p>Customer: {order.customerName || 'Walk-in'}</p>
            <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
            {businessSpecificInfo.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {businessSpecificInfo.map((info, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    {info}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-right mt-4 sm:mt-0">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(order.totalAmount)}
          </p>
          <p className="text-sm text-secondary">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Order Items */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
        <div className="space-y-2">
          {displayedItems.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-secondary">
                {item.quantity}x {item.productName || 'Unknown Product'}
                {item.attributes?.size && ` (${item.attributes.size})`}
              </span>
              <span className="font-medium">
                {formatCurrency(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}
          {!expanded && hasMoreItems && (
            <p className="text-sm text-secondary">
              +{items.length - 3} more items
            </p>
          )}

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm text-secondary">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(order.subtotal || order.totalAmount)}</span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-medium">{formatCurrency(order.taxAmount)}</span>
                </div>
              )}
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>
                    Discount
                    {order.attributes?.rewardCouponCode && (
                      <span className="ml-1 text-xs text-green-600 dark:text-green-400 font-normal">
                        🎁 {order.attributes.rewardCouponCode}
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-red-500">-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-primary">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              {order.paymentMethod && (
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="font-medium capitalize">{order.paymentMethod.toLowerCase()}</span>
                </div>
              )}
              {order.notes && (
                <div className="mt-2">
                  <span className="font-medium">Notes:</span> {order.notes}
                </div>
              )}
              {order.attributes?.partialRefund && order.attributes?.refunds && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300">
                  <span className="font-medium">Partial Refund:</span>{' '}
                  {(order.attributes.refunds as any[]).map((r: any, i: number) => (
                    <span key={i}>
                      {formatCurrency(r.amount)} - {r.reason}
                      {i < (order.attributes!.refunds as any[]).length - 1 ? '; ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={order.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          {config.statuses.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        {config.features.receiptPrinting && (
          <button
            onClick={() => onPrintReceipt(order)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Print
          </button>
        )}

        {canRefund && order.status === 'COMPLETED' && onRefund && (
          <button
            onClick={() => onRefund(order)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Refund
          </button>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-secondary rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </button>
      </div>
    </div>
  )
}
