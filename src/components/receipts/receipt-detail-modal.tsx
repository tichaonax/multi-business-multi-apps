'use client'

import { useState, useEffect } from 'react'
import { formatReprintDate } from '@/lib/receipts/watermark'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'

interface ReceiptDetailModalProps {
  receiptId: string
  onClose: () => void
}

export default function ReceiptDetailModal({ receiptId, onClose }: ReceiptDetailModalProps) {
  const [receipt, setReceipt] = useState<any>(null)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reprinting, setReprinting] = useState(false)
  const [reprintSuccess, setReprintSuccess] = useState(false)
  const [reprintReceiptData, setReprintReceiptData] = useState<any>(null)

  useEffect(() => {
    fetchReceipt()
  }, [receiptId])

  const fetchReceipt = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/universal/receipts/${receiptId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch receipt')
      }

      setReceipt(data.receipt)
      setOrder(data.order)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReprint = async () => {
    try {
      setReprinting(true)
      setError(null)

      const response = await fetch(`/api/universal/receipts/${receiptId}/reprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'Reprinted from receipt history',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reprint receipt')
      }

      // Open receipt preview modal for printer selection and close detail modal
      if (data.receiptData) {
        setReprintReceiptData(data.receiptData)
        onClose() // Close the detail modal, go back to receipt list
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setReprinting(false)
    }
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num)
  }

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Receipt Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {reprintSuccess && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200">
                  ✓ Receipt sent to printer successfully
                </p>
              </div>
            )}

            {!loading && !error && receipt && order && (
              <div className="space-y-6">
                {/* Receipt Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Receipt Information
                  </h4>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Receipt Number</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                        {order.orderNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Business</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {order.businessName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Date</dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {new Date(order.createdAt).toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">Total Amount</dt>
                      <dd className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(order.totalAmount)}
                      </dd>
                    </div>
                    {order.customerName && (
                      <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Customer</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                          {order.customerName}
                          {order.customerPhone && (
                            <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">{order.customerPhone}</span>
                          )}
                        </dd>
                      </div>
                    )}
                    {order.rewardCouponCode && (
                      <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Reward / Coupon Used</dt>
                        <dd className="mt-1 text-sm font-mono text-green-700 dark:text-green-400">
                          🎁 {order.rewardCouponCode}
                          {order.discountAmount > 0 && (
                            <span className="ml-2 font-sans font-normal text-gray-500 dark:text-gray-400">
                              (-{formatCurrency(order.discountAmount)})
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                    {order.employeeName && (
                      <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Served by</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                          {order.employeeName}
                        </dd>
                      </div>
                    )}
                    {order.paymentMethod && (
                      <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400">Payment</dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                          {order.paymentMethod.replace('_', ' ').toLowerCase()}
                          {order.paymentStatus && (
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                              order.paymentStatus === 'PAID'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {order.paymentStatus.toLowerCase()}
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Items ({receipt.items.length})
                  </h4>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                    {receipt.items.map((item: any, index: number) => (
                      <div key={index} className="px-4 py-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {item.name || 'Unknown Product'}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                {item.notes}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(item.totalPrice)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-600 dark:text-gray-400">Subtotal</dt>
                      <dd className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(receipt.subtotal)}
                      </dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-600 dark:text-gray-400">Tax</dt>
                      <dd className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(receipt.tax)}
                      </dd>
                    </div>
                    {receipt.discount && receipt.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <dt className="text-gray-600 dark:text-gray-400">{receipt.discountLabel || 'Discount'}</dt>
                        <dd className="text-red-600 dark:text-red-400 font-medium">
                          -{formatCurrency(receipt.discount)}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                      <dt className="text-gray-900 dark:text-white">Total</dt>
                      <dd className="text-gray-900 dark:text-white">
                        {formatCurrency(receipt.total)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Reprint History */}
                {order.reprintHistory && order.reprintHistory.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Reprint History ({order.reprintHistory.length})
                    </h4>
                    <div className="space-y-2">
                      {order.reprintHistory.map((log: any) => (
                        <div
                          key={log.id}
                          className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded"
                        >
                          Reprinted by <span className="font-medium">{log.reprintedBy}</span> on{' '}
                          {formatReprintDate(log.reprintedAt)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Close
            </button>
            <button
              onClick={handleReprint}
              disabled={reprinting || loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium flex items-center"
            >
              {reprinting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Reprinting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Reprint Receipt
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Receipt Preview Modal for reprinting */}
      {reprintReceiptData && (
        <UnifiedReceiptPreviewModal
          receiptData={reprintReceiptData}
          onClose={() => setReprintReceiptData(null)}
          onPrintConfirm={async (printer) => {
            await ReceiptPrintManager.printReceipt(reprintReceiptData, printer)
            setReprintReceiptData(null)
          }}
        />
      )}
    </>
  )
}
